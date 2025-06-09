
"use client";

import { useState, useEffect, useCallback } from 'react';
import type { JobListing, User, TrackedApplication, LocalUserActivity, ActivityType, Technology } from '@/types';
// import { sampleJobs } from '@/lib/sample-data'; // Removing sample data
import useLocalStorage from '@/hooks/use-local-storage';
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/lib/apiClient';
import { JobCard } from '@/components/app/job-card';
import { JobDetailsModal } from '@/components/app/job-details-modal';
import { ApplicationMaterialsModal } from '@/components/app/application-materials-modal';
import { FullPageLoading, LoadingSpinner } from '@/components/app/loading-spinner';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Compass, Info, FileWarning, LogOut as LogOutIcon, ServerCrash } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { AxiosError } from 'axios';

// AI Flow Imports
import { jobMatchExplanation, type JobMatchExplanationInput, type JobMatchExplanationOutput } from '@/ai/flows/job-match-explanation';
import { extractJobDescriptionPoints, type ExtractJobDescriptionPointsInput, type ExtractJobDescriptionPointsOutput } from '@/ai/flows/job-description-point-extractor';
import {
  generateResume,
  generateCoverLetter,
  type GenerateDocumentInput,
} from '@/ai/flows/resume-cover-letter-generator';

interface JobAnalysisCache {
  [jobId: number]: {
    matchScore: number;
    matchExplanation: string;
  };
}

// Backend returns JobListingResponse which includes technologies as string[]
// We need to map it to our frontend JobListing type which expects Technology[]
interface BackendJobListingResponseItem {
  id: number;
  job_title: string;
  url: string | null;
  date_posted: string | null;
  employment_status: string | null;
  matching_phrase: string[] | null;
  matching_words: string[] | null;
  company: string | null;
  company_domain: string | null;
  company_obj_id: number | null;
  final_url: string | null;
  source_url: string | null;
  location: string | null;
  remote: boolean | null;
  hybrid: boolean | null;
  salary_string: string | null;
  min_salary: number | null;
  max_salary: number | null;
  currency: string | null;
  country: string | null;
  seniority: string | null;
  discovered_at: string;
  description: string | null;
  reposted: boolean | null;
  date_reposted: string | null;
  country_code: string | null;
  job_expired: boolean | null;
  industry_id: string | null;
  fetched_data: string | null;
  technologies: string[]; // Backend sends array of names
  api_id?: string | null; // Ensure this is included if backend sends it
}


