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

import type {
  Brand,
  CreateBrandInput,
  Asset,
  AssetProvenance,
  BrandFolder,
} from '@/shared/types/brand';

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
  /** Library origin. Defaults to 'uploaded' when omitted. */
  origin?: Asset['origin'];
  folderId?: string | null;
  useAsReference?: boolean;
  /** Generative media carries its provenance from the moment it exists. */
  provenance?: AssetProvenance;
  /** Set by the Library ingest so logoSystem AssetRefs still resolve. */
  legacyRefId?: string | null;
  /**
   * INGEST ONLY. Lets the Library migration keep a legacy asset's original id,
   * so existing `logoSystem` AssetRefs keep resolving with no rewrite at all —
   * the safest outcome, since a rewrite is the one step that can strand a logo.
   * Implementations that cannot honour it (Supabase, where `id` is a uuid and
   * legacy ids are app-generated strings) ignore it and fall back to
   * `legacyRefId` + a rewrite.
   */
  id?: string;
}

// ─── Brand Library ─────────────────────────────────────────────
// The Library is the ONE home for brand-owned material. It is not a new
// store: `public.assets` + IAssetsService BECOME the Library, because that
// pair already has membership-aware RLS, a brand-scoped storage bucket, and
// a local/server implementation pair. The legacy `brand.assets[]` and
// `brand.brandAssets[]` arrays migrate into it.

export interface LibraryFlags {
  isFavorite: boolean;
  /** Mutually exclusive with isFavorite. */
  isDisliked: boolean;
  useAsReference: boolean;
}

export interface LibraryQuery {
  /** `null` matches unfiled items specifically; omit to match any folder. */
  folderId?: string | null;
  origin?: Array<'uploaded' | 'generated' | 'reference'>;
  favorite?: boolean;
  references?: boolean;
  /** Default false — archived items are hidden from default views. */
  includeArchived?: boolean;
  search?: string;
  tags?: string[];
}

/**
 * Why a delete did not happen. Deletion never cascades: if material is adopted
 * by the Official Kit or referenced by saved work, the caller is told what is
 * in the way so the USER can decide (FR-020).
 */
export type DeleteOutcome =
  | { ok: true }
  | { ok: false; reason: 'adopted'; adoptedRefs: string[] }
  | { ok: false; reason: 'referenced'; workItemIds: string[] };

export interface CreateFolderInput {
  brandId: string;
  name: string;
  parentId?: string | null;
}

export interface IAssetsService {
  listForBrand(brandId: string): Promise<Asset[]>;
  getById(id: string): Promise<Asset | null>;
  create(input: CreateAssetInput): Promise<Asset>;
  update(id: string, patch: Partial<CreateAssetInput>): Promise<Asset>;
  /** @deprecated Prefer `softDelete` — it preserves lineage for saved work. */
  delete(id: string): Promise<void>;

  // ── Library surface ──
  /** Excludes archived and tombstoned items unless the query says otherwise. */
  listLibrary(brandId: string, q?: LibraryQuery): Promise<Asset[]>;
  setFlags(id: string, flags: Partial<LibraryFlags>): Promise<Asset>;
  moveToFolder(id: string, folderId: string | null): Promise<Asset>;
  archive(id: string): Promise<Asset>;
  unarchive(id: string): Promise<Asset>;
  /** Tombstones the item. NEVER hard-deletes the row. */
  softDelete(id: string): Promise<DeleteOutcome>;

  listFolders(brandId: string): Promise<BrandFolder[]>;
  createFolder(input: CreateFolderInput): Promise<BrandFolder>;
  renameFolder(id: string, name: string): Promise<BrandFolder>;
  /** Items in the folder fall back to unfiled; they are never deleted. */
  deleteFolder(id: string): Promise<void>;
}

// ─── Storage Service ───────────────────────────────────────────

export interface IStorageService {
  uploadFile(path: string, file: File): Promise<string>;
  deleteFile(path: string): Promise<void>;
  getPublicUrl(path: string): string;
}

// ─── Design Storage ────────────────────────────────────────────

/**
 * Per-design metadata returned by IDesignStorage.listDesigns.
 * Phase 4 extension — was `string[]` of ids only; now returns a
 * record so the My Designs grid can render thumbnails + names
 * without a follow-up loadDesign per id.
 */
