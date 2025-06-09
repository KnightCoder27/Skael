
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
 * Represents a technology or skill (simplified for now).
 */
export interface Technology {
  id: number; // Added for sample data consistency
  technology_name: string;
  technology_slug: string;
  // Add other fields as they become necessary from backend or usage
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
  job_role?: string | null; // Was desired_job_role
  skills?: string[]; // Was skills_list_text (now array of strings)
  experience?: number | null;
  preferred_locations?: string[]; // Was location_string (now array of strings)
  remote_preference?: RemotePreferenceAPI | string | null; // Allow string for flexibility from API
  professional_summary?: string | null;
  expected_salary?: number | null; // Was string
  resume?: string | null; // URL
  joined_date?: string; // ISO datetime string
  // Fields removed: preferred_tier_id, country (if not in UserOut)
}

// API Request/Response types from the guide

export interface UserIn { // For POST /users/ (registration)
  username: string;
  email: string;
  number: string | null; // Changed to allow null
  password: string;
}

export interface UserLogin { // For POST /users/login
  email: string;
  password: string;
}

export interface UserLoginResponse {
  msg: string;
  user_id: number; // Backend User ID
}

export interface UserRegistrationResponse {
  msg: string;
  id: number; // Backend User ID
}


export interface UserUpdateAPI { // For PUT /users/{id}
  username?: string;
  number?: string;
  desired_job_role?: string;
  skills?: string; // Comma-separated string of skill names
  experience?: number;
  preferred_locations?: string; // Comma-separated string of location names
  remote_preference?: RemotePreferenceAPI;
  professional_summary?: string;
  expected_salary?: number;
  resume?: string; // File path or URL
}


/**
 * Represents a job listing, partially aligned with JobListingResponse from backend.
 * Needs further alignment if we fetch jobs from backend.
 */
export interface JobListing {
  id: number; // Keeping as number
  job_title: string;
  company: string;
  location: string;
  description: string;
  url?: string;
  salary_string?: string;
  date_posted?: string;
  technologies?: Technology[]; 
  companyLogo?: string;
  matchScore?: number;
  matchExplanation?: string;
  remote?: boolean;
  hybrid?: boolean;
  currency?: string;
  employment_status?: string; 
  api_id?: string | null; 
  company_domain?: string | null; 
  company_obj_id?: number | null; 
  final_url?: string | null; 
  source_url?: string | null; 
  min_salary?: number | null; 
  max_salary?: number | null; 
  seniority?: string | null; 
  discovered_at?: string; 
  reposted?: boolean | null; 
  date_reposted?: string | null; 
  country_code?: string | null; 
  job_expired?: boolean | null; 
  industry_id?: string | null; 
}

/**
 * Represents the status of a job application.
 */
export type ApplicationStatus = "Interested" | "Saved" | "Applied" | "Interviewing" | "Offer" | "Rejected";

/**
 * Represents a job application tracked by the user.
 * This will eventually be managed by backend API.
 */
export interface TrackedApplication {
  id: string; 
  jobId: number;
  jobTitle: string;
  company: string;
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

export interface ActivityLogResponse {
  msg: string;
  activity_id: string;
}

// For Job Analysis
export interface AnalyzeResult {
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
  msg: string;
  resume_id: string;
}

// This type was for local storage and might be deprecated or changed
export type ActivityType =
  | "MATCH_ANALYSIS_VIEWED"
  | "JOB_SAVED"
  | "JOB_UNSAVED"
  | "RESUME_GENERATED_FOR_JOB"
  | "COVER_LETTER_GENERATED_FOR_JOB"
  | "GENERAL_RESUME_GENERATED"
  | "GENERAL_COVER_LETTER_GENERATED";

export interface LocalUserActivity {
  id: string;
  type: ActivityType;
  timestamp: string;
  userId?: number; 
  jobId?: number;
  jobTitle?: string;
  company?: string;
  details?: { [key: string]: any };
}

