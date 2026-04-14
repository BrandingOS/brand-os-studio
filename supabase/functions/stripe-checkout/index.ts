import Stripe from 'https://esm.sh/stripe@14?target=deno';
import { corsHeaders } from '../_shared/cors.ts';
import { createServiceClient, createUserClient } from '../_shared/supabase.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-04-10',
});

const PRICE_MAP: Record<string, string> = {
  pro: Deno.env.get('STRIPE_PRICE_PRO') || '',
  agency: Deno.env.get('STRIPE_PRICE_AGENCY') || '',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');

    const { workspaceId, planKey, successUrl, cancelUrl } = await req.json();
    if (!workspaceId || !planKey) throw new Error('Missing workspaceId or planKey');

    const priceId = PRICE_MAP[planKey];
    if (!priceId) throw new Error(`Invalid plan: ${planKey}`);

    // Verify user is workspace owner/admin
    const userClient = createUserClient(authHeader);
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const serviceClient = createServiceClient();

    // Check workspace membership
    const { data: membership } = await serviceClient
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single();

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      throw new Error('Only workspace owners/admins can manage billing');
    }

    // Get or create Stripe customer
    const { data: sub } = await serviceClient
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('workspace_id', workspaceId)
      .single();

    let customerId = sub?.stripe_customer_id;

    if (!customerId || customerId.startsWith('pending_')) {
      // Create Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { workspace_id: workspaceId, user_id: user.id },
      });
      customerId = customer.id;

      // Upsert subscription record
      await serviceClient
        .from('subscriptions')
        .upsert({
          workspace_id: workspaceId,
          stripe_customer_id: customerId,
          plan: 'free',
          status: 'active',
        }, { onConflict: 'workspace_id' });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: successUrl || `${req.headers.get('origin')}/settings/plans?success=true`,
      cancel_url: cancelUrl || `${req.headers.get('origin')}/settings/plans`,
      metadata: { workspace_id: workspaceId },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