export interface DesignSummary {
  id: string;
  name?: string;
  thumbnailUrl?: string;
  contentType?: string;
  width?: number;
  height?: number;
  updatedAt?: string;
  /** Phase 4.2 — set when the design was seeded from a template. */
  sourceTemplateId?: string;
  /** Phase 4.2 — set when the user marked this design as a personal template. */
  isTemplate?: boolean;
  /** Phase 5 — design family link. Set on the source design and every
   *  variant generated from it; lets the My Designs grid group family
   *  members and surface "X variants" affordances. */
  familyId?: string;
  /** Phase 5 — pointer back to the source design when this entry IS a
   *  variant. Absent on the source itself. */
  sourceDesignId?: string;
}

export interface IDesignStorage {
  /**
   * Persist a design. The optional `meta` carries Phase 4.2 fields
   * (thumbnailUrl, name, contentType, dimensions, source-template
   * id, is-template flag) so listDesigns can hydrate a grid without
   * loading every doc body. Adapters MAY ignore unknown meta keys.
   */
  saveDesign(
    brandId: string,
    designId: string,
    data: unknown,
    meta?: Partial<DesignSummary>,
  ): Promise<void>;
  loadDesign(brandId: string, designId: string): Promise<unknown | null>;
  /**
   * Phase 4.2 — was `Promise<string[]>` of ids only; now returns
   * `DesignSummary[]` so the My Designs grid can render without a
   * follow-up loadDesign per id. Adapters should cap the body load
   * (return summaries, not full docs).
   */
  listDesigns(brandId: string): Promise<DesignSummary[]>;
  deleteDesign(brandId: string, designId: string): Promise<void>;
}

// ─── Comments Service ──────────────────────────────────────────

export interface CommentData {
  id: string;
  threadId: string;
  brandId: string;
  pageKey: string;
  anchor?: string;
  authorId: string;
  authorName: string;
  authorEmail?: string;
  body: string;
  mentions?: string[];
  parentId?: string;
  resolved?: boolean;
  createdAt: number;
  updatedAt?: number;
}

export interface CreateCommentInput {
  threadId: string;
  brandId: string;
  pageKey: string;
  anchor?: string;
  authorName: string;
  authorEmail?: string;
  body: string;
  mentions?: string[];
  parentId?: string;
}

export interface ICommentsService {
  listForPage(brandId: string, pageKey: string): Promise<CommentData[]>;
  create(input: CreateCommentInput): Promise<CommentData>;
  resolve(threadId: string): Promise<void>;
  reopen(threadId: string): Promise<void>;
  delete(id: string): Promise<void>;
}

// ─── Approvals Service ─────────────────────────────────────────

export type ApprovalKind = 'asset' | 'template' | 'block' | 'guideline';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface ApprovalData {
  id: string;
  brandId: string;
  kind: ApprovalKind;
  refId: string;
  title: string;
  subtitle?: string;
  thumbnailUrl?: string;
  status: ApprovalStatus;
  submittedBy: string;
  submittedByName?: string;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: number;
  comment?: string;
  createdAt: number;
  updatedAt?: number;
}

export interface CreateApprovalInput {
  brandId: string;
  kind: ApprovalKind;
  refId: string;
  title: string;
  subtitle?: string;
  thumbnailUrl?: string;
  submittedByName?: string;
}

export interface IApprovalsService {
  list(brandId: string): Promise<ApprovalData[]>;
  submit(input: CreateApprovalInput): Promise<ApprovalData>;
  approve(id: string, reviewerName: string, comment?: string): Promise<void>;
  reject(id: string, reviewerName: string, comment?: string): Promise<void>;
  delete(id: string): Promise<void>;
}

// ─── Notifications Service ─────────────────────────────────────

export type NotificationType =
  | 'comment_reply'
  | 'comment_mention'
  | 'approval_requested'
  | 'approval_approved'
  | 'approval_rejected'
  | 'member_invited'
  | 'brand_shared'
  | 'system';

export interface NotificationData {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  href?: string;
  brandId?: string;
  read: boolean;
  createdAt: number;
}

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  href?: string;
  brandId?: string;
}

export interface INotificationsService {
  list(): Promise<NotificationData[]>;
  create(input: CreateNotificationInput): Promise<NotificationData>;
  markRead(id: string): Promise<void>;
  markAllRead(): Promise<void>;
  delete(id: string): Promise<void>;
}

