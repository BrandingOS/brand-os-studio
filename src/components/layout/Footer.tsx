import { Button } from "@/components/ui/button";

export default function Footer() {
  return (
    <footer className="mt-20 rounded-t-3xl panel-dark bg-grid">
      <div className="container-tight py-16 text-center">
        <div className="space-y-6" data-animate>
          <h3 className="font-display text-2xl font-semibold">Your Brand. Everywhere. Always.</h3>
          <div className="flex items-center justify-center gap-2">
            <Button variant="secondary" size="sm" shape="pill">License</Button>
            <Button variant="secondary" size="sm" shape="pill">Changelog</Button>
            <Button variant="secondary" size="sm" shape="pill">Status</Button>
          </div>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="container-tight py-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Brand OS. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
