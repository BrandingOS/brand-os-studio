import { supabase } from '@/integrations/supabase/client';

export interface EarlyAccessSubmission {
  email: string;
  name?: string;
  role?: string;
  use_case?: string;
  interesting_feature?: string;
  tester_interest?: string;
  source?: string;
  user_agent?: string;
}

export async function submitEarlyAccess(payload: EarlyAccessSubmission): Promise<void> {
  const { error } = await supabase.from('early_access').insert({
    ...payload,
    source: payload.source ?? 'main-app',
    user_agent:
      payload.user_agent ??
      (typeof navigator !== 'undefined' ? navigator.userAgent : undefined),
  });

  if (error) {
    if (error.code === '23505') {
      return;
    }
    throw new Error(error.message);
  }
}
