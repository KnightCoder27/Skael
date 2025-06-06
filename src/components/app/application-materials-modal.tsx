
"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { ClipboardCopy, FileText, X } from 'lucide-react';
import { LoadingSpinner } from './loading-spinner';

interface ApplicationMaterialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  resume: string | null;
  coverLetter: string | null;
  isLoading: boolean;
  jobTitle?: string; // This comes from JobListing.job_title, which is string. No change needed here.
}

export function ApplicationMaterialsModal({ isOpen, onClose, resume, coverLetter, isLoading, jobTitle }: ApplicationMaterialsModalProps) {
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="text-2xl font-bold font-headline text-primary flex items-center">
            <FileText className="w-6 h-6 mr-2" /> Application Materials
          </DialogTitle>
          {jobTitle && <DialogDescription>Generated for: {jobTitle}</DialogDescription>}
        </DialogHeader>

        {isLoading ? (
          <div className="flex-grow flex flex-col items-center justify-center p-6">
            <LoadingSpinner size={48} />
            <p className="mt-4 text-lg text-muted-foreground">Generating materials, please wait...</p>
          </div>
        ) : (
          <Tabs defaultValue="resume" className="flex-grow flex flex-col overflow-hidden">
            <div className="px-6 py-3 border-b">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="resume">Resume</TabsTrigger>
                <TabsTrigger value="coverLetter">Cover Letter</TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="resume" className="flex-grow overflow-hidden m-0">
              <div className="p-6 h-full flex flex-col">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-semibold">Generated Resume</h3>
                  <Button variant="outline" size="sm" onClick={() => handleCopy(resume, 'Resume')} disabled={!resume}>
                    <ClipboardCopy className="w-4 h-4 mr-2" /> Copy Resume
                  </Button>
                </div>
                <ScrollArea className="flex-grow border rounded-md p-1 bg-muted/30">
                  <Textarea 
                    value={resume || "No resume generated."} 
                    readOnly 
                    className="h-full min-h-[300px] resize-none border-0 focus-visible:ring-0 bg-transparent text-sm"
                    placeholder="Resume content will appear here..."
                  />
                </ScrollArea>
              </div>
            </TabsContent>
            <TabsContent value="coverLetter" className="flex-grow overflow-hidden m-0">
              <div className="p-6 h-full flex flex-col">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-semibold">Generated Cover Letter</h3>
                  <Button variant="outline" size="sm" onClick={() => handleCopy(coverLetter, 'Cover Letter')} disabled={!coverLetter}>
                    <ClipboardCopy className="w-4 h-4 mr-2" /> Copy Cover Letter
                  </Button>
                </div>
                <ScrollArea className="flex-grow border rounded-md p-1 bg-muted/30">
                   <Textarea 
                    value={coverLetter || "No cover letter generated."} 
                    readOnly 
                    className="h-full min-h-[300px] resize-none border-0 focus-visible:ring-0 bg-transparent text-sm"
                    placeholder="Cover letter content will appear here..."
                  />
                </ScrollArea>
              </div>
            </TabsContent>
          </Tabs>
        )}

        <DialogFooter className="p-6 pt-4 border-t">
          <Button variant="ghost" onClick={onClose}>
            <X className="w-4 h-4 mr-2" /> Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
