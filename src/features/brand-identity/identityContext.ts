/**
 * The model the page is currently rendering.
 *
 * Exists so an owner-only action in the nav can read what is on the page
 * without the route building the identity model a second time. Two builds
 * would be two answers whenever the Library resolved between them — and the
 * thing being published must be the thing being shown.
 */
import { createContext, useContext } from 'react';
import type { IdentityModel } from './identityModel';
import type { Ground, IdentityRegister } from './identityRegister';

export const IdentityModelContext = createContext<IdentityModel | null>(null);

export function useIdentityModel(): IdentityModel | null {
  return useContext(IdentityModelContext);
}

/**
 * The register the page is being played in.
 *
 * Sections read their own ground from here rather than being told one by the
 * parent. The ground a section stands on depends on which OTHER sections exist
 * — see `rhythm` — so it cannot be a prop written at the call site without
 * every call site knowing about all the others.
 */
export const IdentityRegisterContext = createContext<IdentityRegister | null>(null);

export function useIdentityRegister(): IdentityRegister | null {
  return useContext(IdentityRegisterContext);
}

/** What this section stands on. `page` when the register is unavailable. */
export function useGround(id: string): Ground {
  return useIdentityRegister()?.grounds[id] ?? 'page';
}
