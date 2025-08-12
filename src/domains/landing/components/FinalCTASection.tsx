import { Button } from "@/components/ui/button";
import { Rocket, Play } from "lucide-react";

export const FinalCTASection = () => {
  return (
    <section className="section bg-dot-grid">
      <div className="container-tight text-center">
        <h2 data-animate className="text-3xl font-semibold">
          Brand Once. Use Forever.
        </h2>
        <p className="mt-3 text-lg text-muted-foreground" data-animate>
          Upload your brand today — never worry about consistency again.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3" data-animate>
          <Button variant="hero" shape="pill" className="px-6 py-3">
            <Rocket className="mr-2" /> Start Free
          </Button>
          <Button variant="outline" shape="pill" className="px-6 py-3">
            <Play className="mr-2" /> Watch Demo
          </Button>
        </div>
      </div>
    </section>
  );
};