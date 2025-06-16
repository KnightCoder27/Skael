
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import type { JobListing, LocalUserActivity, ActivityType, UserProfileForJobFetching, RelevantJobsRequestPayload, Technology, SaveJobPayload, AnalyzeJobPayload, UserActivityOut, BackendJobListingResponseItem, BackendMatchScoreLogItem, ActivityIn, AnalyzeResultOut, BackendTechnologyObject } from '@/types';
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
import { Compass, Info, FileWarning, ServerCrash, Search, ListChecks, Bot, DatabaseZap, Filter, XCircle, Settings2, Briefcase, MapPin, Users, Wifi, ListFilter, CalendarDays, Tag, BookText, MapPinned, Star, CheckSquare, Globe } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AxiosError } from 'axios';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SimpleJobListItem } from '@/components/app/simple-job-list-item';
import { PaginationControls } from '@/components/app/PaginationControls';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';


// AI Flow Imports
import { jobMatchExplanation, type JobMatchExplanationInput } from '@/ai/flows/job-match-explanation';
import { extractJobDescriptionPoints, type ExtractJobDescriptionPointsInput, type ExtractJobDescriptionPointsOutput } from '@/ai/flows/job-description-point-extractor';
import {
  generateResume,
  generateCoverLetter,
  type GenerateDocumentInput,
  type QAndA, // Added for the new interactive Q&A feature
} from '@/ai/flows/resume-cover-letter-generator';
import { generateQuestions, type GenerateQuestionsInput, type GenerateQuestionsOutput } from '@/ai/flows/question-generator-flow';


interface JobAnalysisCache {
  [jobId: number]: {
    matchScore: number;
    matchExplanation: string;
  };
}

