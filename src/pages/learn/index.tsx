/**
 * Learn — workspace-level tutorials and brand education.
 *
 * 8 lessons covering brand fundamentals, color theory, typography,
 * and BrandOS product walkthrough. Progress tracked in localStorage.
 */
import { useState } from 'react';
import { DashboardLayout } from '@/features/dashboard/components/DashboardLayout';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  GraduationCap, BookOpen, Sparkles, Compass, Palette, Type, Eye,
  MessageSquare, ChevronRight, CheckCircle2, Clock, ArrowLeft, X,
} from 'lucide-react';

interface Lesson {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  duration: string;
  content: string[];
}

const LESSONS: Lesson[] = [
  {
    id: 'what-is-a-brand', title: 'What is a brand?',
    description: 'The fundamentals: identity, voice, and visual language.',
    icon: Compass, accent: 'from-violet-500 to-indigo-600', duration: '5 min',
    content: [
      'A brand is more than a logo. It\'s the complete experience people have with your company — the emotions, expectations, and associations that form in their minds.',
      'Brand identity has three pillars: Visual (logo, colors, typography), Verbal (tone, messaging, taglines), and Strategic (mission, values, positioning).',
      'Consistency is the foundation. Research shows that consistent brand presentation across all platforms increases revenue by up to 23%. Every touchpoint — from your website to your business card — should feel like it comes from the same source.',
      'Your brand is a promise. It tells people what to expect from you. When that promise is clear and consistently delivered, trust forms. Trust drives loyalty. Loyalty drives growth.',
      'Start by asking: What do we stand for? Who are we talking to? How do we want them to feel? The answers become your brand strategy — the foundation everything else builds on.',
    ],
  },
  {
    id: 'color-theory', title: 'Picking colors that work',
    description: 'A practical guide to palettes, contrast, and harmony.',
    icon: Palette, accent: 'from-rose-500 to-pink-600', duration: '7 min',
    content: [
      'Color is the first thing people notice about your brand. Studies show that color increases brand recognition by up to 80%. Choose intentionally.',
      'Start with psychology: Blue conveys trust (finance, tech). Red signals energy and urgency (food, retail). Green suggests growth and nature. Purple implies creativity and luxury. Orange feels friendly and accessible.',
      'Build a palette with hierarchy: Primary (60% usage — your main brand color), Secondary (30% — complementary or neutral), Accent (10% — calls to action, highlights).',
      'Contrast matters for accessibility. WCAG AA requires a 4.5:1 contrast ratio for normal text. Use BrandOS\'s built-in contrast checker on the Analytics page to verify your colors pass.',
      'Test your palette in context: Will it work on a white website? A dark app? A printed business card? A social media post? Colors that look great on screen may need adjustment for print (RGB to CMYK).',
      'Limit your palette. The most iconic brands use 2-3 colors max. Coca-Cola is red and white. Spotify is green and black. Simplicity is memorable.',
    ],
  },
  {
    id: 'typography', title: 'Typography pairings',
    description: 'How to choose fonts that feel intentional, not random.',
    icon: Type, accent: 'from-amber-500 to-orange-600', duration: '6 min',
    content: [
      'Typography is the voice of your visual identity. A serif font says "established and trustworthy." A geometric sans says "modern and clean." A rounded sans says "friendly and approachable."',
      'The golden rule of font pairing: contrast with purpose. Pair a serif heading with a sans-serif body, or a bold display face with a clean text face. Never pair two similar fonts — it looks like a mistake.',
      'Hierarchy through type: Use 3 levels maximum. Display (headings, hero text), Body (paragraphs, descriptions), and UI (buttons, labels, captions). Each should be instantly distinguishable.',
      'Size matters: body text should be 16-18px on screen. Headings should be at least 1.5x body size. Line height should be 1.4-1.6 for body text for comfortable reading.',
      'Stick to 2 font families. One for headings, one for body. Using more creates visual chaos and slows page load. Google Fonts and Adobe Fonts both offer free, high-quality options.',
    ],
  },
  {
    id: 'brand-voice', title: 'Finding your brand voice',
    description: 'How to sound like yourself, consistently, everywhere.',
    icon: MessageSquare, accent: 'from-sky-500 to-blue-600', duration: '5 min',
    content: [
      'Your brand voice is how you sound in writing. It\'s the personality behind every email, social post, headline, and error message. It should be as recognizable as your logo.',
      'Define voice with 3-4 adjectives: "Bold, witty, warm" or "Professional, clear, empathetic." These become your voice pillars — every piece of writing should reflect at least two of them.',
      'Voice stays constant; tone adapts. Your voice is always "friendly," but your tone shifts from "excited" on a product launch to "empathetic" in a support response.',
      'Create a do/don\'t guide: "We say \'Hey there!\' not \'Dear valued customer.\'" "We use contractions." "We never use jargon without explaining it." Concrete examples beat abstract rules.',
      'Audit everything: Read your website, emails, social posts, and error messages aloud. Do they all sound like the same person? If not, your voice needs tightening.',
    ],
  },
  {
    id: 'logo-design', title: 'Logo design principles',
    description: 'What makes a logo work — simplicity, versatility, and meaning.',
    icon: Eye, accent: 'from-emerald-500 to-teal-600', duration: '6 min',
    content: [
      'A great logo is simple enough to work at 16px (favicon) and beautiful enough to work at 16 feet (billboard). If your logo doesn\'t work in black and white, the color is doing all the work.',
      'The best logos are built on a concept — not decoration. The FedEx arrow, the Amazon smile, the Spartan Golf Club golfer. Meaning makes a logo memorable.',
      'You need variants: Full logo (horizontal), stacked/vertical, icon-only, wordmark-only, dark-on-light, light-on-dark. BrandOS generates these automatically in the Logo Files module.',
      'Clear space: Every logo needs breathing room. Define a minimum clear space (usually the height of one letter in your wordmark) and enforce it everywhere.',
      'Test at every size: Profile picture (32px), app icon (512px), business card, billboard, embroidery. A logo that only works at one size isn\'t finished.',
    ],
  },
  {
    id: 'brand-strategy', title: 'Brand strategy basics',
    description: 'Mission, vision, values, and positioning — the strategic core.',
    icon: Sparkles, accent: 'from-fuchsia-500 to-purple-600', duration: '8 min',
    content: [
      'Brand strategy is the "why" behind everything. It answers: Why do we exist? Who do we serve? How are we different? What do we believe in? Without strategy, design is just decoration.',
      'Mission = what you do today. Vision = where you\'re going. Values = how you behave along the way. Keep each to one sentence. If you can\'t, you haven\'t distilled it enough.',
      'Positioning is your place in the customer\'s mind relative to alternatives. "The affordable luxury option" or "The fastest tool for small teams." Own one clear position.',
      'Know your audience deeply: demographics (age, location, income) + psychographics (values, fears, aspirations). The better you know them, the more precisely you can speak to them.',
      'Strategy should constrain, not just inspire. If your strategy doesn\'t help you say "no" to off-brand ideas, it isn\'t specific enough.',
      'Review quarterly. Markets shift, audiences evolve, products pivot. Your strategy should be alive, not laminated on a wall.',
    ],
  },
  {
    id: 'tour-brandos', title: 'Tour BrandOS',
    description: 'A guided walkthrough of the workspace, brand sections, and editors.',
    icon: GraduationCap, accent: 'from-cyan-500 to-blue-600', duration: '4 min',
    content: [
      'BrandOS is organized in three scopes: Workspace (your home base, all brands), Brand (one brand\'s identity and assets), and Editor (focused creation tools).',
      'The Brand scope has five sections: Overview (your brand at a glance), Identity (logo, colors, type, voice, strategy), Assets (categorized deliverables), Guidelines (the brand book), and Share (public links and exports).',
      'Identity is a tabbed page — Logo, Colors, Typography, Voice, Strategy. Each tab inline-mounts a module from the Brand Kit. Changes auto-save.',
      'The Brand Kit (/kit) is the power user\'s hub with 18 modules: from business cards to social media templates, from QR codes to brand guides. Every template can be customized and exported.',
      'Use the activity feed (/dashboard/activity) to track everything that happens across your brands. The notification bell in the topbar alerts you to new comments, approvals, and team actions.',
    ],
  },
  {
    id: 'consistency-guide', title: 'Building brand consistency',
    description: 'How to maintain a cohesive brand across every touchpoint.',
    icon: BookOpen, accent: 'from-orange-500 to-red-600', duration: '5 min',
    content: [
      'Consistency doesn\'t mean repetition. It means every brand expression — however creative — is recognizably "you." Think of how Apple\'s product packaging, website, retail stores, and ads all feel unified without being identical.',
      'Create a single source of truth. BrandOS\'s guidelines page is your canonical brand book. When anyone asks "what font do we use?" or "what\'s our primary color?" — point them there.',
      'Define rules for the common scenarios: email signatures, social media posts, presentation decks, print materials. Templates are your best friend — they encode decisions so people don\'t have to guess.',
      'Audit regularly. Set a monthly reminder to review your public-facing materials. Are colors drifting? Are old logos still in use? Are partner sites using outdated assets? Fix drift before it compounds.',
      'Empower your team. Brand guidelines that sit in a PDF nobody reads are useless. Share your BrandOS showcase link with everyone — designers, marketers, partners, vendors. Make it easy to get it right.',
    ],
  },
];

