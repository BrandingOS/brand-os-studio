/**
 * ══════════════════════════════════════════════════════════════════════════
 * NODE-ONLY. Never import this from browser code.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Real TypeScript-AST extraction of `<Route>` definitions. Run by the dev-server
 * plugin (see vite.config.ts) and by tests — never bundled.
 *
 * Why an AST rather than a text scan: the component→source-file link is the
 * whole point of this tool, and it lives in the *import* declarations
 * (`const BrandSetupPageV2 = lazy(() => import("./pages/b/[slug]/setup"))`).
 * Recovering that by regex means re-implementing binding resolution badly. The
 * AST also gets us exact line numbers for open-in-editor, `import.meta.env.DEV`
 * guards, and the ability to FOLLOW imported route fragments
 * (`{logoMakerFlowRoutes}`) instead of hardcoding a list of router files.
 *
 * `features/dev-product-map/discovery.ts` is an independent text scanner over
 * the same source. We deliberately do not couple to it — instead
 * `__tests__/realRouter.test.ts` asserts the two agree, so a regression in
 * either parser fails CI. Two independent implementations agreeing is a
 * stronger staleness guard than one shared implementation.
 */
import ts from 'typescript';

/** A `<Route>` exactly as written, before naming/grouping is applied. */
export interface RawRoute {
  /** Composed path (parent + own), normalized. */
  path: string;
  /** Path attribute as written; null for `<Route index>`. */
  ownPath: string | null;
  isIndex: boolean;
  /** Deepest component inside `element={…}`. */
  component: string | null;
  /** Components wrapped outside it, outermost first. */
  wrappers: string[];
  /** Statically-knowable forward target. */
  redirectTo?: string;
  devOnly: boolean;
  parentPath?: string;
  /** True when this `<Route>` has nested `<Route>` children. */
  hasChildren: boolean;
  /** 1-indexed line of the `<Route>` token. */
  line: number;
}

/** `{someRoutesArray}` found in the JSX — a route fragment to follow. */
export interface FragmentRef {
  /** Local binding name, e.g. `logoMakerFlowRoutes`. */
  name: string;
  /** Import specifier it was bound from, e.g. `./features/logo-maker/flow`. */
  specifier: string;
  /** Path the fragment is mounted under. */
  parentPath: string;
  line: number;
}

export interface ParsedRouter {
  routes: RawRoute[];
  fragments: FragmentRef[];
  /** Local binding name → import specifier, for component source resolution. */
  bindings: Map<string, string>;
  /**
   * Re-exports (`export { x } from './y'`), so a route fragment reached through
   * a barrel file can be chased to the module that actually defines it.
   * Maps exported name → specifier; `export * from` is keyed by `'*'`.
   */
  reExports: Map<string, string>;
}

export function normalizePath(input: string): string {
  if (!input) return '/';
  let out = input.replace(/\/{2,}/g, '/');
  if (out.length > 1 && out.endsWith('/')) out = out.slice(0, -1);
  return out || '/';
}

function joinPath(parent: string, own: string | null): string {
  if (own === null) return normalizePath(parent || '/');
  // React Router treats a leading slash as absolute.
  if (own.startsWith('/')) return normalizePath(own);
  const base = parent === '/' ? '' : parent;
  return normalizePath(`${base}/${own}`);
}

const tagNameOf = (node: ts.JsxElement | ts.JsxSelfClosingElement): string => {
  const tag = ts.isJsxElement(node) ? node.openingElement.tagName : node.tagName;
  return tag.getText();
};

const isJsxNode = (node: ts.Node): node is ts.JsxElement | ts.JsxSelfClosingElement =>
  ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node);

const isRouteTag = (node: ts.Node): node is ts.JsxElement | ts.JsxSelfClosingElement =>
  isJsxNode(node) && tagNameOf(node) === 'Route';

function attributesOf(
  node: ts.JsxElement | ts.JsxSelfClosingElement,
): ts.NodeArray<ts.JsxAttributeLike> {
  return ts.isJsxElement(node)
    ? node.openingElement.attributes.properties
    : node.attributes.properties;
}

