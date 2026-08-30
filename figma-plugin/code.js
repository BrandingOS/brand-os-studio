/* BrandingOS → Figma — spike scaffold.
 *
 * Phase 1 validates spikes 2, 3 and 5 (spike 1 passed in the extractor; spike 4
 * needs the real IR and lands next). Every spike ends in assertions run against
 * the LIVE Figma API, because a screenshot cannot tell you whether a node is a
 * real COMPONENT_SET or four frames that merely look like one.
 */

const report = [];
const log = (pass, spike, claim, detail) => report.push({ pass, spike, claim, detail });

// ---------- fonts ----------------------------------------------------------
// The DS asks for Plus Jakarta Sans. Never assume a font is present; a failed
// loadFontAsync throws and takes the whole run with it.
let FONT = { family: 'Plus Jakarta Sans', style: 'SemiBold' };
async function ensureFont() {
  for (const candidate of [
    { family: 'Plus Jakarta Sans', style: 'SemiBold' },
    { family: 'Inter', style: 'Semi Bold' },
    { family: 'Inter', style: 'Regular' },
  ]) {
    try { await figma.loadFontAsync(candidate); FONT = candidate; 
      log(candidate.family === 'Plus Jakarta Sans', 'font',
          'DS font available', `using ${candidate.family} ${candidate.style}`);
      return; } catch (e) { /* try next */ }
  }
  throw new Error('no usable font');
}

// ---------- spike 2: inline SVG → editable vector --------------------------
const ARROW_RIGHT =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0e0e0e" ' +
  'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
  '<path d="M5 12h14M12 5l7 7-7 7" /></svg>';

function spike2(parent) {
  const node = figma.createNodeFromSvg(ARROW_RIGHT);
  node.name = 'icon/arrow-right';
  parent.appendChild(node);

  const vectors = node.findAll(n => n.type === 'VECTOR');
  const v = vectors[0];
  log(vectors.length > 0, 2, 'SVG becomes VECTOR nodes, not an image',
      `${vectors.length} vector node(s), wrapper type ${node.type}`);
  if (v) {
    log(Math.abs(v.strokeWeight - 1.8) < 0.01, 2, 'stroke weight 1.8 preserved',
        `strokeWeight = ${v.strokeWeight}`);
    log(v.strokeCap === 'ROUND', 2, 'round caps preserved', `strokeCap = ${v.strokeCap}`);
    log(Array.isArray(v.fills) && v.fills.length === 0, 2, 'unfilled (line icon, never solid)',
        `fills = ${JSON.stringify(v.fills)}`);
    log(typeof v.vectorNetwork === 'object', 2, 'geometry is editable (vectorNetwork present)',
        `${(v.vectorNetwork && v.vectorNetwork.vertices || []).length} vertices`);
  }
  return node;
}

