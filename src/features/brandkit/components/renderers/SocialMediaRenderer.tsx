import type { Brand } from '@/shared/types/brand';
import { BrandLogo } from './BrandLogo';

interface SocialMediaRendererProps {
  brand: Brand;
  templateIndex: number;
  format: 'square' | 'story' | 'cover';
}

export function SocialMediaRenderer({ brand, templateIndex, format }: SocialMediaRendererProps) {
  const p = brand.primaryColor;
  const s = brand.secondaryColor || '#00D4AA';

  if (format === 'story') return renderStory(brand, templateIndex, p, s);
  if (format === 'cover') return renderCover(brand, templateIndex, p, s);
  return renderSquarePost(brand, templateIndex, p, s);
}

function renderSquarePost(brand: Brand, idx: number, p: string, s: string) {
  const posts = [
    // 0: Quote card
    (
      <div className="w-full h-full flex flex-col justify-between p-[10%]" style={{ backgroundColor: p }}>
        <BrandLogo brand={brand} size="xs" color="#ffffff" />
        <div>
          <div className="text-[7px] text-white font-semibold leading-tight">"The future belongs to those who build with clarity."</div>
          <div className="mt-1 w-6 h-[1px]" style={{ backgroundColor: s }} />
        </div>
        <div className="text-[4px] text-white/50 uppercase tracking-widest">{brand.name.toLowerCase()}.com</div>
      </div>
    ),
    // 1: Stats highlight
    (
      <div className="w-full h-full bg-white flex flex-col justify-center items-center p-[10%] relative overflow-hidden">
        <div className="text-[5px] font-semibold uppercase tracking-wider mb-1" style={{ color: p }}>{brand.name}</div>
        <div className="text-[16px] font-bold text-gray-900 leading-none">94%</div>
        <div className="text-[5px] text-gray-500 mt-0.5 text-center">of our users report improved financial clarity</div>
        <div className="absolute bottom-0 left-0 w-full h-1" style={{ background: `linear-gradient(90deg, ${p}, ${s})` }} />
      </div>
    ),
    // 2: Feature announcement
    (
      <div className="w-full h-full flex flex-col justify-between p-[10%] relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${p}, ${p}dd)` }}>
        <div className="text-[4px] text-white/60 uppercase tracking-widest font-semibold">New Feature</div>
        <div>
          <div className="text-[8px] text-white font-bold leading-tight">Smart Budget<br/>Allocation</div>
          <div className="text-[5px] text-white/70 mt-1">Split expenses across teams automatically.</div>
        </div>
        <div className="flex items-center gap-1">
          <div className="px-1.5 py-0.5 rounded-sm text-[4px] font-semibold text-white" style={{ backgroundColor: s }}>Learn More</div>
        </div>
        <div className="absolute -bottom-4 -right-4 w-12 h-12 rounded-full" style={{ backgroundColor: s, opacity: 0.15 }} />
      </div>
    ),
    // 3: Tip card
    (
      <div className="w-full h-full bg-gray-50 flex flex-col justify-between p-[10%]">
        <div className="flex items-center gap-1">
          <BrandLogo brand={brand} variant="monogram" size="xs" />
          <div className="text-[4px] font-semibold text-gray-400 uppercase tracking-wider">Pro Tip</div>
        </div>
        <div>
          <div className="text-[7px] font-bold text-gray-900 leading-tight">Set recurring<br/>budget alerts</div>
          <div className="text-[5px] text-gray-500 mt-1">Never miss a budget threshold again. Get notified before you overspend.</div>
        </div>
        <div className="flex gap-1">
          <div className="w-6 h-[2px] rounded-full" style={{ backgroundColor: p }} />
          <div className="w-2 h-[2px] rounded-full bg-gray-200" />
          <div className="w-2 h-[2px] rounded-full bg-gray-200" />
        </div>
      </div>
    ),
    // 4: Gradient bold
    (
      <div className="w-full h-full flex items-center justify-center relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${p}, ${s})` }}>
        <div className="text-center">
          <div className="text-[10px] font-bold text-white leading-none">Grow<br/>Smarter</div>
          <div className="mt-1 text-[4px] text-white/70">{brand.name} — Financial Intelligence</div>
        </div>
      </div>
    ),
    // 5: Team/culture
    (
      <div className="w-full h-full bg-white flex flex-col justify-between p-[10%] relative">
        <BrandLogo brand={brand} size="xs" />
        <div>
          <div className="text-[4px] uppercase tracking-widest font-semibold mb-0.5" style={{ color: s }}>We're hiring</div>
          <div className="text-[8px] font-bold text-gray-900 leading-tight">Join the team<br/>building the future<br/>of finance.</div>
        </div>
        <div className="text-[4px] text-gray-400">{brand.name.toLowerCase()}.com/careers</div>
      </div>
    ),
    // 6: Minimal data
    (
      <div className="w-full h-full flex flex-col justify-center items-center p-[10%]" style={{ backgroundColor: '#0F172A' }}>
        <div className="text-[4px] text-gray-500 uppercase tracking-widest mb-1">Revenue Growth</div>
        <div className="flex items-end gap-[2px] h-8">
          {[3, 4, 3.5, 5, 6, 5.5, 7, 8, 7.5, 9, 10, 12].map((h, i) => (
            <div key={i} className="w-1.5 rounded-t-sm" style={{ height: `${h * 2.5}px`, backgroundColor: i > 9 ? s : `${p}90` }} />
          ))}
        </div>
        <div className="mt-1.5">
          <BrandLogo brand={brand} size="xs" color="#ffffff" />
        </div>
      </div>
    ),
    // 7: Testimonial
    (
      <div className="w-full h-full flex flex-col justify-between p-[10%]" style={{ backgroundColor: `${p}08` }}>
        <div className="text-[12px] leading-none" style={{ color: p }}>"</div>
        <div className="text-[6px] text-gray-800 font-medium leading-tight -mt-2">
          {brand.name} transformed how we handle our quarterly budgets. What took days now takes minutes.
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: `${p}20` }} />
          <div>
            <div className="text-[4.5px] font-semibold text-gray-800">Sarah Chen</div>
            <div className="text-[3.5px] text-gray-500">CFO, TechCorp</div>
          </div>
        </div>
      </div>
    ),
  ];
  return posts[idx % posts.length];
}

