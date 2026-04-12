/**
 * Service contracts for BrandOS.
 *
 * These interfaces define the API between the UI layer and the data layer.
 * Implementations can be:
 *   - LocalBrandsService (localStorage, dev/guest mode)
 *   - SupabaseBrandsService (production, authenticated)
 *   - MockBrandsService (testing)
 *
 * The UI layer NEVER imports a concrete implementation directly.
 * It accesses services via the ServiceContainer or the useService() hook.
 */

import type { Brand, CreateBrandInput, Asset } from '@/shared/types/brand';

// ─── Workspace Types ───────────────────────────────────────────

export type WorkspaceRole = 'owner' | 'admin' | 'editor' | 'exporter' | 'viewer';

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  ownerId: string;
  settings: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  invitedBy?: string;
  invitedAt?: Date;
  joinedAt: Date;
  // Populated from profiles join
  email?: string;
  name?: string;
  avatarUrl?: string;
}

export interface CreateWorkspaceInput {
  name: string;
  slug?: string;
  logoUrl?: string;
}

// ─── Brand Service ─────────────────────────────────────────────

export interface IBrandsService {
  list(workspaceId?: string): Promise<Brand[]>;
  getById(id: string): Promise<Brand | null>;
  getBySlug(slug: string): Promise<Brand | null>;
  create(input: CreateBrandInput): Promise<Brand>;
  update(id: string, patch: Partial<Brand>): Promise<Brand>;
  delete(id: string): Promise<void>;
}

// ─── Workspace Service ─────────────────────────────────────────

export interface IWorkspaceService {
  list(): Promise<Workspace[]>;
  getById(id: string): Promise<Workspace | null>;
  create(input: CreateWorkspaceInput): Promise<Workspace>;
  update(id: string, patch: Partial<CreateWorkspaceInput>): Promise<Workspace>;
  delete(id: string): Promise<void>;

  // Members
  getMembers(workspaceId: string): Promise<WorkspaceMember[]>;
  addMember(workspaceId: string, email: string, role: WorkspaceRole): Promise<WorkspaceMember>;
  removeMember(workspaceId: string, userId: string): Promise<void>;
  updateMemberRole(workspaceId: string, userId: string, role: WorkspaceRole): Promise<void>;
}

// ─── Assets Service ────────────────────────────────────────────

export interface CreateAssetInput {
  brandId: string;
  name: string;
  type: Asset['type'];
  category: Asset['category'];
  source?: Asset['source'];
  url: string;
  storagePath?: string;
  size?: number;
  tags?: string[];
  metadata?: Asset['metadata'];
}

export interface IAssetsService {
  listForBrand(brandId: string): Promise<Asset[]>;
  getById(id: string): Promise<Asset | null>;
  create(input: CreateAssetInput): Promise<Asset>;
  update(id: string, patch: Partial<CreateAssetInput>): Promise<Asset>;
  delete(id: string): Promise<void>;
}

// ─── Storage Service ───────────────────────────────────────────

export interface IStorageService {
  uploadFile(path: string, file: File): Promise<string>;
  deleteFile(path: string): Promise<void>;
  getPublicUrl(path: string): string;
}

// ─── Upload Service ────────────────────────────────────────────
// Higher-level upload abstraction used by `useUpload`. The Local
// implementation compresses to data URLs; a Supabase impl would
// upload to object storage and return a public URL.

export interface UploadServiceResult {
  url: string;
  width?: number;
  height?: number;
}

export interface IUploadService {
  uploadImage(file: File, opts?: { kind?: 'logo' | 'asset' | 'image' }): Promise<UploadServiceResult>;
}

// ─── Design Storage ────────────────────────────────────────────

export interface IDesignStorage {
  saveDesign(brandId: string, designId: string, data: unknown): Promise<void>;
  loadDesign(brandId: string, designId: string): Promise<unknown | null>;
  listDesigns(brandId: string): Promise<string[]>;
  deleteDesign(brandId: string, designId: string): Promise<void>;
}

// ─── Service Keys ──────────────────────────────────────────────
// Type-safe keys for the ServiceContainer

export const SERVICE_KEYS = {
  BRANDS: 'brands',
  WORKSPACES: 'workspaces',
  ASSETS: 'assets',
  STORAGE: 'storage',
  DESIGN_STORAGE: 'designStorage',
  UPLOAD: 'upload',
} as const;
