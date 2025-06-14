
"use client";

import { useEffect, useState, useCallback } from 'react';
import useLocalStorage from '@/hooks/use-local-storage';
import type { TrackedApplication, ApplicationStatus, UserActivityOut, ActivityIn, JobListing, BackendJobListingResponseItem, Technology } from '@/types';
import { ApplicationTrackerTable } from '@/components/app/application-tracker-table';
import { Button } from '@/components/ui/button';
import { Briefcase, FilePlus2, LogOut as LogOutIcon, ServerCrash, FileWarning, Eye, MessageSquare } from 'lucide-react'; // Added MessageSquare
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { FullPageLoading, LoadingSpinner } from '@/components/app/loading-spinner';
import apiClient from '@/lib/apiClient';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { SaveJobPayload } from '@/types';
import { JobDetailsModal } from '@/components/app/job-details-modal';
import { ApplicationMaterialsModal } from '@/components/app/application-materials-modal';
import { FeedbackDialog } from '@/components/app/feedback-dialog'; // Import FeedbackDialog
import { Card, CardContent } from '@/components/ui/card'; // Import Card for feedback section

// AI Flow Imports (for materials generation)
import { extractJobDescriptionPoints, type ExtractJobDescriptionPointsInput, type ExtractJobDescriptionPointsOutput } from '@/ai/flows/job-description-point-extractor';
import {
  generateResume,
  generateCoverLetter,
  type GenerateDocumentInput,
} from '@/ai/flows/resume-cover-letter-generator';


const isValidDbId = (idInput: any): idInput is number | string => {
  if (idInput === null || idInput === undefined) {
    return false;
  }
  const numId = Number(idInput);
  return !isNaN(numId) && isFinite(numId);
};


