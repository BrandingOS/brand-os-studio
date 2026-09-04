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

  /**
   * Also load the fonts of every component this plan INSTANCES.
   *
   * An instance's text belongs to the component, whose fonts were loaded in a
   * different call and therefore not in this session. `build()` is synchronous,
   * so an override cannot load one on demand — and writing to a text node with
   * an unloaded font throws.
   */
  const refsWanted = new Set();
  (function scanRefs(nodes) {
    for (const n of nodes) {
      if (n.ref && n.ov && n.ov.texts) refsWanted.add(n.ref);
      if (n.children) scanRefs(n.children);
    }
  })(plan.sets.reduce((acc, s) => acc.concat(s.variants.map(v => v.node)), []));

  if (refsWanted.size) {
    for (const p of figma.root.children) {
      for (const n of p.children) {
        const sid = n.getSharedPluginData('brandingos', 'sid');
        const base = sid.indexOf('[') > 0 ? sid.slice(0, sid.indexOf('[')) : sid;
        if (!refsWanted.has(sid) && !refsWanted.has(base)) continue;
        for (const t of n.findAllWithCriteria({ types: ['TEXT'] })) {
          if (t.fontName === figma.mixed) continue;
          const key = t.fontName.family + '|' + t.fontName.style;
          if (fontsNeeded.has(key)) continue;
          fontsNeeded.set(key, t.fontName);
          await figma.loadFontAsync(t.fontName);
          report.fonts.push(t.fontName.family + ' ' + t.fontName.style);
        }
      }
    }
  }

  // ---- variables ---------------------------------------------------------
  const varByName = {};

  /**
   * Seed from what the DOCUMENT already holds, before applying the plan's own
   * collections.
   *
   * Only the FIRST chunk of a split plan carries `collections` — the rest omit
   * it so the definitions do not travel repeatedly. But `varByName` was built
   * solely from that field, so every chunk after the first bound no variables
   * at all and painted flat literal colours instead. The components looked
   * right and were silently disconnected from the token system, which is the
   * single most expensive kind of wrong here.
   *
   * Reading the document first also makes a rerun of one chunk correct on its
   * own, which is what makes partial-run recovery possible.
   */
  for (const v of await figma.variables.getLocalVariablesAsync('COLOR')) {
    varByName[v.name] = v;
  }

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
    // `flex-wrap` was captured and then ignored. Setup's board is a wrapping row
    // whose sections are each full-width, so every section belongs on its own
    // line; without WRAP they were laid out side by side in one row and the
    // whole screen collapsed into a narrow overlapping column. Figma allows wrap
    // on a HORIZONTAL layout only.
    if (spec.layout.wrap && node.layoutMode === 'HORIZONTAL') {
      node.layoutWrap = 'WRAP';
      if (spec.layout.gap) node.counterAxisSpacing = spec.layout.gap;
    }
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

  /**
   * An optional child becomes a BOOLEAN property rather than a variant axis:
   * the same component with one element switched off is a toggle, not a choice
   * from a list. Modelling it as an axis doubles the set for no information.
   *
   * Applied identically whether the set was formed in one call or across
   * several, so the two delivery paths cannot diverge.
   */
  function applyBooleanProps(setNode, set) {
    for (const bp of (set.booleanProps || [])) {
      let key;
      try {
        key = setNode.addComponentProperty(bp.name, 'BOOLEAN', bp.default);
      } catch (e) { report.errors.push('boolean prop ' + bp.name + ': ' + e); continue; }
      let bound = 0;
      for (const variant of setNode.children) {
        for (const child of variant.findAll(function (n) {
          const own = n.getSharedPluginData('brandingos', 'sid').split('/').pop() || '';
          return own.replace(/#\d+$/, '') === bp.role;
        })) {
          child.componentPropertyReferences = { visible: key };
          child.visible = bp.default;
          bound++;
        }
      }
      report.booleanProps = (report.booleanProps || []).concat([{ name: bp.name, bound: bound }]);
    }
  }

  /**
   * Find a component this generator wrote, by sid, anywhere in the document.
   *
   * A referenced pattern may live on another page (a screen on page 10 built
   * from patterns on page 04), so the search cannot be scoped to the current
   * page. Pages load lazily, but every page this generator has written to has
   * already been loaded by its own build call in the same session.
   */
  const componentBySid = {};
  // A variant's sid is "base[axis=value]". Registering the BASE too is what
  // makes a reference to the SET resolve while its variants are still loose
  // components from an earlier build chunk — which is the normal case, since
  // a container is built before anything has been combined.
  //
  // Declared OUTSIDE the indexing pass because the build loop calls it as well:
  // a container and the component it instantiates are usually in the SAME chunk
  // (colors-group beside color-swatch), and an index taken once on entry does
  // not contain anything this run is about to create.
  function put(sid, node) {
    if (!sid) return;
    if (!componentBySid[sid]) componentBySid[sid] = node;
    const bracket = sid.indexOf('[');
    if (bracket > 0) {
      const base = sid.slice(0, bracket);
      if (!componentBySid[base]) componentBySid[base] = node;
    }
  }
  (function indexComponents() {
    for (const p of figma.root.children) {
      for (const n of p.children) {
        const sid = n.getSharedPluginData('brandingos', 'sid');
        if (!sid) continue;
        if (n.type === 'COMPONENT') put(sid, n);
        if (n.type === 'COMPONENT_SET') {
          // A set's default variant is what an unqualified reference means.
          componentBySid[sid] = n.defaultVariant || n.children[0];
          for (const v of n.children) put(v.getSharedPluginData('brandingos', 'sid'), v);
        }
      }
    }
  })();

  function build(spec, isRoot) {
    let node;
    // An INSTANCE of an already-built component. Composition, not copying:
    // editing the swatch must change every palette made of swatches.
    if (spec.ref) {
      const main = componentBySid[spec.ref];
      if (!main) {
        report.errors.push('no component for ref ' + spec.ref + ' at ' + spec.sid);
        // A placeholder frame keeps the parent's layout honest and makes the
        // gap visible on the canvas rather than silently closing it up.
        const gap = figma.createFrame();
        gap.name = 'MISSING INSTANCE — ' + spec.ref;
        gap.resize(Math.max((spec.sizing && spec.sizing.w) || 8, 0.01),
          Math.max((spec.sizing && spec.sizing.h) || 8, 0.01));
        gap.fills = [];
        stamp(gap, spec.sid);
        return gap;
      }
      node = main.createInstance();
      node.name = spec.name;
      // What this occurrence overrides: which variant it is, and the words it
      // shows. Without them every rail row is the component's default and the
      // rail reads "Website" seven times — structurally correct and a picture
      // of something the product never shows.
      if (spec.ov && spec.ov.variant) {
        try { node.setProperties(spec.ov.variant); }
        catch (e) { report.errors.push('variant on ' + spec.sid + ': ' + e); }
      }
      if (spec.ov && spec.ov.texts && spec.ov.texts.length) {
        // Only text THIS generator created is a label. createNodeFromSvg turns
        // an <svg> containing <text> into real TEXT nodes — the rail's
        // thumbnail holds the glyphs "A" and "a" — and those come first in
        // document order, so overrides were written into the ARTWORK while the
        // name and subtitle kept the component's defaults. A node the walker
        // built carries a sid; one Figma derived from an SVG does not.
        const targets = node.findAllWithCriteria({ types: ['TEXT'] })
          .filter(function (t) { return t.getSharedPluginData('brandingos', 'sid'); });
        for (let i = 0; i < targets.length && i < spec.ov.texts.length; i++) {
          try {
            // The font is already loaded: the pre-pass loads the fonts of every
            // component this plan references, because build() is synchronous
            // and a text write without its font throws.
            targets[i].characters = spec.ov.texts[i];
          } catch (e) { report.errors.push('text on ' + spec.sid + '#' + i + ': ' + e); }
        }
      }
      stamp(node, spec.sid);
      return node;
    }
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
      // `text-transform` as a CASE, not baked into the characters: Setup's field
      // labels are authored "Brand name" and displayed "BRAND NAME", and
      // uppercasing the string would make the Figma text disagree with the
      // source and survive an edit.
      if (spec.text.case) {
        const CASES = { upper: 'UPPER', lower: 'LOWER', title: 'TITLE' };
        try { t.textCase = CASES[spec.text.case]; } catch (e) { report.errors.push('textCase: ' + e); }
      }
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
          /**
           * FILL means something different inside a WRAP container.
           *
           * In CSS, `width: 100%` on a child of a wrapping flex row puts that
           * child on a line of its own. In Figma several FILL children SHARE a
           * line and divide it — so Setup's seven full-width sections came out
           * 76px wide, side by side. A child that occupies a whole line is
           * FIXED at its measured width.
           */
          const wrapping = spec.layout.wrap && spec.layout.direction === 'row';
          const column = spec.layout.direction === 'column';
          /**
           * FILL on the parent's PRIMARY axis needs the parent to be fixed on
           * that axis — there is nothing to fill inside a frame that hugs. The
           * section rail's list said `height: fill` inside a hugging column, and
           * Figma resolved it by squashing the list to 356 instead of the 483
           * the seven rows need, clipping the last two.
           */
          if (child.sizing && child.sizing.width === 'fill') {
            if (wrapping && child.sizing.w) {
              built.layoutSizingHorizontal = 'FIXED';
              built.resize(Math.max(child.sizing.w, 0.01), built.height);
            } else if (!column && !spec.fixW) {
              // Primary axis of a hugging row: let it hug.
            } else {
              built.layoutSizingHorizontal = 'FILL';
            }
          }
          if (child.sizing && child.sizing.height === 'fill') {
            if (column && !spec.fixH) {
              // Primary axis of a hugging column: let it hug.
            } else {
              built.layoutSizingVertical = 'FILL';
            }
          }
        } else if (child.pos) {
          // An absolute child carries its own offset. Without it every sibling
          // is appended at the origin and stacks on the first.
          built.x = child.pos.x;
          built.y = child.pos.y;
        }
      }
      // A childless frame has nothing to hug, so it must be sized explicitly or
      // Figma gives it a default 100x100 box. This is what turned the menu's
      // 1px divider into a grey block.
      // Size an ABSOLUTE container as well as a leaf. Its children are placed,
      // not flowed, so nothing pushes its bounds out and Figma falls back to a
      // 100x100 default — which is how the top bar, the icon tile and the logo
      // tile all arrived as identical small squares. The resize comes AFTER the
      // children so their own placement is already done.
      const isAuto = spec.layout && spec.layout.mode === 'auto';
      if (!isAuto && spec.sizing && spec.sizing.w) {
        node.layoutMode = 'NONE';
        node.resize(Math.max(spec.sizing.w, 0.01), Math.max(spec.sizing.h, 0.01));
      } else if (isAuto && spec.sizing && (spec.fixW || spec.fixH)) {
        // An auto-layout frame HUGS unless told otherwise, so a measured width
        // alone changes nothing: section-add hugged its 15px icon instead of
        // being the 30px square it ships as, and the colours group hugged to
        // 178 instead of 1044. Per AXIS, because a fixed width very often pairs
        // with a height that must still grow with its content.
        if (spec.fixW) {
          node.layoutSizingHorizontal = 'FIXED';
          node.resize(Math.max(spec.sizing.w, 0.01), node.height);
        }
        if (spec.fixH) {
          node.layoutSizingVertical = 'FIXED';
          node.resize(node.width, Math.max(spec.sizing.h, 0.01));
        }
      }
      // min/max width exist only inside an auto-layout context. CSS has no such
      // rule, so a measured max-width can land on a node whose parent is
      // absolutely positioned — preview-card's image is one. Figma throws, and
      // an uncaught throw abandons the whole chunk over a constraint that is
      // advisory here. Recorded instead, so the loss is visible.
      try {
        if (spec.sizing && spec.sizing.minW) node.minWidth = spec.sizing.minW;
        if (spec.sizing && spec.sizing.maxW) node.maxWidth = spec.sizing.maxW;
      } catch (e) {
        report.errors.push('sizing bounds on ' + spec.sid + ': ' + e);
      }
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
      // A variant sid is the set sid plus an "[axis=value]" suffix — EXCEPT
      // when the component has no axes, where the two are equal. Matching only
      // the suffixed form lost every axis-less component, which is 11 of the 14
      // product patterns.
      const loose = page.children.filter(function (n) {
        if (n.type !== 'COMPONENT') return false;
        const sid = n.getSharedPluginData('brandingos', 'sid');
        return sid === set.sid || sid.indexOf(set.sid + '[') === 0;
      });
      if (!loose.length) { report.errors.push('no loose components for ' + set.sid); continue; }
      const prior = page.children.filter(function (n) {
        return n.type === 'COMPONENT_SET'
          && n.getSharedPluginData('brandingos', 'sid') === set.sid;
      });
      for (const p of prior) p.remove();

      // The same rule the single-call path applies: a COMPONENT_SET needs every
      // variant to carry a "prop=value" name, so one axis-less component is a
      // plain COMPONENT. Combining it yields a set Figma reports as having
      // existing errors, and every later property read throws.
      // The combine plan carries no variant bodies, so the evidence is the sid
      // itself: an axis-less variant's sid IS the set's sid, with no suffix.
      // Testing that rather than a variants[] the plan does not send means a
      // multi-variant set that only found one component still fails loudly.
      if (loose.length === 1
        && loose[0].getSharedPluginData('brandingos', 'sid') === set.sid) {
        const only = loose[0];
        only.name = set.name;
        only.x = 0;
        only.y = cursorY;
        stamp(only, set.sid);
        cursorY += only.height + 120;
        report.created.push({
          sid: set.sid, name: set.name, type: only.type, variants: 1, props: [],
        });
        continue;
      }

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
      // Laid out with the same running cursor the single-call path uses. The
      // plan sends x/y of 0 for every set, so honouring them stacked all 14
      // patterns on top of each other at the origin.
      setNode.x = 0;
      setNode.y = cursorY;
      cursorY += setNode.height + 120;
      stamp(setNode, set.sid);

      applyBooleanProps(setNode, set);

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

    /**
     * A SCREEN is a frame, not a component.
     *
     * `set.frame` marks a top-level product screen: it is assembled FROM
     * components rather than being one, so it must never be combined into a
     * variant set. Modelling a screen as a component is the mistake that makes
     * a Figma file look systematic while being unusable — you cannot place a
     * screen inside anything, and a set of screens-as-variants is meaningless.
     */
    if (set.frame) {
      for (const variant of set.variants) {
        const f = build(variant.node, false);
        f.name = set.name;
        f.x = set.x || 0;
        f.y = set.y === undefined ? cursorY : set.y;
        page.appendChild(f);
        stamp(f, set.sid);
        cursorY = f.y + f.height + 160;
        report.created.push({ sid: set.sid, name: set.name, type: f.type, frame: true });
      }
      continue;
    }

    const components = [];

    /**
     * build() returns a TEXT node for a text-only spec and a vector frame for
     * an svg-only one, regardless of isRoot — so a component whose ROOT is
     * text (DsEyebrow) came out as a bare TEXT node, which cannot be a library
     * component. Every root is wrapped.
     */
    function asComponent(node, name, sid) {
      if (node.type === 'COMPONENT') return node;
      const c = figma.createComponent();
      c.name = name;
      c.layoutMode = 'HORIZONTAL';
      c.primaryAxisSizingMode = 'AUTO';
      c.counterAxisSizingMode = 'AUTO';
      c.fills = [];
      page.appendChild(c);
      c.appendChild(node);
      c.setSharedPluginData('brandingos', 'sid', sid);
      c.setSharedPluginData('brandingos', 'gen', plan.gen);
      return c;
    }

    for (const variant of set.variants) {
      let c = build(variant.node, true);
      c = asComponent(c, variant.name, variant.sid);
      // THE naming contract: Figma parses "k=v, k=v" into variant properties.
      c.name = variant.name;
      page.appendChild(c);
      // Available to any container built LATER IN THIS SAME RUN. Without it,
      // colors-group could not instantiate the color-swatch standing beside it.
      put(variant.sid, c);
      components.push(c);
    }

    if (plan.phase === 'build') {
      // Leave them loose; a later 'combine' call forms the set.
      report.created.push({ sid: set.sid, name: set.name, built: components.length });
      continue;
    }

    // A COMPONENT_SET requires every variant to carry a prop=value name. A
    // component with ONE variant and no axes has no such name, so
    // combineAsVariants yields a set Figma reports as having "existing
    // errors", and every later read of componentPropertyDefinitions throws.
    // Such a component is not a set at all — it is a plain COMPONENT.
    if (components.length === 1 && Object.keys(set.variants[0].axes || {}).length === 0) {
      const only = components[0];
      only.name = set.name;
      only.x = set.x || 0; only.y = cursorY;
      stamp(only, set.sid);
      cursorY += only.height + 120;
      report.created.push({ sid: set.sid, name: set.name, type: only.type, variants: 1, props: [] });
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
    applyBooleanProps(setNode, set);
    cursorY += setNode.height + 120;

    const defs = setNode.componentPropertyDefinitions;
    report.created.push({
      sid: set.sid, name: set.name, type: setNode.type,
      variants: components.length, props: Object.keys(defs),
    });
  }

  return report;
}
`;