function findAttribute(
  node: ts.JsxElement | ts.JsxSelfClosingElement,
  name: string,
): ts.JsxAttribute | undefined {
  for (const attr of attributesOf(node)) {
    if (ts.isJsxAttribute(attr) && attr.name.getText() === name) return attr;
  }
  return undefined;
}

/** String value of a literal attribute (`path="/x"`), else null. */
function stringAttribute(
  node: ts.JsxElement | ts.JsxSelfClosingElement,
  name: string,
): string | null {
  const attr = findAttribute(node, name);
  if (!attr?.initializer) return null;
  if (ts.isStringLiteral(attr.initializer)) return attr.initializer.text;
  if (
    ts.isJsxExpression(attr.initializer) &&
    attr.initializer.expression &&
    ts.isStringLiteral(attr.initializer.expression)
  ) {
    return attr.initializer.expression.text;
  }
  return null;
}

/** First JSX element anywhere under `root` (depth-first, source order). */
function firstJsxDescendant(
  root: ts.Node,
): ts.JsxElement | ts.JsxSelfClosingElement | undefined {
  let found: ts.JsxElement | ts.JsxSelfClosingElement | undefined;
  const walk = (node: ts.Node) => {
    if (found) return;
    if (isJsxNode(node)) {
      found = node;
      return;
    }
    node.forEachChild(walk);
  };
  root.forEachChild(walk);
  return found;
}

/** Direct JSX child of a JsxElement, skipping whitespace text nodes. */
function firstJsxChild(
  node: ts.JsxElement,
): ts.JsxElement | ts.JsxSelfClosingElement | undefined {
  for (const child of node.children) {
    if (isJsxNode(child)) return child;
    // `{cond && <X/>}` as a child — descend through the expression.
    if (ts.isJsxExpression(child) && child.expression) {
      const nested = isJsxNode(child.expression)
        ? child.expression
        : firstJsxDescendant(child.expression);
      if (nested) return nested;
    }
  }
  return undefined;
}

/**
 * Unwraps `element={…}` down to the component that actually renders the page.
 *
 * `<ProtectedRoute><BrandSettingsProvider><Page/></BrandSettingsProvider></ProtectedRoute>`
 * yields wrappers `[ProtectedRoute, BrandSettingsProvider]` and component
 * `Page`. `wrap(<Screen/>)` yields component `Screen` — call expressions are
 * transparent because we search for the first JSX descendant, not a direct child.
 */
function unwrapElement(expression: ts.Node): {
  component: string | null;
  wrappers: string[];
  leaf: ts.JsxElement | ts.JsxSelfClosingElement | null;
} {
  let current = isJsxNode(expression) ? expression : firstJsxDescendant(expression);
  if (!current) return { component: null, wrappers: [], leaf: null };

  const chain: string[] = [];
  let leaf = current;
  // Guard against pathological nesting; real route elements are 1–3 deep.
  for (let depth = 0; depth < 20; depth += 1) {
    chain.push(tagNameOf(current));
    leaf = current;
    if (!ts.isJsxElement(current)) break;
    const next = firstJsxChild(current);
    if (!next) break;
    current = next;
  }

  return {
    component: chain[chain.length - 1] ?? null,
    wrappers: chain.slice(0, -1),
    leaf,
  };
}

/**
 * Turns a `<Navigate to={`/a/${slug}/setup`}>` target back into a route-shaped
 * path (`/a/:slug/setup`) so redirect destinations are readable.
 *
 * Only holes that occupy a WHOLE segment become params — `${slug}` after a
 * slash is `:slug`, while a hole appended mid-segment is a query/suffix append
 * (`…/setup${search}`) and is dropped. A template that begins with a hole has a
 * computed base (`${target}${search}` in StudioToClassicFallback); that target
 * genuinely isn't static, so we return undefined rather than print a guess.
 */
