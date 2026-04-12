/**
 * One-time localStorage → Supabase migration.
 *
 * Called from useAuth after first login post-deploy. Reads legacy
 * localStorage keys, batch-inserts data to Supabase, then sets a
 * flag to prevent re-running.
 */
import { supabase } from '@/integrations/supabase/client';

const MIGRATION_FLAG = 'brandos:migrated-to-supabase-v2';

const LEGACY_KEYS = {
  brands: 'brandos:brands',
  comments: 'brandos-v5-comments',
  approvals: 'brandos-v5-approvals',
  notifications: 'brandos-notifications',
  activity: 'brandos-activity-log',
};

export async function migrateLocalStorageToSupabase(): Promise<void> {
  // Skip if already migrated
  if (localStorage.getItem(MIGRATION_FLAG)) return;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  console.log('[migration] Starting localStorage → Supabase migration...');

  try {
    await migrateBrands(user.id);
    await migrateComments(user.id);
    await migrateApprovals(user.id);
    await migrateNotifications(user.id);
    await migrateActivity(user.id);

    // Set migration flag
    localStorage.setItem(MIGRATION_FLAG, new Date().toISOString());
    console.log('[migration] Migration complete');
  } catch (error) {
    console.error('[migration] Migration failed:', error);
    // Don't set flag — will retry next login
  }
}

async function migrateBrands(userId: string): Promise<void> {
  const raw = localStorage.getItem(LEGACY_KEYS.brands);
  if (!raw) return;

  try {
    const brands = JSON.parse(raw);
    if (!Array.isArray(brands) || brands.length === 0) return;

    // Get user's workspace
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', userId)
      .eq('role', 'owner')
      .limit(1)
      .single();

    if (!membership) return;

    // Check existing brands to avoid duplicates
    const { data: existing } = await supabase
      .from('brands')
      .select('slug')
      .eq('workspace_id', membership.workspace_id);

    const existingSlugs = new Set((existing || []).map((b: any) => b.slug));

    // Filter out seed brands and already-existing brands
    const SEED_IDS = ['raqm-brand-001', 'skam', 'vector', '550e8400-e29b-41d4-a716-446655440000'];
    const toMigrate = brands.filter(
      (b: any) => !SEED_IDS.includes(b.id) && !existingSlugs.has(b.slug),
    );

    if (toMigrate.length === 0) return;

    const rows = toMigrate.map((b: any) => ({
      user_id: userId,
      workspace_id: membership.workspace_id,
      name: b.name,
      slug: b.slug,
      logo_url: b.logo,
      logo_assets: b.logoAssets || {},
      primary_color: b.primaryColor,
      secondary_color: b.secondaryColor,
      fonts: b.fonts,
      tone: b.tone,
      audience: b.audience,
      strategy: b.strategy,
      guidelines: b.guidelines || {},
      is_public: b.isPublic || false,
    }));

    const { error } = await supabase.from('brands').insert(rows);
    if (error) console.error('[migration] brands error:', error);
    else console.log(`[migration] Migrated ${rows.length} brands`);
  } catch (error) {
    console.error('[migration] brands parse error:', error);
  }
}

async function migrateComments(userId: string): Promise<void> {
  const raw = localStorage.getItem(LEGACY_KEYS.comments);
  if (!raw) return;

  try {
    const parsed = JSON.parse(raw);
    const comments = parsed?.state?.comments;
    if (!comments || typeof comments !== 'object') return;

    const entries = Object.values(comments) as any[];
    if (entries.length === 0) return;

    const rows = entries.map((c: any) => ({
      thread_id: c.threadId,
      brand_id: c.brandId,
      page_key: c.pageKey,
      anchor: c.anchor,
      author_id: userId,
      author_name: c.author || 'Unknown',
      author_email: c.authorEmail,
      body: c.body,
      parent_id: c.parentId,
      resolved: c.resolved || false,
      created_at: new Date(c.createdAt).toISOString(),
    }));

    const { error } = await supabase.from('comments').insert(rows);
    if (error) console.error('[migration] comments error:', error);
    else console.log(`[migration] Migrated ${rows.length} comments`);
  } catch (error) {
    console.error('[migration] comments parse error:', error);
  }
}

async function migrateApprovals(userId: string): Promise<void> {
  const raw = localStorage.getItem(LEGACY_KEYS.approvals);
  if (!raw) return;

  try {
    const parsed = JSON.parse(raw);
    const items = parsed?.state?.items;
    if (!items || typeof items !== 'object') return;

    const entries = Object.values(items) as any[];
    if (entries.length === 0) return;

    const rows = entries.map((a: any) => ({
      brand_id: a.brandId,
      kind: a.kind,
      ref_id: a.refId,
      title: a.title,
      subtitle: a.subtitle,
      thumbnail_url: a.thumbnailUrl,
      status: a.status || 'pending',
      submitted_by: userId,
      submitted_by_name: a.submittedBy,
      reviewed_by_name: a.reviewedBy,
      reviewed_at: a.reviewedAt ? new Date(a.reviewedAt).toISOString() : null,
      comment: a.comment,
      created_at: new Date(a.submittedAt).toISOString(),
    }));

    const { error } = await supabase.from('approvals').insert(rows);
    if (error) console.error('[migration] approvals error:', error);
    else console.log(`[migration] Migrated ${rows.length} approvals`);
  } catch (error) {
    console.error('[migration] approvals parse error:', error);
  }
}

async function migrateNotifications(userId: string): Promise<void> {
  const raw = localStorage.getItem(LEGACY_KEYS.notifications);
  if (!raw) return;

  try {
    const parsed = JSON.parse(raw);
    const items = parsed?.state?.items;
    if (!Array.isArray(items) || items.length === 0) return;

    const rows = items.map((n: any) => ({
      user_id: userId,
      type: n.type,
      title: n.title,
      body: n.body,
      href: n.href,
      brand_id: n.brandId,
      read: n.read || false,
      created_at: new Date(n.createdAt).toISOString(),
    }));

    const { error } = await supabase.from('notifications').insert(rows);
    if (error) console.error('[migration] notifications error:', error);
    else console.log(`[migration] Migrated ${rows.length} notifications`);
  } catch (error) {
    console.error('[migration] notifications parse error:', error);
  }
}

async function migrateActivity(userId: string): Promise<void> {
  const raw = localStorage.getItem(LEGACY_KEYS.activity);
  if (!raw) return;

  try {
    const events = JSON.parse(raw);
    if (!Array.isArray(events) || events.length === 0) return;

    const rows = events.map((e: any) => ({
      brand_id: e.brandId,
      brand_name: e.brandName,
      user_id: userId,
      user_name: e.userName,
      event_type: e.eventType,
      title: e.title,
      description: e.description,
      metadata: e.metadata || {},
      created_at: new Date(e.createdAt).toISOString(),
    }));

    const { error } = await supabase.from('activity_log').insert(rows);
    if (error) console.error('[migration] activity error:', error);
    else console.log(`[migration] Migrated ${rows.length} activity events`);
  } catch (error) {
    console.error('[migration] activity parse error:', error);
  }
}
