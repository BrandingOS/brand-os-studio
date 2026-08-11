/**
 * ══════════════════════════════════════════════════════════════════════════
 * NODE-ONLY. Never import this from browser code.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Navigation edges — "where does this page send the user?"
 *
 * The second scanner in the `NodeAnalysis` extension slot (see `types.ts`). It
 * finds statically provable navigation intent in a page's own source:
 *
 *     <Link to="/dashboard">        <NavLink to={`/b/${slug}/setup`}>
 *     <Navigate to="/login" />      navigate('/onboard-brand')
 *
 * DELIBERATE LIMITS — route availability and user navigation are different
 * things, and this must not blur them:
 *
 *  - Only literal strings and template literals are read. A computed target
 *    (`navigate(next)`) yields NOTHING rather than a guess.
 *  - A target is only turned into an edge when it resolves to EXACTLY ONE known
 *    route. Zero matches or an ambiguous match is left unresolved.
 *  - Two routes existing is never, on its own, evidence of a flow between them.
 *
 * Every emitted edge carries `evidence: 'static-source'`. That field exists so a
 * later runtime source (Playwright-observed navigation, analytics) can be merged
 * in as additional evidence without changing the model or any consumer.
 */
import ts from 'typescript';

import type { NavigationRef, NavigationVia } from '../types';
import { templateToRoutePath } from './parseRouter.node';

/** A navigation target as written, before it is matched against real routes. */
export interface RawNavigation {
  /** Route-shaped target text, e.g. `/b/:slug/setup` or `/dashboard`. */
  target: string;
  via: NavigationVia;
  line: number;
}

const JSX_NAV_TAGS: Record<string, NavigationVia> = {
  Link: 'Link',
  NavLink: 'NavLink',
  Navigate: 'Navigate',
};

/** Identifiers whose call target is a navigation destination. */
const NAV_CALLEES = new Set(['navigate']);

/** Reads a `to=` attribute or a first call argument down to a path string. */
function staticPathOf(node: ts.Node | undefined): string | undefined {
  if (!node) return undefined;
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isTemplateExpression(node)) return templateToRoutePath(node);
  if (ts.isJsxExpression(node)) return staticPathOf(node.expression);
  // `navigate({ pathname: '/x' })` — a documented react-router shape.
  if (ts.isObjectLiteralExpression(node)) {
    for (const property of node.properties) {
      if (
        ts.isPropertyAssignment(property) &&
        property.name.getText() === 'pathname'
      ) {
        return staticPathOf(property.initializer);
      }
    }
  }
  return undefined;
}

function jsxAttribute(
  node: ts.JsxElement | ts.JsxSelfClosingElement,
  name: string,
): ts.JsxAttribute | undefined {
  const attributes = ts.isJsxElement(node)
    ? node.openingElement.attributes.properties
    : node.attributes.properties;
  for (const attribute of attributes) {
    if (ts.isJsxAttribute(attribute) && attribute.name.getText() === name) return attribute;
  }
  return undefined;
}

const tagNameOf = (node: ts.JsxElement | ts.JsxSelfClosingElement): string =>
  (ts.isJsxElement(node) ? node.openingElement.tagName : node.tagName).getText();

/**
 * Navigation targets written in one source file. Relative targets (no leading
 * slash) are skipped — resolving them needs the router context they render in,
 * which we cannot prove from the file alone.
 */
export function scanNavigation(sourceFile: ts.SourceFile): RawNavigation[] {
  const found: RawNavigation[] = [];

  const lineOf = (node: ts.Node) =>
    sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;

  const record = (target: string | undefined, via: NavigationVia, node: ts.Node) => {
    if (!target || !target.startsWith('/')) return;
    found.push({ target, via, line: lineOf(node) });
  };

  const visit = (node: ts.Node) => {
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
      const via = JSX_NAV_TAGS[tagNameOf(node)];
      if (via) {
        record(staticPathOf(jsxAttribute(node, 'to')?.initializer), via, node);
      }
    }

    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      NAV_CALLEES.has(node.expression.getText()) &&
      node.arguments.length > 0
    ) {
      record(staticPathOf(node.arguments[0]), 'navigate', node);
    }

    node.forEachChild(visit);
  };

  visit(sourceFile);
  return found;
}

/** Strips `?query` and `#hash` — they don't participate in route matching. */
function pathOnly(target: string): string {
  return target.split('?')[0].split('#')[0].replace(/\/+$/, '') || '/';
}

const segmentsOf = (path: string) => path.split('/').filter(Boolean);

/**
 * Matches a navigation target against the real route set.
 *
 * Exact path wins. Otherwise a route matches when it has the same segment count
 * and every segment either matches literally or is a `:param` standing in for a
 * concrete value (`/b/acme/setup` → `/b/:slug/setup`). Splat routes are excluded
 * — `/b/:slug/*` would swallow half the app and tell you nothing.
 *
 * Returns null when there is no match OR more than one, so an ambiguous target
 * never becomes a confident edge.
 */
export function resolveNavigationTarget(
  target: string,
  routePaths: readonly string[],
): string | null {
  const wanted = pathOnly(target);
  if (routePaths.includes(wanted)) return wanted;

  const wantedSegments = segmentsOf(wanted);
  const candidates = routePaths.filter((candidate) => {
    if (candidate.includes('*')) return false;
    const candidateSegments = segmentsOf(candidate);
    if (candidateSegments.length !== wantedSegments.length) return false;
    return candidateSegments.every((segment, index) => {
      if (segment.startsWith(':')) return true;
      return segment === wantedSegments[index];
    });
  });

  return candidates.length === 1 ? candidates[0] : null;
}

/**
 * Turns raw targets into resolved `NavigationRef`s. Unresolvable targets are
 * kept with `toPath: null` so the UI can honestly report "this page navigates
 * somewhere we could not pin down" instead of pretending it doesn't navigate.
 */
export function resolveNavigations(
  raw: readonly RawNavigation[],
  routePaths: readonly string[],
): NavigationRef[] {
  const seen = new Set<string>();
  const out: NavigationRef[] = [];

  for (const entry of raw) {
    const toPath = resolveNavigationTarget(entry.target, routePaths);
    // One edge per (target, kind) pair — a nav rendered in a loop is still one
    // relationship.
    const key = `${entry.via}:${entry.target}:${toPath ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);

    out.push({
      target: entry.target,
      toPath,
      via: entry.via,
      line: entry.line,
      evidence: 'static-source',
    });
  }

  return out;
}
