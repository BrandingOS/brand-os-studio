import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Check, Crown, Briefcase } from "lucide-react";

export default function Pricing() {
  return (
    <section id="pricing" className="section bg-dot-grid">
      <div className="container-tight">
        <div className="text-center" data-animate>
          <h2 className="text-3xl font-semibold">Plans That Grow With Your Brand</h2>
          <p className="mt-2 text-muted-foreground">From your first idea to a global presence — we’ve got you covered.</p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {/* Free */}
          <div className="rounded-2xl border p-6 card-soft" data-animate>
            <h3 className="text-xl font-semibold">Free</h3>
            <div className="mt-2 text-3xl font-semibold">$0 <span className="text-sm font-normal text-muted-foreground">/month</span></div>
            <ul className="mt-4 space-y-2 text-sm">
              <li className="flex items-center gap-2"><Check className="h-4 w-4"/> 1 Brand Project</li>
              <li className="flex items-center gap-2"><Check className="h-4 w-4"/> Live Brand Guidelines</li>
              <li className="flex items-center gap-2"><Check className="h-4 w-4"/> PDF Export</li>
              <li className="flex items-center gap-2"><Check className="h-4 w-4"/> Shareable Guideline Link</li>
            </ul>
            <Button variant="hero" shape="pill" className="mt-6 w-full">Start for Free</Button>
            <p className="mt-2 text-xs text-muted-foreground">Perfect for testing and small personal projects.</p>
          </div>

          {/* Pro */}
          <div className="rounded-2xl border p-6 glass-surface shadow-elegant relative" data-animate>
            <div className="absolute -top-3 left-6 rounded-full bg-secondary px-3 py-1 text-xs">Best Value</div>
            <h3 className="text-xl font-semibold inline-flex items-center gap-2"><Crown className="h-5 w-5"/> Pro</h3>
            <div className="mt-2 text-3xl font-semibold">
              $19 <span className="text-sm font-normal text-muted-foreground">/month</span>
            </div>
            <ul className="mt-4 space-y-2 text-sm">
              <li className="flex items-center gap-2"><Check className="h-4 w-4"/> 5 Brand Projects</li>
              <li className="flex items-center gap-2"><Check className="h-4 w-4"/> Full Features</li>
              <li className="flex items-center gap-2"><Check className="h-4 w-4"/> PDF + ZIP Export</li>
              <li className="flex items-center gap-2"><Check className="h-4 w-4"/> Collaboration & Roles</li>
              <li className="flex items-center gap-2"><Check className="h-4 w-4"/> Public Showcase</li>
            </ul>
            <Button variant="hero" shape="pill" className="mt-6 w-full cta-glow">Get Pro</Button>
            <p className="mt-2 text-xs text-muted-foreground">For startups & creators who want everything in one OS.</p>
          </div>

          {/* Agency */}
          <div className="rounded-2xl border p-6 card-soft" data-animate>
            <h3 className="text-xl font-semibold inline-flex items-center gap-2"><Briefcase className="h-5 w-5"/> Agency</h3>
            <div className="mt-2 text-3xl font-semibold">$49 <span className="text-sm font-normal text-muted-foreground">/month</span></div>
            <ul className="mt-4 space-y-2 text-sm">
              <li className="flex items-center gap-2"><Check className="h-4 w-4"/> Unlimited Brands</li>
              <li className="flex items-center gap-2"><Check className="h-4 w-4"/> All Pro Features</li>
              <li className="flex items-center gap-2"><Check className="h-4 w-4"/> Custom Domain for Guidelines</li>
              <li className="flex items-center gap-2"><Check className="h-4 w-4"/> Priority Support & SLA</li>
            </ul>
            <Button variant="outline" shape="pill" className="mt-6 w-full">Get Agency</Button>
            <p className="mt-2 text-xs text-muted-foreground">Designed for agencies and enterprise workflows.</p>
          </div>
        </div>

        <div className="mt-8 text-center text-sm text-muted-foreground" data-animate>
          “We saved 20+ hours per month since switching to BrandingOS” — Agency Owner
        </div>

        <div className="mt-10" data-animate>
          <Accordion type="single" collapsible className="w-full max-w-3xl mx-auto">
            <AccordionItem value="item-1">
              <AccordionTrigger>Can I upgrade anytime?</AccordionTrigger>
              <AccordionContent>Yes, upgrades take effect immediately and are prorated.</AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger>What happens to my data if I cancel?</AccordionTrigger>
              <AccordionContent>Your data remains exportable. We’ll keep it read-only for 30 days.</AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger>Do you offer discounts?</AccordionTrigger>
              <AccordionContent>Annual plans include a 20% discount.</AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
    </section>
  );
}
