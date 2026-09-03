/**
 * The walker — the ONE piece of node-building logic in the system.
 *
 * Exported as source text because both transports must execute the identical
 * code: the MCP transport inlines it into a `use_figma` script, and the local
 * plugin bundles it into `code.js`. If either grew its own walker, the
 * "one renderer, two transports" guarantee would quietly die.
 *
 * It takes a RenderPlan (pure data) and performs Plugin API calls. Nothing here
 * decides how anything LOOKS — every value arrives measured.
 */
export const WALKER_SRC = String.raw`
async function runPlan(plan) {
  const report = { created: [], reused: [], variables: 0, fonts: [], errors: [] };

  // ---- fonts: resolve BEFORE any node work -------------------------------
  // use_figma is transactional, so a loadFontAsync throw discards the whole
  // slice. Resolving first turns a missing font into a named, fixable failure
  // instead of a half-written document.
  const available = await figma.listAvailableFontsAsync();
  const stylesByFamily = {};
  for (const f of available) {
    (stylesByFamily[f.fontName.family] = stylesByFamily[f.fontName.family] || [])
      .push(f.fontName.style);
  }

  // Plus Jakarta Sans spells it "SemiBold"; Inter spells it "Semi Bold".
  // Guessing either way is the documented footgun, so try both spellings.
  const WEIGHT_STYLES = {
    400: ['Regular', 'Normal'],
    500: ['Medium'],
    600: ['SemiBold', 'Semi Bold', 'Demi Bold', 'Medium'],
    700: ['Bold'],
    800: ['ExtraBold', 'Extra Bold', 'Bold'],
  };
  const FAMILY_FALLBACK = ['Inter', 'Roboto'];

  function resolveFont(family, weight) {
    const candidates = [family].concat(FAMILY_FALLBACK);
    const wanted = WEIGHT_STYLES[weight] || WEIGHT_STYLES[400];
    for (const fam of candidates) {
      const styles = stylesByFamily[fam];
      if (!styles) continue;
      for (const style of wanted) if (styles.indexOf(style) > -1) return { family: fam, style };
      if (styles.indexOf('Regular') > -1) return { family: fam, style: 'Regular' };
    }
    return null;
  }

  const fontsNeeded = new Map();
  (function scanFonts(nodes) {
    for (const n of nodes) {
      if (n.text) {
        const f = resolveFont(n.text.family, n.text.weight);
        if (!f) throw new Error('no usable font for ' + n.text.family + ' ' + n.text.weight);
        fontsNeeded.set(f.family + '|' + f.style, f);
        n._font = f;
      }
      if (n.children) scanFonts(n.children);
    }
  })(plan.sets.reduce((acc, s) => acc.concat(s.variants.map(v => v.node)), []));

  for (const f of fontsNeeded.values()) {
    await figma.loadFontAsync(f);
    report.fonts.push(f.family + ' ' + f.style);
  }

  // ---- variables ---------------------------------------------------------
  const varByName = {};
  for (const spec of plan.collections) {
    let collection = (await figma.variables.getLocalVariableCollectionsAsync())
      .filter(function (c) { return c.name === spec.name; })[0];
    if (!collection) {
      collection = figma.variables.createVariableCollection(spec.name);
      collection.renameMode(collection.modes[0].modeId, spec.modes[0]);
      for (let i = 1; i < spec.modes.length; i++) collection.addMode(spec.modes[i]);
    }
    const modeId = {};
    for (const m of collection.modes) modeId[m.name] = m.modeId;

    const existing = await figma.variables.getLocalVariablesAsync('COLOR');
    for (const v of spec.variables) {
      let variable = existing.filter(function (e) {
        return e.name === v.name && e.variableCollectionId === collection.id;
      })[0];
      if (!variable) variable = figma.variables.createVariable(v.name, collection, v.type);
      variable.scopes = v.scopes.length ? v.scopes : ['ALL_SCOPES'];
      for (const mode of spec.modes) {
        if (v.values[mode] === undefined) continue;
        variable.setValueForMode(modeId[mode], hexToRgb(v.values[mode]));
      }
      varByName[v.name] = variable;
      report.variables++;
    }
  }

  // ---- node construction -------------------------------------------------
  function hexToRgb(value) {
    const s = String(value).trim();
    const m = s.match(/^#([0-9a-fA-F]{6})$/);
    if (m) {
      const n = parseInt(m[1], 16);
      return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
    }
    const rgba = s.match(/^rgba?\(([^)]+)\)$/);
    if (rgba) {
      const p = rgba[1].split(/[,\s\/]+/).filter(Boolean).map(Number);
      return { r: p[0] / 255, g: p[1] / 255, b: p[2] / 255 };
    }
    return { r: 0, g: 0, b: 0 };
  }

  function alphaOf(value) {
    const m = String(value).match(/^rgba\(([^)]+)\)$/);
    if (!m) return 1;
    const p = m[1].split(/[,\s\/]+/).filter(Boolean).map(Number);
    return p.length > 3 ? p[3] : 1;
  }

  function paint(p) {
    let solid = { type: 'SOLID', color: hexToRgb(p.v), opacity: alphaOf(p.v) };
    if (p.t && varByName[p.t]) {
      // setBoundVariableForPaint returns a NEW paint — capture and reassign.
      solid = figma.variables.setBoundVariableForPaint(solid, 'color', varByName[p.t]);
    }
    return solid;
  }

  function applyLayout(node, spec) {
    if (!spec.layout || spec.layout.mode !== 'auto') return;
    node.layoutMode = spec.layout.direction === 'column' ? 'VERTICAL' : 'HORIZONTAL';
    node.itemSpacing = spec.layout.gap;
    node.paddingTop = spec.layout.padding[0];
    node.paddingRight = spec.layout.padding[1];
    node.paddingBottom = spec.layout.padding[2];
    node.paddingLeft = spec.layout.padding[3];
    const PRIMARY = { min: 'MIN', center: 'CENTER', max: 'MAX', 'space-between': 'SPACE_BETWEEN' };
    const COUNTER = { min: 'MIN', center: 'CENTER', max: 'MAX', baseline: 'BASELINE' };
    node.primaryAxisAlignItems = PRIMARY[spec.layout.primaryAlign] || 'MIN';
    node.counterAxisAlignItems = COUNTER[spec.layout.counterAlign] || 'MIN';
    node.primaryAxisSizingMode = 'AUTO';
    node.counterAxisSizingMode = 'AUTO';
  }

  function applyStyle(node, spec) {
    if ('fills' in node) node.fills = (spec.fills||[]).map(paint);
    if ('strokes' in node && (spec.strokes||[]).length) {
      node.strokes = spec.strokes.map(paint);
      if (spec.sw) node.strokeWeight = spec.sw;
    }
    if ('topLeftRadius' in node) {
      node.topLeftRadius = (spec.radii||[0,0,0,0])[0];
      node.topRightRadius = (spec.radii||[0,0,0,0])[1];
      node.bottomRightRadius = (spec.radii||[0,0,0,0])[2];
      node.bottomLeftRadius = (spec.radii||[0,0,0,0])[3];
    }
    if ('effects' in node && (spec.effects||[]).length) {
      node.effects = spec.effects.map(function (e) {
        return {
          type: 'DROP_SHADOW', visible: true, blendMode: 'NORMAL',
          color: Object.assign(hexToRgb(e.color.v), { a: alphaOf(e.color.v) }),
          offset: { x: e.x, y: e.y }, radius: e.blur, spread: e.spread,
        };
      });
    }
    if ('opacity' in node && spec.opacity !== undefined) node.opacity = spec.opacity;
  }

  function stamp(node, sid) {
    node.setSharedPluginData('brandingos', 'sid', sid);
    node.setSharedPluginData('brandingos', 'gen', plan.gen);
  }

  function build(spec, isRoot) {
    let node;
    if (spec.svg) {
      node = figma.createNodeFromSvg(spec.svg);
      node.name = spec.name;
    } else if (spec.text) {
      const t = figma.createText();
      t.fontName = spec._font;
      t.characters = spec.text.characters;
      t.fontSize = spec.text.size;
      if (spec.text.lineHeight !== 'auto') {
        t.lineHeight = { unit: 'PIXELS', value: spec.text.lineHeight };
      }
      if (spec.text.letterSpacing) {
        t.letterSpacing = { unit: 'PIXELS', value: spec.text.letterSpacing };
      }
      t.fills = [paint(spec.text.color)];
      t.name = spec.name;
      node = t;
    } else {
      node = isRoot ? figma.createComponent() : figma.createFrame();
      node.name = spec.name;
      // Auto-layout BEFORE children, or the frame keeps its 100x100 birth size.
      applyLayout(node, spec);
      applyStyle(node, spec);
      for (const child of (spec.children||[])) {
        const built = build(child, false);
        node.appendChild(built);
        // hug/fill can only be set once the node has an auto-layout parent.
        if (spec.layout && spec.layout.mode === 'auto') {
          if (child.sizing && child.sizing.width === 'fill') built.layoutSizingHorizontal = 'FILL';
          if (child.sizing && child.sizing.height === 'fill') built.layoutSizingVertical = 'FILL';
        }
      }
      // A childless frame has nothing to hug, so it must be sized explicitly or
      // Figma gives it a default 100x100 box. This is what turned the menu's
      // 1px divider into a grey block.
      if (!(spec.children || []).length && spec.sizing && spec.sizing.w) {
        node.layoutMode = 'NONE';
        node.resize(Math.max(spec.sizing.w, 0.01), Math.max(spec.sizing.h, 0.01));
      }
      if (spec.sizing && spec.sizing.minW) node.minWidth = spec.sizing.minW;
      if (spec.sizing && spec.sizing.maxW) node.maxWidth = spec.sizing.maxW;
      stamp(node, spec.sid);
      return node;
    }
    stamp(node, spec.sid);
    return node;
  }

  // ---- sets --------------------------------------------------------------
  const page = figma.currentPage;
  let cursorY = 0;

  // A large set exceeds use_figma's 50,000-character cap, so it is built across
  // several calls and combined once at the end. Components persist between
  // calls, so 'build' leaves them loose on the page carrying their sid, and
  // 'combine' finds them again and forms the set. Phase is a property of
  // DELIVERY, not of rendering — the node-building code below is identical
  // either way, so the two transports still share one walker.
  if (plan.phase === 'combine') {
    for (const set of plan.sets) {
      const loose = page.children.filter(function (n) {
        return n.type === 'COMPONENT'
          && n.getSharedPluginData('brandingos', 'sid').indexOf(set.sid + '[') === 0;
      });
      if (!loose.length) { report.errors.push('no loose components for ' + set.sid); continue; }
      const prior = page.children.filter(function (n) {
        return n.type === 'COMPONENT_SET'
          && n.getSharedPluginData('brandingos', 'sid') === set.sid;
      });
      for (const p of prior) p.remove();

      const setNode = figma.combineAsVariants(loose, page);
      setNode.name = set.name;
      setNode.layoutMode = 'HORIZONTAL';
      setNode.layoutWrap = 'WRAP';
      setNode.itemSpacing = 24;
      setNode.counterAxisSpacing = 24;
      setNode.paddingTop = setNode.paddingBottom = 40;
      setNode.paddingLeft = setNode.paddingRight = 40;
      setNode.primaryAxisSizingMode = 'FIXED';
      setNode.counterAxisSizingMode = 'AUTO';
      setNode.resize(set.width || 1400, setNode.height);
      setNode.x = set.x || 0;
      setNode.y = set.y || 0;
      stamp(setNode, set.sid);
      const defs = setNode.componentPropertyDefinitions;
      report.created.push({
        sid: set.sid, name: set.name, type: setNode.type,
        variants: loose.length, props: Object.keys(defs),
      });
    }
    return report;
  }

  for (const set of plan.sets) {
    // Reconcile: a set this generator previously wrote is replaced wholesale.
    // Deletion requires a sid THIS renderer stamped — an untagged node is
    // someone else's work by definition and is never touched.
    const prior = page.children.filter(function (n) {
      return n.getSharedPluginData('brandingos', 'sid') === set.sid;
    });
    for (const p of prior) { cursorY = Math.max(cursorY, p.y); p.remove(); }

    const components = [];
    for (const variant of set.variants) {
      const c = build(variant.node, true);
      // THE naming contract: Figma parses "k=v, k=v" into variant properties.
      c.name = variant.name;
      page.appendChild(c);
      components.push(c);
    }

    if (plan.phase === 'build') {
      // Leave them loose; a later 'combine' call forms the set.
      report.created.push({ sid: set.sid, name: set.name, built: components.length });
      continue;
    }

    const setNode = figma.combineAsVariants(components, page);
    setNode.name = set.name;
    setNode.layoutMode = 'HORIZONTAL';
    setNode.layoutWrap = 'WRAP';
    setNode.itemSpacing = 24;
    setNode.counterAxisSpacing = 24;
    setNode.paddingTop = setNode.paddingBottom = 32;
    setNode.paddingLeft = setNode.paddingRight = 32;
    setNode.primaryAxisSizingMode = 'FIXED';
    setNode.counterAxisSizingMode = 'AUTO';
    setNode.resize(1600, setNode.height);
    setNode.x = 0;
    setNode.y = cursorY;
    stamp(setNode, set.sid);
    cursorY += setNode.height + 120;

    report.created.push({ sid: set.sid, name: set.name, variants: components.length });
  }

  return report;
}
`;