export default function TrackerPage() {
  const { currentUser, isLoadingAuth, isLoggingOut } = useAuth();
  const router = useRouter();
  const [localStatusOverrides, setLocalStatusOverrides] = useLocalStorage<Record<number, ApplicationStatus>>('application-status-overrides', {});
  const [trackedApplications, setTrackedApplications] = useState<TrackedApplication[]>([]);
  const [isLoadingTracker, setIsLoadingTracker] = useState(false);
  const [errorTracker, setErrorTracker] = useState<string | null>(null);
  const { toast } = useToast();

  const [selectedJobForDetailsModal, setSelectedJobForDetailsModal] = useState<JobListing | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isLoadingJobDetails, setIsLoadingJobDetails] = useState(false);

  // States for ApplicationMaterialsModal
  const [selectedJobForMaterials, setSelectedJobForMaterials] = useState<JobListing | null>(null);
  const [isMaterialsModalOpen, setIsMaterialsModalOpen] = useState(false);
  const [isLoadingResume, setIsLoadingResume] = useState(false);
  const [isLoadingCoverLetter, setIsLoadingCoverLetter] = useState(false);
  const [generatedResume, setGeneratedResume] = useState<string | null>(null);
  const [generatedCoverLetter, setGeneratedCoverLetter] = useState<string | null>(null);
  const [extractedJobPoints, setExtractedJobPoints] = useState<ExtractJobDescriptionPointsOutput | null>(null);
  const [jobForExtractedPoints, setJobForExtractedPoints] = useState<JobListing | null>(null);


  const mapBackendJobToTrackerJobListing = useCallback((backendJob: BackendJobListingResponseItem): JobListing => {
    let numericDbId: number;
    if (isValidDbId(backendJob.id)) {
        numericDbId = typeof backendJob.id === 'string' ? parseInt(backendJob.id, 10) : backendJob.id as number;
        if (isNaN(numericDbId)) numericDbId = -Date.now() - Math.random();
    } else {
        numericDbId = -Date.now() - Math.random();
    }

    const technologiesFormatted: Technology[] = Array.isArray(backendJob.technologies)
    ? backendJob.technologies.filter(name => typeof name === 'string').map((name, index) => ({
        id: `${numericDbId}-tech-${index}`,
        technology_name: name,
        technology_slug: name.toLowerCase().replace(/\s+/g, '-'),
      }))
    : [];

    const companyName = backendJob.company || backendJob.company_object?.name || "N/A";
    const companyLogo = backendJob.company_object?.logo || `https://placehold.co/100x100.png?text=${encodeURIComponent(companyName?.[0] || 'J')}`;

    return {
      id: numericDbId,
      api_id: backendJob.api_id || null,
      job_title: backendJob.job_title || "N/A",
      company: companyName,
      location: backendJob.location || "N/A",
      description: backendJob.description || "No description available.",
      url: backendJob.url || null,
      date_posted: backendJob.date_posted || null,
      employment_status: backendJob.employment_status || null,
      matching_phrase: backendJob.matching_phrase || null,
      matching_words: backendJob.matching_words || null,
      company_domain: backendJob.company_domain || null,
      company_obj_id: backendJob.company_obj_id || null,
      final_url: backendJob.final_url || null,
      source_url: backendJob.source_url || null,
      remote: backendJob.remote || null,
      hybrid: backendJob.hybrid || null,
      salary_string: backendJob.salary_string || null,
      min_salary: backendJob.min_salary || null,
      max_salary: backendJob.max_salary || null,
      currency: backendJob.currency || null,
      country: backendJob.country || null,
      seniority: backendJob.seniority || null,
      discovered_at: backendJob.discovered_at || new Date().toISOString(),
      reposted: backendJob.reposted || null,
      date_reposted: backendJob.date_reposted || null,
      country_code: backendJob.country_code || null,
      job_expired: backendJob.job_expired || null,
      industry_id: backendJob.industry_id || null,
      fetched_data: backendJob.fetched_data || null,
      technologies: technologiesFormatted,
      companyLogo: companyLogo,
      key_info: backendJob.key_info || null,
      // matchScore and matchExplanation are not typically part of GET /jobs/{id}
    };
  }, []);


  const fetchAndProcessActivities = useCallback(async () => {
    if (!currentUser || !currentUser.id) return;

    setIsLoadingTracker(true);
    setErrorTracker(null);
    try {
      const response = await apiClient.get<UserActivityOut[]>(`/activity/user/${currentUser.id}`);
      const activities = response.data;

      const jobActions: Record<number, { action: 'JOB_SAVED' | 'JOB_UNSAVED', activity: UserActivityOut, timestamp: string }> = {};

      activities.forEach(activity => {
        if (activity.job_id !== null && activity.job_id !== undefined && (activity.action_type === 'JOB_SAVED' || activity.action_type === 'JOB_UNSAVED')) {
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
          const metadata = activity.activity_metadata as any || {};
          derivedApplications.push({
            id: activity.id.toString(),
            jobId: jobId,
            jobTitle: metadata.jobTitle || 'N/A',
            company: metadata.company || 'N/A',
            status: localStatusOverrides[jobId] || 'Saved',
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

    if (newStatus !== oldStatus) {
      const activityPayload: ActivityIn = {
        user_id: currentUser.id,
        job_id: jobId,
        action_type: "APPLICATION_STATUS_UPDATED",
        metadata: { // Backend for /activity/log expects 'metadata'
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
        activity_metadata: {
            jobTitle: appToRemove.jobTitle,
            company: appToRemove.company,
            status: "Unsaved"
        }
    };

    try {
        await apiClient.post(`/jobs/${jobId}/save`, payload);
        toast({ title: "Application Removed", description: "The application has been marked as unsaved." });
        
        // Optimistic UI Update
        setTrackedApplications(prevApps => prevApps.filter(app => app.jobId !== jobId));
        
        setLocalStatusOverrides(prev => {
            const newOverrides = {...prev};
            delete newOverrides[jobId];
            return newOverrides;
        });
        // Re-fetch to ensure consistency with backend is no longer called immediately here.
        // The main useEffect will handle re-fetch if currentUser/isLoggingOut/etc. changes.
    } catch (error) {
        console.error("Error unsaving job via API:", error);
        const message = error instanceof Error ? error.message : "Could not remove application from backend.";
        toast({ title: "Removal Failed", description: message, variant: "destructive" });
        // If API call fails, the optimistic update will still have happened.
        // A full page refresh or navigating away and back would re-sync from backend.
        // Or, we could call fetchAndProcessActivities() here in catch if needed.
    }
  };

  const handleViewJobDetails = async (jobId: number) => {
    if (!currentUser) return;
    setIsLoadingJobDetails(true);
    setSelectedJobForDetailsModal(null);
    try {
      const response = await apiClient.get<BackendJobListingResponseItem>(`/jobs/${jobId}`);
      const mappedJob = mapBackendJobToTrackerJobListing(response.data);
      setSelectedJobForDetailsModal(mappedJob);
      setIsDetailsModalOpen(true);
    } catch (error) {
      console.error("Error fetching job details for tracker modal:", error);
      toast({ title: "Error", description: "Could not fetch job details.", variant: "destructive" });
    } finally {
      setIsLoadingJobDetails(false);
    }
  };

  const openMaterialsModalFromTracker = (job: JobListing) => {
    if (!job) return;
    setSelectedJobForMaterials(job);
    setGeneratedResume(null);
    setGeneratedCoverLetter(null);
    setExtractedJobPoints(null);
    setJobForExtractedPoints(null);
    setIsLoadingResume(false);
    setIsLoadingCoverLetter(false);
    setIsMaterialsModalOpen(true);
  };

  const getPointsForJob = async (jobToGetPointsFor: JobListing): Promise<ExtractJobDescriptionPointsOutput | null> => {
    if (jobToGetPointsFor.id === jobForExtractedPoints?.id && extractedJobPoints) return extractedJobPoints;
    try {
      const pointsInput: ExtractJobDescriptionPointsInput = { jobDescription: jobToGetPointsFor.description || '' };
      const pointsResult = await extractJobDescriptionPoints(pointsInput);
      setExtractedJobPoints(pointsResult);
      setJobForExtractedPoints(jobToGetPointsFor);
      return pointsResult;
    } catch (error) {
      console.error("Error extracting job description points:", error);
      toast({ title: "Point Extraction Failed", description: "Could not extract key points from job description.", variant: "destructive" });
      return null;
    }
  };

  const handleTriggerAIResumeGeneration = async (jobToGenerateFor: JobListing) => {
    if (!currentUser || !currentUser.professional_summary || !currentUser.skills || currentUser.skills.length === 0) {
      toast({ title: "Profile Incomplete", description: "Please complete your profile (summary, skills) to generate materials.", variant: "destructive" });
      return;
    }
    setIsLoadingResume(true);
    setGeneratedResume(null);
    try {
      const points = await getPointsForJob(jobToGenerateFor);
      if (!points) { setIsLoadingResume(false); return; }
      const resumeInput: GenerateDocumentInput = { jobDescription: jobToGenerateFor.description || '', userProfile: currentUser.professional_summary || '', pointsToMention: [...(points.keyRequirements || []), ...(points.keySkills || [])]};
      const resumeResult = await generateResume(resumeInput);
      if (resumeResult) setGeneratedResume(resumeResult.resume);
    } catch (error) {
      toast({ title: "Resume Generation Failed", variant: "destructive" });
    } finally {
      setIsLoadingResume(false);
    }
  };

  const handleTriggerAICoverLetterGeneration = async (jobToGenerateFor: JobListing) => {
     if (!currentUser || !currentUser.professional_summary || !currentUser.skills || currentUser.skills.length === 0) {
      toast({ title: "Profile Incomplete", description: "Please complete your profile (summary, skills) to generate materials.", variant: "destructive" });
      return;
    }
    setIsLoadingCoverLetter(true);
    setGeneratedCoverLetter(null);
    try {
      const points = await getPointsForJob(jobToGenerateFor);
      if (!points) { setIsLoadingCoverLetter(false); return; }
      const coverLetterInput: GenerateDocumentInput = { jobDescription: jobToGenerateFor.description || '', userProfile: currentUser.professional_summary || '', pointsToMention: [...(points.keyRequirements || []), ...(points.keySkills || [])]};
      const coverLetterResult = await generateCoverLetter(coverLetterInput);
      if (coverLetterResult) setGeneratedCoverLetter(coverLetterResult.coverLetter);
    } catch (error) {
      toast({ title: "Cover Letter Generation Failed", variant: "destructive" });
    } finally {
      setIsLoadingCoverLetter(false);
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
          onViewDetails={handleViewJobDetails}
          isLoadingDetails={isLoadingJobDetails}
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

      <JobDetailsModal
        job={selectedJobForDetailsModal}
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        onGenerateMaterials={openMaterialsModalFromTracker}
        // isLoadingExplanation: The modal shows AI explanation if job.matchScore is present.
        // GET /jobs/{id} doesn't return matchScore, so it won't show by default from tracker.
        // If AI explanation needs to be generated on-the-fly from tracker, modal logic needs adjustment or prop.
      />
      <ApplicationMaterialsModal
        isOpen={isMaterialsModalOpen}
        onClose={() => setIsMaterialsModalOpen(false)}
        resume={generatedResume}
        coverLetter={generatedCoverLetter}
        isLoadingResume={isLoadingResume}
        isLoadingCoverLetter={isLoadingCoverLetter}
        job={selectedJobForMaterials}
        onGenerateResume={handleTriggerAIResumeGeneration}
        onGenerateCoverLetter={handleTriggerAICoverLetterGeneration}
      />

      {currentUser && (
        <Card className="mt-10">
            <CardContent className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-muted-foreground text-sm">
                    Have suggestions or found an issue with the tracker?
                </p>
                <FeedbackDialog
                    source="tracker-page"
                    triggerButton={
                        <Button variant="outline">
                            <MessageSquare className="mr-2 h-4 w-4" /> Share Feedback
                        </Button>
                    }
                />
            </CardContent>
        </Card>
      )}
    </div>
  );
}

