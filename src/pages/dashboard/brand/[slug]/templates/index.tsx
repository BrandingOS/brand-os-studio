/**
 * Brand Templates — stub destination for the AppRail "Templates" item.
 *
 * The brand-scoped templates feature (per-brand template library, save as
 * template, etc.) is not yet built. This page exists so the AppRail item
 * has a real, in-context destination — the user stays inside the brand
 * scope and is told what's coming.
 *
 * The workspace-level marketplace at /templates is a different surface
 * (cross-brand catalog) and stays where it is.
 */
import { useParams, useNavigate } from 'react-router-dom';
import { BrandLayout } from '@/features/brand';
import { useBrandBySlug } from '@/shared/hooks/useBrandBySlug';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LayoutTemplate, ExternalLink } from 'lucide-react';

export default function BrandTemplatesPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { brand } = useBrandBySlug(slug);

  return (
    <BrandLayout brandName={brand?.name}>
      <PageHeader
        title="Templates"
        subtitle="Templates saved to this brand"
      />

      <Card className="p-10 mt-6 flex flex-col items-center text-center gap-4 bg-muted/20">
        <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
          <LayoutTemplate className="h-7 w-7 text-primary" />
        </div>
        <div className="max-w-md space-y-1">
          <h3 className="text-lg font-semibold">Brand templates are coming</h3>
          <p className="text-sm text-muted-foreground">
            Soon you'll be able to save designs as reusable templates inside
            this brand and remix them with the brand's own colors, type, and
            logo. Until then, browse the cross-brand marketplace.
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/templates')}>
          <ExternalLink className="h-4 w-4 mr-2" />
          Open Templates Marketplace
        </Button>
      </Card>
    </BrandLayout>
  );
}
