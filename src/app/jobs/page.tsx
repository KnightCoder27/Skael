
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import type { JobListing, LocalUserActivity, ActivityType, UserProfileForJobFetching, UserProfileForRelevantJobs, Technology, SaveJobPayload, AnalyzeJobPayload, UserActivityOut, BackendJobListingResponseItem, BackendMatchScoreLogItem } from '@/types'; // Removed ApplyJobFormData
import useLocalStorage from '@/hooks/use-local-storage';
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/lib/apiClient';
import { JobCard } from '@/components/app/job-card';
import { JobDetailsModal } from '@/components/app/job-details-modal';
import { ApplicationMaterialsModal } from '@/components/app/application-materials-modal';
import { FullPageLoading, LoadingSpinner } from '@/components/app/loading-spinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Compass, Info, FileWarning, ServerCrash, Search, ListChecks, Bot, DatabaseZap, Filter, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { AxiosError } from 'axios';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SimpleJobListItem } from '@/components/app/simple-job-list-item';
import { PaginationControls } from '@/components/app/PaginationControls';

// AI Flow Imports
import { jobMatchExplanation, type JobMatchExplanationInput } from '@/ai/flows/job-match-explanation';
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

type ActiveJobTab = "generate" | "relevant" | "all";
const JOBS_PER_PAGE = 9;

const isValidDbId = (idInput: any): idInput is number | string => {
  if (idInput === null || idInput === undefined) {
    return false;
  }
  const numId = Number(idInput);
  return !isNaN(numId) && isFinite(numId);
};