function templateToRoutePath(node: ts.TemplateExpression): string | undefined {
  if (node.head.text === '') return undefined;

  let out = node.head.text;
  for (const span of node.templateSpans) {
    const expr = span.expression.getText().trim();
    if (out.endsWith('/')) {
      out += /^[A-Za-z_$][\w$]*$/.test(expr) ? `:${expr}` : '*';
    }
    out += span.literal.text;
  }
  return out;
}

/** Redirect target from a `<Navigate>` element, when statically knowable. */
function navigateTarget(node: ts.JsxElement | ts.JsxSelfClosingElement): string | undefined {
  const attr = findAttribute(node, 'to');
  if (!attr?.initializer) return undefined;
  if (ts.isStringLiteral(attr.initializer)) return attr.initializer.text;
  if (ts.isJsxExpression(attr.initializer) && attr.initializer.expression) {
    const expr = attr.initializer.expression;
    if (ts.isStringLiteral(expr)) return expr.text;
    if (ts.isTemplateExpression(expr)) return templateToRoutePath(expr);
    if (ts.isNoSubstitutionTemplateLiteral(expr)) return expr.text;
  }
  return undefined;
}

/**
 * For a redirect component declared in the same file (`StudioToClassicFallback`,
 * `DamRedirect`, …), read its own `<Navigate to=…>` so the explorer can show
 * where the route actually forwards to.
 */
function resolveLocalRedirectTarget(
  sourceFile: ts.SourceFile,
  componentName: string,
): string | undefined {
  let target: string | undefined;

  const scanBody = (body: ts.Node) => {
    const walk = (node: ts.Node) => {
      if (target) return;
      if (isJsxNode(node) && tagNameOf(node) === 'Navigate') {
        target = navigateTarget(node);
        return;
      }
      node.forEachChild(walk);
    };
    walk(body);
  };

  for (const statement of sourceFile.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name?.getText() === componentName) {
      if (statement.body) scanBody(statement.body);
      break;
    }
    if (ts.isVariableStatement(statement)) {
      for (const decl of statement.declarationList.declarations) {
        if (decl.name.getText() === componentName && decl.initializer) {
          scanBody(decl.initializer);
        }
      }
    }
  }

  return target;
}

/**
 * Local binding name → import specifier, covering every way this codebase
 * brings a page into the router:
 *   import Page from './pages/x'                    (eager default)
 *   import { Layout } from './shared/layouts/y'     (eager named)
 *   const Page = lazy(() => import('./pages/z'))    (lazy — the common case)
 */
function collectBindings(sourceFile: ts.SourceFile): Map<string, string> {
  const bindings = new Map<string, string>();

  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
      const specifier = statement.moduleSpecifier.text;
      const clause = statement.importClause;
      if (!clause) continue;
      if (clause.name) bindings.set(clause.name.getText(), specifier);
      if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
        for (const element of clause.namedBindings.elements) {
          bindings.set(element.name.getText(), specifier);
        }
      }
      continue;
    }

    if (ts.isVariableStatement(statement)) {
      for (const decl of statement.declarationList.declarations) {
        if (!decl.initializer || !ts.isIdentifier(decl.name)) continue;
        const specifier = findDynamicImportSpecifier(decl.initializer);
        if (specifier) bindings.set(decl.name.getText(), specifier);
      }
    }
  }

  return bindings;
}

/**
 * `export { logoMakerFlowRoutes } from './routes'` → `logoMakerFlowRoutes` →
 * `./routes`. Barrel files are the normal way features expose route fragments,
 * so following them is required for fragment discovery to be automatic.
 */