// ─── Activity Service ──────────────────────────────────────────

export type ActivityEventType =
  | 'brand_created'
  | 'brand_updated'
  | 'asset_uploaded'
  | 'asset_exported'
  | 'guideline_updated'
  | 'guideline_published'
  | 'comment_posted'
  | 'comment_resolved'
  | 'approval_submitted'
  | 'approval_approved'
  | 'approval_rejected'
  | 'member_invited'
  | 'member_joined'
  | 'member_removed';

export interface ActivityEventData {
  id: string;
  brandId?: string;
  brandName?: string;
  userId?: string;
  userName?: string;
  eventType: ActivityEventType;
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
  createdAt: number;
}

export interface CreateActivityInput {
  brandId?: string;
  brandName?: string;
  userName?: string;
  eventType: ActivityEventType;
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface IActivityService {
  log(event: CreateActivityInput): Promise<void>;
  list(options?: { brandId?: string; limit?: number }): Promise<ActivityEventData[]>;
}

// ─── Service Keys ──────────────────────────────────────────────
// Type-safe keys for the ServiceContainer

export const SERVICE_KEYS = {
  BRANDS: 'brands',
  /** Stage 2B/2D — canonical Brand repository (BrandServiceRepository facade over
   *  BRANDS today; identity-column SupabaseBrandRepository once migration 013 ships). */
  BRAND_REPOSITORY: 'brandRepository',
  WORKSPACES: 'workspaces',
  ASSETS: 'assets',
  COMMENTS: 'comments',
  APPROVALS: 'approvals',
  NOTIFICATIONS: 'notifications',
  ACTIVITY: 'activity',
  STORAGE: 'storage',
  DESIGN_STORAGE: 'designStorage',
  /** Brand Consistency engine — generated outputs persistence. */
  BRAND_CONSISTENCY: 'brandConsistency',
  /** Mockup Studio — template catalogue (local bundle for V1). */
  MOCKUP_TEMPLATES: 'mockupTemplates',
  /** Phase 4 — Content Universe (templates + categories). */
  TEMPLATES: 'templates',
  /** Phase 5.1b — Format presets (dimension presets per content type).
   *  Local impl reads from ContentTypeConfig.dimensionPresets; Supabase
   *  impl will read from a `format_presets` table once the migration
   *  deploys. 1-line DI swap when Supabase auth flips. */
  FORMAT_PRESETS: 'formatPresets',
  /** Phase 6.3 — Brand memory (per-brand observed user preferences).
   *  Local impl re-analyzes designs on demand; Supabase impl will
   *  write through to a `brand_memory` table for cross-device sync. */
  BRAND_MEMORY: 'brandMemory',
  /** Phase 5 — AI agent (Phase 3.5's `AIAgent`). Registered so
   *  panels can pull a stub agent in tests without constructing
   *  their own EdgeFunctionAgent (which calls fetch). Production
   *  registers `createEdgeFunctionAgent` per active brandKit. */
  AI_AGENT: 'aiAgent',
  /** Brand System Foundation — Official Brand Kit adoptions. Each record is a
   *  REFERENCE to a Core value / Library item / kit deliverable plus adoption
   *  metadata; it never holds a copy of the adopted object. Only an explicit
   *  action by an authorized human creates one. */
  KIT_ADOPTIONS: 'kitAdoptions',
  /** Brand System Foundation — Brand Context v1. Plain recorded signals
   *  (favourites, dislikes, references, approvals, usage). No memory engine,
   *  no embeddings; it can never write Brand Core. */
  BRAND_CONTEXT: 'brandContext',
} as const;

// ─── Mockup Templates Service ──────────────────────────────────

/**
 * Source of truth for the mockup catalogue. V1 is a local, bundled
 * implementation; a Supabase-backed one replaces it once the admin
 * uploader is built (spec Phase 7).
 *
 * Imported lazily from the feature module to avoid pulling PixiJS
 * types into the core layer.
 */
export interface IMockupTemplatesService {
  list(): Promise<import('@/features/mockup-studio/engine/types').TemplateMeta[]>;
  getById(
    id: string,
  ): Promise<import('@/features/mockup-studio/engine/types').TemplateMeta | null>;
}