function renderStory(brand: Brand, idx: number, p: string, s: string) {
  const stories = [
    // 0: Full color headline
    (
      <div className="w-full h-full flex flex-col justify-between p-[8%]" style={{ backgroundColor: p }}>
        <BrandLogo brand={brand} size="sm" color="#ffffff" />
        <div>
          <div className="text-[9px] text-white font-bold leading-tight">Your money.<br/>Your rules.<br/>Your clarity.</div>
          <div className="mt-2 px-2 py-0.5 rounded-sm text-[4px] font-semibold inline-block" style={{ backgroundColor: s, color: '#fff' }}>Get Started</div>
        </div>
        <div className="text-[3.5px] text-white/40">{brand.name.toLowerCase()}.com</div>
      </div>
    ),
    // 1: Minimal white
    (
      <div className="w-full h-full bg-white flex flex-col justify-center items-center p-[10%] relative">
        <BrandLogo brand={brand} variant="monogram" size="md" />
        <div className="mt-2 text-[8px] font-bold text-gray-900 text-center leading-tight">Financial<br/>Intelligence</div>
        <div className="mt-1 text-[4px] text-gray-400">Swipe up to learn more</div>
        <div className="absolute bottom-0 left-0 w-full h-0.5" style={{ backgroundColor: p }} />
      </div>
    ),
    // 2: Gradient card
    (
      <div className="w-full h-full flex flex-col justify-between p-[8%] relative overflow-hidden" style={{ background: `linear-gradient(180deg, ${p}, #0F172A)` }}>
        <BrandLogo brand={brand} size="xs" color="#ffffff" />
        <div>
          <div className="text-[4px] uppercase tracking-widest text-white/50 font-semibold mb-0.5">Feature Spotlight</div>
          <div className="text-[8px] text-white font-bold leading-tight">AI-Powered<br/>Forecasting</div>
          <div className="text-[4.5px] text-white/60 mt-1">Predict your cash flow<br/>30 days ahead.</div>
        </div>
        <div className="w-8 h-[2px] rounded-full" style={{ backgroundColor: s }} />
      </div>
    ),
    // 3: Stats story
    (
      <div className="w-full h-full flex flex-col justify-center items-center p-[10%]" style={{ backgroundColor: '#0F172A' }}>
        <div className="text-[4px] uppercase tracking-widest font-semibold mb-1" style={{ color: s }}>Year in Review</div>
        <div className="text-[18px] font-bold text-white leading-none">$2.4B</div>
        <div className="text-[5px] text-gray-400 mt-0.5">processed this quarter</div>
        <div className="mt-3 flex gap-2">
          <div className="text-center">
            <div className="text-[8px] font-bold text-white">50K+</div>
            <div className="text-[3.5px] text-gray-500">Businesses</div>
          </div>
          <div className="text-center">
            <div className="text-[8px] font-bold text-white">99.9%</div>
            <div className="text-[3.5px] text-gray-500">Uptime</div>
          </div>
        </div>
        <div className="mt-3">
          <BrandLogo brand={brand} size="xs" color="#ffffff" />
        </div>
      </div>
    ),
    // 4: Bold CTA
    (
      <div className="w-full h-full flex flex-col justify-between p-[8%]" style={{ background: `linear-gradient(135deg, ${s}, ${p})` }}>
        <div />
        <div>
          <div className="text-[10px] text-white font-bold leading-tight">Start free.<br/>Scale fast.</div>
          <div className="mt-1.5 px-2 py-0.5 bg-white rounded-sm text-[4px] font-semibold inline-block" style={{ color: p }}>Try {brand.name} Free</div>
        </div>
        <BrandLogo brand={brand} size="xs" color="#ffffff" />
      </div>
    ),
  ];
  return stories[idx % stories.length];
}