function collectReExports(sourceFile: ts.SourceFile): Map<string, string> {
  const reExports = new Map<string, string>();

  for (const statement of sourceFile.statements) {
    if (!ts.isExportDeclaration(statement)) continue;
    if (!statement.moduleSpecifier || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    if (statement.isTypeOnly) continue;
    const specifier = statement.moduleSpecifier.text;

    if (!statement.exportClause) {
      // `export * from './x'`
      reExports.set('*', specifier);
      continue;
    }
    if (ts.isNamedExports(statement.exportClause)) {
      for (const element of statement.exportClause.elements) {
        reExports.set(element.name.getText(), specifier);
      }
    }
  }

  return reExports;
}

/** First `import('…')` string anywhere under `node` — handles any lazy() shape. */
function findDynamicImportSpecifier(node: ts.Node): string | undefined {
  let specifier: string | undefined;
  const walk = (current: ts.Node) => {
    if (specifier) return;
    if (
      ts.isCallExpression(current) &&
      current.expression.kind === ts.SyntaxKind.ImportKeyword &&
      current.arguments.length > 0 &&
      ts.isStringLiteral(current.arguments[0])
    ) {
      specifier = (current.arguments[0] as ts.StringLiteral).text;
      return;
    }
    current.forEachChild(walk);
  };
  walk(node);
  return specifier;
}

/** True for `import.meta.env.DEV && …` guards. */
function isDevGuard(node: ts.Node): boolean {
  if (!ts.isBinaryExpression(node)) return false;
  if (node.operatorToken.kind !== ts.SyntaxKind.AmpersandAmpersandToken) return false;
  return node.left.getText().includes('import.meta.env.DEV');
}

export function parseRouterSource(text: string, file: string): ParsedRouter {
  const sourceFile = ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    ts.ScriptKind.TSX,
  );

  const bindings = collectBindings(sourceFile);
  const routes: RawRoute[] = [];
  const fragments: FragmentRef[] = [];

  const lineOf = (node: ts.Node) =>
    sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;

  const visit = (node: ts.Node, parentPath: string, devOnly: boolean) => {
    const nextDevOnly = devOnly || isDevGuard(node);

    // A bare `{identifier}` in JSX position that resolves to an import is a
    // route fragment — follow it rather than hardcoding router file paths.
    if (
      ts.isJsxExpression(node) &&
      node.expression &&
      ts.isIdentifier(node.expression) &&
      bindings.has(node.expression.getText())
    ) {
      const name = node.expression.getText();
      fragments.push({
        name,
        specifier: bindings.get(name) as string,
        parentPath,
        line: lineOf(node),
      });
      return;
    }

    if (isRouteTag(node)) {
      const ownPath = stringAttribute(node, 'path');
      const indexAttr = findAttribute(node, 'index');
      const isIndex = ownPath === null && indexAttr !== undefined;
      const composed = joinPath(parentPath, ownPath);

      const elementAttr = findAttribute(node, 'element');
      let component: string | null = null;
      let wrappers: string[] = [];
      let redirectTo: string | undefined;

      if (elementAttr?.initializer && ts.isJsxExpression(elementAttr.initializer)) {
        const expression = elementAttr.initializer.expression;
        if (expression) {
          const unwrapped = unwrapElement(expression);
          component = unwrapped.component;
          wrappers = unwrapped.wrappers;
          if (unwrapped.leaf && unwrapped.component === 'Navigate') {
            redirectTo = navigateTarget(unwrapped.leaf);
          } else if (unwrapped.component) {
            redirectTo = resolveLocalRedirectTarget(sourceFile, unwrapped.component);
          }
        }
      }

      const childRoutes = ts.isJsxElement(node)
        ? node.children.some(
            (child) =>
              isRouteTag(child) ||
              (ts.isJsxExpression(child) &&
                child.expression !== undefined &&
                Boolean(firstJsxDescendant(child.expression))),
          )
        : false;

      // A pathless, index-less `<Route>` is a layout-only wrapper: it owns no
      // URL, so emit nothing and let children compose under the same parent.
      if (ownPath !== null || isIndex) {
        routes.push({
          path: composed,
          ownPath,
          isIndex,
          component,
          wrappers,
          redirectTo,
          devOnly: nextDevOnly,
          parentPath: parentPath || undefined,
          hasChildren: childRoutes,
          line: lineOf(node),
        });
      }

      if (ts.isJsxElement(node)) {
        for (const child of node.children) {
          visit(child, composed, nextDevOnly);
        }
      }
      return;
    }

    node.forEachChild((child) => visit(child, parentPath, nextDevOnly));
  };

  visit(sourceFile, '', false);

  return { routes, fragments, bindings, reExports: collectReExports(sourceFile) };
}
