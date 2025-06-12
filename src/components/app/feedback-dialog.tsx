
"use client";

import { useState }
from 'react';
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/lib/apiClient';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, Send, Loader2 } from 'lucide-react';
import type { FeedbackIn } from '@/types';

interface FeedbackDialogProps {
  triggerButton?: React.ReactNode;
  source: string; // e.g., "footer", "tracker-page", "profile-page"
}

export function FeedbackDialog({ triggerButton, source }: FeedbackDialogProps) {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmitFeedback = async () => {
    if (!currentUser || !currentUser.id) {
      toast({
        title: 'Error',
        description: 'You must be logged in to submit feedback.',
        variant: 'destructive',
      });
      return;
    }
    if (!feedbackText.trim()) {
      toast({
        title: 'Feedback Empty',
        description: 'Please enter your feedback before submitting.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    const payload: FeedbackIn = {
      feedback: feedbackText,
      metadata: { source, timestamp: new Date().toISOString() },
    };

    try {
      await apiClient.post(`/users/${currentUser.id}/feedback`, payload);
      toast({
        title: 'Feedback Submitted',
        description: 'Thank you for your feedback!',
      });
      setFeedbackText('');
      setIsOpen(false); // Close dialog on success
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({
        title: 'Submission Failed',
        description: 'Could not submit your feedback. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {triggerButton || (
          <Button variant="outline" size="sm">
            <MessageSquare className="mr-2 h-4 w-4" />
            Provide Feedback
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <MessageSquare className="mr-2 h-5 w-5 text-primary" />
            Submit Feedback
          </DialogTitle>
          <DialogDescription>
            We value your input! Let us know what you think or if you encountered any issues.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="feedback-text">Your Feedback</Label>
            <Textarea
              id="feedback-text"
              placeholder="Type your feedback here..."
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              rows={5}
              disabled={isSubmitting}
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={isSubmitting}>Cancel</Button>
          </DialogClose>
          <Button onClick={handleSubmitFeedback} disabled={isSubmitting || !feedbackText.trim()}>
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
