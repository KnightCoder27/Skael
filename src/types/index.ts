
/**
 * Enum for specifying remote work preferences.
 */
export type RemotePreferenceAPI = "Remote" | "Hybrid" | "Onsite"; // As per backend guide

/**
 * Represents a geographical location (simplified for now).
 */
export interface Location {
  name: string;
}

/**
 * Represents a technology or skill object as provided by the backend.
 */
export interface BackendTechnologyObject {
  id: number | string;
  technology_name: string;
  technology_slug: string;
  category?: string | null;
  logo?: string | null;
  one_liner?: string | null;
  description?: string | null;
  category_slug?: string | null;
  logo_thumbnail?: string | null;
  url?: string | null;
}

/**
 * Represents a technology or skill for frontend use.
 */
export interface Technology {
  id: number | string;
  technology_name: string;
  technology_slug: string;
  logo?: string | null;
}

/**
 * Represents a member of the hiring team.
 */
export interface HiringTeamMember {
  name: string;
  title?: string | null;
  linkedin_profile_url?: string | null;
}

/**
 * Represents the company object as provided by the backend.
 */
export interface BackendCompanyObject {
  id: number;
  company_name: string;
  company_domain?: string | null;
  country_code?: string | null;
  long_description?: string | null;
  linkedin_id?: string | null;
  industry_id?: string | null;
  api_company_id?: string | null;
  industry?: string | null;
  country?: string | null;
  url?: string | null;
  linkedin_url?: string | null;
  logo?: string | null;
  fetched_date?: string | null; // Assuming string for ISO date
}


// Expected structure for items from backend related to match scores
export interface BackendMatchScoreLogItem {
  job_id: number;
  score: number;
  explanation: string;
}

/**
 * Represents a saved job item, typically mirroring BackendJobListingResponseItem.
 * This is for jobs returned by endpoints like GET /jobs/user/{user_id}/saved
 */
export type SavedJob = BackendJobListingResponseItem;


/**
 * Represents a user of the application, aligned with backend's UserOut.
 * The 'id' is the backend's database ID.
 */
export interface User {
  id: number; // Backend ID (number)
  username: string;
  email_id: string;
  phone_number?: string | null;
  desired_job_role?: string | null;
  skills?: string[];
  experience?: number | null;
  preferred_locations?: string[];
  countries: string[]; // Now mandatory
  remote_preference?: RemotePreferenceAPI | string | null;
  professional_summary?: string | null;
  expected_salary?: number | null;
  resume?: string | null; // URL
  joined_date?: string; // ISO datetime string
  match_scores?: BackendMatchScoreLogItem[];
  saved_jobs?: SavedJob[];
}

// API Request/Response types from the guide

export interface UserIn { // For POST /users/ (registration)
  username: string;
  email: string;
  number: string | null;
  password: string;
}

export interface UserLogin { // For POST /users/login
  email: string;
  password: string;
}

export interface UserLoginResponse {
  messages: string;
  user_id: number; // Backend User ID
}

export interface UserRegistrationResponse {
  messages: string;
  user_id: number;
}


export interface UserUpdateAPI { // For PUT /users/{id}
  username?: string;
  number?: string;
  desired_job_role?: string;
  skills?: string; // Comma-separated string of skill names
  experience?: number;
  preferred_locations?: string; // Comma-separated string of location names
  country?: string; // Comma-separated string of country codes (e.g., "US,CA")
  remote_preference?: RemotePreferenceAPI;
  professional_summary?: string;
  expected_salary?: number;
  resume?: string; // File path or URL
}

// --- Job Fetching Payloads ---
export interface UserProfileForJobFetching { // For POST /jobs/fetch_jobs
  job_titles?: string[];
  skills?: string[];
  experience?: number | null;
  locations?: string[];
  countries?: string[]; // e.g., ["IN", "US"]
  remote?: boolean | null; // null for any, true for remote, false for not remote
  limit?: number; // Number of jobs to fetch
  posted_at_max_age_days?: number; // Max age of job postings in days
}

// UserProfileForRelevantJobs now mirrors UserProfileForJobFetching as per clarification
export interface UserProfileForRelevantJobs { // For POST /jobs/relevant_jobs
  job_titles?: string[];
  skills?: string[];
  experience?: number | null;
  locations?: string[];
  countries?: string[];
  remote?: boolean | null;
}

/**
 * Represents a job listing, aligned with JobListingResponse from backend.
 * Frontend type for JobListing.
 */
export interface JobListing {
  // Core fields always expected
  id: number; // Database ID
  job_title: string;
  company: string; // Derived from company_obj or fallback
  location: string | null;
  description: string | null;

  // Fields from backend's JobListingResponse
  api_id?: string | null;
  url?: string | null;
  date_posted?: string | null; // Date string
  employment_status?: string[] | null;
  matching_phrase?: string[] | null;
  matching_words?: string[] | null;
  company_domain?: string | null; // Derived from company_obj or fallback
  final_url?: string | null;
  source_url?: string | null;
  remote?: boolean | null;
  hybrid?: boolean | null;
  salary_string?: string | null;
  min_salary?: number | null;
  max_salary?: number | null;
  currency?: string | null;
  country?: string | null;
  seniority?: string | null;
  discovered_at: string; // ISO 8601 datetime string
  reposted?: boolean | null;
  date_reposted?: string | null; // Date string
  country_code?: string | null; // Derived from company_obj or fallback
  job_expired?: boolean | null;
  industry_id?: string | null; // Can be string or number based on backend
  fetched_data?: string | null; // Date string, assuming this is what backend 'fetched_data' field means
  key_info?: string | null;
  hiring_team?: HiringTeamMember[] | null;

