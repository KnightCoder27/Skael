
"use client";

import { useState, useEffect, useCallback } from 'react';
import type { JobListing, User, TrackedApplication, LocalUserActivity, ActivityType } from '@/types';
import { sampleJobs } from '@/lib/sample-data';
import useLocalStorage from '@/hooks/use-local-storage'; 
import { useAuth } from '@/contexts/AuthContext'; 
import { JobCard } from '@/components/app/job-card';
import { JobDetailsModal } from '@/components/app/job-details-modal';
import { ApplicationMaterialsModal } from '@/components/app/application-materials-modal';
import { FullPageLoading } from '@/components/app/loading-spinner';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Compass, Info, FileWarning } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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

export default function JobExplorerPage() {
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const { currentUser, isLoadingAuth } = useAuth(); 
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

  const [hasAuthInitiallyLoaded, setHasAuthInitiallyLoaded] = useState(false);


  const { toast } = useToast();

  useEffect(() => {
    // If authentication is still loading, don't do anything yet.
    if (isLoadingAuth) {
      return;
    }

    // At this point, isLoadingAuth is false.
    // If this is the first time isLoadingAuth became false, mark it.
    if (!hasAuthInitiallyLoaded) {
      setHasAuthInitiallyLoaded(true);
      // On this very first pass after isLoadingAuth is false,
      // currentUser might still be in the process of being set by AuthContext.
      // So, we don't redirect yet. The effect will run again if currentUser changes or hasAuthInitiallyLoaded changes.
      return;
    }

    // If auth has initially loaded (isLoadingAuth was false at least once and hasAuthInitiallyLoaded is true)
    // AND there's still no currentUser, then it's an access denied situation.
    if (hasAuthInitiallyLoaded && !currentUser) {
      toast({ title: "Access Denied", description: "Please log in to explore jobs.", variant: "destructive" });
      router.push('/auth');
    }
  }, [isLoadingAuth, currentUser, router, toast, hasAuthInitiallyLoaded]);

  const addLocalActivity = useCallback((activityData: Omit<LocalUserActivity, 'id' | 'timestamp'>) => {
    const newActivity: LocalUserActivity = {
      id: Date.now().toString() + Math.random().toString(36).substring(2), // Simple unique ID
      timestamp: new Date().toISOString(),
      userId: currentUser?.id, // Optionally associate with current user
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
    
    if (!currentUser || !currentUser.professional_summary || !currentUser.skills) {
      toast({ title: "Profile Incomplete", description: "AI analysis requires your professional summary and skills in your profile.", variant: "destructive" });
      return; 
    }

    setIsLoadingExplanation(true);
    try {
      const input: JobMatchExplanationInput = {
        jobDescription: job.description,
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

      // Log activity locally
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

  useEffect(() => {
    const loadJobs = () => {
      setIsLoadingJobs(true);
      const augmentedJobs = sampleJobs.map(job => {
        const cachedData = jobAnalysisCache[job.id];
        if (cachedData) {
          return { ...job, ...cachedData };
        }
        return { ...job, matchScore: undefined, matchExplanation: undefined };
      });
      setJobs(augmentedJobs);
      setIsLoadingJobs(false);
    };
    // Only load jobs if auth is not loading AND a user is present (or initial auth load attempt passed)
    if (!isLoadingAuth && (currentUser || hasAuthInitiallyLoaded)) { 
        loadJobs();
    } else if (!isLoadingAuth && !currentUser && hasAuthInitiallyLoaded) { // User explicitly not logged in after initial check
        setIsLoadingJobs(false); // Don't load jobs, user will be redirected by other effect
    }
  }, [jobAnalysisCache, isLoadingAuth, currentUser, hasAuthInitiallyLoaded]); 


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

    // Log activity locally
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
      const pointsInput: ExtractJobDescriptionPointsInput = { jobDescription: jobToGetPointsFor.description };
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
    if (!currentUser || !currentUser.professional_summary || !currentUser.skills) {
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
        jobDescription: jobToGenerateFor.description,
        userProfile: currentUser.professional_summary || '', 
        pointsToMention: [...(points.keyRequirements || []), ...(points.keySkills || [])],
      };
      const resumeResult = await generateResume(resumeInput);
      if (resumeResult) {
        setGeneratedResume(resumeResult.resume);
        // Log activity locally
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
    if (!currentUser || !currentUser.professional_summary || !currentUser.skills) {
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
        jobDescription: jobToGenerateFor.description,
        userProfile: currentUser.professional_summary || '',
        pointsToMention: [...(points.keyRequirements || []), ...(points.keySkills || [])],
      };
      const coverLetterResult = await generateCoverLetter(coverLetterInput);
      if (coverLetterResult) {
        setGeneratedCoverLetter(coverLetterResult.coverLetter);
         // Log activity locally
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

  const isProfileIncompleteForAIFeatures = !currentUser || !currentUser.professional_summary || !currentUser.skills || currentUser.skills.length === 0;

  if (isLoadingAuth || (!hasAuthInitiallyLoaded && isLoadingJobs)) {
    return <FullPageLoading message={isLoadingAuth ? "Authenticating..." : "Finding best jobs for you..."} />;
  }
  
  // This will be caught by the useEffect for redirection if !currentUser after initial load
  if (!currentUser && hasAuthInitiallyLoaded) { 
    return <FullPageLoading message="Redirecting to login..." />;
  }


  return (
    <div className="space-y-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold font-headline flex items-center">
          <Compass className="mr-3 h-8 w-8 text-primary" />
          Job Explorer
        </h1>
        <p className="text-muted-foreground">
          Discover AI-matched job opportunities. Click on a job for more details and actions.
        </p>
      </header>

      {isProfileIncompleteForAIFeatures && currentUser && ( // Only show if currentUser exists but profile is incomplete
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

      {jobs.length === 0 && hasAuthInitiallyLoaded && currentUser ? ( // Show only if auth loaded, user exists, but no jobs
        <div className="text-center py-12">
          <FileWarning className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-xl font-semibold">No Jobs Found</h3>
          <p className="mt-1 text-muted-foreground">Check back later or adjust your (future) search criteria.</p>
        </div>
      ) : (
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

