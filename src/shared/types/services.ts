// Service abstractions for dependency injection
import { User, Brand, Asset, Design } from '@/shared/types';
  get<T>(url: string, config?: RequestConfig): Promise<ApiResponse<T>>;
  post<T>(url: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>>;
  put<T>(url: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>>;
  delete<T>(url: string, config?: RequestConfig): Promise<ApiResponse<T>>;
}

export interface StorageService {
  set(key: string, value: any): void;
  get<T>(key: string): T | null;
  remove(key: string): void;
  clear(): void;
}

export interface AuthService {
  login(credentials: LoginCredentials): Promise<AuthResponse>;
  logout(): Promise<void>;
  register(userData: RegisterData): Promise<AuthResponse>;
  refreshToken(): Promise<AuthResponse>;
  getCurrentUser(): Promise<User | null>;
  resetPassword(email: string): Promise<void>;
}

export interface BrandService {
  createBrand(brandData: CreateBrandData): Promise<Brand>;
  updateBrand(id: string, brandData: Partial<Brand>): Promise<Brand>;
  deleteBrand(id: string): Promise<void>;
  getBrand(id: string): Promise<Brand>;
  getBrands(userId: string): Promise<Brand[]>;
  generateAssets(brandId: string, assetType: AssetType): Promise<GeneratedAsset[]>;
}

export interface AssetService {
  uploadAsset(file: File, metadata: AssetMetadata): Promise<Asset>;
  deleteAsset(id: string): Promise<void>;
  getAsset(id: string): Promise<Asset>;
  getAssets(brandId: string, filters?: AssetFilters): Promise<Asset[]>;
  transformAsset(id: string, transformations: AssetTransformation[]): Promise<Asset>;
}

export interface DesignService {
  createDesign(designData: CreateDesignData): Promise<Design>;
  updateDesign(id: string, designData: Partial<Design>): Promise<Design>;
  deleteDesign(id: string): Promise<void>;
  getDesign(id: string): Promise<Design>;
  getDesigns(userId: string, filters?: DesignFilters): Promise<Design[]>;
  duplicateDesign(id: string): Promise<Design>;
  exportDesign(id: string, format: ExportFormat): Promise<ExportResult>;
}

export interface CollaborationService {
  shareDesign(designId: string, shareOptions: ShareOptions): Promise<ShareResult>;
  getCollaborators(designId: string): Promise<Collaborator[]>;
  addCollaborator(designId: string, email: string, permissions: Permission[]): Promise<void>;
  removeCollaborator(designId: string, userId: string): Promise<void>;
  updatePermissions(designId: string, userId: string, permissions: Permission[]): Promise<void>;
}

export interface AnalyticsService {
  track(event: AnalyticsEvent): void;
  identify(userId: string, traits: UserTraits): void;
  page(pageName: string, properties?: PageProperties): void;
  group(groupId: string, traits: GroupTraits): void;
}

export interface NotificationService {
  sendNotification(notification: Notification): Promise<void>;
  getNotifications(userId: string): Promise<Notification[]>;
  markAsRead(notificationId: string): Promise<void>;
  subscribe(userId: string, preferences: NotificationPreferences): Promise<void>;
}

// Request/Response types
export interface RequestConfig {
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
}

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
  pagination?: PaginationInfo;
}

export interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

// Authentication types
export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  company?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
  expiresIn: number;
}

// Brand and Design types
export interface CreateBrandData {
  name: string;
  description?: string;
  logoFile?: File;
  primaryColor: string;
  secondaryColor?: string;
  fontFamily: string;
  industry?: string;
}

export interface CreateDesignData {
  name: string;
  brandId: string;
  template?: string;
  dimensions: {
    width: number;
    height: number;
  };
  category: DesignCategory;
}

