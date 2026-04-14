import { supabase } from '@/integrations/supabase/client';
import type { IApprovalsService, ApprovalData, CreateApprovalInput } from '@/core/types/services';

export class SupabaseApprovalsService implements IApprovalsService {
  async list(brandId: string): Promise<ApprovalData[]> {
    const { data, error } = await supabase
      .from('approvals')
      .select('*')
      .eq('brand_id', brandId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []).map(mapApproval);
  }

  async submit(input: CreateApprovalInput): Promise<ApprovalData> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('approvals')
      .insert({
        brand_id: input.brandId,
        kind: input.kind,
        ref_id: input.refId,
        title: input.title,
        subtitle: input.subtitle,
        thumbnail_url: input.thumbnailUrl,
        submitted_by: user.id,
        submitted_by_name: input.submittedByName,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;
    return mapApproval(data);
  }

  async approve(id: string, reviewerName: string, comment?: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('approvals')
      .update({
        status: 'approved',
        reviewed_by: user?.id,
        reviewed_by_name: reviewerName,
        reviewed_at: new Date().toISOString(),
        comment,
      })
      .eq('id', id);

    if (error) throw error;
  }

  async reject(id: string, reviewerName: string, comment?: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('approvals')
      .update({
        status: 'rejected',
        reviewed_by: user?.id,
        reviewed_by_name: reviewerName,
        reviewed_at: new Date().toISOString(),
        comment,
      })
      .eq('id', id);

    if (error) throw error;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('approvals')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
}

function mapApproval(data: any): ApprovalData {
  return {
    id: data.id,
    brandId: data.brand_id,
    kind: data.kind,
    refId: data.ref_id,
    title: data.title,
    subtitle: data.subtitle || undefined,
    thumbnailUrl: data.thumbnail_url || undefined,
    status: data.status,
    submittedBy: data.submitted_by,
    submittedByName: data.submitted_by_name || undefined,
    reviewedBy: data.reviewed_by || undefined,
    reviewedByName: data.reviewed_by_name || undefined,
    reviewedAt: data.reviewed_at ? new Date(data.reviewed_at).getTime() : undefined,
    comment: data.comment || undefined,
    createdAt: new Date(data.created_at).getTime(),
    updatedAt: data.updated_at ? new Date(data.updated_at).getTime() : undefined,
  };
}
