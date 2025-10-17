import { supabase } from '@/integrations/supabase/client';

export interface UploadResult {
  url: string;
  path: string;
}

export class StorageService {
  private bucketName = 'brand-assets';

  /**
   * Upload a logo file to brand's logos folder
   * Path: {brandId}/logos/{logoType}.{ext}
   */
  async uploadLogo(
    brandId: string,
    logoType: 'primary' | 'black' | 'white' | 'vertical' | 'icon' | 'horizontal',
    file: File
  ): Promise<UploadResult> {
    const extension = file.name.split('.').pop() || 'png';
    const path = `${brandId}/logos/${logoType}.${extension}`;

    const { data, error } = await supabase.storage
      .from(this.bucketName)
      .upload(path, file, {
        upsert: true,
        contentType: file.type,
      });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from(this.bucketName)
      .getPublicUrl(path);

    return {
      url: urlData.publicUrl,
      path: data.path,
    };
  }

  /**
   * Upload a generic brand asset
   * Path: {brandId}/assets/{fileName}
   */
  async uploadAsset(
    brandId: string,
    file: File,
    fileName?: string
  ): Promise<UploadResult> {
    const name = fileName || file.name;
    const path = `${brandId}/assets/${name}`;

    const { data, error } = await supabase.storage
      .from(this.bucketName)
      .upload(path, file, {
        upsert: true,
        contentType: file.type,
      });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from(this.bucketName)
      .getPublicUrl(path);

    return {
      url: urlData.publicUrl,
      path: data.path,
    };
  }

  /**
   * Delete a file from storage
   */
  async deleteFile(path: string): Promise<void> {
    const { error } = await supabase.storage
      .from(this.bucketName)
      .remove([path]);

    if (error) throw error;
  }

  /**
   * List all files in a brand's folder
   */
  async listBrandFiles(brandId: string, folder?: 'logos' | 'assets'): Promise<any[]> {
    const path = folder ? `${brandId}/${folder}` : brandId;

    const { data, error } = await supabase.storage
      .from(this.bucketName)
      .list(path);

    if (error) throw error;
    return data || [];
  }

  /**
   * Delete all files for a brand
   */
  async deleteBrandFolder(brandId: string): Promise<void> {
    const files = await this.listBrandFiles(brandId);
    const paths = files.map(file => `${brandId}/${file.name}`);

    if (paths.length > 0) {
      const { error } = await supabase.storage
        .from(this.bucketName)
        .remove(paths);

      if (error) throw error;
    }
  }
}

export const storageService = new StorageService();
