
"use client";

import NextImage from 'next/image'; // Renamed to avoid conflict
import type { JobListing } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Briefcase, DollarSign, Percent, Bookmark, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface JobCardProps {
  job: JobListing;
  onViewDetails: (job: JobListing) => void;
  onSaveJob: (job: JobListing) => void;
  onGenerateMaterials: (job: JobListing) => void;
  isSaved?: boolean;
}

const trustedLogoHostnames = [
  'placehold.co',
  'media.theirstack.com',
  'storage.googleapis.com',
  'firebasestorage.googleapis.com',
  'zenprospect-production.s3.amazonaws.com',
  'd2q79iu7y748jz.cloudfront.net',
  'logo.clearbit.com',
];

export function JobCard({ job, onViewDetails, onSaveJob, onGenerateMaterials, isSaved }: JobCardProps) {
  const getMatchScoreVariant = () => {
    if (job.matchScore === undefined) return "outline";
    if (job.matchScore > 75) return "default";
    if (job.matchScore > 50) return "secondary";
    return "destructive";
  };

  const handleCardClick = () => {
    onViewDetails(job);
  };

  const handleCardKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onViewDetails(job);
    }
  };

  const handleButtonAction = (event: React.MouseEvent | React.KeyboardEvent, action: () => void) => {
    event.stopPropagation();
    action();
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
        // Invalid URL, fallback to placeholder
        logoUrl = `https://placehold.co/48x48.png?text=${encodeURIComponent(job.company?.[0] || 'L')}`;
        useNextImage = true; // placehold.co is trusted
      }
    } else {
      // No logo provided, use placeholder
      logoUrl = `https://placehold.co/48x48.png?text=${encodeURIComponent(job.company?.[0] || 'L')}`;
      useNextImage = true; // placehold.co is trusted
    }

    const imageProps = {
      src: logoUrl,
      alt: `${job.company} logo`,
      width: 48,
      height: 48,
      className: "rounded-md border object-contain",
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
    <Card
      className="flex flex-col h-full shadow-md hover:shadow-xl transition-all duration-300 ease-in-out transform hover:-translate-y-1 bg-card cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`View details for ${job.job_title} at ${job.company}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-xl font-bold font-headline text-primary mb-1">{job.job_title}</CardTitle>
            <CardDescription className="text-sm text-muted-foreground flex items-center">
              <Briefcase className="w-4 h-4 mr-1.5" /> {job.company}
            </CardDescription>
          </div>
          {renderLogo()}
        </div>
        <div className="text-xs text-muted-foreground flex items-center mt-1">
          <MapPin className="w-3 h-3 mr-1.5" /> {job.location}
        </div>
      </CardHeader>
      <CardContent className="flex-grow pb-3 space-y-2">
        <p className="text-sm text-foreground/90 line-clamp-3">{job.description}</p>
        {job.salary_string && (
          <div className="text-sm text-accent flex items-center">
            <DollarSign className="w-4 h-4 mr-1.5" /> {job.salary_string}
          </div>
        )}
        {job.matchScore !== undefined && (
          <Badge variant={getMatchScoreVariant()}
                 className="py-1 px-2.5">
            <Percent className="w-3.5 h-3.5 mr-1" /> Match: {job.matchScore}%
          </Badge>
        )}
      </CardContent>
      <CardFooter className="flex flex-row justify-between items-center gap-2 pt-3 border-t">
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => handleButtonAction(e, () => onGenerateMaterials(job))}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleButtonAction(e, () => onGenerateMaterials(job));}}
          className="text-primary hover:bg-primary/10"
          aria-label={`Generate materials for ${job.job_title}`}
        >
          <FileText className="w-4 h-4 mr-2" /> Materials
        </Button>
        <Button
          variant={isSaved ? "secondary" : "default"}
          size="sm"
          onClick={(e) => handleButtonAction(e, () => onSaveJob(job))}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleButtonAction(e, () => onSaveJob(job));}}
          aria-pressed={isSaved}
          aria-label={isSaved ? `Unsave ${job.job_title}` : `Save ${job.job_title}`}
        >
          <Bookmark className="w-4 h-4 mr-2" /> {isSaved ? 'Saved' : 'Save'}
        </Button>
      </CardFooter>
    </Card>
  );
}
