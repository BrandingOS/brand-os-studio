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

export const IdentityModelContext = createContext<IdentityModel | null>(null);

export function useIdentityModel(): IdentityModel | null {
  return useContext(IdentityModelContext);
}
