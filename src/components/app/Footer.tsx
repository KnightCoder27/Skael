
"use client";

import Link from 'next/link';
import { Compass, MessageSquare, FileText, ShieldCheck, Users } from 'lucide-react';
import { FeedbackDialog } from './feedback-dialog';
import { Button } from '../ui/button';

export function Footer() {
  const currentYear = new Date().getFullYear();

  const footerLinks = [
    { href: '/about-us', label: 'About Us', icon: Users },
    { href: '/terms-and-conditions', label: 'Terms & Conditions', icon: FileText },
    { href: '/privacy-policy', label: 'Privacy Policy', icon: ShieldCheck },
  ];

  return (
    <footer className="border-t bg-background/95">
      <div className="container max-w-screen-2xl py-8 md:py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
          <div className="flex items-center gap-2 md:mb-0 col-span-1 md:col-auto justify-center md:justify-start">
            <Compass className="w-6 h-6 text-primary" />
            <span className="text-lg font-semibold font-brand text-primary">Skael</span>
          </div>

          <nav className="flex flex-col sm:flex-row items-center justify-center gap-x-6 gap-y-3 text-sm text-muted-foreground col-span-1 md:col-auto">
            {footerLinks.map(link => (
              <Link key={link.href} href={link.href} className="hover:text-primary transition-colors flex items-center">
                <link.icon className="w-4 h-4 mr-1.5" />
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex flex-col items-center md:items-end gap-3 text-sm text-muted-foreground col-span-1 md:col-auto">
             <FeedbackDialog
                source="footer"
                triggerButton={
                    <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-primary">
                        <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
                        Provide Feedback
                    </Button>
                }
            />
            <p>&copy; {currentYear} Skael. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
