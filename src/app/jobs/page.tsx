"use client";

import { useState, useEffect, useCallback } from 'react';
import type { JobOpportunity, UserProfileData, TrackedApplication } from '@/types';
import { sampleJobs } from '@/lib/sample-data';
import useLocalStorage from '@/hooks/use-local-storage';
import { JobCard } from '@/components/app/job-card';
import { JobDetailsModal } from '@/components/app/job-details-modal';
import { ApplicationMaterialsModal } from '@/components/app/application-materials-modal';
import { LoadingSpinner, FullPageLoading } from '@/components/app/loading-spinner';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Compass, Info, FileWarning } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// AI Flow Imports (ensure these paths are correct and functions are exported)
import { jobMatchExplanation, type JobMatchExplanationInput, type JobMatchExplanationOutput } from '@/ai/flows/job-match-explanation';
import { extractJobDescriptionPoints, type ExtractJobDescriptionPointsInput, type ExtractJobDescriptionPointsOutput } from '@/ai/flows/job-description-point-extractor';
import { generateResumeAndCoverLetter, type GenerateResumeAndCoverLetterInput, type GenerateResumeAndCoverLetterOutput } from '@/ai/flows/resume-cover-letter-generator';

export default function JobExplorerPage() {
  const [jobs, setJobs] = useState<JobOpportunity[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const [userProfile] = useLocalStorage<UserProfileData | null>('user-profile', null);
  const [trackedApplications, setTrackedApplications] = useLocalStorage<TrackedApplication[]>('tracked-applications', []);
  
  const [selectedJobForDetails, setSelectedJobForDetails] = useState<JobOpportunity | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isLoadingExplanation, setIsLoadingExplanation] = useState(false);

  const [selectedJobForMaterials, setSelectedJobForMaterials] = useState<JobOpportunity | null>(null);
  const [isMaterialsModalOpen, setIsMaterialsModalOpen] = useState(false);
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(false);
  const [generatedResume, setGeneratedResume] = useState<string | null>(null);
  const [generatedCoverLetter, setGeneratedCoverLetter] = useState<string | null>(null);

  const { toast } = useToast();

  const fetchJobDetailsWithAI = useCallback(async (job: JobOpportunity) => {
    if (!userProfile || !userProfile.rawText) {
      // If no profile, just show job without AI details
      setSelectedJobForDetails(job);
      setIsDetailsModalOpen(true);
      return;
    }

    setIsLoadingExplanation(true);
    setSelectedJobForDetails(job); // Show modal immediately with basic info
    setIsDetailsModalOpen(true);

    try {
      const input: JobMatchExplanationInput = {
        jobDescription: job.fullDescription || job.description,
        userProfile: userProfile.rawText,
        userPreferences: userProfile.preferences,
        userHistory: '', // Placeholder for actual user history logic if implemented
      };
      const explanationResult = await jobMatchExplanation(input);
      setSelectedJobForDetails(prevJob => prevJob ? {
        ...prevJob,
        matchScore: explanationResult.matchScore,
        matchExplanation: explanationResult.matchExplanation,
      } : null);
    } catch (error) {
      console.error("Error fetching AI match explanation:", error);
      toast({ title: "AI Analysis Failed", description: "Could not get AI match explanation.", variant: "destructive" });
      // Keep existing job data in modal, AI part will be missing
    } finally {
      setIsLoadingExplanation(false);
    }
  }, [userProfile, toast]);
  
  useEffect(() => {
    // Simulate fetching jobs
    const loadJobs = async () => {
      setIsLoadingJobs(true);
      // In a real app, fetch jobs from an API
      // For now, use sampleJobs and optionally enrich with AI scores if profile exists
      if (userProfile?.rawText && sampleJobs.length > 0) {
        // Optionally pre-calculate match scores for display on cards (can be slow for many jobs)
        // For this example, we'll calculate on demand when viewing details to speed up initial load.
        // If you want to pre-calculate:
        // const enrichedJobs = await Promise.all(sampleJobs.map(async (job) => { ... fetch AI ... return enrichedJob; }));
        // setJobs(enrichedJobs);
        setJobs(sampleJobs.map(j => ({...j, matchScore: undefined, matchExplanation: undefined }))); // Reset AI fields
      } else {
        setJobs(sampleJobs);
      }
      setIsLoadingJobs(false);
    };
    loadJobs();
  }, [userProfile]);


  const handleViewDetails = (job: JobOpportunity) => {
    fetchJobDetailsWithAI(job);
  };

  const handleSaveJob = (job: JobOpportunity) => {
    const existingApplication = trackedApplications.find(app => app.jobId === job.id);
    if (existingApplication) {
      // Unsave - remove from tracked applications
      setTrackedApplications(prev => prev.filter(app => app.jobId !== job.id));
      toast({ title: "Job Unsaved", description: `${job.title} removed from your tracker.` });
    } else {
      // Save - add to tracked applications
      const newApplication: TrackedApplication = {
        jobId: job.id,
        jobTitle: job.title,
        company: job.company,
        status: "Saved",
        lastUpdated: new Date().toISOString(),
      };
      setTrackedApplications(prev => [...prev, newApplication]);
      toast({ title: "Job Saved!", description: `${job.title} added to your application tracker.` });
    }
  };

  const handleGenerateMaterials = async (job: JobOpportunity) => {
    if (!userProfile || !userProfile.rawText) {
      toast({ title: "Profile Required", description: "Please complete your profile to generate application materials.", variant: "destructive" });
      return;
    }
    setSelectedJobForMaterials(job);
    setIsMaterialsModalOpen(true);
    setIsLoadingMaterials(true);
    setGeneratedResume(null);
    setGeneratedCoverLetter(null);

    try {
      const pointsInput: ExtractJobDescriptionPointsInput = { jobDescription: job.fullDescription || job.description };
      const pointsResult = await extractJobDescriptionPoints(pointsInput);
      
      const materialsInput: GenerateResumeAndCoverLetterInput = {
        jobDescription: job.fullDescription || job.description,
        userProfile: userProfile.rawText,
        pointsToMention: [...(pointsResult.keyRequirements || []), ...(pointsResult.keySkills || [])],
      };
      const materialsResult = await generateResumeAndCoverLetter(materialsInput);
      
      setGeneratedResume(materialsResult.resume);
      setGeneratedCoverLetter(materialsResult.coverLetter);
    } catch (error) {
      console.error("Error generating application materials:", error);
      toast({ title: "Generation Failed", description: "Could not generate application materials.", variant: "destructive" });
    } finally {
      setIsLoadingMaterials(false);
    }
  };

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

      {!userProfile?.rawText && (
        <Alert variant="default" className="bg-primary/10 border-primary/30 text-primary-dark">
          <Info className="h-5 w-5 text-primary" />
          <AlertTitle className="font-semibold text-primary">Complete Your Profile for Better Matches!</AlertTitle>
          <AlertDescription>
            AI-powered matching and material generation work best with a complete profile. 
            <Button variant="link" asChild className="p-0 h-auto ml-1 text-primary font-semibold">
              <a href="/profile">Update your profile now.</a>
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
              onGenerateMaterials={handleGenerateMaterials}
              isSaved={trackedApplications.some(app => app.jobId === job.id)}
            />
          ))}
        </div>
      )}

      <JobDetailsModal 
        job={selectedJobForDetails} 
        isOpen={isDetailsModalOpen} 
        onClose={() => setIsDetailsModalOpen(false)}
        onGenerateMaterials={handleGenerateMaterials}
        isLoadingExplanation={isLoadingExplanation}
      />

      <ApplicationMaterialsModal
        isOpen={isMaterialsModalOpen}
        onClose={() => setIsMaterialsModalOpen(false)}
        resume={generatedResume}
        coverLetter={generatedCoverLetter}
        isLoading={isLoadingMaterials}
        jobTitle={selectedJobForMaterials?.title}
      />
    </div>
  );
}