export default function JobExplorerPage() {
  const { currentUser, isLoadingAuth, isLoggingOut } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<ActiveJobTab>("relevant");

  const [relevantJobsList, setRelevantJobsList] = useState<JobListing[]>([]);
  const [allJobsList, setAllJobsList] = useState<JobListing[]>([]);
  const [fetchedApiJobs, setFetchedApiJobs] = useState<JobListing[]>([]);
  const [lastFetchCount, setLastFetchCount] = useState<number | null>(null);

  const [isLoadingGenerateJobs, setIsLoadingGenerateJobs] = useState(false);
  const [isLoadingRelevantJobs, setIsLoadingRelevantJobs] = useState(false);
  const [isLoadingAllJobs, setIsLoadingAllJobs] = useState(false);

  const [errorGenerateJobs, setErrorGenerateJobs] = useState<string | null>(null);
  const [errorRelevantJobs, setErrorRelevantJobs] = useState<string | null>(null);
  const [errorAllJobs, setErrorAllJobs] = useState<string | null>(null);

  const [filterTechnology, setFilterTechnology] = useState('');
  const [filterLocation, setFilterLocation] = useState('');

  const [relevantJobsCurrentPage, setRelevantJobsCurrentPage] = useState(1);
  const [allJobsCurrentPage, setAllJobsCurrentPage] = useState(1);
  const [hasNextRelevantPage, setHasNextRelevantPage] = useState(true);
  const [hasNextAllPage, setHasNextAllPage] = useState(true);

  const [jobAnalysisCache, setJobAnalysisCache] = useLocalStorage<JobAnalysisCache>('job-ai-analysis-cache', {});
  const jobAnalysisCacheRef = useRef(jobAnalysisCache);
  useEffect(() => {
    jobAnalysisCacheRef.current = jobAnalysisCache;
  }, [jobAnalysisCache]);

  const [localUserActivities, setLocalUserActivities] = useLocalStorage<LocalUserActivity[]>('user-activity-log', []);
  const [savedJobIds, setSavedJobIds] = useState<Set<number>>(new Set());

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

  const [isCacheReadyForAnalysis, setIsCacheReadyForAnalysis] = useState(false);
  const [jobPendingAnalysis, setJobPendingAnalysis] = useState<JobListing | null>(null);


  const mapBackendJobToFrontend = useCallback((backendJob: BackendJobListingResponseItem): JobListing => {
    let numericDbId: number;

    if (isValidDbId(backendJob.id)) {
        if (typeof backendJob.id === 'string') {
            numericDbId = parseInt(backendJob.id, 10);
            if (isNaN(numericDbId)) {
                console.warn(`mapBackendJobToFrontend: DB ID string '${backendJob.id}' could not be parsed to int for job: ${backendJob.job_title}. API ID: ${backendJob.api_id}. Assigning temporary ID.`);
                numericDbId = -Date.now() - Math.random();
            }
        } else {
            numericDbId = backendJob.id as number;
        }
    } else {
        console.warn(`mapBackendJobToFrontend: Encountered job with invalid/missing DB ID. Original DB ID: ${backendJob.id} (type: ${typeof backendJob.id}), API ID: ${backendJob.api_id}, Title: ${backendJob.job_title}. Assigning temporary ID.`);
        numericDbId = -Date.now() - Math.random();
    }

    const technologiesFormatted: Technology[] = Array.isArray(backendJob.technologies)
    ? backendJob.technologies.map((name, index) => ({
        id: `${numericDbId}-tech-${index}`, 
        technology_name: name,
        technology_slug: name.toLowerCase().replace(/\s+/g, '-'),
      }))
    : [];

    const companyName = backendJob.company || backendJob.company_object?.name || "N/A";
    const companyLogo = backendJob.company_object?.logo || `https://placehold.co/100x100.png?text=${encodeURIComponent(companyName?.[0] || 'J')}`;
    
    const cachedAnalysis = (numericDbId >= 0 && jobAnalysisCacheRef.current[numericDbId]) ? jobAnalysisCacheRef.current[numericDbId] : {};

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
      matchScore: cachedAnalysis.matchScore,
      matchExplanation: cachedAnalysis.matchExplanation,
    };
  }, []); 


  const fetchRelevantJobs = useCallback(async (page = 1) => {
    if (!currentUser) {
      setErrorRelevantJobs("Please log in to view relevant jobs.");
      setRelevantJobsList([]);
      return;
    }
    setIsLoadingRelevantJobs(true);
    setErrorRelevantJobs(null);
    try {
      const payload: UserProfileForRelevantJobs = {
        job_titles: currentUser.job_role ? [currentUser.job_role] : [],
        skills: currentUser.skills || [],
        experience: currentUser.experience ?? 0,
        locations: currentUser.preferred_locations || [],
        countries: [],
        remote: currentUser.remote_preference === "Remote" ? true : (currentUser.remote_preference === "Onsite" ? false : null),
      };
      const cleanedPayload = Object.fromEntries(Object.entries(payload).filter(([_, v]) => v !== undefined && v !== null && (Array.isArray(v) ? v.length > 0 : true)));

      if (!cleanedPayload.hasOwnProperty('job_titles')) cleanedPayload.job_titles = [];
      if (!cleanedPayload.hasOwnProperty('skills')) cleanedPayload.skills = [];
      if (!cleanedPayload.hasOwnProperty('locations')) cleanedPayload.locations = [];
      if (!cleanedPayload.hasOwnProperty('countries')) cleanedPayload.countries = [];

      const skip = (page - 1) * JOBS_PER_PAGE;
      const limit = JOBS_PER_PAGE;

      const response = await apiClient.post<BackendJobListingResponseItem[]>('/jobs/relevant_jobs', cleanedPayload, { params: { skip, limit } });
      const mappedJobs = response.data.map(job => mapBackendJobToFrontend(job));
      setRelevantJobsList(mappedJobs);
      // setRelevantJobsCurrentPage(page); // Page state updated by pagination controls
      setHasNextRelevantPage(mappedJobs.length === JOBS_PER_PAGE);

    } catch (error) {
      const message = error instanceof AxiosError && error.response?.data?.detail ? error.response.data.detail : "Could not load relevant jobs.";
      setErrorRelevantJobs(message);
      toast({ title: "Failed to Load Relevant Jobs", description: message, variant: "destructive" });
    } finally {
      setIsLoadingRelevantJobs(false);
    }
  }, [currentUser, toast, mapBackendJobToFrontend]);

  const fetchAllJobs = useCallback(async (page = 1) => {
    if (!currentUser) {
      setErrorAllJobs("Please log in to view all jobs.");
      setAllJobsList([]);
      return;
    }
    setIsLoadingAllJobs(true);
    setErrorAllJobs(null);
    try {
      const skip = (page - 1) * JOBS_PER_PAGE;
      const limit = JOBS_PER_PAGE;
      const response = await apiClient.get<BackendJobListingResponseItem[]>('/jobs/list_jobs/', { params: { skip, limit } });
      const mappedJobs = response.data.map(job => mapBackendJobToFrontend(job));
      setAllJobsList(mappedJobs);
      // setAllJobsCurrentPage(page); // Page state updated by pagination controls
      setHasNextAllPage(mappedJobs.length === JOBS_PER_PAGE);
    } catch (error) {
      const message = error instanceof AxiosError && error.response?.data?.detail ? error.response.data.detail : "Could not load all jobs.";
      setErrorAllJobs(message);
      toast({ title: "Failed to Load All Jobs", description: message, variant: "destructive" });
    } finally {
      setIsLoadingAllJobs(false);
    }
  }, [currentUser, toast, mapBackendJobToFrontend]);


  const handleApplyFilters = useCallback(async (page = 1) => {
    if (!currentUser) {
      setErrorAllJobs("Please log in to filter jobs.");
      setAllJobsList([]);
      return;
    }
    setIsLoadingAllJobs(true);
    setErrorAllJobs(null);
    try {
      const skip = (page - 1) * JOBS_PER_PAGE;
      const limit = JOBS_PER_PAGE;
      const params = new URLSearchParams();
      if (filterTechnology) params.append('technology', filterTechnology);
      if (filterLocation) params.append('location', filterLocation);
      params.append('skip', skip.toString());
      params.append('limit', limit.toString());
      
      const finalEndpoint = `/jobs/?${params.toString()}`;

      const response = await apiClient.get<BackendJobListingResponseItem[]>(finalEndpoint);
      const mappedJobs = response.data.map(job => mapBackendJobToFrontend(job));
      setAllJobsList(mappedJobs);
      // setAllJobsCurrentPage(page); // Page state updated by pagination controls
      setHasNextAllPage(mappedJobs.length === JOBS_PER_PAGE);

      if (mappedJobs.length === 0 && (filterTechnology || filterLocation)) {
        toast({ title: "No Jobs Found", description: "No jobs matched your filter criteria." });
      } else if (filterTechnology || filterLocation) {
         toast({ title: "Filters Applied", description: `Showing jobs matching your criteria.` });
      }
    } catch (error) {
      const message = error instanceof AxiosError && error.response?.data?.detail ? error.response.data.detail : "Could not load filtered jobs.";
      setErrorAllJobs(message);
      toast({ title: "Failed to Load Filtered Jobs", description: message, variant: "destructive" });
    } finally {
      setIsLoadingAllJobs(false);
    }
  }, [currentUser, toast, mapBackendJobToFrontend, filterTechnology, filterLocation]);

  const handleClearFilters = useCallback(() => {
    setFilterTechnology('');
    setFilterLocation('');
    setAllJobsCurrentPage(1); 
    // The main useEffect will now pick up the change in allJobsCurrentPage and filter states
    // and call fetchAllJobs(1) because filters are now empty.
  }, []);


 const populateCacheAndSavedJobIds = useCallback(async () => {
    if (!currentUser || !currentUser.id) {
      console.log("JobExplorer: populateCache - No current user or user ID. Cache not populated from backend.");
      setIsCacheReadyForAnalysis(true); 
      return;
    }
    console.log("JobExplorer: Starting populateCacheAndSavedJobIds for user:", currentUser.id);
    setIsCacheReadyForAnalysis(false);
    
    const newAiCacheUpdates: JobAnalysisCache = {};
    let generalActivitiesError = null;
    let matchScoresError = null;

    console.log("JobExplorer: Checking currentUser.match_scores:", currentUser?.match_scores);
    if (currentUser.match_scores && Array.isArray(currentUser.match_scores)) {
        currentUser.match_scores.forEach(scoreLog => {
            if (scoreLog.job_id != null && scoreLog.score != null && scoreLog.explanation != null) {
                newAiCacheUpdates[scoreLog.job_id] = {
                    matchScore: scoreLog.score,
                    matchExplanation: scoreLog.explanation,
                };
            }
        });
        console.log(`JobExplorer: Populated ${Object.keys(newAiCacheUpdates).length} AI analysis entries from currentUser.match_scores.`);
    } else {
        console.log("JobExplorer: currentUser.match_scores is NOT available or not an array. Historical AI scores cannot be populated from user object.");
        toast({
            title: "Historical AI Scores Not Loaded",
            description: "Your profile data from the backend does not include historical match scores. New analyses will be performed as needed. This is expected if your backend GET /users/{id} doesn't include them yet.",
            variant: "default",
            duration: 7000,
        });
    }
    
    try {
      const response = await apiClient.get<UserActivityOut[]>(`/activity/user/${currentUser.id}`);
      const activities = response.data;
      const latestJobActions: Record<number, { action: 'JOB_SAVED' | 'JOB_UNSAVED', timestamp: string }> = {};

      activities.forEach(activity => {
        if (activity.job_id !== null && activity.job_id !== undefined && (activity.action_type === 'JOB_SAVED' || activity.action_type === 'JOB_UNSAVED')) {
          const existing = latestJobActions[activity.job_id];
          if (!existing || new Date(activity.created_at) > new Date(existing.timestamp)) {
            latestJobActions[activity.job_id] = {
              action: activity.action_type as 'JOB_SAVED' | 'JOB_UNSAVED',
              timestamp: activity.created_at
            };
          }
        }
      });

      const currentSavedIds = new Set<number>();
      for (const jobIdStr in latestJobActions) {
        const jobId = parseInt(jobIdStr, 10);
        if (latestJobActions[jobId].action === 'JOB_SAVED') {
          currentSavedIds.add(jobId);
        }
      }
      
      setSavedJobIds(prevSavedIds => {
        if (prevSavedIds.size === currentSavedIds.size && [...prevSavedIds].every(id => currentSavedIds.has(id))) {
          return prevSavedIds; 
        }
        console.log("JobExplorer: Saved Job IDs updated from activities:", currentSavedIds);
        return currentSavedIds;
      });
    } catch (error) {
      console.error("Error fetching general activities:", error);
      generalActivitiesError = error;
    }

    if (Object.keys(newAiCacheUpdates).length > 0) {
        setJobAnalysisCache(prevCache => {
          const changed = Object.keys(newAiCacheUpdates).some(
            key => newAiCacheUpdates[Number(key)]?.matchScore !== prevCache[Number(key)]?.matchScore ||
                   newAiCacheUpdates[Number(key)]?.matchExplanation !== prevCache[Number(key)]?.matchExplanation
          );
          if (changed) {
            console.log("JobExplorer: AI Analysis cache updated from currentUser.match_scores.");
            return { ...prevCache, ...newAiCacheUpdates };
          }
          return prevCache;
        });

        const updateJobItemsInList = (list: JobListing[], sourceCache: JobAnalysisCache): JobListing[] => {
          let listChanged = false;
          const newList = list.map(job => {
            const newlyCachedScoreData = sourceCache[job.id];
            if (newlyCachedScoreData && (job.matchScore !== newlyCachedScoreData.matchScore || job.matchExplanation !== newlyCachedScoreData.matchExplanation)) {
              listChanged = true;
              return { ...job, matchScore: newlyCachedScoreData.matchScore, matchExplanation: newlyCachedScoreData.matchExplanation };
            }
            return job;
          });
          if(listChanged) console.log("JobExplorer: Job list updated with new AI scores from currentUser.match_scores.");
          return listChanged ? newList : list;
        };
        setRelevantJobsList(prev => updateJobItemsInList(prev, newAiCacheUpdates));
        setAllJobsList(prev => updateJobItemsInList(prev, newAiCacheUpdates));
        setFetchedApiJobs(prev => updateJobItemsInList(prev, newAiCacheUpdates));
      }
    
    if (generalActivitiesError) {
      toast({ title: "Partial Cache Sync", description: "Could not sync all activity data. Saved job status might be affected.", variant: "destructive" });
    }
    
    console.log("JobExplorer: populateCacheAndSavedJobIds finished. Setting isCacheReadyForAnalysis to true.");
    setIsCacheReadyForAnalysis(true);
  }, [currentUser, setJobAnalysisCache, setSavedJobIds, toast]);


  useEffect(() => {
    if (currentUser && !isLoggingOut) {
      populateCacheAndSavedJobIds(); 
    } else if (!currentUser && !isLoadingAuth && !isLoggingOut) {
        setIsCacheReadyForAnalysis(true);
    }
  }, [currentUser, isLoggingOut, isLoadingAuth, populateCacheAndSavedJobIds]); 

  useEffect(() => {
    if (currentUser && !isLoggingOut && isCacheReadyForAnalysis) { 
      if (activeTab === "relevant") {
        fetchRelevantJobs(relevantJobsCurrentPage);
      } else if (activeTab === "all") {
        if (!filterTechnology && !filterLocation) {
          fetchAllJobs(allJobsCurrentPage);
        } else {
          handleApplyFilters(allJobsCurrentPage);
        }
      }
    }
  }, [
    activeTab, 
    currentUser, 
    isLoggingOut, 
    isCacheReadyForAnalysis, 
    relevantJobsCurrentPage, 
    allJobsCurrentPage, 
    filterTechnology, 
    filterLocation,
    fetchRelevantJobs, 
    fetchAllJobs,       
    handleApplyFilters 
  ]);


  const handleGenerateJobs = async () => {
    if (!currentUser) {
      toast({ title: "Action Required", description: "Please log in to generate jobs.", variant: "destructive" });
      return;
    }
    setIsLoadingGenerateJobs(true);
    setErrorGenerateJobs(null);
    setFetchedApiJobs([]);
    setLastFetchCount(null);

    const payload: UserProfileForJobFetching = {
      job_titles: currentUser.job_role ? [currentUser.job_role] : [],
      skills: currentUser.skills || [],
      experience: currentUser.experience ?? 0,
      locations: currentUser.preferred_locations || [],
      countries: [],
      remote: currentUser.remote_preference === "Remote" ? true : (currentUser.remote_preference === "Onsite" ? false : null),
    };

    const cleanedPayload = Object.fromEntries(Object.entries(payload).filter(([_, v]) => v !== undefined && v !== null && (Array.isArray(v) ? v.length > 0 : true)));
    if (!cleanedPayload.hasOwnProperty('job_titles')) cleanedPayload.job_titles = [];
    if (!cleanedPayload.hasOwnProperty('skills')) cleanedPayload.skills = [];
    if (!cleanedPayload.hasOwnProperty('locations')) cleanedPayload.locations = [];
    if (!cleanedPayload.hasOwnProperty('countries')) cleanedPayload.countries = [];

    try {
      const response = await apiClient.post<{ status: string; jobs_fetched: number; jobs: BackendJobListingResponseItem[] }>('/jobs/fetch_jobs', cleanedPayload);
      setLastFetchCount(response.data.jobs_fetched);
      if (response.data.jobs_fetched > 0 && response.data.jobs) {
        setFetchedApiJobs(response.data.jobs.map(job => mapBackendJobToFrontend(job)));
        toast({ title: "Job Fetch Successful", description: `${response.data.jobs_fetched} job(s) were processed. See results below.` });
      } else {
        setFetchedApiJobs([]); 
        toast({ title: "Job Fetch Complete", description: "No new jobs were found from the external API." });
      }
    } catch (error) {
      const message = error instanceof AxiosError && error.response?.data?.detail ? error.response.data.detail : "Failed to initiate job fetching from external API.";
      setErrorGenerateJobs(message);
      setFetchedApiJobs([]);
      setLastFetchCount(0); 
      toast({ title: "Job Fetch Failed", description: message, variant: "destructive" });
    } finally {
      setIsLoadingGenerateJobs(false);
    }
  };

  const addLocalActivity = useCallback((
    activityData: {
      action_type: ActivityType;
      job_id?: number;
      user_id?: number; 
      activity_metadata?: { [key: string]: any };
    }
  ) => {
    const newActivity: LocalUserActivity = {
      id: Date.now().toString() + Math.random().toString(36).substring(2), 
      timestamp: new Date().toISOString(), 
      user_id: activityData.user_id ?? currentUser?.id, 
      job_id: activityData.job_id,
      action_type: activityData.action_type,
      activity_metadata: activityData.activity_metadata,
    };
    console.log('New local activity to be logged:', newActivity);
    setLocalUserActivities(prevActivities => [newActivity, ...prevActivities]);
  }, [setLocalUserActivities, currentUser]);