const PROGRESS_KEY = 'brandos-learn-progress';

function getProgress(): Record<string, boolean> {
  try { return JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}'); }
  catch { return {}; }
}
function setProgress(id: string, done: boolean) {
  const p = getProgress();
  p[id] = done;
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
}

export default function LearnPage() {
  const [progress, setProgressState] = useState(getProgress);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const completedCount = LESSONS.filter((l) => progress[l.id]).length;

  const markComplete = (id: string) => {
    setProgress(id, true);
    setProgressState(getProgress());
  };

  if (activeLesson) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto py-8 px-4">
          <button onClick={() => setActiveLesson(null)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to lessons
          </button>
          <div className={`h-2 w-full rounded-full bg-gradient-to-r ${activeLesson.accent} mb-8`} />
          <h1 className="text-2xl font-bold mb-2">{activeLesson.title}</h1>
          <div className="flex items-center gap-3 mb-8 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{activeLesson.duration} read</span>
            {progress[activeLesson.id] && <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 gap-1"><CheckCircle2 className="h-3 w-3" />Completed</Badge>}
          </div>
          <div className="prose prose-sm dark:prose-invert max-w-none space-y-4">
            {activeLesson.content.map((para, i) => (
              <p key={i} className="text-sm leading-relaxed text-foreground/80">{para}</p>
            ))}
          </div>
          <div className="mt-10 flex items-center gap-3">
            {!progress[activeLesson.id] ? (
              <Button onClick={() => markComplete(activeLesson.id)} className="gap-1.5">
                <CheckCircle2 className="h-4 w-4" /> Mark as complete
              </Button>
            ) : (
              <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 gap-1 py-2 px-4">
                <CheckCircle2 className="h-4 w-4" /> Completed
              </Badge>
            )}
            <Button variant="outline" onClick={() => setActiveLesson(null)}>Back to lessons</Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <PageHeader
          title="Learn"
          subtitle="Tutorials, examples, and the language of brand design — at your own pace."
        />

        {/* Progress bar */}
        <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
          <GraduationCap className="h-6 w-6 text-primary shrink-0" />
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium">{completedCount} of {LESSONS.length} lessons completed</span>
              <span className="text-xs text-muted-foreground">{Math.round((completedCount / LESSONS.length) * 100)}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all" style={{ width: `${(completedCount / LESSONS.length) * 100}%` }} />
            </div>
          </div>
        </div>

        {/* Lesson grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {LESSONS.map((lesson) => {
            const Icon = lesson.icon;
            const done = progress[lesson.id];
            return (
              <Card
                key={lesson.id}
                className="group relative overflow-hidden p-6 cursor-pointer hover:shadow-lg transition-all hover:-translate-y-0.5"
                onClick={() => setActiveLesson(lesson)}
              >
                <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br ${lesson.accent} opacity-10 group-hover:opacity-20 transition-opacity`} />
                <div className="flex items-start justify-between mb-4">
                  <div className={`relative w-12 h-12 rounded-xl bg-gradient-to-br ${lesson.accent} flex items-center justify-center`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{lesson.duration}</span>
                    {done && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                  </div>
                </div>
                <h3 className="relative text-lg font-semibold mb-1">{lesson.title}</h3>
                <p className="relative text-sm text-muted-foreground">{lesson.description}</p>
                <div className="relative mt-3 flex items-center text-xs text-primary font-medium group-hover:underline">
                  {done ? 'Read again' : 'Start lesson'} <ChevronRight className="h-3 w-3 ml-0.5" />
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