// ---------- spike 3: a real COMPONENT_SET with variant properties ----------
async function spike3(parent) {
  // Four buttons differing only by declared variant. Values here are stand-ins;
  // in the real pipeline every one of them arrives measured from the DOM.
  const cells = [
    { tone: 'primary',   state: 'default', bg: '#111113', fg: '#f5f4ef' },
    { tone: 'primary',   state: 'hover',   bg: '#111113', fg: '#f5f4ef' },
    { tone: 'secondary', state: 'default', bg: '#ffffff', fg: '#0e0e0e' },
    { tone: 'secondary', state: 'hover',   bg: '#efeee8', fg: '#0e0e0e' },
  ];

  const components = cells.map(c => {
    const frame = figma.createFrame();
    // Auto-layout FIRST, then children — so the frame hugs rather than keeping
    // the 100x100 default it was born with.
    frame.layoutMode = 'HORIZONTAL';
    frame.primaryAxisSizingMode = 'AUTO';
    frame.counterAxisSizingMode = 'AUTO';
    frame.counterAxisAlignItems = 'CENTER';
    frame.paddingLeft = 22; frame.paddingRight = 22;
    frame.paddingTop = 12;  frame.paddingBottom = 12;
    frame.itemSpacing = 8;
    frame.cornerRadius = 999;
    frame.fills = [{ type: 'SOLID', color: hex(c.bg) }];

    const label = figma.createText();
    label.fontName = FONT;
    label.characters = 'Button';
    label.fontSize = 14;
    label.fills = [{ type: 'SOLID', color: hex(c.fg) }];
    label.name = 'label';
    frame.appendChild(label);

    const component = figma.createComponent();
    component.resizeWithoutConstraints(frame.width, frame.height);
    component.layoutMode = 'HORIZONTAL';
    component.primaryAxisSizingMode = 'AUTO';
    component.counterAxisSizingMode = 'AUTO';
    component.counterAxisAlignItems = 'CENTER';
    component.paddingLeft = 22; component.paddingRight = 22;
    component.paddingTop = 12;  component.paddingBottom = 12;
    component.itemSpacing = 8;
    component.cornerRadius = 999;
    component.fills = [{ type: 'SOLID', color: hex(c.bg) }];
    component.appendChild(label);
    frame.remove();

    // THE naming contract: Figma parses "prop=value, prop=value" into real
    // variant properties on combine. Get this wrong and you get four frames.
    component.name = `tone=${c.tone}, state=${c.state}`;
    parent.appendChild(component);
    return component;
  });

  const set = figma.combineAsVariants(components, parent);
  set.name = 'DsButton';
  set.layoutMode = 'VERTICAL';
  set.itemSpacing = 16;
  set.paddingTop = set.paddingBottom = set.paddingLeft = set.paddingRight = 16;
  set.primaryAxisSizingMode = 'AUTO';
  set.counterAxisSizingMode = 'AUTO';

  log(set.type === 'COMPONENT_SET', 3, 'is a real COMPONENT_SET', `type = ${set.type}`);
  const defs = set.componentPropertyDefinitions || {};
  const names = Object.keys(defs);
  log(names.length === 2, 3, 'two variant properties parsed from names', `props = ${names.join(', ')}`);
  log(!!defs.tone && defs.tone.variantOptions.length === 2, 3,
      'tone axis has its options', `tone = ${defs.tone ? defs.tone.variantOptions.join('|') : 'MISSING'}`);
  log(!!defs.state && defs.state.variantOptions.length === 2, 3,
      'state axis has its options', `state = ${defs.state ? defs.state.variantOptions.join('|') : 'MISSING'}`);
  log(set.children.length === 4, 3, 'four variants, not duplicated frames',
      `${set.children.length} children, all ${set.children.every(c => c.type === 'COMPONENT') ? 'COMPONENT' : 'MIXED'}`);

  // instance connectivity — your quality gate asks for this explicitly
  const inst = set.defaultVariant.createInstance();
  inst.name = 'DsButton instance (connectivity probe)';
  parent.appendChild(inst);
  const main = await inst.getMainComponentAsync();
  log(!!main && main.parent.id === set.id, 3, 'instance stays connected to the set',
      main ? `mainComponent → ${main.name}` : 'NO MAIN COMPONENT');
  return { set, inst };
}

