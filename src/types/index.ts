
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
 * Represents an item of work experience. Aligned with backend model.
 * Dates are stored as "yyyy-MM-dd" strings.
 */
export interface WorkExperienceItem {
  id?: string; // Frontend ID for list management (string for UUIDs or backend numeric ID converted)
  company_name: string;
  job_title: string;
  start_date: string; // "yyyy-MM-dd" - This is required by backend
  end_date?: string | null; // "yyyy-MM-dd" or null if current - Backend: nullable=True
  description?: string | null; // Backend: nullable=True
  currently_working?: boolean; // Frontend helper
}

/**
 * Represents an item of education. Aligned with backend model.
 * Years are numbers.
 */
export interface EducationItem {
  id?: string; // Frontend ID
  institution: string; // Backend: nullable=False
  degree: string; // Backend: nullable=False
  start_year?: number | null; // Backend: nullable=True
  end_year?: number | null; // Backend: nullable=True
  currently_studying?: boolean; // Frontend helper
}

/**
 * Represents a certification. Aligned with backend model.
 * Issue date is stored as "yyyy-MM-dd" string.
 */
export interface CertificationItem {
  id?: string; // Frontend ID
  title: string; // Backend: nullable=False
  issued_by?: string | null; // Backend: nullable=True
  issue_date?: string | null; // "yyyy-MM-dd" - Backend: nullable=True
  credential_url?: string | null; // Backend: nullable=True
}


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
  countries: string[]; // Array of strings for frontend User type
  country?: string; // Sometimes backend might send singular 'country' as string
  remote_preference?: RemotePreferenceAPI | string | null;
  professional_summary?: string | null;
  expected_salary?: number | null;
  resume?: string | null; // URL
  joined_date?: string; // ISO datetime string
  match_scores?: BackendMatchScoreLogItem[];
  saved_jobs?: SavedJob[];
  work_experiences?: WorkExperienceItem[];
  educations?: EducationItem[];
  certifications?: CertificationItem[];
}

// API Request/Response types from the guide

// For POST /users/ (registration) - Matches Backend Documentation.md
export interface UserIn {
  username: string;
  email: string;
  number: string | null;
  password: string;
}

export interface UserLogin { // For POST /users/login
  email: string;
  password: string;
}

// For POST /users/login
export interface UserLoginResponse {
  messages: string;
  user_id: number;
}

// For POST /users/ (registration) - Matches Backend Documentation.md
export interface UserRegistrationResponse {
  messages: string;
  user_id: number;
}

// For PUT /users/{id} - Matches Backend Documentation.md UserUpdate
// This type is for the payload sent to the backend.
// 'country' is a comma-separated string. 'skills' and 'preferred_locations' are also comma-separated.
export interface UserUpdateAPI {
  username?: string;
  number?: string | null; // Corresponds to User.phone_number
  desired_job_role?: string | null;
  skills?: string; // Comma-separated string from User.skills array
  experience?: number | null;
  preferred_locations?: string; // Comma-separated string from User.preferred_locations array
  country: string; // Comma-separated string from User.countries array - NOW REQUIRED
  remote_preference?: RemotePreferenceAPI | null;
  professional_summary?: string | null;
  expected_salary?: number | null;
  resume?: string | null; // URL
  work_experiences?: Omit<WorkExperienceItem, 'id' | 'currently_working'>[] | null;
  educations?: Omit<EducationItem, 'id' | 'currently_studying'>[] | null;
  certifications?: Omit<CertificationItem, 'id'>[] | null;
}


// General success response for PUT /users/{id} and DELETE /users/{id}
export interface UserModifyResponse {
  messages: string;
  user_id: number;
}


// --- Job Fetching Payloads ---
export interface UserProfileForJobFetching {
  job_titles?: string[];
  skills?: string[];
  experience?: number | null;
  locations?: string[];
  countries?: string[]; // Array of strings
  remote?: boolean | null;
  limit?: number;
  posted_at_max_age_days?: number;
}

// Payload for POST /jobs/relevant_jobs
export interface RelevantJobsRequestPayload {
  job_title?: string;
  technology?: string;
  location?: string;
  experience?: string;
  skip?: number;
  limit?: number;
}


/**
 * Represents a job listing, aligned with JobListingResponse from backend.
 * Frontend type for JobListing.
 */
export interface JobListing {
  // Core fields always expected
  id: number;
  job_title: string;
  company: string;
  location: string | null;
  description: string | null;

