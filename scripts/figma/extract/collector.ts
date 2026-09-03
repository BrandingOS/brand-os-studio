/**
 * The in-page collector, as source text.
 *
 * It is a string rather than a function reference on purpose: Playwright
 * serialises an evaluated function, and a TypeScript build step can rewrite one
 * to reference module-scope helpers that do not exist inside the page. A string
 * is exactly what runs, with nothing between authoring and execution.
 *
 * It produces PLAIN DATA only. Every decision about meaning lives in `toIR.ts`,
 * which is pure and unit-tested.
 */
export const COLLECTOR_SRC = String.raw`
(function collect(props) {
  // ---- token reverse map: resolved value -> --ds-* name, for THIS theme ----
  // Built from the live stylesheet so it reflects what actually painted, not
  // what a JSON file says should have painted.
  function tokenNames() {
    const names = new Set();
    for (const sheet of Array.from(document.styleSheets)) {
      let rules;
      try { rules = sheet.cssRules; } catch { continue; }   // cross-origin
      for (const rule of Array.from(rules || [])) {
        const text = rule.cssText || '';
        for (const m of text.matchAll(/(--ds-[a-z0-9-]+)\s*:/g)) names.add(m[1]);
      }
    }
    return Array.from(names);
  }

  function normalize(value) {
    const s = String(value || '').trim();
    const m = s.match(/^rgba?\(([^)]+)\)$/);
    if (!m) return s;
    const p = m[1].split(/[,\s\/]+/).filter(Boolean).map(Number);
    const [r, g, b, a = 1] = p;
    if ([r, g, b].some(Number.isNaN)) return s;
    if (a >= 1) {
      const h = (n) => n.toString(16).padStart(2, '0');
      return '#' + h(r) + h(g) + h(b);
    }
    return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + a + ')';
  }

  const scope = document.querySelector('[data-fx-harness]') || document.documentElement;
  const probe = getComputedStyle(scope);
  const tokens = {};
  // name -> resolved value. The reverse map below is for PAINT lookup and is
  // lossy by nature: two tokens sharing a value collide. The variable LIST must
  // come from names instead, or a colliding token silently gets no variable —
  // which is how --ds-accent (the primary button fill) went unbound while
  // --ds-text won the #f5f4f0 slot in dark.
  const tokenValues = {};
  for (const name of tokenNames()) {
    const raw = probe.getPropertyValue(name).trim();
    if (!raw) continue;
    // A colour maps by its RESOLVED form; sizes and shadows map verbatim.
    tokenValues[name] = normalize(raw);
    const key = normalize(raw);
    if (!(key in tokens)) tokens[key] = name;
    if (!(raw in tokens)) tokens[raw] = name;
  }

  // ---- declared (authored) width/height, not the used value ----------------
  // getComputedStyle resolves width to a used pixel value, which is
  // indistinguishable from an author's fixed width. Walking the CSSOM for rules
  // this element matches recovers what was actually declared.
  function declared(el) {
    const out = { width: '', height: '' };
    for (const sheet of Array.from(document.styleSheets)) {
      let rules;
      try { rules = sheet.cssRules; } catch { continue; }
      for (const rule of Array.from(rules || [])) {
        if (!rule.selectorText || !rule.style) continue;
        let matches = false;
        try { matches = el.matches(rule.selectorText); } catch { continue; }
        if (!matches) continue;
        const w = rule.style.getPropertyValue('width');
        const h = rule.style.getPropertyValue('height');
        if (w) out.width = w.trim();
        if (h) out.height = h.trim();
      }
    }
    if (el.style && el.style.width) out.width = el.style.width;
    if (el.style && el.style.height) out.height = el.style.height;
    return out;
  }

  function isTextOnly(el) {
    if (!el.childNodes.length) return false;
    return Array.from(el.childNodes).every(
      (n) => n.nodeType === Node.TEXT_NODE && true
    ) && el.textContent.trim().length > 0;
  }

  function snap(el) {
    const cs = getComputedStyle(el);
    const style = {};
    for (const p of props) style[p] = cs.getPropertyValue(p);
    const d = declared(el);
    style.declaredWidth = d.width;
    style.declaredHeight = d.height;

    const r = el.getBoundingClientRect();
    const fx = {};
    for (const key in el.dataset) {
      if (key.startsWith('fx')) {
        const short = key.slice(2);
        fx[short.charAt(0).toLowerCase() + short.slice(1)] = el.dataset[key];
      }
    }
    const aria = {};
    for (const attr of Array.from(el.attributes)) {
      if (attr.name.startsWith('aria-')) aria[attr.name] = attr.value;
    }

    const node = {
      tag: el.tagName.toLowerCase(),
      classes: Array.from(el.classList),
      fx, aria, style,
      rect: { x: r.x, y: r.y, w: r.width, h: r.height },
      children: [],
    };

    if (el.tagName.toLowerCase() === 'svg') {
      // currentColor cannot survive the trip, so resolve it to what painted.
      const clone = el.cloneNode(true);
      // The dev tagger stamps data-lov-* / data-component-* on every element.
      // They are ~700 bytes of noise per icon and mean nothing in Figma.
      (function strip(n) {
        if (n.nodeType !== 1) return;
        for (const a of Array.from(n.attributes)) {
          if (/^data-(lov|component)-/.test(a.name)) n.removeAttribute(a.name);
        }
        for (const c of Array.from(n.childNodes)) strip(c);
      })(clone);
      node.svg = clone.outerHTML.replace(/currentColor/g, normalize(cs.color));
      return node;                                    // an svg is a leaf here
    }

    if (isTextOnly(el)) {
      node.text = el.textContent.trim();
      return node;
    }

    // Walk childNodes, not children.
    //
    // DsMenuItem renders {icon}{children}{kbd}, where `children` is a BARE TEXT
    // NODE between two elements. Walking `el.children` skips it, so every menu
    // item lost its label and would have rendered in Figma as an icon and a
    // keyboard chip with nothing between them. A bare text node that carries
    // ink is a real child and gets a synthetic node of its own, inheriting the
    // parent's text style because that is what actually painted it.
    for (const child of Array.from(el.childNodes)) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        node.children.push(snap(child));
        continue;
      }
      if (child.nodeType !== Node.TEXT_NODE) continue;
      const value = child.textContent.replace(/\s+/g, ' ').trim();
      if (!value) continue;
      const range = document.createRange();
      range.selectNodeContents(child);
      const tr = range.getBoundingClientRect();
      range.detach && range.detach();
      // Inherit TEXT properties only. Copying the parent's whole computed style
      // gave the label the item's padding, corner radius and — on hover — its
      // surface fill, so a bare label would have painted its own background and
      // box. A text run inherits type and colour; it does not inherit a box.
      const TEXT_PROPS = [
        'font-family', 'font-size', 'font-weight', 'line-height',
        'letter-spacing', 'text-align', 'direction', 'color', 'visibility',
      ];
      const inherited = { display: 'block', opacity: '1' };
      for (const p of TEXT_PROPS) inherited[p] = cs.getPropertyValue(p);
      inherited.declaredWidth = '';
      inherited.declaredHeight = '';
      node.children.push({
        tag: '#text',
        classes: [],
        fx: {},
        aria: {},
        style: inherited,
        rect: { x: tr.x, y: tr.y, w: tr.width, h: tr.height },
        text: value,
        children: [],
      });
    }
    return node;
  }

  const cells = [];
  for (const el of Array.from(document.querySelectorAll('[data-fx-component]'))) {
    const subject = el.querySelector('[data-fx-subject] > *');
    if (!subject) continue;
    const variant = {};
    for (const pair of (el.dataset.fxVariant || '').split(',')) {
      if (!pair) continue;
      const i = pair.indexOf('=');
      if (i > 0) variant[pair.slice(0, i)] = pair.slice(i + 1);
    }
    let roles = {}, booleanProps = [];
    try { roles = JSON.parse(el.dataset.fxRoles || '{}'); } catch (e) { roles = {}; }
    try { booleanProps = JSON.parse(el.dataset.fxBooleanProps || '[]'); } catch (e) { booleanProps = []; }
    cells.push({
      component: el.dataset.fxComponent,
      sidRoot: el.dataset.fxSid,
      variant,
      pseudo: el.dataset.fxPseudo || 'default',
      roles,
      booleanProps,
      root: snap(subject),
    });
  }

  return {
    theme: (document.querySelector('[data-fx-harness]') || {}).dataset?.theme || 'light',
    direction: document.documentElement.getAttribute('dir') || 'ltr',
    viewport: { w: window.innerWidth, h: window.innerHeight },
    url: location.href,
    capturedAt: new Date().toISOString(),
    tokens,
    tokenValues,
    cells,
  };
})
`;
