
"use client";

import { Compass } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-background/95">
      <div className="container max-w-screen-2xl py-8 flex flex-col md:flex-row items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-2 mb-4 md:mb-0">
          <Compass className="w-5 h-5 text-primary" />
          <span className="font-semibold">Job Hunter AI</span>
        </div>
        <p>&copy; {currentYear} Job Hunter AI. All rights reserved.</p>
        <div className="flex items-center gap-4 mt-4 md:mt-0">
          {/* Placeholder for future links */}
          {/* <Link href="/privacy" className="hover:text-primary">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-primary">Terms of Service</Link> */}
        </div>
      </div>
    </footer>
  );
}
