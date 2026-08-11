/**
 * ══════════════════════════════════════════════════════════════════════════
 * NODE-ONLY. Never import this from browser code.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * The FIRST of the extension scanners described in `types.ts` → `NodeAnalysis`.
 *
 * Scope is deliberately level-1 only: the direct imports of a page file,
 * bucketed by architectural layer. That answers "what does this page depend
 * on?" — one of the orientation questions this tool exists for — without
 * building a transitive dependency graph, which is a different tool with
 * different performance and UI needs.
 *
 * Later scanners (hooks, stores, services, Supabase tables, reverse deps,
 * impact analysis) go in this directory as siblings and attach their own
 * optional field to `NodeAnalysis`. Do not grow this one into all of them.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';

import type { ImportKind, ImportRef } from '../types';
import { resolveSpecifier } from './resolveModule.node';

/**
 * Layer buckets, matched against the RESOLVED path so an import counts the same
 * whether it was written `@/shared/ds` or `../../shared/ds`. Order matters:
 * the more specific layer wins.
 */
const LAYER_RULES: Array<{ kind: ImportKind; test: (file: string) => boolean }> = [
  { kind: 'ds', test: (f) => f.startsWith('src/shared/ds/') },
  { kind: 'store', test: (f) => /\/store(s)?\//.test(f) || /Store\.[jt]sx?$/.test(f) },
  { kind: 'service', test: (f) => /\/services?\//.test(f) || f.startsWith('src/core/') },
  { kind: 'domain', test: (f) => f.startsWith('src/domain/') },
  { kind: 'shared', test: (f) => f.startsWith('src/shared/') },
  { kind: 'feature', test: (f) => f.startsWith('src/features/') },
  { kind: 'page', test: (f) => f.startsWith('src/pages/') },
  { kind: 'component', test: (f) => f.startsWith('src/components/') },
];

function classify(file: string | null, external: boolean): ImportKind {
  if (external || !file) return 'external';
  for (const rule of LAYER_RULES) {
    if (rule.test(file)) return rule.kind;
  }
  return 'shared';
}

function bindingNames(clause: ts.ImportClause | undefined): string[] {
  if (!clause) return [];
  const names: string[] = [];
  if (clause.name) names.push(clause.name.getText());
  if (clause.namedBindings) {
    if (ts.isNamedImports(clause.namedBindings)) {
      for (const element of clause.namedBindings.elements) {
        names.push(element.name.getText());
      }
    } else {
      names.push(`* as ${clause.namedBindings.name.getText()}`);
    }
  }
  return names;
}

/**
 * Direct imports of one file. Returns [] when the file can't be read, so a
 * moved or deleted page degrades to "no dependency info" rather than throwing
 * and taking down the whole map.
 */
export function scanImports(file: string, rootDir: string): ImportRef[] {
  let text: string;
  try {
    text = readFileSync(resolve(rootDir, file), 'utf8');
  } catch {
    return [];
  }

  const sourceFile = ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    ts.ScriptKind.TSX,
  );

  const refs: ImportRef[] = [];

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    if (!ts.isStringLiteral(statement.moduleSpecifier)) continue;
    // Type-only imports aren't runtime dependencies.
    if (statement.importClause?.isTypeOnly) continue;

    const specifier = statement.moduleSpecifier.text;
    const { file: resolved, external } = resolveSpecifier(specifier, file, rootDir);

    refs.push({
      specifier,
      file: resolved,
      kind: classify(resolved, external),
      names: bindingNames(statement.importClause),
    });
  }

  return refs;
}