// ---------- spike 5: resize behaviour, not screenshot fidelity -------------
function spike5(parent) {
  const row = figma.createFrame();
  row.name = 'resize probe / row';
  row.layoutMode = 'HORIZONTAL';
  row.counterAxisSizingMode = 'AUTO';
  row.primaryAxisSizingMode = 'FIXED';
  row.resize(320, 40);
  row.itemSpacing = 12;
  row.paddingLeft = row.paddingRight = 16;
  row.paddingTop = row.paddingBottom = 8;
  row.counterAxisAlignItems = 'CENTER';
  row.fills = [{ type: 'SOLID', color: hex('#ffffff') }];
  parent.appendChild(row);

  const label = figma.createText();
  label.fontName = FONT; label.characters = 'Label'; label.fontSize = 14;
  label.name = 'label (hug)';
  row.appendChild(label);
  label.layoutGrow = 0;                       // hugs

  const filler = figma.createFrame();
  filler.name = 'spacer (fill)';
  filler.fills = [{ type: 'SOLID', color: hex('#efeee8') }];
  filler.resize(10, 24);
  row.appendChild(filler);
  filler.layoutGrow = 1;                      // fills remaining space
  filler.layoutAlign = 'STRETCH';

  const before = { row: row.width, label: label.width, filler: filler.width,
                   padL: row.paddingLeft, labelX: label.x };
  row.resize(640, row.height);
  const after  = { row: row.width, label: label.width, filler: filler.width,
                   padL: row.paddingLeft, labelX: label.x };

  log(after.label === before.label, 5, 'hugging child keeps its width on resize',
      `label ${before.label} → ${after.label}`);
  log(after.filler === before.filler + 320, 5, 'filling child absorbs the full delta',
      `spacer ${before.filler} → ${after.filler} (+${after.filler - before.filler} of +320)`);
  log(after.padL === before.padL, 5, 'padding is preserved, not scaled',
      `paddingLeft ${before.padL} → ${after.padL}`);
  log(after.labelX === before.labelX, 5, 'reflow is layout, not a scale transform',
      `label.x ${before.labelX} → ${after.labelX}`);
  row.resize(320, row.height);
  return row;
}

// ---------- hierarchy hygiene: the "no wrapper garbage" assertion ----------
function auditHierarchy(root) {
  const garbage = [];
  const walk = (n) => {
    if ('children' in n) {
      const styled = ('fills' in n && Array.isArray(n.fills) && n.fills.length > 0)
        || ('strokes' in n && Array.isArray(n.strokes) && n.strokes.length > 0)
        || ('cornerRadius' in n && n.cornerRadius !== 0)
        || ('paddingLeft' in n && (n.paddingLeft || n.paddingTop || n.paddingRight || n.paddingBottom));
      const isSet = n.type === 'COMPONENT_SET';
      if (!isSet && n.children.length === 1 && !styled && n.type === 'FRAME') {
        garbage.push(n.name || n.type);
      }
      n.children.forEach(walk);
    }
  };
  walk(root);
  log(garbage.length === 0, 'hygiene', 'no single-child unstyled wrapper frames',
      garbage.length ? `${garbage.length} found: ${garbage.slice(0, 8).join(', ')}` : 'clean');
}

const hex = (h) => {
  const n = parseInt(h.slice(1), 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
};

// ---------- run ------------------------------------------------------------
figma.showUI(__html__, { width: 420, height: 520 });

figma.ui.onmessage = async (msg) => {
  if (msg.type !== 'run-spikes') return;
  report.length = 0;
  try {
    await ensureFont();

    const page = figma.currentPage;
    const board = figma.createFrame();
    board.name = 'SPIKE — BrandingOS → Figma';
    board.layoutMode = 'VERTICAL';
    board.itemSpacing = 48;
    board.paddingTop = board.paddingBottom = board.paddingLeft = board.paddingRight = 48;
    board.primaryAxisSizingMode = 'AUTO';
    board.counterAxisSizingMode = 'AUTO';
    board.fills = [{ type: 'SOLID', color: hex('#f5f4ef') }];
    page.appendChild(board);

    spike2(board);
    await spike3(board);
    spike5(board);
    auditHierarchy(board);

    figma.viewport.scrollAndZoomIntoView([board]);
  } catch (e) {
    log(false, 'run', 'plugin completed without throwing', String(e && e.stack || e));
  }

  const passed = report.filter(r => r.pass).length;
  const text = [
    `BrandingOS → Figma — spike report`,
    `${passed}/${report.length} assertions passed`,
    ``,
    ...report.map(r => `${r.pass ? 'PASS' : 'FAIL'}  [spike ${r.spike}] ${r.claim}\n        ${r.detail}`),
  ].join('\n');

  figma.ui.postMessage({ type: 'report', text, passed, total: report.length, rows: report });
};
