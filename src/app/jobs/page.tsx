
"use client";

import { useState, useEffect, useCallback } from 'react';
import type { JobListing, User, TrackedApplication } from '@/types'; 
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
import Link from 'next/link'; 

// AI Flow Imports
import { jobMatchExplanation, type JobMatchExplanationInput, type JobMatchExplanationOutput } from '@/ai/flows/job-match-explanation';
import { extractJobDescriptionPoints, type ExtractJobDescriptionPointsInput, type ExtractJobDescriptionPointsOutput } from '@/ai/flows/job-description-point-extractor';
import { 
  generateResume, 
  generateCoverLetter, 
  type GenerateDocumentInput,
  type GenerateResumeOutput,
  type GenerateCoverLetterOutput 
} from '@/ai/flows/resume-cover-letter-generator';

export default function JobExplorerPage() {
  const [jobs, setJobs] = useState<JobListing[]>([]); 
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const [userProfile] = useLocalStorage<User | null>('user-profile', null); 
  const [trackedApplications, setTrackedApplications] = useLocalStorage<TrackedApplication[]>('tracked-applications', []);
  
  const [selectedJobForDetails, setSelectedJobForDetails] = useState<JobListing | null>(null); 
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isLoadingExplanation, setIsLoadingExplanation] = useState(false);

  const [selectedJobForMaterials, setSelectedJobForMaterials] = useState<JobListing | null>(null); 
  const [isMaterialsModalOpen, setIsMaterialsModalOpen] = useState(false);
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(false);
  const [generatedResume, setGeneratedResume] = useState<string | null>(null);
  const [generatedCoverLetter, setGeneratedCoverLetter] = useState<string | null>(null);

  const { toast } = useToast();

  const fetchJobDetailsWithAI = useCallback(async (job: JobListing) => { 
    if (!userProfile || !userProfile.professional_summary) { 
      setSelectedJobForDetails(job);
      setIsDetailsModalOpen(true);
      return;
    }

    setIsLoadingExplanation(true);
    setSelectedJobForDetails(job); 
    setIsDetailsModalOpen(true);

    try {
      const input: JobMatchExplanationInput = {
        jobDescription: job.description, 
        userProfile: userProfile.professional_summary, 
        userPreferences: userProfile.desired_job_role || '', 
        userHistory: '', 
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
    } finally {
      setIsLoadingExplanation(false);
    }
  }, [userProfile, toast]);
  
  useEffect(() => {
    const loadJobs = async () => {
      setIsLoadingJobs(true);
      setJobs(sampleJobs.map(j => ({...j, matchScore: undefined, matchExplanation: undefined })));
      setIsLoadingJobs(false);
    };
    loadJobs();
  }, []);


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
    setIsLoadingMaterials(false); // Ensure loading is false initially
    setIsMaterialsModalOpen(true);
  };

  const handleTriggerAIMaterialsGeneration = async (jobToGenerateFor: JobListing) => {
    if (!userProfile || !userProfile.professional_summary || !userProfile.desired_job_role || !userProfile.skills_list_text) { 
      toast({ title: "Profile Incomplete", description: "Please complete your professional summary, desired job role, and key skills in your profile to generate application materials.", variant: "destructive" });
      setIsMaterialsModalOpen(false); // Close modal if profile is incomplete
      return;
    }

    setIsLoadingMaterials(true);
    setGeneratedResume(null); // Clear previous materials
    setGeneratedCoverLetter(null);

    try {
      const pointsInput: ExtractJobDescriptionPointsInput = { jobDescription: jobToGenerateFor.description }; 
      const pointsResult = await extractJobDescriptionPoints(pointsInput);
      
      const materialsInput: GenerateDocumentInput = {
        jobDescription: jobToGenerateFor.description, 
        userProfile: userProfile.professional_summary, 
        pointsToMention: [...(pointsResult.keyRequirements || []), ...(pointsResult.keySkills || [])],
      };
      
      const [resumeResult, coverLetterResult] = await Promise.all([
        generateResume(materialsInput),
        generateCoverLetter(materialsInput)
      ]);
      
      if (resumeResult) {
        setGeneratedResume(resumeResult.resume);
      }
      if (coverLetterResult) {
        setGeneratedCoverLetter(coverLetterResult.coverLetter);
      }

    } catch (error) {
      console.error("Error generating application materials:", error);
      toast({ title: "Generation Failed", description: "Could not generate application materials.", variant: "destructive" });
    } finally {
      setIsLoadingMaterials(false);
    }
  };

  const isProfileIncomplete = !userProfile || !userProfile.professional_summary || !userProfile.desired_job_role || !userProfile.skills_list_text;

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

      {isProfileIncomplete && ( 
        <Alert variant="default" className="bg-primary/10 border-primary/30">
          <Info className="h-5 w-5 text-primary" />
          <AlertTitle className="font-semibold text-primary">Complete Your Profile for AI Features!</AlertTitle>
          <AlertDescription className="text-primary/80">
            AI-powered matching and material generation work best with a complete profile (summary, desired role, and skills). 
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
              onGenerateMaterials={openMaterialsModal} // Changed to openMaterialsModal
              isSaved={trackedApplications.some(app => app.jobId === job.id)}
            />
          ))}
        </div>
      )}

      <JobDetailsModal 
        job={selectedJobForDetails} 
        isOpen={isDetailsModalOpen} 
        onClose={() => setIsDetailsModalOpen(false)}
        onGenerateMaterials={openMaterialsModal} // Changed to openMaterialsModal
        isLoadingExplanation={isLoadingExplanation}
      />

      <ApplicationMaterialsModal
        isOpen={isMaterialsModalOpen}
        onClose={() => setIsMaterialsModalOpen(false)}
        resume={generatedResume}
        coverLetter={generatedCoverLetter}
        isLoading={isLoadingMaterials}
        job={selectedJobForMaterials} // Pass the full job object
        onGenerate={handleTriggerAIMaterialsGeneration} // Pass the generation trigger function
      />
    </div>
  );
}

