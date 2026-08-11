import type { TokenStateSnapshot } from './historyStore';

/**
 * Named versions — durable checkpoints of the COMPLETE tokens.json state.
 *
 * Stored server-side by the dev-only Vite endpoints in
 * `.ds-token-versions.json` at the repo root (gitignored), so they
 * survive browser refresh/restart AND browser-data clears, and are the
 * same across browsers on this machine. Versions are snapshots only —
 * tokens.json remains the one active source of truth; restoring routes
 * through the same /__ds-tokens/apply validate→write→codegen pipeline.
 */

export interface TokenVersion {
  id: string;
  name: string;
  note?: string;
  createdAt: number;
  tokens: TokenStateSnapshot;
}

export interface TokensState {
  light: Record<string, string>;
  dark: Record<string, string>;
  global: Record<string, string>;
}

/** Current canonical tokens.json content (raw source values). */
export async function fetchTokensState(): Promise<TokensState> {
  const res = await fetch('/__ds-tokens/state');
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data.state as TokensState;
}

export async function fetchVersions(): Promise<TokenVersion[]> {
  const res = await fetch('/__ds-tokens/versions');
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data.versions as TokenVersion[];
}

async function post(body: object): Promise<TokenVersion[]> {
  const res = await fetch('/__ds-tokens/versions', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data.versions as TokenVersion[];
}

/** Snapshot the CURRENT tokens.json as a named version (server reads it). */
export const saveVersion = (name: string, note?: string) => post({ op: 'save', name, note });
export const renameVersion = (id: string, name: string, note?: string) =>
  post({ op: 'rename', id, name, note });
export const deleteVersion = (id: string) => post({ op: 'delete', id });