  // Frontend specific fields or enhancements
  technologies?: Technology[]; // Mapped from backend's BackendTechnologyObject[]
  companyLogo?: string; // Derived from company_obj.logo or placeholder
  matchScore?: number; // For AI features, populated client-side
  matchExplanation?: string; // For AI features, populated client-side
}

// Type for the raw backend job listing item, before mapping
export interface BackendJobListingResponseItem {
  id?: number | string | null | undefined;
  api_id?: string | null | undefined;
  job_title: string;
  url?: string | null;
  date_posted?: string | null;
  company?: string | null; // Keep for potential fallback if company_obj is missing in older data
  company_obj?: BackendCompanyObject | null;
  company_domain?: string | null; // Keep for potential fallback
  employment_status?: string[] | null;
  final_url?: string | null;
  source_url?: string | null;
  location?: string | null;
  remote?: boolean | null;
  hybrid?: boolean | null;
  salary_string?: string | null;
  min_salary?: number | null;
  max_salary?: number | null;
  currency?: string | null;
  country?: string | null; // Top-level country if company_obj not present
  seniority?: string | null;
  description?: string | null;
  reposted?: boolean | null;
  date_reposted?: string | null;
  country_code?: string | null; // Top-level country_code if company_obj not present
  job_expired?: boolean | null;
  industry_id?: string | null; // Can be string or number
  fetched_data?: string | null;
  discovered_at?: string | null;
  matching_phrase?: string[] | null;
  matching_words?: string[] | null;
  experience?: string | null;
  key_info?: string | null;
  technologies?: BackendTechnologyObject[] | null;
  hiring_team?: HiringTeamMember[] | null;
}


/**
 * Represents the status of a job application.
 */
export type ApplicationStatus = "Interested" | "Saved" | "Applied" | "Interviewing" | "Offer" | "Rejected";

/**
 * Represents a job application tracked by the user.
 */
export interface TrackedApplication {
  id: string; // This is the UserActivityLog ID from the backend if available, or a client-generated one.
  jobId: number; // This is the JobListing.id
  jobTitle: string;
  company: string | null;
  status: ApplicationStatus;
  appliedDate?: string;
  notes?: string;
  lastUpdated: string; // ISO string of the activity that led to this state
}

// Activity Logging Types for backend
// This is for POST /activity/log
export interface ActivityIn {
  user_id: number;
  job_id?: number | null;
  action_type: string;
  metadata?: { [key: string]: any } | null;
}

export interface ActivityLogResponse { // Response from POST /activity/log
  messages: string;
  activity_id: string;
}


// Payload for POST /jobs/{id}/save
export interface SaveJobPayload {
  user_id: number;
  job_id: number;
  action_type: string; // e.g., "JOB_SAVED", "JOB_UNSAVED"
  activity_metadata: { [key: string]: any } | null;
}


// Payload for POST /jobs/{id}/analyze
export interface AnalyzeJobPayload {
  user_id: number;
  job_id: number;
  score: number;
  explanation: string;
}


// For Resumes
export interface ResumeIn {
  user_id: number;
  job_id?: number | null;
  source: string;
  content: string;
}

export interface ResumeGenerateResponse {
  messages: string;
  resume_id: string;
}

export type ActivityType =
  | "JOB_SAVED"
  | "JOB_UNSAVED"
  | "RESUME_GENERATED_FOR_JOB"
  | "COVER_LETTER_GENERATED_FOR_JOB"
  | "GENERAL_RESUME_GENERATED"
  | "GENERAL_COVER_LETTER_GENERATED"
  | "AI_JOB_ANALYZED" // Simple log that an analysis was run
  | "APPLICATION_STATUS_UPDATED";

// Corresponds to backend's UserActivityLog, with client-side id and timestamp
export interface LocalUserActivity {
  id: string; // Client-generated ID for list keying
  timestamp: string; // Client-generated timestamp for local log display/sorting
  user_id?: number; // Corresponds to backend UserActivityLog.user_id
  job_id?: number; // Corresponds to backend UserActivityLog.job_id
  action_type: ActivityType; // Corresponds to backend UserActivityLog.action_type
  activity_metadata?: { [key: string]: any };
}

// Type for the actual structure of UserActivityLog coming from GET /activity/user/{user_id}
export interface UserActivityOut {
  id: number; // DB ID
  user_id: number;
  job_id: number | null;
  action_type: string;
  activity_metadata: { [key: string]: any } | null;
  created_at: string; // ISO 8601 datetime string
}

// Feedback submission payload
export interface FeedbackIn {
  feedback: string;
  metadata?: { [key: string]: any };
}

// Type for GET /jobs/{id}/match_score
export interface AnalyzeResultOut {
  user_id: number;
  job_id: number;
  score: number;
  explanation: string;
}

