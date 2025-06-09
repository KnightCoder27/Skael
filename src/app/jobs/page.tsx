
"use client";

import { useState, useEffect, useCallback } from 'react';
import type { JobListing, TrackedApplication, LocalUserActivity, ActivityType, UserProfileForJobFetching, UserProfileForRelevantJobs, RemotePreferenceAPI, Technology } from '@/types';
import useLocalStorage from '@/hooks/use-local-storage';
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/lib/apiClient';
import { JobCard } from '@/components/app/job-card';
import { JobDetailsModal } from '@/components/app/job-details-modal';
import { ApplicationMaterialsModal } from '@/components/app/application-materials-modal';
import { FullPageLoading, LoadingSpinner } from '@/components/app/loading-spinner';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Compass, Info, FileWarning, LogOut as LogOutIcon, ServerCrash, Search, ListChecks, Bot, DatabaseZap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { AxiosError } from 'axios';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SimpleJobListItem } from '@/components/app/simple-job-list-item';

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
  technologies: string[];
  api_id?: string | null;
}

type ActiveJobTab = "generate" | "relevant" | "all";

export default function JobExplorerPage() {
  const { currentUser, isLoadingAuth, isLoggingOut } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<ActiveJobTab>("relevant");

  const [relevantJobsList, setRelevantJobsList] = useState<JobListing[]>([]);
  const [allJobsList, setAllJobsList] = useState<JobListing[]>([]);

  const [isLoadingGenerateJobs, setIsLoadingGenerateJobs] = useState(false);
  const [isLoadingRelevantJobs, setIsLoadingRelevantJobs] = useState(false);
  const [isLoadingAllJobs, setIsLoadingAllJobs] = useState(false);

  const [errorGenerateJobs, setErrorGenerateJobs] = useState<string | null>(null);
  const [errorRelevantJobs, setErrorRelevantJobs] = useState<string | null>(null);
  const [errorAllJobs, setErrorAllJobs] = useState<string | null>(null);
  
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


  const mapBackendJobToFrontend = useCallback((backendJob: BackendJobListingResponseItem): JobListing => {
    return {
      ...backendJob, 
      technologies: backendJob.technologies?.map((name, index) => ({
        id: `${backendJob.id || 'no-id'}-tech-${index}`, 
        technology_name: name,
        technology_slug: name.toLowerCase().replace(/\s+/g, '-'),
      })) || [],
      companyLogo: `https://placehold.co/100x100.png?text=${encodeURIComponent(backendJob.company?.[0] || 'J')}`,
      matchScore: typeof backendJob.id === 'number' ? jobAnalysisCache[backendJob.id]?.matchScore : undefined,
      matchExplanation: typeof backendJob.id === 'number' ? jobAnalysisCache[backendJob.id]?.matchExplanation : undefined,
    };
  }, [jobAnalysisCache]);

  useEffect(() => {
    if (isLoggingOut) return;
    if (!isLoadingAuth && !currentUser) {
      toast({ title: "Access Denied", description: "Please log in to explore jobs.", variant: "destructive" });
      router.push('/auth');
    }
  }, [isLoadingAuth, currentUser, router, toast, isLoggingOut]);

  const fetchRelevantJobs = useCallback(async () => {
    if (!currentUser) {
      setErrorRelevantJobs("Please log in to view relevant jobs.");
      setRelevantJobsList([]);
      setIsLoadingRelevantJobs(false);
      return;
    }
    setIsLoadingRelevantJobs(true);
    setErrorRelevantJobs(null);
    try {
      let remotePreferenceValue: boolean | null = null;
      if (currentUser.remote_preference === "Remote") remotePreferenceValue = true;
      else if (currentUser.remote_preference === "Onsite") remotePreferenceValue = false;

      const payload: UserProfileForRelevantJobs = { 
        job_titles: currentUser.job_role ? [currentUser.job_role] : [],
        skills: currentUser.skills && currentUser.skills.length > 0 ? currentUser.skills : [],
        experience: currentUser.experience ?? 0, // Ensure experience is a number, default to 0
        locations: currentUser.preferred_locations && currentUser.preferred_locations.length > 0 ? currentUser.preferred_locations : [],
        countries: [], // As discussed, include empty array for countries
        remote: remotePreferenceValue,
      };
      const cleanedPayload = Object.fromEntries(Object.entries(payload).filter(([_, v]) => v !== undefined));
      
      console.log("DEBUG: Payload for /jobs/relevant_jobs:", JSON.stringify(cleanedPayload, null, 2));

      const response = await apiClient.post<BackendJobListingResponseItem[]>('/jobs/relevant_jobs', cleanedPayload);
      
      const validJobs = response.data.filter(job => typeof job.id === 'number' && job.id !== null && job.id !== undefined);
      if (validJobs.length !== response.data.length) {
        console.warn(`Relevant Jobs: Filtered out ${response.data.length - validJobs.length} jobs due to missing or invalid ID.`);
      }
      setRelevantJobsList(validJobs.map(mapBackendJobToFrontend));

    } catch (error) {
      const message = error instanceof AxiosError && error.response?.data?.detail ? error.response.data.detail : "Could not load relevant jobs.";
      setErrorRelevantJobs(message);
      toast({ title: "Failed to Load Relevant Jobs", description: message, variant: "destructive" });
    } finally {
      setIsLoadingRelevantJobs(false);
    }
  }, [currentUser, toast, mapBackendJobToFrontend]);

  const fetchAllJobs = useCallback(async () => {
    setIsLoadingAllJobs(true);
    setErrorAllJobs(null);
    try {
      const response = await apiClient.get<BackendJobListingResponseItem[]>('/jobs/list_jobs/');

      const validJobs = response.data.filter(job => typeof job.id === 'number' && job.id !== null && job.id !== undefined);
      if (validJobs.length !== response.data.length) {
        console.warn(`All Jobs: Filtered out ${response.data.length - validJobs.length} jobs due to missing or invalid ID.`);
      }
      setAllJobsList(validJobs.map(mapBackendJobToFrontend));

    } catch (error) {
      const message = error instanceof AxiosError && error.response?.data?.detail ? error.response.data.detail : "Could not load all jobs.";
      setErrorAllJobs(message);
      toast({ title: "Failed to Load All Jobs", description: message, variant: "destructive" });
    } finally {
      setIsLoadingAllJobs(false);
    }
  }, [toast, mapBackendJobToFrontend]);


  useEffect(() => {
    if (currentUser && !isLoggingOut) {
        if (activeTab === "relevant") { 
            fetchRelevantJobs();
        } else if (activeTab === "all") { 
            fetchAllJobs();
        }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, currentUser, isLoggingOut]); // fetchRelevantJobs and fetchAllJobs are memoized and will be stable if their deps are


  const handleGenerateJobs = async () => {
    if (!currentUser) {
      toast({ title: "Action Required", description: "Please log in to generate jobs.", variant: "destructive" });
      return;
    }
    setIsLoadingGenerateJobs(true);
    setErrorGenerateJobs(null);

    let remotePreferenceValue: boolean | null = null;
    if (currentUser.remote_preference === "Remote") remotePreferenceValue = true;
    else if (currentUser.remote_preference === "Onsite") remotePreferenceValue = false;

    const payload: UserProfileForJobFetching = {
      job_titles: currentUser.job_role ? [currentUser.job_role] : [],
      skills: currentUser.skills && currentUser.skills.length > 0 ? currentUser.skills : [],
      experience: currentUser.experience ?? 0, 
      locations: currentUser.preferred_locations && currentUser.preferred_locations.length > 0 ? currentUser.preferred_locations : [],
      countries: [], // As discussed, include empty array
      remote: remotePreferenceValue,
    };
    
    const cleanedPayload = Object.fromEntries(Object.entries(payload).filter(([_, v]) => v !== undefined));
    console.log("DEBUG: Payload for /jobs/fetch_jobs:", JSON.stringify(cleanedPayload, null, 2));

    try {
      const response = await apiClient.post<{ status: string; jobs_fetched: number; jobs: BackendJobListingResponseItem[] }>('/jobs/fetch_jobs', cleanedPayload);
      toast({ title: "Job Fetch Initiated", description: `${response.data.jobs_fetched} jobs fetched/processed from external API. Newly fetched jobs might appear in 'All Jobs' or 'Relevant Jobs' after a refresh or switching tabs.` });
      
      if (response.data.jobs_fetched > 0) {
        // If jobs were fetched, we might want to encourage user to switch tabs or auto-refresh a tab
        if (activeTab === "all") {
            fetchAllJobs(); // Re-fetch all jobs to include new ones
        } else if (activeTab === "relevant") {
            fetchRelevantJobs(); // Re-fetch relevant jobs
        }
      }
    } catch (error) {
      const message = error instanceof AxiosError && error.response?.data?.detail ? error.response.data.detail : "Failed to initiate job fetching from external API.";
      setErrorGenerateJobs(message);
      toast({ title: "Job Fetch Failed", description: message, variant: "destructive" });
    } finally {
      setIsLoadingGenerateJobs(false);
    }
  };

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
    if (job.matchScore !== undefined && job.matchExplanation) return;
    
    if (typeof job.id !== 'number') {
        console.warn("Cannot fetch AI details for job with invalid ID:", job);
        return;
    }
    const cachedAnalysis = jobAnalysisCache[job.id];
    if (cachedAnalysis) {
      const updateWithCache = (prev: JobListing[]) => prev.map(j => j.id === job.id ? { ...j, ...cachedAnalysis } : j);
      setRelevantJobsList(updateWithCache);
      setAllJobsList(updateWithCache);
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
        jobDescription: job.description || '',
        userProfile: currentUser.professional_summary || '',
        userPreferences: currentUser.job_role || '',
        userHistory: '',
      };
      const explanationResult = await jobMatchExplanation(input);
      const updateJobsState = (prevJobs: JobListing[]) => prevJobs.map(j => j.id === job.id ? { ...j, ...explanationResult } : j);
      setRelevantJobsList(updateJobsState);
      setAllJobsList(updateJobsState);
      setSelectedJobForDetails(prevJob => prevJob ? { ...prevJob, ...explanationResult } : null);
      setJobAnalysisCache(prevCache => ({ ...prevCache, [job.id as number]: explanationResult }));
      addLocalActivity({ type: "MATCH_ANALYSIS_VIEWED", jobId: job.id, jobTitle: job.job_title, company: job.company, details: { matchScore: explanationResult.matchScore }});
    } catch (error) {
      console.error("Error fetching AI match explanation:", error);
      toast({ title: "AI Analysis Failed", description: "Could not get AI match explanation.", variant: "destructive" });
    } finally {
      setIsLoadingExplanation(false);
    }
  }, [currentUser, toast, jobAnalysisCache, setJobAnalysisCache, addLocalActivity]);

  const handleViewDetails = (job: JobListing) => fetchJobDetailsWithAI(job);

  const handleSaveJob = (job: JobListing) => {
    if (typeof job.id !== 'number') {
        toast({ title: "Error", description: "Cannot save job with invalid ID.", variant: "destructive"});
        return;
    }
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
      const newApplication: TrackedApplication = { id: job.id.toString() + Date.now().toString(), jobId: job.id, jobTitle: job.job_title, company: job.company, status: "Saved", lastUpdated: new Date().toISOString() };
      setTrackedApplications(prev => [...prev, newApplication]);
      toast({ title: "Job Saved!", description: toastMessage });
    }
    addLocalActivity({ type: activityType, jobId: job.id, jobTitle: job.job_title, company: job.company, details: statusToLog ? { status: statusToLog } : {}});
  };

  const openMaterialsModal = (job: JobListing) => {
    if (typeof job.id !== 'number') {
        toast({ title: "Error", description: "Cannot generate materials for job with invalid ID.", variant: "destructive"});
        return;
    }
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
    if (typeof jobToGetPointsFor.id !== 'number') return null;
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
    if (typeof jobToGenerateFor.id !== 'number') return;
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
      if (resumeResult) {
        setGeneratedResume(resumeResult.resume);
        addLocalActivity({ type: "RESUME_GENERATED_FOR_JOB", jobId: jobToGenerateFor.id, jobTitle: jobToGenerateFor.job_title, company: jobToGenerateFor.company, details: { success: true }});
      }
    } catch (error) {
      console.error("Error generating resume:", error);
      toast({ title: "Resume Generation Failed", description: "Could not generate resume.", variant: "destructive" });
    } finally {
      setIsLoadingResume(false);
    }
  };

  const handleTriggerAICoverLetterGeneration = async (jobToGenerateFor: JobListing) => {
    if (typeof jobToGenerateFor.id !== 'number') return;
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
      if (coverLetterResult) {
        setGeneratedCoverLetter(coverLetterResult.coverLetter);
        addLocalActivity({ type: "COVER_LETTER_GENERATED_FOR_JOB", jobId: jobToGenerateFor.id, jobTitle: jobToGenerateFor.job_title, company: jobToGenerateFor.company, details: { success: true }});
      }
    } catch (error) {
      console.error("Error generating cover letter:", error);
      toast({ title: "Cover Letter Generation Failed", description: "Could not generate cover letter.", variant: "destructive" });
    } finally {
      setIsLoadingCoverLetter(false);
    }
  };

  const isProfileIncompleteForAIFeatures = currentUser && (!currentUser.professional_summary || !currentUser.skills || currentUser.skills.length === 0);

  if (isLoggingOut) return <FullPageLoading message="Logging out..." />;
  if (isLoadingAuth) return <FullPageLoading message="Authenticating..." />;
  if (!currentUser && !isLoadingAuth && !isLoggingOut) return <FullPageLoading message="Verifying session..." />;

  return (
    <div className="space-y-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold font-headline flex items-center">
          <Compass className="mr-3 h-8 w-8 text-primary" />
          Explore Jobs
        </h1>
        <p className="text-muted-foreground">
          Generate new job listings, find relevant opportunities, or browse all available jobs.
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
      
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ActiveJobTab)} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="generate"><Bot className="mr-2 h-4 w-4" />Generate Jobs</TabsTrigger>
          <TabsTrigger value="relevant"><Search className="mr-2 h-4 w-4" />Relevant Jobs</TabsTrigger>
          <TabsTrigger value="all"><ListChecks className="mr-2 h-4 w-4" />All Jobs</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-6">
          <div className="p-6 border rounded-lg bg-card shadow">
            <h2 className="text-xl font-semibold mb-2 flex items-center"><DatabaseZap className="mr-2 h-5 w-5 text-primary"/>Fetch New Jobs via External API</h2>
            <p className="text-muted-foreground mb-4">
              Click the button below to fetch the latest job listings based on your profile from our external job provider. This process may take some time.
            </p>
            <Button onClick={handleGenerateJobs} disabled={isLoadingGenerateJobs} size="lg">
              {isLoadingGenerateJobs ? <LoadingSpinner className="mr-2" /> : <Bot className="mr-2 h-5 w-5" />}
              {isLoadingGenerateJobs ? 'Fetching Jobs...' : 'Fetch New Jobs'}
            </Button>
            {errorGenerateJobs && (
              <Alert variant="destructive" className="mt-4">
                <ServerCrash className="h-5 w-5" />
                <AlertTitle>Error Generating Jobs</AlertTitle>
                <AlertDescription>{errorGenerateJobs}</AlertDescription>
              </Alert>
            )}
          </div>
        </TabsContent>

        <TabsContent value="relevant" className="space-y-6">
          {isLoadingRelevantJobs && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <LoadingSpinner size={40} />
              <p className="mt-3 text-lg text-muted-foreground">Loading relevant jobs...</p>
            </div>
          )}
          {!isLoadingRelevantJobs && errorRelevantJobs && (
            <Alert variant="destructive" className="my-6">
              <ServerCrash className="h-5 w-5" />
              <AlertTitle>Error Loading Relevant Jobs</AlertTitle>
              <AlertDescription>{errorRelevantJobs}</AlertDescription>
            </Alert>
          )}
          {!isLoadingRelevantJobs && !errorRelevantJobs && relevantJobsList.length === 0 && (
             <div className="text-center py-12">
              <FileWarning className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-xl font-semibold">No Relevant Jobs Found</h3>
              <p className="mt-1 text-muted-foreground">Try updating your profile skills or check back later. You can also fetch new jobs from the "Generate Jobs" tab.</p>
              {currentUser?.skills?.length === 0 && (
                <p className="mt-2 text-sm text-primary/80">
                  Hint: Add some skills to your <Button variant="link" asChild className="p-0 h-auto text-primary font-semibold"><Link href="/profile">profile</Link></Button> to see relevant jobs.
                </p>
              )}
            </div>
          )}
          {!isLoadingRelevantJobs && !errorRelevantJobs && relevantJobsList.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {relevantJobsList.map(job => (
                <JobCard key={`relevant-${job.id}`} job={job} onViewDetails={handleViewDetails} onSaveJob={handleSaveJob} onGenerateMaterials={openMaterialsModal} isSaved={trackedApplications.some(app => app.jobId === job.id)} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-6">
          {isLoadingAllJobs && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <LoadingSpinner size={40} />
              <p className="mt-3 text-lg text-muted-foreground">Loading all jobs...</p>
            </div>
          )}
          {!isLoadingAllJobs && errorAllJobs && (
            <Alert variant="destructive" className="my-6">
              <ServerCrash className="h-5 w-5" />
              <AlertTitle>Error Loading All Jobs</AlertTitle>
              <AlertDescription>{errorAllJobs}</AlertDescription>
            </Alert>
          )}
          {!isLoadingAllJobs && !errorAllJobs && allJobsList.length === 0 && (
            <div className="text-center py-12">
              <FileWarning className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-xl font-semibold">No Jobs Found</h3>
              <p className="mt-1 text-muted-foreground">No jobs were found in our database currently. Try generating jobs from the "Generate Jobs" tab.</p>
            </div>
          )}
          {!isLoadingAllJobs && !errorAllJobs && allJobsList.length > 0 && (
            <div className="space-y-4">
              {allJobsList.map(job => (
                <SimpleJobListItem key={`all-${job.id}`} job={job} onViewDetails={handleViewDetails} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <JobDetailsModal job={selectedJobForDetails} isOpen={isDetailsModalOpen} onClose={() => setIsDetailsModalOpen(false)} onGenerateMaterials={openMaterialsModal} isLoadingExplanation={isLoadingExplanation} />
      <ApplicationMaterialsModal isOpen={isMaterialsModalOpen} onClose={() => setIsMaterialsModalOpen(false)} resume={generatedResume} coverLetter={generatedCoverLetter} isLoadingResume={isLoadingResume} isLoadingCoverLetter={isLoadingCoverLetter} job={selectedJobForMaterials} onGenerateResume={handleTriggerAIResumeGeneration} onGenerateCoverLetter={handleTriggerAICoverLetterGeneration} />
    </div>
  );
}


    