type ActiveJobTab = "generate" | "relevant" | "all";
const JOBS_PER_PAGE = 9;
const DEFAULT_JOB_FETCH_LIMIT = 10;
const MAX_JOB_FETCH_LIMIT = 10; // For "Generate Jobs" tab API
const DEFAULT_JOB_MAX_AGE_DAYS = 30;


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

  // State for "Generate Jobs" tab filters
  const [fetchJobTitlesInput, setFetchJobTitlesInput] = useState('');
  const [fetchSkillsInput, setFetchSkillsInput] = useState('');
  const [fetchLocationsInput, setFetchLocationsInput] = useState('');
  const [fetchCountriesInput, setFetchCountriesInput] = useState('');
  const [fetchExperienceInput, setFetchExperienceInput] = useState<string>('');
  const [fetchRemotePreferenceInput, setFetchRemotePreferenceInput] = useState<'any' | 'true' | 'false'>('any');
  const [fetchLimitInput, setFetchLimitInput] = useState<string>(DEFAULT_JOB_FETCH_LIMIT.toString());
  const [fetchMaxAgeDaysInput, setFetchMaxAgeDaysInput] = useState<string>(DEFAULT_JOB_MAX_AGE_DAYS.toString());


  const [filterTechnology, setFilterTechnology] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterExperience, setFilterExperience] = useState(''); // For "All Jobs" tab

  const [relevantJobsCurrentPage, setRelevantJobsCurrentPage] = useState(1);
  const [allJobsCurrentPage, setAllJobsCurrentPage] = useState(1);
  const [hasNextRelevantPage, setHasNextRelevantPage] = useState(true);
  const [hasNextAllPage, setHasNextAllPage] = useState(true);

  const [jobAnalysisCache, setJobAnalysisCache] = useLocalStorage<JobAnalysisCache>('job-ai-analysis-cache', {});

  const [localUserActivities, setLocalUserActivities] = useLocalStorage<LocalUserActivity[]>('user-activity-log', []);
  const [savedJobIds, setSavedJobIds] = useState<Set<number>>(new Set());

  const [selectedJobForDetails, setSelectedJobForDetails] = useState<JobListing | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isLoadingExplanation, setIsLoadingExplanation] = useState(false);

  const [selectedJobForMaterials, setSelectedJobForMaterials] = useState<JobListing | null>(null);
  const [isMaterialsModalOpen, setIsMaterialsModalOpen] = useState(false);

  // New state for Q&A based material generation
  const [materialGenerationStep, setMaterialGenerationStep] = useState<'initial' | 'questions' | 'generating' | 'done'>('initial');
  const [generatedQuestions, setGeneratedQuestions] = useState<GenerateQuestionsOutput['questions'] | null>(null);
  const [userAnswers, setUserAnswers] = useState<QAndA[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [docTypeForGeneration, setDocTypeForGeneration] = useState<'resume' | 'coverLetter' | null>(null);


  const [isLoadingResume, setIsLoadingResume] = useState(false);
  const [isLoadingCoverLetter, setIsLoadingCoverLetter] = useState(false);
  const [generatedResume, setGeneratedResume] = useState<string | null>(null);
  const [generatedCoverLetter, setGeneratedCoverLetter] = useState<string | null>(null);

  const [extractedJobPoints, setExtractedJobPoints] = useState<ExtractJobDescriptionPointsOutput | null>(null);
  const [jobForExtractedPoints, setJobForExtractedPoints] = useState<JobListing | null>(null);

  const [isCacheReadyForAnalysis, setIsCacheReadyForAnalysis] = useState(false);
  const [jobPendingAnalysis, setJobPendingAnalysis] = useState<JobListing | null>(null);
  const [filtersReady, setFiltersReady] = useState(false); // Flag for filter readiness
  
  const isFetchingRelevantJobsForPage = useRef<number | null>(null);


  // Pre-populate fetch filters from currentUser and set filtersReady
  useEffect(() => {
    console.log("JobsPage: Filter pre-population useEffect triggered. currentUser:", currentUser);
    if (currentUser) {
      setFetchJobTitlesInput(currentUser.desired_job_role || '');
      setFetchSkillsInput(currentUser.skills?.join(', ') || '');
      setFetchLocationsInput(currentUser.preferred_locations?.join(', ') || '');
      
      const countriesStringForFilter = currentUser.countries?.join(', ') || '';
      setFetchCountriesInput(countriesStringForFilter);

      setFetchExperienceInput(currentUser.experience?.toString() || '');

      let remotePref: 'any' | 'true' | 'false' = 'any';
      const userRemotePref = currentUser.remote_preference?.toString().toLowerCase();
      if (userRemotePref === 'remote') remotePref = 'true';
      else if (userRemotePref === 'onsite') remotePref = 'false';
      else if (userRemotePref === 'hybrid') remotePref = 'any'; 
      setFetchRemotePreferenceInput(remotePref);
      setFiltersReady(true); // Mark filters as ready after population
    } else {
      setFiltersReady(false); // Reset if no current user
    }
  }, [currentUser]);


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

    const companyName = backendJob.company_obj?.company_name || "N/A";
    const companyLogo = backendJob.company_obj?.logo || `https://placehold.co/100x100.png?text=${encodeURIComponent(companyName?.[0] || 'J')}`;
    const companyDomain = backendJob.company_obj?.company_domain || null;
    const countryCode = backendJob.company_obj?.country_code || backendJob.country_code || null;

    const technologiesFormatted: Technology[] = Array.isArray(backendJob.technologies)
      ? backendJob.technologies
          .filter((techObj): techObj is BackendTechnologyObject => 
            typeof techObj === 'object' && 
            techObj !== null && 
            techObj.id !== undefined && 
            techObj.technology_name !== undefined && 
            techObj.technology_slug !== undefined
          )
          .map(techObj => ({
            id: techObj.id,
            technology_name: techObj.technology_name,
            technology_slug: techObj.technology_slug,
            logo: techObj.logo, 
          }))
      : [];

    const cachedAnalysis = (numericDbId >= 0 && jobAnalysisCache[numericDbId]) ? jobAnalysisCache[numericDbId] : {};

    return {
      id: numericDbId,
      api_id: backendJob.api_id || null,
      job_title: backendJob.job_title || "N/A",
      company: companyName,
      companyLogo: companyLogo,
      company_domain: companyDomain,
      location: backendJob.location || "N/A",
      description: backendJob.description || "No description available.",
      url: backendJob.url || null,
      date_posted: backendJob.date_posted || null,
      employment_status: backendJob.employment_status || null,
      matching_phrase: backendJob.matching_phrase || null,
      matching_words: backendJob.matching_words || null,
      final_url: backendJob.final_url || null,
      source_url: backendJob.source_url || null,
      remote: backendJob.remote || null,
      hybrid: backendJob.hybrid || null,
      salary_string: backendJob.salary_string || null,
      min_salary: backendJob.min_salary || null,
      max_salary: backendJob.max_salary || null,
      currency: backendJob.currency || null,
      country: backendJob.company_obj?.country || backendJob.country || null,
      seniority: backendJob.seniority || null,
      discovered_at: backendJob.discovered_at || new Date().toISOString(),
      reposted: backendJob.reposted || null,
      date_reposted: backendJob.date_reposted || null,
      country_code: countryCode,
      job_expired: backendJob.job_expired || null,
      industry_id: backendJob.company_obj?.industry_id || backendJob.industry_id || null,
      fetched_data: backendJob.fetched_data || null,
      technologies: technologiesFormatted,
      key_info: backendJob.key_info || null,
      hiring_team: backendJob.hiring_team || null,
      matchScore: cachedAnalysis.matchScore,
      matchExplanation: cachedAnalysis.matchExplanation,
    };
  }, [jobAnalysisCache]);


 const fetchRelevantJobs = useCallback(async (pageToFetch = 1) => {
    if (!currentUser || !currentUser.id) {
      setErrorRelevantJobs("Please log in to view relevant jobs.");
      setRelevantJobsList([]); 
      return;
    }
    
    if (isFetchingRelevantJobsForPage.current === pageToFetch) {
      console.log(`JobExplorer: fetchRelevantJobs - Already fetching page ${pageToFetch}. Skipping duplicate.`);
      return; 
    }
    
    console.log(`JobExplorer: fetchRelevantJobs - Proceeding to fetch for page ${pageToFetch}.`);
    
    setIsLoadingRelevantJobs(true);
    isFetchingRelevantJobsForPage.current = pageToFetch; 
    setErrorRelevantJobs(null);

    try {
      const skip = (pageToFetch - 1) * JOBS_PER_PAGE;
      const limit = JOBS_PER_PAGE;

      const payload: RelevantJobsRequestPayload = {
        job_title: currentUser.desired_job_role || undefined,
        technology: currentUser.skills?.join(',') || undefined, // Corrected: join array
        location: currentUser.preferred_locations?.join(',') || undefined, // Corrected: join array
        experience: currentUser.experience?.toString() || undefined, // Corrected: to string
        skip: skip,
        limit: limit,
      };
      
      const cleanedPayload = Object.fromEntries(Object.entries(payload).filter(([_, v]) => v !== undefined)) as RelevantJobsRequestPayload;

      const response = await apiClient.post<BackendJobListingResponseItem[] | { jobs: BackendJobListingResponseItem[] }>('/jobs/relevant_jobs', cleanedPayload);
      
      const jobsToMap = Array.isArray(response.data) ? response.data : response.data?.jobs;

      if (!jobsToMap || !Array.isArray(jobsToMap)) {
        console.error("Invalid response structure for relevant jobs (after check):", response.data);
        throw new Error("Received invalid data structure from backend for relevant jobs.");
      }
      const mappedJobs = jobsToMap.map(job => mapBackendJobToFrontend(job));

      if (pageToFetch === relevantJobsCurrentPage) {
        setRelevantJobsList(mappedJobs);
        setHasNextRelevantPage(mappedJobs.length === JOBS_PER_PAGE);
      }

    } catch (error) {
      console.error("Error in fetchRelevantJobs for page " + pageToFetch + ":", error);
      if (pageToFetch === relevantJobsCurrentPage) {
        let specificErrorMessage: string | null = null;
        if (error instanceof AxiosError && error.response?.data?.detail) {
          specificErrorMessage = typeof error.response.data.detail === 'string' ? error.response.data.detail : JSON.stringify(error.response.data.detail);
        } else if (error instanceof Error && error.message) {
          specificErrorMessage = error.message;
        }
        const finalMessage = specificErrorMessage || "Could not load relevant jobs.";
        setErrorRelevantJobs(finalMessage);
        toast({ title: "Failed to Load Relevant Jobs", description: finalMessage, variant: "destructive" });
        setRelevantJobsList([]);
        setHasNextRelevantPage(false);
      }
    } finally {
      if (isFetchingRelevantJobsForPage.current === pageToFetch) {
        isFetchingRelevantJobsForPage.current = null;
      }
      setIsLoadingRelevantJobs(false);
    }
  }, [currentUser, toast, mapBackendJobToFrontend, relevantJobsCurrentPage]);


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
      const response = await apiClient.get<{ jobs: BackendJobListingResponseItem[] }>('/jobs/list_jobs/', { params: { skip, limit } });

      const jobsToMap = response.data?.jobs; // Corrected: access data.jobs

      if (!jobsToMap || !Array.isArray(jobsToMap)) {
        console.error("Invalid response structure for all jobs (after check):", response.data);
        throw new Error("Received invalid data structure from backend for all jobs.");
      }
      const mappedJobs = jobsToMap.map(job => mapBackendJobToFrontend(job));
      setAllJobsList(mappedJobs);
      setHasNextAllPage(mappedJobs.length === JOBS_PER_PAGE);
    } catch (error) {
      console.error("Error in fetchAllJobs:", error);
      let specificErrorMessage: string | null = null;
      if (error instanceof AxiosError && error.response?.data?.detail) {
        specificErrorMessage = typeof error.response.data.detail === 'string' ? error.response.data.detail : JSON.stringify(error.response.data.detail);
      } else if (error instanceof Error && error.message) {
        specificErrorMessage = error.message;
      }
      const finalMessage = specificErrorMessage || "Could not load all jobs.";
      setErrorAllJobs(finalMessage);
      toast({ title: "Failed to Load All Jobs", description: finalMessage, variant: "destructive" });
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
      if (filterTechnology) params.append('tech', filterTechnology);
      if (filterLocation) params.append('location', filterLocation);
      if (filterExperience) params.append('experience', filterExperience);
      params.append('skip', skip.toString());
      params.append('limit', limit.toString());

      const finalEndpoint = `/jobs/?${params.toString()}`; // Corrected: endpoint for filtered list

      const response = await apiClient.get<{ jobs: BackendJobListingResponseItem[] }>(finalEndpoint);
      
      const jobsToMap = response.data?.jobs; // Corrected: access data.jobs

      if (!jobsToMap || !Array.isArray(jobsToMap)) {
        console.error("Invalid response structure for filtered jobs (after check):", response.data);
        throw new Error("Received invalid data structure from backend for filtered jobs.");
      }
      const mappedJobs = jobsToMap.map(job => mapBackendJobToFrontend(job));
      setAllJobsList(mappedJobs);
      setHasNextAllPage(mappedJobs.length === JOBS_PER_PAGE);

      if (mappedJobs.length === 0 && (filterTechnology || filterLocation || filterExperience)) {
        toast({ title: "No Jobs Found", description: "No jobs matched your filter criteria." });
      } else if (filterTechnology || filterLocation || filterExperience) {
         toast({ title: "Filters Applied", description: `Showing jobs matching your criteria.` });
      }
    } catch (error) {
      console.error("Error in handleApplyFilters:", error);
      let specificErrorMessage: string | null = null;
      if (error instanceof AxiosError && error.response?.data?.detail) {
        specificErrorMessage = typeof error.response.data.detail === 'string' ? error.response.data.detail : JSON.stringify(error.response.data.detail);
      } else if (error instanceof Error && error.message) {
        specificErrorMessage = error.message;
      }
      const finalMessage = specificErrorMessage || "Could not load filtered jobs.";
      setErrorAllJobs(finalMessage);
      toast({ title: "Failed to Load Filtered Jobs", description: finalMessage, variant: "destructive" });
    } finally {
      setIsLoadingAllJobs(false);
    }
  }, [currentUser, toast, mapBackendJobToFrontend, filterTechnology, filterLocation, filterExperience]);

  const handleClearFilters = useCallback(() => {
    setFilterTechnology('');
    setFilterLocation('');
    setFilterExperience('');
    setAllJobsCurrentPage(1); 
  }, []);


 const populateCacheAndSavedJobIds = useCallback(async () => {
    if (!currentUser || !currentUser.id) {
      setIsCacheReadyForAnalysis(true);
      return;
    }
    setIsCacheReadyForAnalysis(false);

    const newAiCacheUpdates: JobAnalysisCache = {};
    let generalActivitiesError = null;

    if (currentUser.match_scores && Array.isArray(currentUser.match_scores)) {
        currentUser.match_scores.forEach(scoreLog => {
            if (scoreLog.job_id != null && scoreLog.score != null && scoreLog.explanation != null) {
                newAiCacheUpdates[scoreLog.job_id] = {
                    matchScore: scoreLog.score,
                    matchExplanation: scoreLog.explanation,
                };
            }
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
          return listChanged ? newList : list;
        };
        setAllJobsList(prev => updateJobItemsInList(prev, newAiCacheUpdates));
        setFetchedApiJobs(prev => updateJobItemsInList(prev, newAiCacheUpdates));
        if (relevantJobsList.length > 0) { 
            setRelevantJobsList(prev => updateJobItemsInList(prev, newAiCacheUpdates));
        }
      }

    if (generalActivitiesError) {
      toast({ title: "Partial Cache Sync", description: "Could not sync all activity data. Saved job status might be affected.", variant: "destructive" });
    }
    setIsCacheReadyForAnalysis(true);
  }, [currentUser, setJobAnalysisCache, setSavedJobIds, toast, relevantJobsList.length]);


  useEffect(() => {
    if (currentUser && !isLoggingOut) {
      populateCacheAndSavedJobIds();
    } else if (!currentUser && !isLoadingAuth && !isLoggingOut) {
        setIsCacheReadyForAnalysis(true);
    }
  }, [currentUser, isLoggingOut, isLoadingAuth, populateCacheAndSavedJobIds]);

  // Effect to fetch data when tab or dependencies change
  useEffect(() => {
    if (currentUser && !isLoggingOut && isCacheReadyForAnalysis && filtersReady) { // Added filtersReady condition
      if (activeTab === "relevant") {
         fetchRelevantJobs(relevantJobsCurrentPage);
      } else if (activeTab === "all") {
        if (!filterTechnology && !filterLocation && !filterExperience) {
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
    filtersReady, // Added filtersReady dependency
    relevantJobsCurrentPage, 
    allJobsCurrentPage, 
    filterTechnology, filterLocation, filterExperience, 
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

    const limitNum = parseInt(fetchLimitInput, 10);
    const currentFetchLimit = isNaN(limitNum) || limitNum <= 0 ? DEFAULT_JOB_FETCH_LIMIT : Math.min(limitNum, MAX_JOB_FETCH_LIMIT);

    const maxAgeNum = parseInt(fetchMaxAgeDaysInput, 10);
    const currentMaxAgeDays = isNaN(maxAgeNum) || maxAgeNum <=0 ? DEFAULT_JOB_MAX_AGE_DAYS : maxAgeNum;


    let remoteValue: boolean | null = null;
    if (fetchRemotePreferenceInput === 'true') remoteValue = true;
    else if (fetchRemotePreferenceInput === 'false') remoteValue = false;

    const payload: UserProfileForJobFetching = {
      job_titles: fetchJobTitlesInput.split(',').map(s => s.trim()).filter(s => s),
      skills: fetchSkillsInput.split(',').map(s => s.trim()).filter(s => s),
      experience: fetchExperienceInput ? parseInt(fetchExperienceInput, 10) : null,
      locations: fetchLocationsInput.split(',').map(s => s.trim()).filter(s => s),
      countries: fetchCountriesInput.split(',').map(s => s.trim()).filter(s => s),
      remote: remoteValue,
      limit: currentFetchLimit,
      posted_at_max_age_days: currentMaxAgeDays,
    };

    const cleanedPayload = Object.fromEntries(Object.entries(payload).filter(([_, v]) => v !== undefined && v !== null && (Array.isArray(v) ? v.length > 0 : true)));
    if (!cleanedPayload.hasOwnProperty('job_titles')) cleanedPayload.job_titles = [];
    if (!cleanedPayload.hasOwnProperty('skills')) cleanedPayload.skills = [];
    if (!cleanedPayload.hasOwnProperty('locations')) cleanedPayload.locations = [];
    if (!cleanedPayload.hasOwnProperty('countries')) cleanedPayload.countries = [];
    if (!cleanedPayload.hasOwnProperty('limit')) cleanedPayload.limit = DEFAULT_JOB_FETCH_LIMIT;
    if (!cleanedPayload.hasOwnProperty('posted_at_max_age_days')) cleanedPayload.posted_at_max_age_days = DEFAULT_JOB_MAX_AGE_DAYS;


    try {
      const response = await apiClient.post<{ messages: string; jobs_fetched: number; jobs: BackendJobListingResponseItem[] }>('/jobs/fetch_jobs', cleanedPayload);
      setLastFetchCount(response.data.jobs_fetched);
      if (response.data.jobs_fetched > 0 && response.data.jobs) {
        setFetchedApiJobs(response.data.jobs.map(job => mapBackendJobToFrontend(job)));
        toast({ title: "Job Fetch Successful", description: `${response.data.jobs_fetched} job(s) were processed. See results below.` });
      } else {
        setFetchedApiJobs([]);
        toast({ title: "Job Fetch Complete", description: "No new jobs were found from the external API matching your criteria." });
      }
    } catch (error) {
      const message = error instanceof AxiosError && error.response?.data?.detail ? (typeof error.response.data.detail === 'string' ? error.response.data.detail : JSON.stringify(error.response.data.detail)) : "Failed to initiate job fetching from external API.";
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
    setLocalUserActivities(prevActivities => [newActivity, ...prevActivities]);
  }, [setLocalUserActivities, currentUser]);


const performAiAnalysis = useCallback(async (jobToAnalyze: JobListing) => {
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
            userPreferences: currentUser.desired_job_role || '',
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

        if (currentUser.id && jobToAnalyze.id >= 0) {
            const activityPayload: ActivityIn = {
                user_id: currentUser.id,
                job_id: jobToAnalyze.id,
                action_type: "AI_JOB_ANALYZED",
                metadata: {
                    jobTitle: jobToAnalyze.job_title,
                    company: jobToAnalyze.company,
                    success: true,
                    score: explanationResult.matchScore,
                }
            };
            try {
                await apiClient.post('/activity/log', activityPayload);
                toast({ title: "AI Analysis Logged", description: "AI analysis event recorded on server.", variant: "default" });
            } catch (logError) {
                console.error("Error logging AI_JOB_ANALYZED activity to backend:", logError);
                toast({ title: "Logging Failed", description: "Could not log AI analysis event to server.", variant: "destructive" });
            }
        }

        addLocalActivity({
            action_type: "AI_JOB_ANALYZED",
            job_id: jobToAnalyze.id,
            user_id: currentUser.id,
            activity_metadata: {
                jobTitle: jobToAnalyze.job_title,
                company: jobToAnalyze.company,
                success: true,
                score: explanationResult.matchScore,
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
    }
  }, [currentUser, toast, setJobAnalysisCache, addLocalActivity]);


  const fetchJobDetailsWithAI = useCallback(async (job: JobListing) => {
    setSelectedJobForDetails(job); 
    setIsDetailsModalOpen(true);
    setIsLoadingExplanation(true);
    setJobPendingAnalysis(null);

    if (typeof job.id !== 'number' || isNaN(job.id) || job.id < 0) {
        toast({ title: "Error", description: "Cannot perform AI analysis on job with invalid ID.", variant: "destructive"});
        setIsLoadingExplanation(false);
        return;
    }

    if (currentUser && currentUser.id) {
        try {
            const response = await apiClient.get<AnalyzeResultOut>(`/jobs/${job.id}/match_score?user_id=${currentUser.id}`);
            if (response.data && response.data.score !== undefined && response.data.explanation !== undefined) {
                const backendAnalysis = {
                    matchScore: response.data.score,
                    matchExplanation: response.data.explanation,
                };
                setSelectedJobForDetails(prevJob => prevJob ? { ...prevJob, ...backendAnalysis } : null);
                setJobAnalysisCache(prevCache => ({ ...prevCache, [job.id as number]: backendAnalysis }));
                setIsLoadingExplanation(false);
                return; 
            }
        } catch (error) {
            const axiosError = error as AxiosError;
            if (!(axiosError.response && axiosError.response.status === 404)) {
                console.error(`JobExplorer: Error fetching existing match score for job ${job.id}:`, error);
                toast({ title: "Error Fetching Score", description: "Could not fetch existing AI analysis. Will try generating.", variant: "destructive" });
            }
        }
    }


    const cachedData = jobAnalysisCache[job.id];
    if (cachedData && cachedData.matchScore !== undefined && cachedData.matchExplanation !== undefined) {
      setSelectedJobForDetails(prevJob => prevJob ? { ...prevJob, ...cachedData } : null);
      setIsLoadingExplanation(false);
      return;
    }

    if (isCacheReadyForAnalysis) {
        await performAiAnalysis(job);
    } else {
        setJobPendingAnalysis(job);
    }
  }, [currentUser, isCacheReadyForAnalysis, performAiAnalysis, toast, setJobAnalysisCache, jobAnalysisCache]);


  useEffect(() => {
    if (isCacheReadyForAnalysis && jobPendingAnalysis && selectedJobForDetails?.id === jobPendingAnalysis.id) {
      if (currentUser && currentUser.id && jobPendingAnalysis.id >=0) {
         apiClient.get<AnalyzeResultOut>(`/jobs/${jobPendingAnalysis.id}/match_score?user_id=${currentUser.id}`)
          .then(response => {
            if (response.data && response.data.score !== undefined && response.data.explanation !== undefined) {
              const backendAnalysis = { matchScore: response.data.score, matchExplanation: response.data.explanation };
              setSelectedJobForDetails(prevJob => prevJob ? { ...prevJob, ...backendAnalysis } : null);
              setJobAnalysisCache(prevCache => ({ ...prevCache, [jobPendingAnalysis.id as number]: backendAnalysis }));
              setIsLoadingExplanation(false);
              setJobPendingAnalysis(null);
            } else {
              const cachedData = jobAnalysisCache[jobPendingAnalysis.id];
              if (cachedData && cachedData.matchScore !== undefined && cachedData.matchExplanation !== undefined) {
                setSelectedJobForDetails(prevJob => prevJob ? { ...prevJob, ...cachedData } : null);
                setIsLoadingExplanation(false);
                setJobPendingAnalysis(null);
              } else {
                performAiAnalysis(jobPendingAnalysis);
              }
            }
          })
          .catch(error => {
            const axiosError = error as AxiosError;
             if (axiosError.response && axiosError.response.status === 404) {
                 const cachedData = jobAnalysisCache[jobPendingAnalysis.id];
                if (cachedData && cachedData.matchScore !== undefined && cachedData.matchExplanation !== undefined) {
                    setSelectedJobForDetails(prevJob => prevJob ? { ...prevJob, ...cachedData } : null);
                    setIsLoadingExplanation(false);
                    setJobPendingAnalysis(null);
                } else {
                    performAiAnalysis(jobPendingAnalysis);
                }
            } else {
                toast({ title: "Error", description: "Could not fetch existing AI analysis for pending job. Proceeding with generation.", variant: "destructive" });
                performAiAnalysis(jobPendingAnalysis); 
            }
          });
      } else {
        const cachedData = jobAnalysisCache[jobPendingAnalysis.id];
        if (cachedData && cachedData.matchScore !== undefined && cachedData.matchExplanation !== undefined) {
            setSelectedJobForDetails(prevJob => prevJob ? { ...prevJob, ...cachedData } : null);
            setIsLoadingExplanation(false);
            setJobPendingAnalysis(null);
        } else {
            performAiAnalysis(jobPendingAnalysis);
        }
      }
    }
  }, [currentUser, isCacheReadyForAnalysis, jobPendingAnalysis, selectedJobForDetails, performAiAnalysis, setJobAnalysisCache, toast, jobAnalysisCache]);


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
                           ? (typeof error.response.data.detail === 'string' ? error.response.data.detail : JSON.stringify(error.response.data.detail))
                           : `Could not sync job ${actionTypeForBackend.toLowerCase()} with backend.`;
        toast({ title: "Backend Sync Failed", description: errorMessage, variant: "destructive" });
    }
  };

const openMaterialsModal = (job: JobListing, docType: 'resume' | 'coverLetter') => {
    if (typeof job.id !== 'number' || isNaN(job.id)) {
        toast({ title: "Error", description: "Cannot generate materials for job with invalid ID.", variant: "destructive"});
        return;
    }
    setSelectedJobForMaterials(job);
    setDocTypeForGeneration(docType);
    setMaterialGenerationStep('initial');
    setGeneratedQuestions(null);
    setUserAnswers([]);
    setGeneratedResume(null);
    setGeneratedCoverLetter(null);
    setIsMaterialsModalOpen(true);
};

const handleAnswerChange = (index: number, answer: string) => {
    setUserAnswers(prev => {
        const newAnswers = [...prev];
        if (newAnswers[index]) {
            newAnswers[index].answer = answer;
        }
        return newAnswers;
    });
};

const handleStartQuestionGeneration = async () => {
    if (!selectedJobForMaterials || !docTypeForGeneration) return;
    if (!currentUser || !currentUser.professional_summary || !currentUser.skills || currentUser.skills.length === 0) {
        toast({ title: "Profile Incomplete", description: "Please complete your profile (summary, skills) to generate materials.", variant: "destructive" });
        return;
    }

    setIsLoadingQuestions(true);
    setMaterialGenerationStep('questions');
    try {
        const input: GenerateQuestionsInput = {
            jobDescription: selectedJobForMaterials.description || '',
            userProfile: currentUser.professional_summary || '',
            documentType: docTypeForGeneration,
        };
        const questionsResult = await generateQuestions(input);
        setGeneratedQuestions(questionsResult.questions);
        setUserAnswers(questionsResult.questions.map(q => ({ question: q.question, answer: '' }))); // Initialize answers
    } catch (error) {
        console.error("Error generating questions:", error);
        toast({ title: "Question Generation Failed", description: "Could not generate guiding questions.", variant: "destructive" });
        setMaterialGenerationStep('initial'); // Revert to initial if questions fail
    } finally {
        setIsLoadingQuestions(false);
    }
};


const handleProceedWithAnswers = async () => {
    if (!selectedJobForMaterials || !docTypeForGeneration || !currentUser?.professional_summary) {
        toast({ title: "Error", description: "Missing information to generate document.", variant: "destructive" });
        return;
    }
    if (userAnswers.some(qa => !qa.answer.trim())) {
        toast({ title: "Answers Incomplete", description: "Please answer all questions to proceed.", variant: "destructive" });
        return;
    }

    setMaterialGenerationStep('generating');

    try {
        const pointsInput: ExtractJobDescriptionPointsInput = { jobDescription: selectedJobForMaterials.description || '' };
        const pointsResult = await extractJobDescriptionPoints(pointsInput);
        const pointsToMention = [...(pointsResult?.keyRequirements || []), ...(pointsResult?.keySkills || [])];

        const generationInput: GenerateDocumentInput = {
            jobDescription: selectedJobForMaterials.description || '',
            userProfile: currentUser.professional_summary,
            pointsToMention: pointsToMention,
            qAndA: userAnswers,
        };

        if (docTypeForGeneration === 'resume') {
            setIsLoadingResume(true);
            const resumeResult = await generateResume(generationInput);
            setGeneratedResume(resumeResult.resume);
            setIsLoadingResume(false);
            addLocalActivity({ action_type: "RESUME_GENERATED_FOR_JOB", job_id: selectedJobForMaterials.id, user_id: currentUser.id, activity_metadata: { jobTitle: selectedJobForMaterials.job_title, success: true } });
        } else if (docTypeForGeneration === 'coverLetter') {
            setIsLoadingCoverLetter(true);
            const coverLetterResult = await generateCoverLetter(generationInput);
            setGeneratedCoverLetter(coverLetterResult.coverLetter);
            setIsLoadingCoverLetter(false);
            addLocalActivity({ action_type: "COVER_LETTER_GENERATED_FOR_JOB", job_id: selectedJobForMaterials.id, user_id: currentUser.id, activity_metadata: { jobTitle: selectedJobForMaterials.job_title, success: true } });
        }
        setMaterialGenerationStep('done');
    } catch (error) {
        console.error(`Error generating ${docTypeForGeneration}:`, error);
        toast({ title: `${docTypeForGeneration === 'resume' ? 'Resume' : 'Cover Letter'} Generation Failed`, variant: "destructive" });
        setMaterialGenerationStep('questions'); // Allow user to retry or adjust
        if (docTypeForGeneration === 'resume') setIsLoadingResume(false);
        if (docTypeForGeneration === 'coverLetter') setIsLoadingCoverLetter(false);
        addLocalActivity({ action_type: docTypeForGeneration === 'resume' ? "RESUME_GENERATED_FOR_JOB" : "COVER_LETTER_GENERATED_FOR_JOB", job_id: selectedJobForMaterials.id, user_id: currentUser.id, activity_metadata: { jobTitle: selectedJobForMaterials.job_title, success: false, error: error instanceof Error ? error.message : "Unknown" } });
    }
};


  const isProfileIncompleteForAIFeatures = currentUser && (!currentUser.username || !currentUser.professional_summary || !currentUser.skills || currentUser.skills.length === 0);


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
            AI-powered match analysis and material generation require a complete profile (username, summary and skills). Some AI features may be limited.
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
            <Card className="p-6 border rounded-lg bg-card shadow">
                <CardHeader className="p-0 mb-4">
                    <CardTitle className="text-xl font-semibold flex items-center"><Settings2 className="mr-2 h-5 w-5 text-primary"/>Configure Job Fetch Parameters</CardTitle>
                    <CardDescription>Adjust these criteria to refine the jobs fetched from the external API. Defaults are based on your profile.</CardDescription>
                </CardHeader>
                <CardContent className="p-0 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="fetch-job-titles" className="flex items-center text-sm font-medium"><Tag className="mr-2 h-4 w-4 text-muted-foreground" />Job Titles (comma-separated)</Label>
                            <Input id="fetch-job-titles" placeholder="e.g., Software Engineer, Product Manager" value={fetchJobTitlesInput} onChange={(e) => setFetchJobTitlesInput(e.target.value)} className="mt-1" />
                        </div>
                        <div>
                            <Label htmlFor="fetch-skills" className="flex items-center text-sm font-medium"><Star className="mr-2 h-4 w-4 text-muted-foreground" />Skills (comma-separated)</Label>
                            <Input id="fetch-skills" placeholder="e.g., Python, React, Project Management" value={fetchSkillsInput} onChange={(e) => setFetchSkillsInput(e.target.value)} className="mt-1" />
                        </div>
                        <div>
                            <Label htmlFor="fetch-locations" className="flex items-center text-sm font-medium"><MapPinned className="mr-2 h-4 w-4 text-muted-foreground" />Locations (comma-separated)</Label>
                            <Input id="fetch-locations" placeholder="e.g., New York, Remote, London" value={fetchLocationsInput} onChange={(e) => setFetchLocationsInput(e.target.value)} className="mt-1" />
                        </div>
                        <div>
                            <Label htmlFor="fetch-experience" className="flex items-center text-sm font-medium"><CheckSquare className="mr-2 h-4 w-4 text-muted-foreground" />Years of Experience</Label>
                            <Input id="fetch-experience" type="number" placeholder="e.g., 5" value={fetchExperienceInput} onChange={(e) => setFetchExperienceInput(e.target.value)} className="mt-1" />
                        </div>
                    </div>
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="advanced-filters">
                        <AccordionTrigger className="text-sm font-medium hover:no-underline text-primary">
                            <div className="flex items-center">
                                <Filter className="mr-2 h-4 w-4" /> Advanced Filters
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-4 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="fetch-countries" className="flex items-center text-sm font-medium"><Globe className="mr-2 h-4 w-4 text-muted-foreground" />Countries (comma-separated)</Label>
                                    <Input id="fetch-countries" placeholder="e.g., US, CA, GB, India" value={fetchCountriesInput} onChange={(e) => setFetchCountriesInput(e.target.value)} className="mt-1" />
                                    <p className="text-xs text-muted-foreground mt-1">Optional. Enter country names or ISO alpha-2 codes (e.g., United States, CA).</p>
                                </div>
                                <div>
                                    <Label htmlFor="fetch-remote" className="flex items-center text-sm font-medium"><Wifi className="mr-2 h-4 w-4 text-muted-foreground" />Remote Preference</Label>
                                    <Select value={fetchRemotePreferenceInput} onValueChange={(value) => setFetchRemotePreferenceInput(value as 'any' | 'true' | 'false')}>
                                        <SelectTrigger className="w-full mt-1">
                                            <SelectValue placeholder="Select preference" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="any">Any</SelectItem>
                                            <SelectItem value="true">Remote Only</SelectItem>
                                            <SelectItem value="false">On-site/Hybrid</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="fetch-limit" className="flex items-center text-sm font-medium"><ListFilter className="mr-2 h-4 w-4 text-muted-foreground" />Max Jobs to Fetch</Label>
                                    <Input id="fetch-limit" type="number" min="1" max={MAX_JOB_FETCH_LIMIT.toString()} placeholder={`1-${MAX_JOB_FETCH_LIMIT}`} value={fetchLimitInput} onChange={(e) => setFetchLimitInput(e.target.value)} className="mt-1" />
                                    <p className="text-xs text-muted-foreground mt-1">Max: {MAX_JOB_FETCH_LIMIT}</p>
                                </div>
                                <div>
                                    <Label htmlFor="fetch-max-age" className="flex items-center text-sm font-medium"><CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />Max Job Posting Age (Days)</Label>
                                    <Input id="fetch-max-age" type="number" min="1" placeholder="e.g., 30" value={fetchMaxAgeDaysInput} onChange={(e) => setFetchMaxAgeDaysInput(e.target.value)} className="mt-1" />
                                </div>
                            </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                     <Button onClick={handleGenerateJobs} disabled={isLoadingGenerateJobs} size="lg" className="w-full md:w-auto mt-4">
                        {isLoadingGenerateJobs ? <LoadingSpinner className="mr-2" /> : <DatabaseZap className="mr-2 h-5 w-5" />}
                        {isLoadingGenerateJobs ? 'Fetching Jobs...' : `Fetch Up to ${Math.min(Number(fetchLimitInput) || DEFAULT_JOB_FETCH_LIMIT, MAX_JOB_FETCH_LIMIT)} Jobs`}
                    </Button>
                </CardContent>
            </Card>

            {errorGenerateJobs && (
              <Alert variant="destructive" className="mt-4">
                <ServerCrash className="h-5 w-5" />
                <AlertTitle>Error Generating Jobs</AlertTitle>
                <AlertDescription>{errorGenerateJobs}</AlertDescription>
              </Alert>
            )}

          {isLoadingGenerateJobs && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <LoadingSpinner size={40} />
              <p className="mt-3 text-lg text-muted-foreground">Fetching new jobs from API...</p>
            </div>
          )}
          {!isLoadingGenerateJobs && lastFetchCount !== null && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3">
                {lastFetchCount > 0 ? `${lastFetchCount} job(s) fetched from the API:` : (lastFetchCount === 0 ? "No new jobs found from the API matching your criteria." : "")}
              </h3>
              {fetchedApiJobs.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {fetchedApiJobs.map((job, index) => (
                    <JobCard
                      key={job.api_id ? `fetched-api-${job.api_id}` : `fetched-db-${job.id}-${index}`}
                      job={job}
                      onViewDetails={handleViewDetails}
                      onSaveJob={handleSaveJob}
                      onGenerateMaterials={(jobForMat) => openMaterialsModal(jobForMat, 'resume')} // Default to resume, modal will allow choosing
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
          {(() => {
            if (!currentUser || (!isCacheReadyForAnalysis && !filtersReady && !isLoadingRelevantJobs && !errorRelevantJobs)) {
                return (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <LoadingSpinner size={40} />
                    <p className="mt-3 text-lg text-muted-foreground">Initializing...</p>
                  </div>
                );
            }
            if (isLoadingRelevantJobs && relevantJobsList.length === 0) {
              return (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <LoadingSpinner size={40} />
                  <p className="mt-3 text-lg text-muted-foreground">Loading relevant jobs...</p>
                </div>
              );
            }
            if (!isLoadingRelevantJobs && errorRelevantJobs) {
              return (
                <Alert variant="destructive" className="my-6">
                  <ServerCrash className="h-5 w-5" />
                  <AlertTitle>Error Loading Relevant Jobs</AlertTitle>
                  <AlertDescription>{errorRelevantJobs}</AlertDescription>
                </Alert>
              );
            }
            if (!isLoadingRelevantJobs && !errorRelevantJobs && relevantJobsList.length === 0 && filtersReady && isCacheReadyForAnalysis) {
              return (
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
              );
            }
            if (relevantJobsList.length > 0) {
              return (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {relevantJobsList.map((job, index) => (
                      <JobCard
                        key={job.api_id ? `relevant-api-${job.api_id}` : `relevant-db-${job.id}-${index}`}
                        job={job}
                        onViewDetails={handleViewDetails}
                        onSaveJob={handleSaveJob}
                        onGenerateMaterials={(jobForMat) => openMaterialsModal(jobForMat, 'resume')}
                        isSaved={savedJobIds.has(job.id)}
                      />
                    ))}
                  </div>
                  <PaginationControls
                    currentPage={relevantJobsCurrentPage}
                    onPageChange={(page) => setRelevantJobsCurrentPage(page)}
                    canGoPrevious={relevantJobsCurrentPage > 1}
                    canGoNext={hasNextRelevantPage}
                    isLoading={isLoadingRelevantJobs && relevantJobsList.length > 0} 
                  />
                </>
              );
            }
             if (isLoadingRelevantJobs && relevantJobsList.length > 0) { // Still loading next page
                return (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {relevantJobsList.map((job, index) => (
                            <JobCard
                            key={job.api_id ? `relevant-api-${job.api_id}` : `relevant-db-${job.id}-${index}`}
                            job={job}
                            onViewDetails={handleViewDetails}
                            onSaveJob={handleSaveJob}
                            onGenerateMaterials={(jobForMat) => openMaterialsModal(jobForMat, 'resume')}
                            isSaved={savedJobIds.has(job.id)}
                            />
                        ))}
                        </div>
                         <div className="flex flex-col items-center justify-center py-12 text-center">
                            <LoadingSpinner size={32} />
                            <p className="mt-2 text-sm text-muted-foreground">Loading more...</p>
                        </div>
                    </>
                );
            }
            if (isLoadingRelevantJobs || !filtersReady || !isCacheReadyForAnalysis) { // Default loading if still processing prerequisites
                return (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <LoadingSpinner size={40} />
                      <p className="mt-3 text-lg text-muted-foreground">Processing jobs...</p>
                    </div>
                );
            }
            return null;
          })()}
        </TabsContent>

        <TabsContent value="all" className="space-y-6">
          <div className="p-4 border rounded-lg bg-card shadow-sm mb-6">
            <h3 className="text-lg font-semibold mb-3 flex items-center"><Filter className="mr-2 h-5 w-5 text-primary" />Filter All Jobs</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="filter-tech" className="text-sm font-medium">Technology (comma-separated)</Label>
                <Input
                  id="filter-tech"
                  placeholder="e.g., Python, React"
                  value={filterTechnology}
                  onChange={(e) => setFilterTechnology(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="filter-loc" className="text-sm font-medium">Location (comma-separated)</Label>
                <Input
                  id="filter-loc"
                  placeholder="e.g., New York, Remote"
                  value={filterLocation}
                  onChange={(e) => setFilterLocation(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="filter-exp" className="text-sm font-medium">Experience (e.g., 5+ years)</Label>
                <Input
                  id="filter-exp"
                  placeholder="e.g., 3 years, Senior"
                  value={filterExperience}
                  onChange={(e) => setFilterExperience(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button onClick={() => setAllJobsCurrentPage(1)} disabled={isLoadingAllJobs}>
                {isLoadingAllJobs && (filterTechnology || filterLocation || filterExperience) ? <LoadingSpinner className="mr-2" /> : <Search className="mr-2 h-4 w-4" />}
                Apply Filters
              </Button>
              <Button variant="outline" onClick={handleClearFilters} disabled={isLoadingAllJobs || (!filterTechnology && !filterLocation && !filterExperience)}>
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
                {filterTechnology || filterLocation || filterExperience ? "No jobs match your current filters." : "No jobs were found in our database. Try generating jobs from the \"Generate Jobs\" tab."}
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
                isLoading={isLoadingAllJobs && allJobsList.length > 0}
              />
            </>
          )}
        </TabsContent>
      </Tabs>

      <JobDetailsModal
        job={selectedJobForDetails}
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        onGenerateMaterials={(jobForMat) => openMaterialsModal(jobForMat, 'resume')}
        isLoadingExplanation={isLoadingExplanation}
      />
     <ApplicationMaterialsModal
        isOpen={isMaterialsModalOpen}
        onClose={() => {
            setIsMaterialsModalOpen(false);
            // Reset Q&A states when modal closes
            setMaterialGenerationStep('initial');
            setGeneratedQuestions(null);
            setUserAnswers([]);
            setDocTypeForGeneration(null);
        }}
        job={selectedJobForMaterials}
        step={materialGenerationStep}
        docType={docTypeForGeneration}
        generatedQuestions={generatedQuestions}
        userAnswers={userAnswers}
        isLoadingQuestions={isLoadingQuestions}
        isLoadingResume={isLoadingResume}
        isLoadingCoverLetter={isLoadingCoverLetter}
        generatedResume={generatedResume}
        generatedCoverLetter={generatedCoverLetter}
        onAnswerChange={handleAnswerChange}
        onStartQuestionGeneration={handleStartQuestionGeneration}
        onProceedWithAnswers={handleProceedWithAnswers}
        onGenerateDirectly={async (jobToGenFor, type) => { // Placeholder for direct generation if needed, or remove
            if (type === 'resume') {
                // Simplified direct resume generation
                setMaterialGenerationStep('generating');
                setIsLoadingResume(true);
                const points = await extractJobDescriptionPoints({ jobDescription: jobToGenFor.description || '' });
                const input: GenerateDocumentInput = { jobDescription: jobToGenFor.description || '', userProfile: currentUser?.professional_summary || '', pointsToMention: [...(points?.keyRequirements || []), ...(points?.keySkills || [])] };
                const result = await generateResume(input);
                setGeneratedResume(result.resume);
                setIsLoadingResume(false);
                setMaterialGenerationStep('done');

            } else {
                 // Simplified direct cover letter generation
                setMaterialGenerationStep('generating');
                setIsLoadingCoverLetter(true);
                const points = await extractJobDescriptionPoints({ jobDescription: jobToGenFor.description || '' });
                const input: GenerateDocumentInput = { jobDescription: jobToGenFor.description || '', userProfile: currentUser?.professional_summary || '', pointsToMention: [...(points?.keyRequirements || []), ...(points?.keySkills || [])] };
                const result = await generateCoverLetter(input);
                setGeneratedCoverLetter(result.coverLetter);
                setIsLoadingCoverLetter(false);
                setMaterialGenerationStep('done');
            }
        }}
      />
    </div>
  );
}

    

    

