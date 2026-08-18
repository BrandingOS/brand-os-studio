/**
 * Footer — continues the ink chapter. One hairline, one lockup,
 * one line of Doto metadata. Nothing else.
 */
import { LogoMark } from '@/components/brand/LogoMark';
import { Wordmark } from '@/components/brand/Wordmark';

export function FooterNext() {
  return (
    <footer className="border-t border-white/10 bg-panel text-panel-foreground">
      <div className="container-wide flex flex-col items-start justify-between gap-8 py-12 md:flex-row md:items-center">
        <a href="#" aria-label="BrandingOS — home" className="flex items-center gap-3">
          <LogoMark className="h-[20px] w-[20px]" />
          <Wordmark className="h-[12px] translate-y-[1px]" />
        </a>

        <span className="microlabel opacity-55">
          One core. Infinite formations.
        </span>

        <span className="microlabel opacity-55">© 2026 BrandingOS</span>
      </div>
    </footer>
  );
}