export interface Design {
  id: string;
  name: string;
  brandId: string;
  userId: string;
  content: DesignContent;
  thumbnail: string;
  dimensions: Dimensions;
  category: DesignCategory;
  isPublic: boolean;
  collaborators: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface DesignContent {
  version: string;
  elements: DesignElement[];
  background: BackgroundConfig;
  settings: DesignSettings;
}

export interface DesignElement {
  id: string;
  type: ElementType;
  position: Position;
  dimensions: Dimensions;
  style: ElementStyle;
  data: any;
  locked?: boolean;
  visible?: boolean;
  groupId?: string;
}

// Asset types
export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  url: string;
  thumbnailUrl?: string;
  brandId: string;
  userId: string;
  metadata: AssetMetadata;
  tags: string[];
  size: number;
  createdAt: Date;
}

export interface AssetMetadata {
  width?: number;
  height?: number;
  format?: string;
  colorProfile?: string;
  dpi?: number;
}

export interface AssetTransformation {
  type: 'resize' | 'crop' | 'filter' | 'format';
  params: Record<string, any>;
}

// Collaboration types
export interface ShareOptions {
  type: 'view' | 'edit';
  expiresAt?: Date;
  password?: string;
  allowDownload?: boolean;
}

export interface Collaborator {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  permissions: Permission[];
  addedAt: Date;
}

export interface Permission {
  action: 'view' | 'edit' | 'comment' | 'download' | 'share';
  resource: 'design' | 'brand' | 'assets';
}

// Enum types
export enum AssetType {
  IMAGE = 'image',
  FONT = 'font',
  ICON = 'icon',
  TEMPLATE = 'template',
  VIDEO = 'video',
  AUDIO = 'audio'
}

export enum DesignCategory {
  SOCIAL_MEDIA = 'social_media',
  PRESENTATION = 'presentation',
  PRINT = 'print',
  WEB = 'web',
  BRANDING = 'branding',
  MARKETING = 'marketing'
}

export enum ElementType {
  TEXT = 'text',
  IMAGE = 'image',
  SHAPE = 'shape',
  ICON = 'icon',
  GROUP = 'group',
  FRAME = 'frame'
}

export enum ExportFormat {
  PNG = 'png',
  JPG = 'jpg',
  PDF = 'pdf',
  SVG = 'svg',
  GIF = 'gif'
}

// Utility types
export interface Position {
  x: number;
  y: number;
  z?: number;
}

export interface Dimensions {
  width: number;
  height: number;
}

export interface ElementStyle {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  rotation?: number;
  borderRadius?: number;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  textAlign?: 'left' | 'center' | 'right';
}

export interface BackgroundConfig {
  type: 'color' | 'gradient' | 'image';
  value: string;
}

export interface DesignSettings {
  gridEnabled: boolean;
  snapToGrid: boolean;
  gridSize: number;
  rulers: boolean;
  guides: Guide[];
}

export interface Guide {
  id: string;
  type: 'horizontal' | 'vertical';
  position: number;
}

// Analytics types
export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  timestamp?: Date;
}

export interface UserTraits {
  name?: string;
  email?: string;
  plan?: string;
  company?: string;
}

export interface PageProperties {
  title?: string;
  path?: string;
  referrer?: string;
}

export interface GroupTraits {
  name?: string;
  plan?: string;
  employees?: number;
}

// Notification types
export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  read: boolean;
  createdAt: Date;
}

export enum NotificationType {
  DESIGN_SHARED = 'design_shared',
  COMMENT_ADDED = 'comment_added',
  BRAND_UPDATED = 'brand_updated',
  EXPORT_READY = 'export_ready',
  COLLABORATION_INVITE = 'collaboration_invite'
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  inApp: boolean;
  types: NotificationType[];
}

// Filter types
export interface AssetFilters {
  type?: AssetType;
  tags?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  size?: {
    min?: number;
    max?: number;
  };
}

export interface DesignFilters {
  category?: DesignCategory;
  brandId?: string;
  isPublic?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface ShareResult {
  shareUrl: string;
  shareId: string;
  expiresAt?: Date;
}

export interface ExportResult {
  url: string;
  filename: string;
  size: number;
  format: ExportFormat;
}