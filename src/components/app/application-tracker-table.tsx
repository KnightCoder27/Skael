
"use client";

import type { TrackedApplication, ApplicationStatus } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, ExternalLink } from 'lucide-react'; // Removed Edit3 as notes are not implemented
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import Link from 'next/link'; 
import { sampleJobs } from '@/lib/sample-data'; 
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Briefcase } from 'lucide-react'; 

interface ApplicationTrackerTableProps {
  applications: TrackedApplication[];
  onUpdateStatus: (jobId: number, status: ApplicationStatus) => void;
  onDeleteApplication: (jobId: number) => void;
  // onEditNotes: (jobId: number) => void; // Future enhancement
}

const statusOptions: ApplicationStatus[] = ["Interested", "Saved", "Applied", "Interviewing", "Offer", "Rejected"];

const getStatusColor = (status: ApplicationStatus) => {
  switch (status) {
    case "Offer": return "bg-green-500 text-white";
    case "Interviewing": return "bg-blue-500 text-white";
    case "Applied": return "bg-yellow-500 text-black";
    case "Saved":
    case "Interested": 
      return "bg-gray-500 text-white";
    case "Rejected": return "bg-red-500 text-white";
    default: return "bg-muted text-muted-foreground";
  }
};

export function ApplicationTrackerTable({ applications, onUpdateStatus, onDeleteApplication }: ApplicationTrackerTableProps) {
  
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  // JobListing.id is number, TrackedApplication.jobId is number
  const findJobUrl = (jobId: number): string | undefined => {
    const job = sampleJobs.find(j => j.id === jobId);
    return job?.url;
  };

  if (applications.length === 0) {
    return (
      <Card className="text-center py-10 border rounded-lg bg-card">
        <CardHeader>
            <div className="flex justify-center mb-2">
                <Briefcase className="mx-auto h-12 w-12 text-muted-foreground" />
            </div>
            <CardTitle className="text-xl font-semibold">No Applications Tracked</CardTitle>
        </CardHeader>
        <CardContent>
            <CardDescription className="mt-1 text-sm text-muted-foreground">
            Start by exploring jobs and saving the ones you're interested in.
            </CardDescription>
            <Button asChild className="mt-4">
            <Link href="/jobs">Explore Jobs</Link>
            </Button>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">My Applications</CardTitle>
        <CardDescription>Manage your job applications and track their progress.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[25%]">Job Title</TableHead>
              <TableHead className="w-[20%]">Company</TableHead>
              <TableHead className="w-[15%]">Status</TableHead>
              <TableHead className="w-[15%]">Last Updated</TableHead>
              <TableHead className="text-right w-[25%]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {applications.sort((a,b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()).map((app) => (
              <TableRow key={app.jobId}>
                <TableCell className="font-medium">{app.jobTitle}</TableCell>
                <TableCell>{app.company}</TableCell>
                <TableCell>
                  <Select
                    value={app.status}
                    onValueChange={(value) => onUpdateStatus(app.jobId, value as ApplicationStatus)}
                  >
                    <SelectTrigger className={`h-8 text-xs w-[120px] ${getStatusColor(app.status)} border-0 data-[placeholder]:text-inherit`}>
                      <SelectValue placeholder="Set status" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map(option => (
                        <SelectItem key={option} value={option} className="text-xs">
                           <Badge className={`${getStatusColor(option)} mr-2 w-2 h-2 p-0 rounded-full`} />
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{formatDate(app.lastUpdated)}</TableCell>
                <TableCell className="text-right space-x-1">
                  {/* <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => onEditNotes(app.jobId)}>
                    <Edit3 className="h-3.5 w-3.5" /> <span className="sr-only">Edit Notes</span>
                  </Button> */}
                  {findJobUrl(app.jobId) && (
                    <Button variant="outline" size="icon" className="h-7 w-7" asChild>
                       <a href={findJobUrl(app.jobId)} target="_blank" rel="noopener noreferrer" aria-label="View Original Job Post">
                        <ExternalLink className="h-3.5 w-3.5" /> <span className="sr-only">View Job</span>
                       </a>
                    </Button>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="icon" className="h-7 w-7" aria-label="Delete Application">
                        <Trash2 className="h-3.5 w-3.5" /> <span className="sr-only">Delete</span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete the tracked application for "{app.jobTitle}".
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onDeleteApplication(app.jobId)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
