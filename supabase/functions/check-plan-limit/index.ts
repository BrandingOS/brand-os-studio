import { corsHeaders } from '../_shared/cors.ts';
import { createServiceClient, createUserClient } from '../_shared/supabase.ts';
import { getPlanLimit, type MetricKey } from '../_shared/plan-limits.ts';

/**
 * Metric-to-count mapping: how to count current usage for each metric.
 */
const METRIC_COUNTERS: Record<string, (supabase: any, workspaceId: string) => Promise<number>> = {
  brands_count: async (supabase, workspaceId) => {
    const { count } = await supabase
      .from('brands')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId);
    return count || 0;
  },
  team_members: async (supabase, workspaceId) => {
    const { count } = await supabase
      .from('workspace_members')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId);
    return count || 0;
  },
  storage_bytes: async (supabase, workspaceId) => {
    // Sum asset sizes for all brands in workspace
    const { data: brands } = await supabase
      .from('brands')
      .select('id')
      .eq('workspace_id', workspaceId);

    if (!brands || brands.length === 0) return 0;

    const brandIds = brands.map((b: any) => b.id);
    const { data: assets } = await supabase
      .from('assets')
      .select('size')
      .in('brand_id', brandIds);

    return (assets || []).reduce((sum: number, a: any) => sum + (a.size || 0), 0);
  },
};

/**
 * Map action names to the metric they consume.
 */
const ACTION_TO_METRIC: Record<string, MetricKey> = {
  create_brand: 'brands',
  add_member: 'team_members',
  upload_asset: 'storage_mb',
  export: 'exports_month',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');

    const { workspaceId, action } = await req.json();
    if (!workspaceId || !action) throw new Error('Missing workspaceId or action');

    // Verify user is workspace member
    const userClient = createUserClient(authHeader);
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const supabase = createServiceClient();

    // Get current plan
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('plan')
      .eq('workspace_id', workspaceId)
      .single();

    const plan = sub?.plan || 'free';
    const metricKey = ACTION_TO_METRIC[action];

    if (!metricKey) {
      // Unknown action — allow by default
      return new Response(JSON.stringify({ allowed: true, plan }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const limit = getPlanLimit(plan, metricKey);

    // Unlimited
    if (limit === -1) {
      return new Response(JSON.stringify({ allowed: true, plan, limit: -1 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Count current usage
    const counterKey = metricKey === 'brands' ? 'brands_count' : metricKey === 'team_members' ? 'team_members' : metricKey === 'storage_mb' ? 'storage_bytes' : null;
    let currentUsage = 0;

    if (counterKey && METRIC_COUNTERS[counterKey]) {
      currentUsage = await METRIC_COUNTERS[counterKey](supabase, workspaceId);
    }

    // For storage, convert bytes to MB for comparison
    const usageForComparison = metricKey === 'storage_mb' ? Math.ceil(currentUsage / (1024 * 1024)) : currentUsage;

    const allowed = usageForComparison < limit;

    return new Response(JSON.stringify({
      allowed,
      plan,
      currentUsage: usageForComparison,
      limit,
      metric: metricKey,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
