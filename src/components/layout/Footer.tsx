import { Button } from "@/components/ui/button";
import { Twitter, Github, Linkedin, Instagram } from "lucide-react";

export default function Footer() {
  return (
    <footer className="mt-20">
      <div className="container-tight">
        {/* Floating dark widget (not full width) */}
        <div className="mx-auto max-w-5xl panel-dark bg-grid grid-fade rounded-3xl px-8 py-12 text-center">
          <div className="space-y-6" data-animate>
            <h3 className="font-display text-2xl font-semibold">Your Brand. Everywhere. Always.</h3>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {[
                { label: "License", href: "#" },
                { label: "Changelog", href: "#" },
                { label: "Status", href: "#" },
              ].map((l) => (
                <a key={l.label} href={l.href} className="rounded-full border border-border/70 px-3 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  {l.label}
                </a>
              ))}
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

            {/* Socials */}
            <div className="mt-8 flex items-center justify-center gap-4 text-muted-foreground" aria-label="Social media">
              <a href="#" aria-label="Twitter" className="hover:text-foreground transition-colors"><Twitter className="h-4 w-4"/></a>
              <a href="#" aria-label="LinkedIn" className="hover:text-foreground transition-colors"><Linkedin className="h-4 w-4"/></a>
              <a href="#" aria-label="GitHub" className="hover:text-foreground transition-colors"><Github className="h-4 w-4"/></a>
              <a href="#" aria-label="Instagram" className="hover:text-foreground transition-colors"><Instagram className="h-4 w-4"/></a>
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