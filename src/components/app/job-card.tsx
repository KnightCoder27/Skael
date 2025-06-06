"use client";

import Image from 'next/image';
import type { JobOpportunity, TrackedApplication } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Briefcase, DollarSign, Percent, Info, Sparkles, Bookmark, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface JobCardProps {
  job: JobOpportunity;
  onViewDetails: (job: JobOpportunity) => void;
  onSaveJob: (job: JobOpportunity) => void;
  onGenerateMaterials: (job: JobOpportunity) => void;
  isSaved?: boolean;
}

export function JobCard({ job, onViewDetails, onSaveJob, onGenerateMaterials, isSaved }: JobCardProps) {
  return (
    <Card className="flex flex-col h-full shadow-md hover:shadow-xl transition-all duration-300 ease-in-out transform hover:-translate-y-1 bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-xl font-bold font-headline text-primary mb-1">{job.title}</CardTitle>
            <CardDescription className="text-sm text-muted-foreground flex items-center">
              <Briefcase className="w-4 h-4 mr-1.5" /> {job.company}
            </CardDescription>
          </div>
          {job.companyLogo && (
            <Image 
              src={job.companyLogo} 
              alt={`${job.company} logo`} 
              width={48} 
              height={48} 
              className="rounded-md border object-contain"
              data-ai-hint="company logo"
            />
          )}
        </div>
        <div className="text-xs text-muted-foreground flex items-center mt-1">
          <MapPin className="w-3 h-3 mr-1.5" /> {job.location}
        </div>
      </CardHeader>
      <CardContent className="flex-grow pb-3 space-y-2">
        <p className="text-sm text-foreground/90 line-clamp-3">{job.description}</p>
        {job.salary && (
          <div className="text-sm text-foreground/80 flex items-center">
            <DollarSign className="w-4 h-4 mr-1.5 text-green-600" /> {job.salary}
          </div>
        )}
        {job.matchScore !== undefined && (
          <Badge variant={job.matchScore > 75 ? "default" : (job.matchScore > 50 ? "secondary" : "outline")} 
                 className={cn(
                   job.matchScore > 75 && "bg-green-500/20 text-green-700 border-green-500/30",
                   job.matchScore <= 75 && job.matchScore > 50 && "bg-yellow-500/20 text-yellow-700 border-yellow-500/30",
                   job.matchScore <= 50 && "bg-red-500/20 text-red-700 border-red-500/30",
                   "py-1 px-2.5"
                 )}>
            <Percent className="w-3.5 h-3.5 mr-1" /> Match: {job.matchScore}%
          </Badge>
        )}
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 pt-3 border-t">
        <Button variant="outline" size="sm" onClick={() => onViewDetails(job)} className="flex-1 sm:flex-initial">
          <Info className="w-4 h-4 mr-2" /> Details
        </Button>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button 
            variant={isSaved ? "secondary" : "default"} 
            size="sm" 
            onClick={() => onSaveJob(job)} 
            className="flex-1"
            aria-pressed={isSaved}
          >
            <Bookmark className="w-4 h-4 mr-2" /> {isSaved ? 'Saved' : 'Save'}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onGenerateMaterials(job)} className="flex-1 text-primary hover:bg-primary/10">
            <FileText className="w-4 h-4 mr-2" /> Materials
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
