
"use client";

import type { JobListing, Technology } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Briefcase, CalendarDays, MapPin, Eye, Percent } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface SimpleJobListItemProps {
  job: JobListing;
  onViewDetails: (job: JobListing) => void;
}

export function SimpleJobListItem({ job, onViewDetails }: SimpleJobListItemProps) {
  const formatDateSafe = (dateString?: string): string | null => {
    if (!dateString) return null;
    try {
      return format(parseISO(dateString), 'MMM dd, yyyy');
    } catch (error) {
      console.warn(`Invalid date string for job ${job.id}: ${dateString}`);
      return dateString; // Fallback to original string if parsing fails
    }
  };

  const postedDate = formatDateSafe(job.date_posted);

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

  const handleDetailsButtonClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onViewDetails(job);
  };

  return (
    <Card 
      className="shadow-sm hover:shadow-md transition-shadow duration-200 bg-card cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`View details for ${job.job_title} at ${job.company}`}
    >
      <CardHeader className="pb-3 pt-4 px-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-2">
          <div>
            <CardTitle className="text-lg font-semibold font-headline text-primary hover:underline" onClick={(e) => {e.stopPropagation(); onViewDetails(job);}}>
              {job.job_title}
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground flex items-center mt-0.5">
              <Briefcase className="w-3.5 h-3.5 mr-1.5" /> {job.company || 'N/A'}
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleDetailsButtonClick} 
            className="mt-2 sm:mt-0 sm:ml-auto shrink-0"
            aria-label={`View details button for ${job.job_title}`}
          >
            <Eye className="w-4 h-4 mr-2" /> View Details
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-2">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {job.location && (
            <span className="flex items-center">
              <MapPin className="w-3 h-3 mr-1" /> {job.location}
            </span>
          )}
          {postedDate && (
            <span className="flex items-center">
              <CalendarDays className="w-3 h-3 mr-1" /> Posted: {postedDate}
            </span>
          )}
          {job.remote && <Badge variant="secondary" className="text-xs py-0.5 px-1.5">Remote</Badge>}
          {job.hybrid && <Badge variant="secondary" className="text-xs py-0.5 px-1.5">Hybrid</Badge>}
          {job.matchScore !== undefined && (
            <Badge variant={getMatchScoreVariant()} className="text-xs py-0.5 px-1.5">
              <Percent className="w-3 h-3 mr-1" /> AI Match: {job.matchScore}%
            </Badge>
          )}
        </div>
        {job.technologies && job.technologies.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1">
                {job.technologies.slice(0, 5).map(tech => ( 
                    <Badge key={tech.id} variant="outline" className="text-xs font-normal py-0.5 px-1.5">{tech.technology_name}</Badge>
                ))}
                {job.technologies.length > 5 && (
                     <Badge variant="outline" className="text-xs font-normal py-0.5 px-1.5">+{job.technologies.length - 5} more</Badge>
                )}
            </div>
        )}
      </CardContent>
    </Card>
  );
}

