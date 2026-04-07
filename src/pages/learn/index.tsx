/**
 * Learn — workspace-level tutorials, examples, and brand education.
 *
 * Currently a stub. The full Learn hub (lessons, examples, "what is brand
 * identity") is queued in EXECUTION.md for the docs/content phase. The
 * route exists today so the new workspace sidebar has nowhere broken to
 * point.
 *
 * See docs/ux-redesign/ARCHITECTURE.md §2.4
 */
import { DashboardLayout } from '@/features/dashboard/components/DashboardLayout';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Card } from '@/components/ui/card';
import { GraduationCap, BookOpen, Sparkles, Compass } from 'lucide-react';

const lessons = [
  {
    title: 'What is a brand?',
    description: 'The fundamentals: identity, voice, and visual language.',
    icon: Compass,
    accent: 'from-violet-500 to-indigo-600',
  },
  {
    title: 'Picking colors that work',
    description: 'A practical guide to palettes, contrast, and harmony.',
    icon: Sparkles,
    accent: 'from-rose-500 to-pink-600',
  },
  {
    title: 'Typography pairings',
    description: 'How to choose fonts that feel intentional, not random.',
    icon: BookOpen,
    accent: 'from-amber-500 to-orange-600',
  },
  {
    title: 'Tour BrandOS',
    description: 'A guided walkthrough of the workspace, brand sections, and editors.',
    icon: GraduationCap,
    accent: 'from-emerald-500 to-teal-600',
  },
];

export default function LearnPage() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <PageHeader
          title="Learn"
          subtitle="Tutorials, examples, and the language of brand design — at your own pace."
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {lessons.map((lesson) => (
            <Card
              key={lesson.title}
              className="group relative overflow-hidden p-6 cursor-pointer hover:shadow-lg transition-all hover:-translate-y-0.5"
            >
              <div
                className={`absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br ${lesson.accent} opacity-10 group-hover:opacity-20 transition-opacity`}
              />
              <div
                className={`relative w-12 h-12 rounded-xl bg-gradient-to-br ${lesson.accent} flex items-center justify-center mb-4`}
              >
                <lesson.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="relative text-lg font-semibold mb-1">{lesson.title}</h3>
              <p className="relative text-sm text-muted-foreground">{lesson.description}</p>
              <p className="relative mt-3 text-xs text-muted-foreground/60">Coming soon</p>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
