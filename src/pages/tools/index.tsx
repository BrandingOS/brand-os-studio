/**
 * /tools — public directory page that lists every tool the platform
 * exposes for free use. Doubles as an SEO hub: each tool is a link
 * to its own landing page.
 */
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { listTools } from '@/features/tools/core';
import { useEffect } from 'react';

export default function ToolsDirectoryPage() {
  const tools = listTools();

  useEffect(() => {
    const prev = document.title;
    document.title = 'Free brand tools — BrandOS';
    return () => {
      document.title = prev;
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <header className="border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <a href="/" className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="h-4 w-4 text-primary" />
            BrandOS
          </a>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 py-16">
        <h1 className="text-balance text-4xl font-bold tracking-tight">Free brand tools</h1>
        <p className="mt-2 max-w-2xl text-pretty text-muted-foreground">
          Free, focused tools from the BrandOS suite. Use any of them
          without an account — sign up only when you want to save your
          work or unlock advanced exports.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {tools.map((tool) => {
            const Icon = tool.Icon;
            return (
              <Link
                key={tool.slug}
                to={`/tools/${tool.slug}`}
                className="group rounded-xl border bg-card p-5 transition-all hover:border-primary hover:shadow-md"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="font-semibold">{tool.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{tool.tagline}</p>
                <div className="mt-3 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                  Open tool →
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