function renderCover(brand: Brand, idx: number, p: string, s: string) {
  const covers = [
    // 0: Gradient with tagline
    (
      <div className="w-full h-full flex items-center justify-between px-[8%]" style={{ background: `linear-gradient(135deg, ${p}, ${p}cc)` }}>
        <div>
          <BrandLogo brand={brand} size="md" color="#ffffff" />
          <div className="text-[5px] text-white/60 mt-1">Financial Intelligence for Modern Business</div>
        </div>
        <div className="flex gap-[2px]">
          {[s, p, s].map((c, i) => (
            <div key={i} className="w-1 h-6 rounded-full" style={{ backgroundColor: c, opacity: 0.3 + i * 0.2 }} />
          ))}
        </div>
      </div>
    ),
    // 1: Minimal white
    (
      <div className="w-full h-full bg-white flex items-center justify-center relative">
        <BrandLogo brand={brand} size="lg" />
        <div className="absolute bottom-[10%] text-[4px] text-gray-400">{brand.name.toLowerCase()}.com</div>
        <div className="absolute top-0 left-0 w-full h-[2px]" style={{ backgroundColor: p }} />
      </div>
    ),
    // 2: Split color
    (
      <div className="w-full h-full flex overflow-hidden">
        <div className="w-1/2 flex items-center justify-center" style={{ backgroundColor: p }}>
          <BrandLogo brand={brand} size="md" color="#ffffff" />
        </div>
        <div className="w-1/2 flex items-center justify-center bg-white">
          <div className="text-[6px] font-semibold text-gray-800 text-center leading-tight">Smart Finance.<br/>Simple Tools.</div>
        </div>
      </div>
    ),
    // 3: Dark premium
    (
      <div className="w-full h-full flex items-center px-[8%]" style={{ backgroundColor: '#0F172A' }}>
        <div className="flex items-center gap-3 w-full justify-between">
          <BrandLogo brand={brand} size="md" color="#ffffff" />
          <div className="flex gap-2">
            {['Clarity', 'Trust', 'Growth'].map((v) => (
              <div key={v} className="text-[4px] text-gray-500 uppercase tracking-wider">{v}</div>
            ))}
          </div>
        </div>
        <div className="absolute bottom-0 left-0 w-full h-0.5" style={{ background: `linear-gradient(90deg, ${p}, ${s})` }} />
      </div>
    ),
  ];
  return covers[idx % covers.length];
}
