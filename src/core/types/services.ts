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
  WORKSPACES: 'workspaces',
  ASSETS: 'assets',
  COMMENTS: 'comments',
  APPROVALS: 'approvals',
  NOTIFICATIONS: 'notifications',
  ACTIVITY: 'activity',
  STORAGE: 'storage',
  DESIGN_STORAGE: 'designStorage',
  UPLOAD: 'upload',
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
  /** Phase 5 — AI agent (Phase 3.5's `AIAgent`). Registered so
   *  panels can pull a stub agent in tests without constructing
   *  their own EdgeFunctionAgent (which calls fetch). Production
   *  registers `createEdgeFunctionAgent` per active brandKit. */
  AI_AGENT: 'aiAgent',
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
