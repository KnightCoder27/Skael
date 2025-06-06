
"use client";

import type { JobListing } from '@/types';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { ClipboardCopy, FileText, X, Wand2, Mail } from 'lucide-react'; // Added Mail
import { LoadingSpinner } from './loading-spinner';

interface ApplicationMaterialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  resume: string | null;
  coverLetter: string | null;
  isLoadingResume: boolean;
  isLoadingCoverLetter: boolean;
  job: JobListing | null;
  onGenerateResume: (jobToGenerateFor: JobListing) => Promise<void>;
  onGenerateCoverLetter: (jobToGenerateFor: JobListing) => Promise<void>;
}

export function ApplicationMaterialsModal({
  isOpen,
  onClose,
  resume,
  coverLetter,
  isLoadingResume,
  isLoadingCoverLetter,
  job,
  onGenerateResume,
  onGenerateCoverLetter
}: ApplicationMaterialsModalProps) {
  const { toast } = useToast();

  const handleCopy = (text: string | null, type: 'Resume' | 'Cover Letter') => {
    if (!text) return;
    navigator.clipboard.writeText(text)
      .then(() => {
        toast({ title: `${type} Copied!`, description: `${type} has been copied to your clipboard.` });
      })
      .catch(err => {
        toast({ title: 'Copy Failed', description: `Could not copy ${type.toLowerCase()}.`, variant: 'destructive' });
        console.error('Failed to copy: ', err);
      });
  };

  const defaultTab = resume ? "resume" : (coverLetter ? "coverLetter" : "resume");
  const overallLoading = isLoadingResume || isLoadingCoverLetter;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="text-2xl font-bold font-headline text-primary flex items-center">
            <Wand2 className="w-6 h-6 mr-2" /> AI Application Materials
          </DialogTitle>
          {job && <DialogDescription>For: {job.job_title} at {job.company}</DialogDescription>}
        </DialogHeader>

        <Tabs defaultValue={defaultTab} className="flex-grow flex flex-col overflow-hidden">
          <div className="px-6 py-3 border-b">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="resume">Resume</TabsTrigger>
              <TabsTrigger value="coverLetter">Cover Letter</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="resume" className="flex-grow overflow-hidden m-0">
            <div className="p-6 h-full flex flex-col">
              {isLoadingResume ? (
                <div className="flex-grow flex flex-col items-center justify-center">
                  <LoadingSpinner size={36} />
                  <p className="mt-3 text-muted-foreground">Generating Resume...</p>
                </div>
              ) : resume ? (
                <>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-semibold">Generated Resume</h3>
                    <Button variant="outline" size="sm" onClick={() => handleCopy(resume, 'Resume')} disabled={!resume}>
                      <ClipboardCopy className="w-4 h-4 mr-2" /> Copy Resume
                    </Button>
                  </div>
                  <ScrollArea className="flex-grow border rounded-md p-1 bg-muted/30">
                    <Textarea
                      value={resume}
                      readOnly
                      className="h-full min-h-[300px] resize-none border-0 focus-visible:ring-0 bg-transparent text-sm"
                      placeholder="Resume content will appear here..."
                    />
                  </ScrollArea>
                </>
              ) : (
                <div className="flex-grow flex flex-col items-center justify-center text-center">
                  <FileText className="w-10 h-10 text-primary mb-3" />
                  <h3 className="text-lg font-semibold mb-1">Resume Not Generated</h3>
                  <p className="text-sm text-muted-foreground mb-4 max-w-xs">
                    Click below to generate an AI-tailored resume for {job?.job_title || 'this role'}.
                  </p>
                  <Button
                    onClick={async () => { if (job) await onGenerateResume(job); }}
                    disabled={!job || overallLoading}
                    size="default"
                    className="bg-primary hover:bg-primary/90"
                  >
                    <Wand2 className="mr-2 h-5 w-5" /> Generate Resume
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="coverLetter" className="flex-grow overflow-hidden m-0">
            <div className="p-6 h-full flex flex-col">
              {isLoadingCoverLetter ? (
                <div className="flex-grow flex flex-col items-center justify-center">
                  <LoadingSpinner size={36} />
                  <p className="mt-3 text-muted-foreground">Generating Cover Letter...</p>
                </div>
              ) : coverLetter ? (
                <>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-semibold">Generated Cover Letter</h3>
                    <Button variant="outline" size="sm" onClick={() => handleCopy(coverLetter, 'Cover Letter')} disabled={!coverLetter}>
                      <ClipboardCopy className="w-4 h-4 mr-2" /> Copy Cover Letter
                    </Button>
                  </div>
                  <ScrollArea className="flex-grow border rounded-md p-1 bg-muted/30">
                    <Textarea
                      value={coverLetter}
                      readOnly
                      className="h-full min-h-[300px] resize-none border-0 focus-visible:ring-0 bg-transparent text-sm"
                      placeholder="Cover letter content will appear here..."
                    />
                  </ScrollArea>
                </>
              ) : (
                <div className="flex-grow flex flex-col items-center justify-center text-center">
                  <Mail className="w-10 h-10 text-primary mb-3" />
                  <h3 className="text-lg font-semibold mb-1">Cover Letter Not Generated</h3>
                  <p className="text-sm text-muted-foreground mb-4 max-w-xs">
                    Click below to generate an AI-tailored cover letter for {job?.job_title || 'this role'}.
                  </p>
                  <Button
                    onClick={async () => { if (job) await onGenerateCoverLetter(job); }}
                    disabled={!job || overallLoading}
                    size="default"
                    className="bg-primary hover:bg-primary/90" // Consider: variant="secondary"
                  >
                    <Wand2 className="mr-2 h-5 w-5" /> Generate Cover Letter
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="p-6 pt-4 border-t">
          <Button variant="ghost" onClick={onClose} disabled={overallLoading}>
            <X className="w-4 h-4 mr-2" /> Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
