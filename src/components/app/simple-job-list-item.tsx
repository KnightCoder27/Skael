
"use client";

import type { JobListing } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Briefcase, CalendarDays, MapPin, Eye } from 'lucide-react';
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

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow duration-200 bg-card">
      <CardHeader className="pb-3 pt-4 px-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-2">
          <div>
            <CardTitle className="text-lg font-semibold font-headline text-primary hover:underline cursor-pointer" onClick={() => onViewDetails(job)}>
              {job.job_title}
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground flex items-center mt-0.5">
              <Briefcase className="w-3.5 h-3.5 mr-1.5" /> {job.company || 'N/A'}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => onViewDetails(job)} className="mt-2 sm:mt-0 sm:ml-auto shrink-0">
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
        </div>
        {job.technologies && job.technologies.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1">
                {job.technologies.slice(0, 5).map(tech => ( // Show up to 5 technologies
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
