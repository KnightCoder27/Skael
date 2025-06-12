
"use client";

import { Compass } from 'lucide-react';
import { FeedbackDialog } from './feedback-dialog'; // Import the FeedbackDialog
import { Button } from '../ui/button'; // Import Button for styling trigger
import { MessageSquare } from 'lucide-react'; // Icon for feedback button

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-background/95">
      <div className="container max-w-screen-2xl py-6 flex flex-col md:flex-row items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-2 mb-4 md:mb-0">
          <Compass className="w-5 h-5 text-primary" />
          <span className="font-semibold font-brand text-base">Skael</span>
        </div>
        <div className="flex flex-col items-center md:items-end gap-2">
            <p className="order-2 md:order-1">&copy; {currentYear} Skael. All rights reserved.</p>
            <div className="order-1 md:order-2">
                <FeedbackDialog
                    source="footer"
                    triggerButton={
                        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-primary">
                            <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
                            Provide Feedback
                        </Button>
                    }
                />
            </div>
        </div>
      </div>
    </footer>
  );
}
