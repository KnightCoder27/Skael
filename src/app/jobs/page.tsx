
"use client";

import { useState, useEffect, useCallback } from 'react';
import type { JobListing, User, TrackedApplication } from '@/types';
import { sampleJobs } from '@/lib/sample-data';
import useLocalStorage from '@/hooks/use-local-storage';
import { JobCard } from '@/components/app/job-card';
import { JobDetailsModal } from '@/components/app/job-details-modal';
import { ApplicationMaterialsModal } from '@/components/app/application-materials-modal';
import { FullPageLoading } from '@/components/app/loading-spinner';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Compass, Info, FileWarning } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

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
  const [userProfile] = useLocalStorage<User | null>('user-profile', null);
  const [trackedApplications, setTrackedApplications] = useLocalStorage<TrackedApplication[]>('tracked-applications', []);
  const [jobAnalysisCache, setJobAnalysisCache] = useLocalStorage<JobAnalysisCache>('job-ai-analysis-cache', {});

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

  const fetchJobDetailsWithAI = useCallback(async (job: JobListing) => {
    setSelectedJobForDetails(job); // Set immediately to open modal with basic info
    setIsDetailsModalOpen(true);

    // Check if analysis is already on the job object (from initial load or previous fetch in this session)
    if (job.matchScore !== undefined && job.matchExplanation) {
      // Already have analysis, no need to fetch or load from cache again for modal display
      return;
    }

    // Check localStorage cache
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
    
    // If profile is incomplete, don't attempt AI call for explanation
    if (!userProfile || !userProfile.professional_summary || !userProfile.desired_job_role || !userProfile.skills_list_text) {
      return; 
    }

    setIsLoadingExplanation(true);
    try {
      const input: JobMatchExplanationInput = {
        jobDescription: job.description,
        userProfile: userProfile.professional_summary,
        userPreferences: userProfile.desired_job_role || '',
        userHistory: '', 
      };
      const explanationResult = await jobMatchExplanation(input);
      
      // Update jobs state
      setJobs(prevJobs =>
        prevJobs.map(j =>
          j.id === job.id ? { ...j, ...explanationResult } : j
        )
      );
      // Update selected job for modal
      setSelectedJobForDetails(prevJob => prevJob ? { ...prevJob, ...explanationResult } : null);
      // Update localStorage cache
      setJobAnalysisCache(prevCache => ({
        ...prevCache,
        [job.id]: explanationResult,
      }));

    } catch (error) {
      console.error("Error fetching AI match explanation:", error);
      toast({ title: "AI Analysis Failed", description: "Could not get AI match explanation.", variant: "destructive" });
    } finally {
      setIsLoadingExplanation(false);
    }
  }, [userProfile, toast, jobAnalysisCache, setJobAnalysisCache]);

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
    loadJobs();
  }, [jobAnalysisCache]); // Rerun if cache changes (e.g. from another tab, though unlikely for this prototype)


  const handleViewDetails = (job: JobListing) => {
    fetchJobDetailsWithAI(job);
  };

  const handleSaveJob = (job: JobListing) => {
    const existingApplication = trackedApplications.find(app => app.jobId === job.id);
    if (existingApplication) {
      setTrackedApplications(prev => prev.filter(app => app.jobId !== job.id));
      toast({ title: "Job Unsaved", description: `${job.job_title} removed from your tracker.` });
    } else {
      const newApplication: TrackedApplication = {
        jobId: job.id,
        jobTitle: job.job_title,
        company: job.company,
        status: "Saved",
        lastUpdated: new Date().toISOString(),
      };
      setTrackedApplications(prev => [...prev, newApplication]);
      toast({ title: "Job Saved!", description: `${job.job_title} added to your application tracker.` });
    }
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
    if (!userProfile || !userProfile.professional_summary || !userProfile.desired_job_role || !userProfile.skills_list_text) {
      toast({ title: "Profile Incomplete", description: "Please complete your profile (summary, desired role, skills) to generate materials.", variant: "destructive" });
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
        userProfile: userProfile.professional_summary, // Using full professional summary as userProfile
        pointsToMention: [...(points.keyRequirements || []), ...(points.keySkills || [])],
      };
      const resumeResult = await generateResume(resumeInput);
      if (resumeResult) {
        setGeneratedResume(resumeResult.resume);
      }
    } catch (error) {
      console.error("Error generating resume:", error);
      toast({ title: "Resume Generation Failed", description: "Could not generate resume.", variant: "destructive" });
    } finally {
      setIsLoadingResume(false);
    }
  };

  const handleTriggerAICoverLetterGeneration = async (jobToGenerateFor: JobListing) => {
    if (!userProfile || !userProfile.professional_summary || !userProfile.desired_job_role || !userProfile.skills_list_text) {
      toast({ title: "Profile Incomplete", description: "Please complete your profile (summary, desired role, skills) to generate materials.", variant: "destructive" });
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
        userProfile: userProfile.professional_summary, // Using full professional summary as userProfile
        pointsToMention: [...(points.keyRequirements || []), ...(points.keySkills || [])],
      };
      const coverLetterResult = await generateCoverLetter(coverLetterInput);
      if (coverLetterResult) {
        setGeneratedCoverLetter(coverLetterResult.coverLetter);
      }
    } catch (error) {
      console.error("Error generating cover letter:", error);
      toast({ title: "Cover Letter Generation Failed", description: "Could not generate cover letter.", variant: "destructive" });
    } finally {
      setIsLoadingCoverLetter(false);
    }
  };

  const isProfileIncompleteForAIFeatures = !userProfile || !userProfile.professional_summary || !userProfile.desired_job_role || !userProfile.skills_list_text;


  if (isLoadingJobs) {
    return <FullPageLoading message="Finding best jobs for you..." />;
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

      {isProfileIncompleteForAIFeatures && (
        <Alert variant="default" className="bg-primary/10 border-primary/30">
          <Info className="h-5 w-5 text-primary" />
          <AlertTitle className="font-semibold text-primary">Complete Your Profile for Full AI Features!</AlertTitle>
          <AlertDescription className="text-primary/80">
            AI-powered match analysis and material generation require a complete profile (summary, desired role, and skills). Some AI features may be limited.
            <Button variant="link" asChild className="p-0 h-auto ml-1 text-primary font-semibold">
              <Link href="/profile">Update your profile now.</Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {jobs.length === 0 ? (
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
