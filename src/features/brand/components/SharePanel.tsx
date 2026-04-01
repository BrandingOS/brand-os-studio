import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Share2, Copy, Check, Globe, Lock, ExternalLink, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import type { Brand } from '@/shared/types/brand';

interface SharePanelProps {
  brand: Brand;
  onUpdate: (patch: Partial<Brand>) => void;
}

export function SharePanel({ brand, onUpdate }: SharePanelProps) {
  const [copied, setCopied] = useState(false);
  const [customDomain, setCustomDomain] = useState(brand.customDomain ?? '');

  const isPublic = brand.isPublic ?? false;
  const showcaseUrl = `${window.location.origin}/brand/${brand.slug}/showcase`;

  const handleTogglePublic = () => {
    const next = !isPublic;
    onUpdate({ isPublic: next });
    toast.success(next ? 'Brand showcase is now public' : 'Brand showcase is now private');
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(showcaseUrl);
      setCopied(true);
      toast.success('Link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const handleCustomDomainSave = () => {
    const trimmed = customDomain.trim();
    onUpdate({ customDomain: trimmed || undefined });
    toast.success(trimmed ? 'Custom domain saved' : 'Custom domain removed');
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Share2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">Share & Visibility</CardTitle>
              <CardDescription>
                Control who can view your brand showcase
              </CardDescription>
            </div>
          </div>
          <Badge
            variant="outline"
            className={
              isPublic
                ? 'gap-1 bg-green-100 text-green-800 border-green-200'
                : 'gap-1 bg-gray-100 text-gray-700 border-gray-200'
            }
          >
            {isPublic ? (
              <>
                <Globe className="h-3 w-3" /> Public
              </>
            ) : (
              <>
                <Lock className="h-3 w-3" /> Private
              </>
            )}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Public/Private Toggle */}
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <p className="text-sm font-medium">Public Showcase</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isPublic
                ? 'Anyone with the link can view your brand guidelines'
                : 'Only you and your team can see this brand'}
            </p>
          </div>
          <button
            role="switch"
            aria-checked={isPublic}
            onClick={handleTogglePublic}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
              isPublic ? 'bg-primary' : 'bg-gray-200'
            }`}
          >
            <span
              className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform ${
                isPublic ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Shareable URL */}
        {isPublic && (
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium mb-2">Shareable Link</p>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={showcaseUrl}
                  className="font-mono text-sm bg-muted/50"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyLink}
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Preview Link */}
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-muted-foreground"
              onClick={() => window.open(showcaseUrl, '_blank')}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open showcase in new tab
            </Button>

            {/* QR Code Placeholder */}
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-sm font-medium mb-1">QR Code</p>
              <p className="text-xs text-muted-foreground mb-3">
                Share your brand showcase via QR code
              </p>
              <div className="w-32 h-32 mx-auto rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-white">
                <p className="text-xs text-muted-foreground text-center px-2 break-all">
                  {showcaseUrl}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Custom Domain */}
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-medium">Custom Domain</p>
            <Badge variant="outline" className="gap-1 text-xs bg-amber-50 text-amber-700 border-amber-200">
              <Sparkles className="h-3 w-3" />
              Agency Plan
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Serve your brand showcase on your own domain
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="brand.yourdomain.com"
              value={customDomain}
              onChange={(e) => setCustomDomain(e.target.value)}
              className="font-mono text-sm"
              disabled
            />
            <Button variant="outline" size="sm" disabled>
              Save
            </Button>
          </div>
          <p className="text-xs text-amber-600 mt-2">
            Upgrade to the Agency plan to use custom domains.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