export default function JobExplorerPage() {
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [isLoadingJobsState, setIsLoadingJobsState] = useState(true);
  const [jobFetchError, setJobFetchError] = useState<string | null>(null);
  const { currentUser, isLoadingAuth, isLoggingOut } = useAuth();
  const router = useRouter();

  const [trackedApplications, setTrackedApplications] = useLocalStorage<TrackedApplication[]>('tracked-applications', []);
  const [jobAnalysisCache, setJobAnalysisCache] = useLocalStorage<JobAnalysisCache>('job-ai-analysis-cache', {});
  const [localUserActivities, setLocalUserActivities] = useLocalStorage<LocalUserActivity[]>('user-activity-log', []);

  const [selectedJobForDetails, setSelectedJobForDetails] = useState<JobListing | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isLoadingExplanation, setIsLoadingExplanation] = useState(false);

  const [selectedJobForMaterials, setSelectedJobForMaterials] = useState<JobListing | null>(null);
  const [isMaterialsModalOpen, setIsMaterialsModalOpen] = useState(false);

  const [isLoadingResume, setIsLoadingResume] = useState(false);
  const [isLoadingCoverLetter, setIsLoadingCoverLetter] = useState(false);
  const [generatedResume, setGeneratedResume] = useState<string | null>(null);
  const [generatedCoverLetter, setGeneratedCoverLetter] = useState<string | null>(null);

  const [extractedJobPoints, setExtractedJobPoints] = useState<ExtractJobDescriptionPointsOutput | null>(null);
  const [jobForExtractedPoints, setJobForExtractedPoints] = useState<JobListing | null>(null);

  const { toast } = useToast();

  const mapBackendJobToFrontend = (backendJob: BackendJobListingResponseItem): JobListing => {
    return {
      ...backendJob,
      // Map string[] of tech names to Technology[]
      technologies: backendJob.technologies.map((name, index) => ({
        id: `${backendJob.id}-tech-${index}`, // Create a unique-ish ID for key prop
        technology_name: name,
        technology_slug: name.toLowerCase().replace(/\s+/g, '-'),
      })),
      companyLogo: `https://placehold.co/100x100.png?text=${encodeURIComponent(backendJob.company?.[0] || 'J')}`, // Placeholder logo
      matchScore: jobAnalysisCache[backendJob.id]?.matchScore,
      matchExplanation: jobAnalysisCache[backendJob.id]?.matchExplanation,
    };
  };

  useEffect(() => {
    console.log(`JobExplorerPage Effect: isLoadingAuth=${isLoadingAuth}, currentUser.id=${currentUser?.id}, isLoggingOut=${isLoggingOut}`);
    if (isLoggingOut) {
      console.log("JobExplorerPage: Logout in progress, skipping access denied logic and job loading.");
      return;
    }
    if (!isLoadingAuth) {
      if (!currentUser) {
        console.log("JobExplorerPage: Access Denied. isLoadingAuth is false, currentUser is null. Redirecting to /auth.");
        toast({ title: "Access Denied", description: "Please log in to explore jobs.", variant: "destructive" });
        router.push('/auth');
      } else {
        console.log(`JobExplorerPage: Access Granted. isLoadingAuth is false, currentUser.id=${currentUser.id}. Fetching jobs from backend.`);
        const fetchJobsFromAPI = async () => {
          setIsLoadingJobsState(true);
          setJobFetchError(null);
          try {
            const response = await apiClient.get<BackendJobListingResponseItem[]>('/jobs/list_jobs/');
            const fetchedBackendJobs = response.data;
            
            const augmentedJobs = fetchedBackendJobs.map(mapBackendJobToFrontend);
            setJobs(augmentedJobs);
            console.log("JobExplorerPage: Jobs fetched and processed from backend.");
          } catch (error) {
            console.error("JobExplorerPage: Error fetching jobs from API:", error);
            let message = "Could not load jobs from the server.";
            if (error instanceof Error) {
               message = (error as AxiosError).response?.data?.detail || error.message || message;
            }
            setJobFetchError(message);
            toast({ title: "Failed to Load Jobs", description: message, variant: "destructive" });
          } finally {
            setIsLoadingJobsState(false);
          }
        };
        fetchJobsFromAPI();
      }
    } else {
        console.log("JobExplorerPage: Still loading auth (isLoadingAuth is true).");
    }
  }, [isLoadingAuth, currentUser, router, toast, jobAnalysisCache, isLoggingOut]);


  const addLocalActivity = useCallback((activityData: Omit<LocalUserActivity, 'id' | 'timestamp'>) => {
    const newActivity: LocalUserActivity = {
      id: Date.now().toString() + Math.random().toString(36).substring(2),
      timestamp: new Date().toISOString(),
      userId: currentUser?.id,
      ...activityData,
    };
    setLocalUserActivities(prevActivities => [newActivity, ...prevActivities]);
  }, [setLocalUserActivities, currentUser]);


  const fetchJobDetailsWithAI = useCallback(async (job: JobListing) => {
    setSelectedJobForDetails(job);
    setIsDetailsModalOpen(true);

    if (job.matchScore !== undefined && job.matchExplanation) {
      return;
    }

    const cachedAnalysis = jobAnalysisCache[job.id];
    if (cachedAnalysis) {
      setJobs(prevJobs =>
        prevJobs.map(j =>
          j.id === job.id ? { ...j, ...cachedAnalysis } : j
        )
      );
      setSelectedJobForDetails(prevJob => prevJob ? { ...prevJob, ...cachedAnalysis } : null);
      return;
    }

    if (!currentUser || !currentUser.professional_summary || !currentUser.skills || currentUser.skills.length === 0) {
      toast({ title: "Profile Incomplete", description: "AI analysis requires your professional summary and skills in your profile.", variant: "destructive" });
      return;
    }

    setIsLoadingExplanation(true);
    try {
      const input: JobMatchExplanationInput = {
        jobDescription: job.description || '', // Ensure not null
        userProfile: currentUser.professional_summary || '',
        userPreferences: currentUser.job_role || '',
        userHistory: '',
      };
      const explanationResult = await jobMatchExplanation(input);

      setJobs(prevJobs =>
        prevJobs.map(j =>
          j.id === job.id ? { ...j, ...explanationResult } : j
        )
      );
      setSelectedJobForDetails(prevJob => prevJob ? { ...prevJob, ...explanationResult } : null);
      setJobAnalysisCache(prevCache => ({
        ...prevCache,
        [job.id]: explanationResult,
      }));

      addLocalActivity({
        type: "MATCH_ANALYSIS_VIEWED",
        jobId: job.id,
        jobTitle: job.job_title,
        company: job.company,
        details: { matchScore: explanationResult.matchScore }
      });

    } catch (error) {
      console.error("Error fetching AI match explanation:", error);
      toast({ title: "AI Analysis Failed", description: "Could not get AI match explanation.", variant: "destructive" });
    } finally {
      setIsLoadingExplanation(false);
    }
  }, [currentUser, toast, jobAnalysisCache, setJobAnalysisCache, addLocalActivity]);


  const handleViewDetails = (job: JobListing) => {
    fetchJobDetailsWithAI(job);
  };

  const handleSaveJob = (job: JobListing) => {
    const existingApplicationIndex = trackedApplications.findIndex(app => app.jobId === job.id);
    let activityType: ActivityType = "JOB_SAVED";
    let toastMessage = `${job.job_title} added to your application tracker.`;
    let statusToLog: "Saved" | undefined = "Saved";

    if (existingApplicationIndex > -1) {
      setTrackedApplications(prev => prev.filter(app => app.jobId !== job.id));
      toastMessage = `${job.job_title} removed from your tracker.`;
      activityType = "JOB_UNSAVED";
      statusToLog = undefined;
      toast({ title: "Job Unsaved", description: toastMessage });
    } else {
      const newApplication: TrackedApplication = {
        id: job.id.toString() + Date.now().toString(),
        jobId: job.id,
        jobTitle: job.job_title,
        company: job.company,
        status: "Saved",
        lastUpdated: new Date().toISOString(),
      };
      setTrackedApplications(prev => [...prev, newApplication]);
      toast({ title: "Job Saved!", description: toastMessage });
    }

    addLocalActivity({
        type: activityType,
        jobId: job.id,
        jobTitle: job.job_title,
        company: job.company,
        details: statusToLog ? { status: statusToLog } : {}
    });
  };

  const openMaterialsModal = (job: JobListing) => {
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
    if (jobToGetPointsFor.id === jobForExtractedPoints?.id && extractedJobPoints) {
      return extractedJobPoints;
    }
    try {
      const pointsInput: ExtractJobDescriptionPointsInput = { jobDescription: jobToGetPointsFor.description || '' }; // Ensure not null
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
      if (!points) {
        setIsLoadingResume(false);
        return;
      }

      const resumeInput: GenerateDocumentInput = {
        jobDescription: jobToGenerateFor.description || '', // Ensure not null
        userProfile: currentUser.professional_summary || '',
        pointsToMention: [...(points.keyRequirements || []), ...(points.keySkills || [])],
      };
      const resumeResult = await generateResume(resumeInput);
      if (resumeResult) {
        setGeneratedResume(resumeResult.resume);
        addLocalActivity({
            type: "RESUME_GENERATED_FOR_JOB",
            jobId: jobToGenerateFor.id,
            jobTitle: jobToGenerateFor.job_title,
            company: jobToGenerateFor.company,
            details: { success: true }
        });
      }
    } catch (error) {
      console.error("Error generating resume:", error);
      toast({ title: "Resume Generation Failed", description: "Could not generate resume.", variant: "destructive" });
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
      if (!points) {
        setIsLoadingCoverLetter(false);
        return;
      }

      const coverLetterInput: GenerateDocumentInput = {
        jobDescription: jobToGenerateFor.description || '', // Ensure not null
        userProfile: currentUser.professional_summary || '',
        pointsToMention: [...(points.keyRequirements || []), ...(points.keySkills || [])],
      };
      const coverLetterResult = await generateCoverLetter(coverLetterInput);
      if (coverLetterResult) {
        setGeneratedCoverLetter(coverLetterResult.coverLetter);
        addLocalActivity({
            type: "COVER_LETTER_GENERATED_FOR_JOB",
            jobId: jobToGenerateFor.id,
            jobTitle: jobToGenerateFor.job_title,
            company: jobToGenerateFor.company,
            details: { success: true }
        });
      }
    } catch (error) {
      console.error("Error generating cover letter:", error);
      toast({ title: "Cover Letter Generation Failed", description: "Could not generate cover letter.", variant: "destructive" });
    } finally {
      setIsLoadingCoverLetter(false);
    }
  };

  const isProfileIncompleteForAIFeatures = currentUser && (!currentUser.professional_summary || !currentUser.skills || currentUser.skills.length === 0);


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

  if (!currentUser && !isLoadingAuth && !isLoggingOut) {
    return <FullPageLoading message="Verifying session..." />;
  }

  return (
    <div className="space-y-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold font-headline flex items-center">
          <Compass className="mr-3 h-8 w-8 text-primary" />
          Job Explorer
        </h1>
        <p className="text-muted-foreground">
          Discover AI-matched job opportunities from our database. Click on a job for more details and actions.
        </p>
      </header>

      {isProfileIncompleteForAIFeatures && (
        <Alert variant="default" className="bg-primary/10 border-primary/30">
          <Info className="h-5 w-5 text-primary" />
          <AlertTitle className="font-semibold text-primary">Complete Your Profile for Full AI Features!</AlertTitle>
          <AlertDescription className="text-primary/80">
            AI-powered match analysis and material generation require a complete profile (summary and skills). Some AI features may be limited.
            <Button variant="link" asChild className="p-0 h-auto ml-1 text-primary font-semibold">
              <Link href="/profile">Update your profile now.</Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
      {isLoadingJobsState && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
            <LoadingSpinner size={40} />
            <p className="mt-3 text-lg text-muted-foreground">Loading job listings...</p>
        </div>
      )}

      {!isLoadingJobsState && jobFetchError && (
        <Alert variant="destructive" className="my-6">
          <ServerCrash className="h-5 w-5" />
          <AlertTitle>Error Loading Jobs</AlertTitle>
          <AlertDescription>
            {jobFetchError} Please try again later or contact support.
          </AlertDescription>
        </Alert>
      )}

      {!isLoadingJobsState && !jobFetchError && jobs.length === 0 && currentUser && (
        <div className="text-center py-12">
          <FileWarning className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-xl font-semibold">No Jobs Found</h3>
          <p className="mt-1 text-muted-foreground">No jobs were found in our database currently. Check back later!</p>
        </div>
      )}

      {!isLoadingJobsState && !jobFetchError && jobs.length > 0 && currentUser && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {jobs.map(job => (
            <JobCard
              key={job.id}
              job={job}
              onViewDetails={handleViewDetails}
              onSaveJob={handleSaveJob}
              onGenerateMaterials={openMaterialsModal}
              isSaved={trackedApplications.some(app => app.jobId === job.id)}
            />
          ))}
        </div>
      )}

      <JobDetailsModal
        job={selectedJobForDetails}
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        onGenerateMaterials={openMaterialsModal}
        isLoadingExplanation={isLoadingExplanation}
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
    </div>
  );
}
