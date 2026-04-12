import { supabase } from '@/integrations/supabase/client';
import type { ICommentsService, CommentData, CreateCommentInput } from '@/core/types/services';

export class SupabaseCommentsService implements ICommentsService {
  async listForPage(brandId: string, pageKey: string): Promise<CommentData[]> {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('brand_id', brandId)
      .eq('page_key', pageKey)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data ?? []).map(mapComment);
  }

  async create(input: CreateCommentInput): Promise<CommentData> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('comments')
      .insert({
        thread_id: input.threadId,
        brand_id: input.brandId,
        page_key: input.pageKey,
        anchor: input.anchor,
        author_id: user.id,
        author_name: input.authorName,
        author_email: input.authorEmail,
        body: input.body,
        mentions: input.mentions || [],
        parent_id: input.parentId,
      })
      .select()
      .single();

    if (error) throw error;
    return mapComment(data);
  }

  async resolve(threadId: string): Promise<void> {
    const { error } = await supabase
      .from('comments')
      .update({ resolved: true })
      .eq('thread_id', threadId);

    if (error) throw error;
  }

  async reopen(threadId: string): Promise<void> {
    const { error } = await supabase
      .from('comments')
      .update({ resolved: false })
      .eq('thread_id', threadId);

    if (error) throw error;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
}

function mapComment(data: any): CommentData {
  return {
    id: data.id,
    threadId: data.thread_id,
    brandId: data.brand_id,
    pageKey: data.page_key,
    anchor: data.anchor || undefined,
    authorId: data.author_id,
    authorName: data.author_name,
    authorEmail: data.author_email || undefined,
    body: data.body,
    mentions: data.mentions || [],
    parentId: data.parent_id || undefined,
    resolved: data.resolved || false,
    createdAt: new Date(data.created_at).getTime(),
    updatedAt: data.updated_at ? new Date(data.updated_at).getTime() : undefined,
  };
}
