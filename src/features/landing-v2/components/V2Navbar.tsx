import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hexagon, Menu, X } from 'lucide-react';

const navLinks = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#workflow' },
  { label: 'AI', href: '#intelligence' },
];

export function V2Navbar() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-[hsl(0,0%,4%)]/80 backdrop-blur-xl border-b border-white/[0.06]'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <a href="/v2" className="flex items-center gap-2.5 group">
          <Hexagon className="w-5 h-5 text-white/40 group-hover:text-white/60 transition-colors" />
          <span className="font-display font-bold text-sm text-white/80 tracking-tight">
            BrandOS
          </span>
          <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-white/[0.06] text-white/30 border border-white/[0.06]">
            v2
          </span>
        </a>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-xs font-medium text-white/35 hover:text-white/70 transition-colors tracking-wide"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-xs font-medium text-white/35 hover:text-white/60 transition-colors"
          >
            Dashboard
          </button>
          <button
            onClick={() => navigate('/onboarding')}
            className="v2-btn-primary h-8 px-5 rounded-full text-xs"
          >
            Start Free
          </button>
        </div>

        {/* Mobile menu toggle */}
        <button
          className="md:hidden w-8 h-8 flex items-center justify-center text-white/40"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-[hsl(0,0%,4%)]/95 backdrop-blur-xl border-t border-white/[0.06] px-6 py-6 space-y-4">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="block text-sm text-white/50 hover:text-white/70"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <div className="pt-3 border-t border-white/[0.06] flex flex-col gap-2">
            <button
              onClick={() => { navigate('/dashboard'); setMobileOpen(false); }}
              className="v2-btn-secondary h-10 rounded-full text-sm"
            >
              Dashboard
            </button>
            <button
              onClick={() => { navigate('/onboarding'); setMobileOpen(false); }}
              className="v2-btn-primary h-10 rounded-full text-sm"
            >
              Start Free
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
