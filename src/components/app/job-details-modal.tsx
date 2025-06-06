
"use client";

import type { JobOpportunity } from '@/types';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { MapPin, Briefcase, DollarSign, FileText, ExternalLink, Percent, Sparkles } from 'lucide-react';
import { LoadingSpinner } from './loading-spinner';
import Image from 'next/image';

interface JobDetailsModalProps {
  job: JobOpportunity | null;
  isOpen: boolean;
  onClose: () => void;
  onGenerateMaterials: (job: JobOpportunity) => void;
  isLoadingExplanation?: boolean;
}

export function JobDetailsModal({ job, isOpen, onClose, onGenerateMaterials, isLoadingExplanation }: JobDetailsModalProps) {
  if (!job) return null;

  const getMatchScoreVariant = () => {
    if (job.matchScore === undefined) return "outline";
    if (job.matchScore > 75) return "default"; // Uses primary color
    if (job.matchScore > 50) return "secondary"; // Uses secondary color
    return "destructive"; // Uses destructive color
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold font-headline text-primary">{job.title}</DialogTitle>
              <DialogDescription className="text-base text-muted-foreground mt-1 flex items-center">
                <Briefcase className="w-4 h-4 mr-2" /> {job.company}
              </DialogDescription>
            </div>
            {job.companyLogo && (
              <Image 
                src={job.companyLogo} 
                alt={`${job.company} logo`} 
                width={56} 
                height={56} 
                className="rounded-lg border object-contain"
                data-ai-hint="company logo"
              />
            )}
          </div>
          <div className="flex flex-wrap gap-2 items-center text-sm text-muted-foreground mt-2">
            <span className="flex items-center"><MapPin className="w-4 h-4 mr-1.5" /> {job.location}</span>
            {job.salary && <span className="flex items-center text-accent"><DollarSign className="w-4 h-4 mr-1.5" /> {job.salary}</span>} {/* Salary uses accent color */}
            {job.postedDate && <span className="flex items-center"><FileText className="w-4 h-4 mr-1.5" /> Posted: {job.postedDate}</span>}
          </div>
          {job.tags && job.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {job.tags.map(tag => <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>)}
            </div>
          )}
        </DialogHeader>
        
        <ScrollArea className="flex-grow overflow-y-auto px-6 py-4">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-1.5 font-headline">Full Job Description</h3>
              <p className="text-sm text-foreground/90 whitespace-pre-line leading-relaxed">
                {job.fullDescription || job.description}
              </p>
            </div>

            {isLoadingExplanation ? (
              <div className="py-6 text-center">
                <LoadingSpinner size={32} />
                <p className="text-muted-foreground mt-2">Analyzing match...</p>
              </div>
            ) : job.matchScore !== undefined && job.matchExplanation && (
              <>
                <Separator />
                <div>
                  <h3 className="text-lg font-semibold mb-1.5 font-headline flex items-center">
                    <Sparkles className="w-5 h-5 mr-2 text-primary" /> AI Match Analysis
                  </h3>
                  <div className="flex items-center gap-2 mb-2">
                     <Badge variant={getMatchScoreVariant()}>
                      <Percent className="w-4 h-4 mr-1" /> Match Score: {job.matchScore}%
                    </Badge>
                  </div>
                  <p className="text-sm text-foreground/90 whitespace-pre-line leading-relaxed">
                    {job.matchExplanation}
                  </p>
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="p-6 pt-4 border-t flex flex-col sm:flex-row gap-2">
          {job.url && (
            <Button variant="outline" asChild className="w-full sm:w-auto">
              <a href={job.url} target="_blank" rel="noopener noreferrer">
                View Original Post <ExternalLink className="w-4 h-4 ml-2" />
              </a>
            </Button>
          )}
          <Button onClick={() => onGenerateMaterials(job)} className="w-full sm:w-auto bg-primary hover:bg-primary/90">
            <FileText className="w-4 h-4 mr-2" /> Generate Application Materials
          </Button>
          <Button variant="ghost" onClick={onClose} className="w-full sm:w-auto">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