  // Fields from backend's JobListingResponse
  api_id?: string | null;
  url?: string | null;
  date_posted?: string | null;
  employment_status?: string[] | null;
  matching_phrase?: string[] | null;
  matching_words?: string[] | null;
  company_domain?: string | null;
  final_url?: string | null;
  source_url?: string | null;
  remote?: boolean | null;
  hybrid?: boolean | null;
  salary_string?: string | null;
  min_salary?: number | null;
  max_salary?: number | null;
  currency?: string | null;
  country?: string | null; // This is singular on backend JobListingResponse
  seniority?: string | null;
  discovered_at: string;
  reposted?: boolean | null;
  date_reposted?: string | null;
  country_code?: string | null;
  job_expired?: boolean | null;
  industry_id?: string | null;
  fetched_data?: string | null;
  key_info?: string | null;
  hiring_team?: HiringTeamMember[] | null;

  // Frontend specific fields or enhancements
  technologies?: Technology[];
  companyLogo?: string;
  matchScore?: number;
  matchExplanation?: string;
}

// Type for the raw backend job listing item, before mapping
export interface BackendJobListingResponseItem {
  id?: number | string | null | undefined;
  api_id?: string | null | undefined;
  job_title: string;
  url?: string | null;
  date_posted?: string | null;
  company_obj?: BackendCompanyObject | null;
  company_domain?: string | null;
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
  country?: string | null;
  seniority?: string | null;
  description?: string | null;
  reposted?: boolean | null;
  date_reposted?: string | null;
  country_code?: string | null;
  job_expired?: boolean | null;
  industry_id?: string | null;
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
  id: string;
  jobId: number;
  jobTitle: string;
  company: string | null;
  status: ApplicationStatus;
  appliedDate?: string;
  notes?: string;
  lastUpdated: string;
}

// Activity Logging Types for backend
export interface ActivityIn {
  user_id: number;
  job_id?: number | null;
  action_type: string;
  metadata?: { [key: string]: any } | null;
}

// Response for POST /activity/log
export interface ActivityLogResponse {
  messages: string;
  activity_id: string;
}


// Payload for POST /jobs/{id}/save - matches SaveJob from docs
export interface SaveJobPayload {
  user_id: number;
  job_id: number; // Top-level as requested
  action_type: "JOB_SAVED";
  activity_metadata?: { [key: string]: any } | null;
}

export interface SaveJobResponse { // For POST /jobs/{id}/save
  messages: string;
  activity_id: number;
}

// For DELETE /jobs/{id}/save
export interface DeleteSavedJobResponse {
    messages: string;
    msg: string;
}


// Payload for POST /jobs/{id}/analyze - matches AnalyzeResultIn from docs
export interface AnalyzeResultIn {
  user_id: number;
  score: number;
  explanation: string;
}

// For Resumes - matches ResumeIn from docs
export interface ResumeIn {
  user_id: number;
  job_id?: number | null;
  source: string;
  content: string;
}

// Response for POST /users/{id}/resume
export interface ResumeUploadResponse {
  messages: string;
  resume_id: number;
}

export type ActivityType =
  | "JOB_SAVED"
  | "JOB_UNSAVED"
  | "RESUME_GENERATED_FOR_JOB"
  | "COVER_LETTER_GENERATED_FOR_JOB"
  | "GENERAL_RESUME_GENERATED"
  | "GENERAL_COVER_LETTER_GENERATED"
  | "AI_JOB_ANALYZED"
  | "APPLICATION_STATUS_UPDATED";

export interface LocalUserActivity {
  id: string;
  timestamp: string;
  user_id?: number;
  job_id?: number;
  action_type: ActivityType;
  activity_metadata?: { [key: string]: any };
}

// Type for GET /users/{id}/activities - matches UserActivityOut from docs
export interface UserActivityOut {
  id: number;
  user_id: number;
  job_id: number | null;
  action_type: string;
  activity_metadata: { [key: string]: any } | null;
  created_at: string;
}

// Feedback submission payload
export interface FeedbackIn {
  feedback: string;
  metadata?: { [key: string]: any };
}

// Type for GET /jobs/{id}/match_score and POST /jobs/{id}/analyze response - matches AnalyzeResultOut from docs
export interface AnalyzeResultOut {
  job_id?: number;
  score: number;
  explanation: string;
}