const performAiAnalysis = useCallback(async (jobToAnalyze: JobListing) => {
    console.log(`JobExplorer: performAiAnalysis called for job ${jobToAnalyze.id}.`);
    if (!currentUser || !currentUser.id || !currentUser.professional_summary || !currentUser.skills || currentUser.skills.length === 0) {
        toast({ title: "Profile Incomplete", description: "AI analysis requires your professional summary and skills in your profile.", variant: "destructive" });
        setIsLoadingExplanation(false); 
        setJobPendingAnalysis(null);
        return;
    }

    setIsLoadingExplanation(true); 

    try {
        const input: JobMatchExplanationInput = {
            jobDescription: jobToAnalyze.description || '',
            userProfile: currentUser.professional_summary || '',
            userPreferences: currentUser.job_role || '',
            userHistory: '', 
        };
        const explanationResult = await jobMatchExplanation(input);

        const updateJobInList = (prevJobs: JobListing[]) => 
            prevJobs.map(j => j.id === jobToAnalyze.id ? { ...j, ...explanationResult } : j);
        
        setRelevantJobsList(updateJobInList);
        setAllJobsList(updateJobInList);
        setFetchedApiJobs(updateJobInList);
        setSelectedJobForDetails(prevJob => prevJob && prevJob.id === jobToAnalyze.id ? { ...prevJob, ...explanationResult } : prevJob);
        
        if (jobToAnalyze.id >= 0) { 
          setJobAnalysisCache(prevCache => ({ ...prevCache, [jobToAnalyze.id as number]: explanationResult }));
        }

        addLocalActivity({ // Logs the event of analysis
            action_type: "AI_JOB_ANALYZED", 
            job_id: jobToAnalyze.id,
            user_id: currentUser.id,
            activity_metadata: { 
                jobTitle: jobToAnalyze.job_title,
                company: jobToAnalyze.company,
                success: true,
            }
        });

        if (currentUser.id && jobToAnalyze.id >= 0) { 
            const analyzePayload: AnalyzeJobPayload = {
                user_id: currentUser.id,
                job_id: jobToAnalyze.id,
                score: explanationResult.matchScore,
                explanation: explanationResult.matchExplanation
            };
            try {
                await apiClient.post(`/jobs/${jobToAnalyze.id}/analyze`, analyzePayload);
                toast({ title: "AI Analysis Saved", description: "Match details saved to your backend MatchScoreLog.", variant: "default" });
            } catch (analysisError) {
                console.error("Error saving AI analysis to backend's MatchScoreLog:", analysisError);
                toast({ title: "Backend Sync Failed", description: "Could not save AI analysis details to backend MatchScoreLog.", variant: "destructive" });
            }
        }
    } catch (error) {
        console.error("Error fetching AI match explanation:", error);
        toast({ title: "AI Analysis Failed", description: "Could not get AI match explanation.", variant: "destructive" });
    } finally {
        setIsLoadingExplanation(false);
        setJobPendingAnalysis(null); 
        console.log(`JobExplorer: performAiAnalysis finished for job ${jobToAnalyze.id}. isLoadingExplanation: false`);
    }
  }, [currentUser, toast, setJobAnalysisCache, addLocalActivity]);


  const fetchJobDetailsWithAI = useCallback(async (job: JobListing) => {
    console.log(`JobExplorer: fetchJobDetailsWithAI called for job ${job.id}. isCacheReadyForAnalysis: ${isCacheReadyForAnalysis}`);
    setSelectedJobForDetails(job); 
    setIsDetailsModalOpen(true);
    setIsLoadingExplanation(true); 
    setJobPendingAnalysis(null); 

    if (typeof job.id !== 'number' || isNaN(job.id) || job.id < 0) {
        console.warn(`fetchJobDetailsWithAI: Cannot fetch AI details for job with invalid frontend ID:`, job);
        toast({ title: "Error", description: "Cannot perform AI analysis on job with invalid ID.", variant: "destructive"});
        setIsLoadingExplanation(false);
        return;
    }

    const cachedData = jobAnalysisCacheRef.current[job.id];
    if (cachedData && cachedData.matchScore !== undefined && cachedData.matchExplanation !== undefined) {
      console.log(`JobExplorer: Using cached AI analysis for job ${job.id} from jobAnalysisCacheRef.`);
      setSelectedJobForDetails(prevJob => prevJob ? { ...prevJob, ...cachedData } : null);
      setIsLoadingExplanation(false); 
      return; 
    }
    
    if (isCacheReadyForAnalysis) {
        console.log(`JobExplorer: Cache is ready, proceeding to performAiAnalysis for job ${job.id} as it's not in cache.`);
        await performAiAnalysis(job); 
    } else {
        console.log(`JobExplorer: Cache not ready. Setting job ${job.id} as pending analysis.`);
        setJobPendingAnalysis(job); 
    }
  }, [isCacheReadyForAnalysis, performAiAnalysis, toast]);


  useEffect(() => {
    console.log(`JobExplorer: useEffect for pending analysis. isCacheReady: ${isCacheReadyForAnalysis}, pendingJob: ${jobPendingAnalysis?.id}, selectedJobModal: ${selectedJobForDetails?.id}`);
    if (isCacheReadyForAnalysis && jobPendingAnalysis && selectedJobForDetails?.id === jobPendingAnalysis.id) {
      console.log(`JobExplorer: Cache is ready. Processing pending analysis for job ${jobPendingAnalysis.id}.`);
      const cachedData = jobAnalysisCacheRef.current[jobPendingAnalysis.id];
      if (cachedData && cachedData.matchScore !== undefined && cachedData.matchExplanation !== undefined) {
        console.log(`JobExplorer: Found pending job ${jobPendingAnalysis.id} in cache after cache became ready. Using cached data.`);
        setSelectedJobForDetails(prevJob => prevJob ? { ...prevJob, ...cachedData } : null);
        setIsLoadingExplanation(false);
        setJobPendingAnalysis(null);
      } else {
        console.log(`JobExplorer: Pending job ${jobPendingAnalysis.id} not in cache even after cache is ready. Performing AI analysis.`);
        performAiAnalysis(jobPendingAnalysis); 
      }
    }
  }, [isCacheReadyForAnalysis, jobPendingAnalysis, selectedJobForDetails, performAiAnalysis]);


  const handleViewDetails = (job: JobListing) => fetchJobDetailsWithAI(job);

  const handleSaveJob = async (job: JobListing) => {
    if (typeof job.id !== 'number' || isNaN(job.id) || job.id < 0) {
        toast({ title: "Error", description: "Cannot save job with temporary or invalid ID.", variant: "destructive"});
        return;
    }
    if (!currentUser || !currentUser.id) {
        toast({ title: "Error", description: "User not authenticated.", variant: "destructive" });
        return;
    }

    const isCurrentlySaved = savedJobIds.has(job.id);
    const actionTypeForBackend = isCurrentlySaved ? "JOB_UNSAVED" : "JOB_SAVED";
    
    const metadataForActivity = {
        jobTitle: job.job_title,
        company: job.company,
        status: actionTypeForBackend === "JOB_SAVED" ? "Saved" : "Unsaved"
    };

    const payload: SaveJobPayload = {
        user_id: currentUser.id,
        job_id: job.id,
        action_type: actionTypeForBackend,
        activity_metadata: metadataForActivity 
    };

    try {
        await apiClient.post(`/jobs/${job.id}/save`, payload);
        toast({ 
            title: actionTypeForBackend === "JOB_SAVED" ? "Job Saved!" : "Job Unsaved", 
            description: `${job.job_title} status updated. (Synced with backend)` 
        });
        
        setSavedJobIds(prev => {
             const next = new Set(prev);
             if (actionTypeForBackend === "JOB_SAVED") {
                 next.add(job.id);
             } else {
                 next.delete(job.id);
             }
             console.log("JobExplorer: Saved Job IDs (local state) updated:", next);
             return next;
        });
        
        addLocalActivity({
            action_type: actionTypeForBackend as "JOB_SAVED" | "JOB_UNSAVED", 
            job_id: job.id,
            user_id: currentUser.id,
            activity_metadata: metadataForActivity
        });

    } catch (error) {
        console.error(`Error ${actionTypeForBackend.toLowerCase()} job to backend:`, error);
        const errorMessage = error instanceof AxiosError && error.response?.data?.detail 
                           ? error.response.data.detail 
                           : `Could not sync job ${actionTypeForBackend.toLowerCase()} with backend.`;
        toast({ title: "Backend Sync Failed", description: errorMessage, variant: "destructive" });
    }
  };

  const openMaterialsModal = (job: JobListing) => {
    if (typeof job.id !== 'number' || isNaN(job.id)) {
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
    if (typeof jobToGetPointsFor.id !== 'number' || isNaN(jobToGetPointsFor.id)) return null;
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
    if (typeof jobToGenerateFor.id !== 'number' || isNaN(jobToGenerateFor.id)) return;
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
        addLocalActivity({
          action_type: "RESUME_GENERATED_FOR_JOB",
          job_id: jobToGenerateFor.id,
          user_id: currentUser.id,
          activity_metadata: { 
            jobTitle: jobToGenerateFor.job_title,
            company: jobToGenerateFor.company,
            success: true
          }
        });
      }
    } catch (error) {
      console.error("Error generating resume:", error);
      toast({ title: "Resume Generation Failed", description: "Could not generate resume.", variant: "destructive" });
       addLocalActivity({
          action_type: "RESUME_GENERATED_FOR_JOB",
          job_id: jobToGenerateFor.id,
          user_id: currentUser?.id,
          activity_metadata: { 
            jobTitle: jobToGenerateFor.job_title,
            company: jobToGenerateFor.company,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error"
          }
        });
    } finally {
      setIsLoadingResume(false);
    }
  };

  const handleTriggerAICoverLetterGeneration = async (jobToGenerateFor: JobListing) => {
    if (typeof jobToGenerateFor.id !== 'number' || isNaN(jobToGenerateFor.id)) return;
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
        addLocalActivity({
          action_type: "COVER_LETTER_GENERATED_FOR_JOB",
          job_id: jobToGenerateFor.id,
          user_id: currentUser.id,
          activity_metadata: { 
            jobTitle: jobToGenerateFor.job_title,
            company: jobToGenerateFor.company,
            success: true
          }
        });
      }
    } catch (error) {
      console.error("Error generating cover letter:", error);
      toast({ title: "Cover Letter Generation Failed", description: "Could not generate cover letter.", variant: "destructive" });
      addLocalActivity({
          action_type: "COVER_LETTER_GENERATED_FOR_JOB",
          job_id: jobToGenerateFor.id,
          user_id: currentUser?.id,
          activity_metadata: { 
            jobTitle: jobToGenerateFor.job_title,
            company: jobToGenerateFor.company,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error"
          }
        });
    } finally {
      setIsLoadingCoverLetter(false);
    }
  };

  // const handleMarkAsApplied = async (job: JobListing) => {
  //   if (!currentUser || !currentUser.id || typeof job.id !== 'number' || isNaN(job.id) || job.id < 0) {
  //     toast({ title: "Error", description: "Cannot mark job as applied. User or job ID invalid.", variant: "destructive" });
  //     return;
  //   }

  //   const formData = new FormData();
  //   formData.append('user_id', currentUser.id.toString());
  //   formData.append('job_id', job.id.toString());

  //   try {
  //     await apiClient.post(`/resumes/apply`, formData, {
  //       headers: {
  //         'Content-Type': 'multipart/form-data', 
  //       },
  //     });
  //     toast({ title: "Application Logged", description: `Application for ${job.job_title} has been logged.` });
  //     addLocalActivity({
  //       action_type: "JOB_APPLIED",
  //       job_id: job.id,
  //       user_id: currentUser.id,
  //       activity_metadata: { jobTitle: job.job_title, company: job.company }
  //     });
  //     if (!savedJobIds.has(job.id)) {
  //       handleSaveJob(job); 
  //     }
  //   } catch (error) {
  //     console.error("Error marking job as applied:", error);
  //     const message = error instanceof AxiosError && error.response?.data?.detail 
  //                      ? error.response.data.detail 
  //                      : "Could not log application.";
  //     toast({ title: "Logging Failed", description: message, variant: "destructive" });
  //   }
  // };


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
          {isLoadingGenerateJobs && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <LoadingSpinner size={40} />
              <p className="mt-3 text-lg text-muted-foreground">Fetching new jobs from API...</p>
            </div>
          )}
          {!isLoadingGenerateJobs && lastFetchCount !== null && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3">
                {lastFetchCount > 0 ? `${lastFetchCount} job(s) fetched from the API:` : (lastFetchCount === 0 ? "No new jobs found from the API." : "")}
              </h3>
              {fetchedApiJobs.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {fetchedApiJobs.map((job, index) => (
                    <JobCard
                      key={job.api_id ? `fetched-api-${job.api_id}` : `fetched-db-${job.id}-${index}`}
                      job={job}
                      onViewDetails={handleViewDetails}
                      onSaveJob={handleSaveJob}
                      onGenerateMaterials={openMaterialsModal}
                      isSaved={savedJobIds.has(job.id)}
                    />
                  ))}
                </div>
              ) : lastFetchCount > 0 ? (
                 <Alert variant="default" className="mt-4">
                    <FileWarning className="h-5 w-5" />
                    <AlertTitle>Jobs Fetched, Display Issue</AlertTitle>
                    <AlertDescription>
                        {lastFetchCount} job(s) were fetched, but there was an issue displaying them. This might be due to data mapping or missing IDs. Please check the console for warnings.
                    </AlertDescription>
                </Alert>
              ) : null}
            </div>
          )}
        </TabsContent>

        <TabsContent value="relevant" className="space-y-6">
          {isLoadingRelevantJobs && relevantJobsList.length === 0 && (
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
          {relevantJobsList.length > 0 && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {relevantJobsList.map((job, index) => (
                  <JobCard
                    key={job.api_id ? `relevant-api-${job.api_id}` : `relevant-db-${job.id}-${index}`}
                    job={job}
                    onViewDetails={handleViewDetails}
                    onSaveJob={handleSaveJob}
                    onGenerateMaterials={openMaterialsModal}
                    isSaved={savedJobIds.has(job.id)}
                  />
                ))}
              </div>
              <PaginationControls
                currentPage={relevantJobsCurrentPage}
                onPageChange={(page) => setRelevantJobsCurrentPage(page)}
                canGoPrevious={relevantJobsCurrentPage > 1}
                canGoNext={hasNextRelevantPage}
                isLoading={isLoadingRelevantJobs}
              />
            </>
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-6">
          <div className="p-4 border rounded-lg bg-card shadow-sm mb-6">
            <h3 className="text-lg font-semibold mb-3 flex items-center"><Filter className="mr-2 h-5 w-5 text-primary" />Filter All Jobs</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="filter-tech" className="text-sm font-medium">Technology</Label>
                <Input 
                  id="filter-tech"
                  placeholder="e.g., Python, React" 
                  value={filterTechnology}
                  onChange={(e) => setFilterTechnology(e.target.value)} 
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="filter-loc" className="text-sm font-medium">Location</Label>
                <Input 
                  id="filter-loc"
                  placeholder="e.g., New York, Remote" 
                  value={filterLocation}
                  onChange={(e) => setFilterLocation(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button onClick={() => setAllJobsCurrentPage(1)} disabled={isLoadingAllJobs}> 
                {isLoadingAllJobs && (filterTechnology || filterLocation) ? <LoadingSpinner className="mr-2" /> : <Search className="mr-2 h-4 w-4" />}
                Apply Filters
              </Button>
              <Button variant="outline" onClick={handleClearFilters} disabled={isLoadingAllJobs || (!filterTechnology && !filterLocation)}>
                <XCircle className="mr-2 h-4 w-4" /> Clear Filters
              </Button>
            </div>
          </div>

          {isLoadingAllJobs && allJobsList.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <LoadingSpinner size={40} />
              <p className="mt-3 text-lg text-muted-foreground">Loading jobs...</p>
            </div>
          )}
          {!isLoadingAllJobs && errorAllJobs && (
            <Alert variant="destructive" className="my-6">
              <ServerCrash className="h-5 w-5" />
              <AlertTitle>Error Loading Jobs</AlertTitle>
              <AlertDescription>{errorAllJobs}</AlertDescription>
            </Alert>
          )}
          {!isLoadingAllJobs && !errorAllJobs && allJobsList.length === 0 && (
            <div className="text-center py-12">
              <FileWarning className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-xl font-semibold">No Jobs Found</h3>
              <p className="mt-1 text-muted-foreground">
                {filterTechnology || filterLocation ? "No jobs match your current filters." : "No jobs were found in our database. Try generating jobs from the \"Generate Jobs\" tab."}
              </p>
            </div>
          )}
          {allJobsList.length > 0 && (
            <>
              <div className="space-y-4">
                {allJobsList.map((job, index) => (
                  <SimpleJobListItem
                    key={job.api_id ? `all-api-${job.api_id}` : `all-db-${job.id}-${index}`}
                    job={job}
                    onViewDetails={handleViewDetails}
                  />
                ))}
              </div>
              <PaginationControls
                currentPage={allJobsCurrentPage}
                onPageChange={(page) => setAllJobsCurrentPage(page)}
                canGoPrevious={allJobsCurrentPage > 1}
                canGoNext={hasNextAllPage}
                isLoading={isLoadingAllJobs}
              />
            </>
          )}
        </TabsContent>
      </Tabs>

      <JobDetailsModal
        job={selectedJobForDetails}
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        onGenerateMaterials={openMaterialsModal}
        // onMarkAsApplied={handleMarkAsApplied} // Commented out
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

    

    

    