import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Rocket, Check, Star, Users, Zap } from 'lucide-react';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Section } from '@/shared/components/Section';
import { Card } from '@/shared/components/Card';

const Badge = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex items-center rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
    {children}
  </span>
);

export default function LandingPage() {
  useEffect(() => {
    const elements = document.querySelectorAll('[data-animate]');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-fade-in');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* Hero Section */}
      <Section variant="secondary">
        <div className="mx-auto text-center max-w-3xl my-16" data-animate>
          <Badge>
            One-time setup <span className="arrow-pulse"> → </span> Endless consistency
          </Badge>
          <h1 className="mt-4 font-display text-4xl sm:text-5xl md:text-6xl leading-tight font-extrabold">
            Save hours of repetitive boring work
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Create your brand system once—our platform syncs it across every asset automatically.
          </p>
          <div className="mt-8 mx-auto max-w-md">
            <div className="flex flex-col md:flex-row items-center gap-2 justify-center">
              <Input
                className="w-full md:w-64 h-12 px-5 text-center"
                placeholder="Enter your brand name"
                shape="pill"
                aria-label="Brand name"
              />
              <Button
                variant="hero"
                shape="pill"
                className="h-12 px-6 w-full md:w-auto"
                asChild
              >
                <Link to="/onboarding">Start Now</Link>
              </Button>
            </div>
          </div>
        </div>
      </Section>

      {/* Features Section */}
      <Section>
        <div data-animate className="text-center mb-12">
          <h2 className="text-3xl font-semibold">Before Brand OS — Chaos. After — Control.</h2>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: Users, title: "Assets Everywhere", desc: "Logos in email, fonts on a drive, colors in your head." },
            { icon: Zap, title: "Inconsistent Look", desc: "Each designer interprets your brand differently." },
            { icon: Star, title: "Rework on Repeat", desc: "New color? Change it in 20 files manually." }
          ].map((feature, index) => (
            <Card key={index} data-animate className="group transition-transform hover:-translate-y-1.5">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <feature.icon className="h-5 w-5 group-hover:animate-micro-bounce" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.desc}</p>
            </Card>
          ))}
        </div>
      </Section>

      {/* Stats Section */}
      <Section variant="secondary">
        <div className="grid gap-8 sm:grid-cols-3">
          {[
            { value: "80%", label: "Brand Recognition Boost" },
            { value: "10–20%", label: "Revenue Growth through Consistency" },
            { value: "87%", label: "Consumer Trust for Consistent Brands" }
          ].map((stat, index) => (
            <div key={index} data-animate className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* Pricing Section */}
      <Section>
        <div data-animate className="text-center mb-12">
          <h2 className="text-3xl font-semibold">Simple, Transparent Pricing</h2>
          <p className="mt-3 text-lg text-muted-foreground">
            Start free, upgrade when you need more power
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
          {[
            {
              name: 'Free',
              price: '$0',
              features: ['1 Brand Kit', 'Basic Guidelines', 'Download Assets', 'Community Support']
            },
            {
              name: 'Pro',
              price: '$29',
              features: ['Unlimited Brands', 'Advanced Editor', 'Team Collaboration', 'Priority Support']
            },
            {
              name: 'Enterprise',
              price: 'Custom',
              features: ['White Label', 'API Access', 'Custom Integrations', 'Dedicated Manager']
            }
          ].map((plan, index) => (
            <Card key={index} data-animate className={index === 1 ? 'border-primary' : ''}>
              <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
              <div className="text-3xl font-bold mb-4">{plan.price}{plan.price !== 'Custom' && '/mo'}</div>
              <ul className="space-y-2 mb-6">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button className="w-full" variant={index === 1 ? 'default' : 'outline'}>
                Get Started
              </Button>
            </Card>
          ))}
        </div>
      </Section>

      {/* Final CTA */}
      <Section variant="secondary">
        <div className="text-center">
          <h2 data-animate className="text-3xl font-semibold">
            Brand Once. Use Forever.
          </h2>
          <p className="mt-3 text-lg text-muted-foreground" data-animate>
            Upload your brand today — never worry about consistency again.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3" data-animate>
            <Button variant="hero" shape="pill" className="px-6 py-3" asChild>
              <Link to="/onboarding">
                <Rocket className="mr-2" /> Start Free
              </Link>
            </Button>
            <Button variant="outline" shape="pill" className="px-6 py-3">
              Watch Demo
            </Button>
          </div>
        </div>
      </Section>
    </>
  );
}