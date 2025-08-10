import { Button } from "@/components/ui/button";

export default function Footer() {
  return (
    <footer className="mt-20">
      <div className="container-tight">
        {/* Floating dark widget (not full width) */}
        <div className="mx-auto max-w-5xl panel-dark bg-grid rounded-3xl px-8 py-12 text-center">
          <div className="space-y-6" data-animate>
            <h3 className="font-display text-2xl font-semibold">Your Brand. Everywhere. Always.</h3>
            <div className="flex items-center justify-center gap-2">
              <Button variant="secondary" size="sm" shape="pill">License</Button>
              <Button variant="secondary" size="sm" shape="pill">Changelog</Button>
              <Button variant="secondary" size="sm" shape="pill">Status</Button>
            </div>

            {/* Dummy footer data */}
            <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-6 text-left">
              <div>
                <h4 className="text-sm font-medium mb-3">Product</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><a className="hover:underline" href="#">Overview</a></li>
                  <li><a className="hover:underline" href="#">Guidelines</a></li>
                  <li><a className="hover:underline" href="#">Design Studio</a></li>
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-3">Resources</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><a className="hover:underline" href="#">Blog</a></li>
                  <li><a className="hover:underline" href="#">Help Center</a></li>
                  <li><a className="hover:underline" href="#">API</a></li>
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-3">Company</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><a className="hover:underline" href="#">About</a></li>
                  <li><a className="hover:underline" href="#">Careers</a></li>
                  <li><a className="hover:underline" href="#">Contact</a></li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Copyright: last element on the page */}
        <div className="py-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Brand OS. All rights reserved.
        </div>
      </div>
    </footer>
  );
}