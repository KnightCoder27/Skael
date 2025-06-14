
"use client";

import type { JobListing, Technology, HiringTeamMember } from '@/types';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { MapPin, Briefcase, DollarSign, FileText, ExternalLink, Percent, Sparkles, CalendarDays, Clock3, Users, Info, Linkedin } from 'lucide-react';
import { LoadingSpinner } from './loading-spinner';
import NextImage from 'next/image'; // Renamed to avoid conflict

interface JobDetailsModalProps {
  job: JobListing | null;
  isOpen: boolean;
  onClose: () => void;
  onGenerateMaterials: (job: JobListing) => void;
  isLoadingExplanation?: boolean;
}

const trustedLogoHostnames = [ // Same list as in JobCard
  'placehold.co',
  'media.theirstack.com',
  'storage.googleapis.com',
  'firebasestorage.googleapis.com',
  'zenprospect-production.s3.amazonaws.com',
  'd2q79iu7y748jz.cloudfront.net',
  'logo.clearbit.com',
];

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
      return dateString;
    }
  };
  
  const displayEmploymentStatus = (status: string[] | string | null | undefined): string | null => {
    if (Array.isArray(status)) {
      return status.join(', ');
    }
    return typeof status === 'string' ? status : null;
  };

  const renderLogo = () => {
    let logoUrl = job.companyLogo;
    let useNextImage = false;

    if (logoUrl) {
      try {
        const url = new URL(logoUrl);
        if (trustedLogoHostnames.includes(url.hostname)) {
          useNextImage = true;
        }
      } catch (e) {
        logoUrl = `https://placehold.co/56x56.png?text=${encodeURIComponent(job.company?.[0] || 'L')}`;
        useNextImage = true;
      }
    } else {
      logoUrl = `https://placehold.co/56x56.png?text=${encodeURIComponent(job.company?.[0] || 'L')}`;
      useNextImage = true;
    }

    const imageProps = {
      src: logoUrl,
      alt: `${job.company} logo`,
      width: 56,
      height: 56,
      className: "rounded-lg border object-contain",
      "data-ai-hint": "company logo",
    };

    if (useNextImage) {
      return <NextImage {...imageProps} />;
    } else {
      // eslint-disable-next-line @next/next/no-img-element
      return <img {...imageProps} loading="lazy" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold font-headline text-primary">{job.job_title}</DialogTitle>
              <DialogDescription className="text-base text-muted-foreground mt-1 flex items-center">
                <Briefcase className="w-4 h-4 mr-2" /> {job.company}
              </DialogDescription>
            </div>
            {renderLogo()}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 items-center text-sm text-muted-foreground mt-2">
            <span className="flex items-center"><MapPin className="w-4 h-4 mr-1.5" /> {job.location}</span>
            {job.salary_string && <span className="flex items-center text-accent"><DollarSign className="w-4 h-4 mr-1.5" /> {job.salary_string}</span>}
            {job.date_posted && <span className="flex items-center"><CalendarDays className="w-4 h-4 mr-1.5" /> Posted: {formatDate(job.date_posted)}</span>}
            {job.employment_status && <span className="flex items-center"><Clock3 className="w-4 h-4 mr-1.5" /> {displayEmploymentStatus(job.employment_status)}</span>}
          </div>
          {job.technologies && job.technologies.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {job.technologies.map(tech => <Badge key={tech.id} variant="secondary" className="text-xs">{tech.technology_name}</Badge>)}
            </div>
          )}
        </DialogHeader>

        <ScrollArea className="flex-grow overflow-y-auto px-6 py-4">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-1.5 font-headline">Full Job Description</h3>
              <p className="text-sm text-foreground/90 whitespace-pre-line leading-relaxed">
                {job.description}
              </p>
            </div>

            {(() => {
              if (job.key_info && typeof job.key_info === 'string') {
                let parsedKeyInfoData: Record<string, any> | null = null;
                try {
                  const parsed = JSON.parse(job.key_info);
                  if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
                    parsedKeyInfoData = parsed;
                  }
                } catch (e) {
                  // console.warn("JobDetailsModal: key_info is not a valid JSON object string.", job.key_info, e);
                }

                if (parsedKeyInfoData && Object.keys(parsedKeyInfoData).length > 0) {
                  return (
                    <>
                      <Separator />
                      <div>
                        <h3 className="text-lg font-semibold mb-1.5 font-headline flex items-center">
                          <Info className="w-5 h-5 mr-2 text-primary" /> Key Information
                        </h3>
                        <ul className="list-none space-y-1 pl-1 text-sm text-foreground/90">
                          {Object.entries(parsedKeyInfoData).map(([key, value]) => (
                            <li key={key} className="leading-relaxed">
                              <span className="font-semibold capitalize">{key.replace(/_/g, ' ').trim()}:</span> {value === null || value === undefined ? "N/A" : String(value)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </>
                  );
                }
              }
              return null; 
            })()}

            {Array.isArray(job.hiring_team) && job.hiring_team.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="text-lg font-semibold mb-1.5 font-headline flex items-center">
                    <Users className="w-5 h-5 mr-2 text-primary" /> Hiring Team
                  </h3>
                  <div className="space-y-2">
                    {job.hiring_team.map((member, index) => (
                      <div key={index} className="text-sm text-foreground/90 p-2 border rounded-md bg-muted/30">
                        <p className="font-medium">{member.name}</p>
                        {member.title && <p className="text-xs text-muted-foreground">{member.title}</p>}
                        {member.linkedin_profile_url && (
                          <a
                            href={member.linkedin_profile_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline flex items-center mt-0.5"
                          >
                            <Linkedin className="w-3 h-3 mr-1" /> LinkedIn Profile
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

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

        <DialogFooter className="p-6 pt-4 border-t grid grid-cols-1 sm:flex sm:flex-row sm:justify-between gap-2">
          <div className="flex gap-2 flex-col sm:flex-row">
            {job.url && (
                <Button variant="outline" asChild className="w-full sm:w-auto">
                <a href={job.url} target="_blank" rel="noopener noreferrer">
                    View Original Post <ExternalLink className="w-4 h-4 ml-2" />
                </a>
                </Button>
            )}
            <Button onClick={() => onGenerateMaterials(job)} className="w-full sm:w-auto">
                <FileText className="w-4 h-4 mr-2" /> Generate Materials
            </Button>
          </div>
          <div className="flex gap-2 flex-col sm:flex-row">
            <Button variant="ghost" onClick={onClose} className="w-full sm:w-auto">Close</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
