
"use client";

import { useEffect, useState, useCallback } from 'react';
import useLocalStorage from '@/hooks/use-local-storage';
import type { TrackedApplication, ApplicationStatus, UserActivityOut, ActivityIn } from '@/types';
import { ApplicationTrackerTable } from '@/components/app/application-tracker-table';
import { Button } from '@/components/ui/button';
import { Briefcase, FilePlus2, LogOut as LogOutIcon, ServerCrash, FileWarning } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { FullPageLoading, LoadingSpinner } from '@/components/app/loading-spinner';
import apiClient from '@/lib/apiClient';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { SaveJobPayload } from '@/types'; // Ensure SaveJobPayload is imported

interface BackendActivity extends UserActivityOut {}

export default function TrackerPage() {
  const { currentUser, isLoadingAuth, isLoggingOut } = useAuth();
  const router = useRouter();
  const [localStatusOverrides, setLocalStatusOverrides] = useLocalStorage<Record<number, ApplicationStatus>>('application-status-overrides', {});
  const [trackedApplications, setTrackedApplications] = useState<TrackedApplication[]>([]);
  const [isLoadingTracker, setIsLoadingTracker] = useState(false);
  const [errorTracker, setErrorTracker] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchAndProcessActivities = useCallback(async () => {
    if (!currentUser || !currentUser.id) return;

    setIsLoadingTracker(true);
    setErrorTracker(null);
    try {
      const response = await apiClient.get<BackendActivity[]>(`/activity/user/${currentUser.id}`);
      const activities = response.data;

      console.log("TrackerPage: Fetched activities:", activities); // Log all fetched activities

      const jobActions: Record<number, { action: 'JOB_SAVED' | 'JOB_UNSAVED', activity: BackendActivity, timestamp: string }> = {};

      activities.forEach(activity => {
        if (activity.job_id !== null && activity.job_id !== undefined && (activity.action_type === 'JOB_SAVED' || activity.action_type === 'JOB_UNSAVED')) {
          // Diagnostic log for JOB_SAVED metadata
          if (activity.action_type === 'JOB_SAVED') {
            console.log(`TrackerPage: Processing JOB_SAVED activity for job_id ${activity.job_id}, metadata:`, activity.activity_metadata);
          }

          const existing = jobActions[activity.job_id];
          if (!existing || new Date(activity.created_at) > new Date(existing.timestamp)) {
            jobActions[activity.job_id] = {
              action: activity.action_type as 'JOB_SAVED' | 'JOB_UNSAVED',
              activity: activity,
              timestamp: activity.created_at
            };
          }
        }
      });

      const derivedApplications: TrackedApplication[] = [];
      for (const jobIdStr in jobActions) {
        const jobId = parseInt(jobIdStr, 10);
        const { action, activity } = jobActions[jobId];

        if (action === 'JOB_SAVED') {
          const metadata = activity.activity_metadata as any || {}; // Cast to any for easier access, provide fallback
          derivedApplications.push({
            id: activity.id.toString(), 
            jobId: jobId,
            jobTitle: metadata.jobTitle || 'N/A',
            company: metadata.company || 'N/A',
            status: localStatusOverrides[jobId] || 'Saved', // Prioritize local override for status
            lastUpdated: activity.created_at, 
          });
        }
      }
      setTrackedApplications(derivedApplications);
    } catch (error) {
      console.error("Error fetching or processing activities for tracker:", error);
      const message = error instanceof Error ? error.message : "Could not load tracked applications.";
      setErrorTracker(message);
      toast({ title: "Error Loading Tracker", description: message, variant: "destructive" });
    } finally {
      setIsLoadingTracker(false);
    }
  }, [currentUser, toast, localStatusOverrides]);

  useEffect(() => {
    if (isLoggingOut) {
      console.log("TrackerPage: Logout in progress, skipping access denied logic and fetch.");
      return;
    }
    if (!isLoadingAuth && !currentUser) {
      console.log("TrackerPage: Access Denied. isLoadingAuth is false, currentUser is null. Redirecting to /auth.");
      toast({ title: "Access Denied", description: "Please log in to view your tracker.", variant: "destructive" });
      router.push('/auth');
    } else if (currentUser && currentUser.id && !isLoggingOut) {
      fetchAndProcessActivities();
    }
  }, [isLoadingAuth, currentUser, router, toast, isLoggingOut, fetchAndProcessActivities]);


  const handleUpdateStatus = async (jobId: number, newStatus: ApplicationStatus) => {
    if (!currentUser || !currentUser.id) {
      toast({ title: "Authentication Error", description: "Cannot update status.", variant: "destructive" });
      return;
    }

    const application = trackedApplications.find(app => app.jobId === jobId);
    if (!application) return;

    const oldStatus = application.status;

    // Optimistic UI Update
    setLocalStatusOverrides(prevOverrides => ({
      ...prevOverrides,
      [jobId]: newStatus,
    }));
    setTrackedApplications(prevApps =>
      prevApps.map(app =>
        app.jobId === jobId ? { ...app, status: newStatus, lastUpdated: new Date().toISOString() } : app
      )
    );
    toast({ title: "Status Updated Locally", description: `Application status changed to ${newStatus}. Syncing...` });

    // Log to backend if it's a significant status change (e.g., not just back to "Saved" from "Interested")
    // For now, we log all status changes except the initial "Saved" which is handled by /jobs/{id}/save
    if (newStatus !== oldStatus) {
      const activityPayload: ActivityIn = {
        user_id: currentUser.id,
        job_id: jobId,
        action_type: "APPLICATION_STATUS_UPDATED",
        metadata: {
          jobTitle: application.jobTitle,
          company: application.company,
          oldStatus: oldStatus,
          newStatus: newStatus,
        }
      };
      try {
        await apiClient.post('/activity/log', activityPayload);
        toast({ title: "Status Update Logged", description: `Change to ${newStatus} recorded on server.` });
      } catch (error) {
        console.error("Error logging status update to backend:", error);
        toast({ title: "Sync Failed", description: "Could not log status update to server.", variant: "destructive" });
        // Optionally revert optimistic update or mark as "sync pending"
      }
    }
  };

  const handleDeleteApplication = async (jobId: number) => {
    if (!currentUser || !currentUser.id) {
        toast({ title: "Error", description: "User not authenticated.", variant: "destructive" });
        return;
    }
    const appToRemove = trackedApplications.find(app => app.jobId === jobId);
    if (!appToRemove) {
        toast({ title: "Error", description: "Application not found in current list.", variant: "destructive"});
        return;
    }

    const payload: SaveJobPayload = {
        user_id: currentUser.id,
        job_id: jobId,
        action_type: "JOB_UNSAVED",
        activity_metadata: JSON.stringify({
            jobTitle: appToRemove.jobTitle,
            company: appToRemove.company,
            status: "Unsaved" 
        })
    };

    try {
        await apiClient.post(`/jobs/${jobId}/save`, payload); 
        toast({ title: "Application Removed", description: "The application has been marked as unsaved." });
        fetchAndProcessActivities(); 
        setLocalStatusOverrides(prev => {
            const newOverrides = {...prev};
            delete newOverrides[jobId];
            return newOverrides;
        });
    } catch (error) {
        console.error("Error unsaving job via API:", error);
        const message = error instanceof Error ? error.message : "Could not remove application from backend.";
        toast({ title: "Removal Failed", description: message, variant: "destructive" });
    }
  };

  if (isLoggingOut) {
    return (
      <div className="flex min-h-[calc(100vh-12rem)] flex-col items-center justify-center p-4 text-center">
        <LogOutIcon className="w-12 h-12 text-primary mb-4 animate-pulse" />
        <h2 className="text-2xl font-semibold mb-2">Logging Out</h2>
        <p className="text-muted-foreground">Please wait...</p>
      </div>
    );
  }

  if (isLoadingAuth || (!currentUser && !isLoggingOut)) {
    return <FullPageLoading message="Verifying session..." />;
  }
  
  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold font-headline flex items-center">
            <Briefcase className="mr-3 h-8 w-8 text-primary" />
            Application Tracker
          </h1>
          <p className="text-muted-foreground">
            Stay organized and monitor your job application progress. Saved jobs are fetched from your activity log.
          </p>
        </div>
        <Button asChild className="shadow-md hover:shadow-lg transition-shadow">
          <Link href="/jobs">
            <FilePlus2 className="mr-2 h-4 w-4" /> Explore More Jobs
          </Link>
        </Button>
      </header>

      {isLoadingTracker && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <LoadingSpinner size={40} />
          <p className="mt-3 text-lg text-muted-foreground">Loading tracked applications...</p>
        </div>
      )}

      {!isLoadingTracker && errorTracker && (
        <Alert variant="destructive" className="my-6">
          <ServerCrash className="h-5 w-5" />
          <AlertTitle>Error Loading Tracker Data</AlertTitle>
          <AlertDescription>
            {errorTracker} Please try again later or check your connection.
            <Button variant="link" onClick={fetchAndProcessActivities} className="ml-2 p-0 h-auto">Retry</Button>
          </AlertDescription>
        </Alert>
      )}
      
      {!isLoadingTracker && !errorTracker && (
        <ApplicationTrackerTable
          applications={trackedApplications}
          onUpdateStatus={handleUpdateStatus}
          onDeleteApplication={handleDeleteApplication}
        />
      )}
       {!isLoadingTracker && !errorTracker && trackedApplications.length === 0 && (
         <Alert variant="default" className="my-6">
            <FileWarning className="h-5 w-5" />
            <AlertTitle>No Saved Jobs Yet</AlertTitle>
            <AlertDescription>
                You haven't saved any jobs yet. Go to the <Link href="/jobs" className="font-semibold text-primary hover:underline">Job Listings</Link> page to find and save jobs.
            </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
