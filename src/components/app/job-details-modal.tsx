
"use client";

import type { JobListing, Technology } from '@/types'; // Updated type
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { MapPin, Briefcase, DollarSign, FileText, ExternalLink, Percent, Sparkles, CalendarDays, Clock3 } from 'lucide-react'; // Added Clock3
import { LoadingSpinner } from './loading-spinner';
import Image from 'next/image';

interface JobDetailsModalProps {
  job: JobListing | null; // Updated type
  isOpen: boolean;
  onClose: () => void;
  onGenerateMaterials: (job: JobListing) => void; // Updated type
  isLoadingExplanation?: boolean;
}

export function JobDetailsModal({ job, isOpen, onClose, onGenerateMaterials, isLoadingExplanation }: JobDetailsModalProps) {
  if (!job) return null;

  const getMatchScoreVariant = () => {
    if (job.matchScore === undefined) return "outline";
    if (job.matchScore > 75) return "default"; 
    if (job.matchScore > 50) return "secondary"; 
    return "destructive"; 
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    try {
      return new Date(dateString).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (e) {
      return dateString; // Fallback to original string if date is invalid
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold font-headline text-primary">{job.job_title}</DialogTitle> {/* Updated field */}
              <DialogDescription className="text-base text-muted-foreground mt-1 flex items-center">
                <Briefcase className="w-4 h-4 mr-2" /> {job.company} {/* Kept as job.company */}
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
          <div className="flex flex-wrap gap-x-4 gap-y-1 items-center text-sm text-muted-foreground mt-2">
            <span className="flex items-center"><MapPin className="w-4 h-4 mr-1.5" /> {job.location}</span>
            {job.salary_string && <span className="flex items-center text-accent"><DollarSign className="w-4 h-4 mr-1.5" /> {job.salary_string}</span>} {/* Updated field */}
            {job.date_posted && <span className="flex items-center"><CalendarDays className="w-4 h-4 mr-1.5" /> Posted: {formatDate(job.date_posted)}</span>} {/* Updated field and added formatting */}
            {job.employment_status && <span className="flex items-center"><Clock3 className="w-4 h-4 mr-1.5" /> {job.employment_status}</span>}
          </div>
          {job.technologies && job.technologies.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {job.technologies.map(tech => <Badge key={tech.id} variant="secondary" className="text-xs">{tech.technology_name}</Badge>)} {/* Displaying technology_name */}
            </div>
          )}
        </DialogHeader>
        
        <ScrollArea className="flex-grow overflow-y-auto px-6 py-4">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-1.5 font-headline">Full Job Description</h3>
              <p className="text-sm text-foreground/90 whitespace-pre-line leading-relaxed">
                {job.description} {/* Updated field (assuming fullDescription was merged into description) */}
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
