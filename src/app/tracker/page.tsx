
"use client";

import { useEffect } from 'react';
import useLocalStorage from '@/hooks/use-local-storage';
import type { TrackedApplication, ApplicationStatus } from '@/types';
import { ApplicationTrackerTable } from '@/components/app/application-tracker-table';
import { Button } from '@/components/ui/button';
import { Briefcase, FilePlus2, LogOut as LogOutIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { FullPageLoading } from '@/components/app/loading-spinner';


export default function TrackerPage() {
  const { currentUser, isLoadingAuth, isLoggingOut } = useAuth();
  const router = useRouter();
  const [trackedApplications, setTrackedApplications] = useLocalStorage<TrackedApplication[]>('tracked-applications', []);
  const { toast } = useToast();

  useEffect(() => {
    console.log(`TrackerPage Effect: isLoadingAuth=${isLoadingAuth}, currentUser.id=${currentUser?.id}, isLoggingOut=${isLoggingOut}`);
    if (isLoggingOut) {
        console.log("TrackerPage: Logout in progress, skipping access denied logic.");
        return;
    }
    if (!isLoadingAuth) {
      if (!currentUser) {
        console.log("TrackerPage: Access Denied. isLoadingAuth is false, currentUser is null. Redirecting to /auth.");
        toast({ title: "Access Denied", description: "Please log in to view your tracker.", variant: "destructive" });
        router.push('/auth');
      }
    }
  }, [isLoadingAuth, currentUser, router, toast, isLoggingOut]);


  const handleUpdateStatus = (jobId: number, status: ApplicationStatus) => {
    setTrackedApplications(prevApps =>
      prevApps.map(app =>
        app.jobId === jobId ? { ...app, status, lastUpdated: new Date().toISOString() } : app
      )
    );
    toast({ title: "Status Updated", description: `Application status changed to ${status}.` });
  };

  const handleDeleteApplication = (jobId: number) => {
    setTrackedApplications(prevApps => prevApps.filter(app => app.jobId !== jobId));
    toast({ title: "Application Removed", description: "The application has been removed from your tracker.", variant: "destructive" });
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

  if (isLoadingAuth) {
    return <FullPageLoading message="Authenticating..." />;
  }

  // This covers the case where auth is resolved, not logging out, but no currentUser (which means redirect should have happened)
  if (!currentUser && !isLoadingAuth && !isLoggingOut) {
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
            Stay organized and monitor your job application progress.
          </p>
        </div>
        <Button asChild className="shadow-md hover:shadow-lg transition-shadow">
          <Link href="/jobs">
            <FilePlus2 className="mr-2 h-4 w-4" /> Explore More Jobs
          </Link>
        </Button>
      </header>
      
      <ApplicationTrackerTable
        applications={trackedApplications}
        onUpdateStatus={handleUpdateStatus}
        onDeleteApplication={handleDeleteApplication}
      />
    </div>
  );
}
