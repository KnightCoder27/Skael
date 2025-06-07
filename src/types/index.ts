
/**
 * Enum for specifying remote work preferences.
 */
export type RemotePreference = "Remote" | "Hybrid" | "Onsite" | "Any";

/**
 * Represents a geographical location.
 */
export interface Location {
  id: number; // Kept as number, assuming these are predefined or managed elsewhere
  name: string;
}

/**
 * Represents a technology or skill.
 */
export interface Technology {
  id: number; // Kept as number for sample data consistency
  technology_name: string;
  technology_slug: string;
  category?: string;
  category_slug?: string;
  logo?: string;
  logo_thumbnail?: string;
  one_liner?: string;
  url?: string;
  description?: string;
}

/**
 * Represents a company tier.
 */
export interface Tier {
  id: string; // Firestore IDs are strings
  company_id: string; // Assuming Company ID will also be string
  tier_rank?: string;
}

/**
 * Represents a company.
 */
export interface Company {
  id: string; // Firestore IDs are strings
  api_company_id?: string;
  company_name: string;
  company_domain: string;
  industry?: string;
  country?: string;
  country_code?: string;
  url?: string;
  long_description?: string;
  linkedin_url?: string;
  linkedin_id?: string;
  logo?: string;
  industry_id?: string;
  tiers?: Tier[];
  fetched_date?: string;
}

/**
 * Represents a user of the application.
 * Firestore document ID will be used as the 'id'.
 */
export interface User {
  id: string; // Firestore Document ID
  user_name?: string;
  phone_number?: string;
  email_id: string; // Should be unique
  
  professional_summary?: string;
  desired_job_role?: string;
  
  // skills?: Technology[]; // For simplicity, keeping skills as text for now if not deeply integrated
  skills_list_text?: string;

  experience?: number;
  
  // preferred_locations?: Location[]; // For simplicity, keeping locations as text
  location_string?: string;
  country?: string;

  remote_preference?: RemotePreference;
  
  preferred_tier_id?: string;
  expected_salary?: string;
  resume?: string; // URL
  joined_date?: string; // ISO datetime string (when profile created in Firestore)
}

/**
 * Represents a job listing.
 * Assuming JobListing data is static or from another source for now, not in Firestore.
 */
export interface JobListing {
  id: number; // Keeping as number for sample data
  unique_input_id?: string; 
  api_id?: string; 
  job_title: string; 
  url?: string; 
  date_posted?: string; 
  employment_status?: string;
  
  company: string; 
  company_domain?: string; 
  // company_obj_id?: string; // If linking to Company collection
  // company_obj?: Company; 

  final_url?: string;
  source_url?: string;
  location: string; 
  remote?: boolean;
  hybrid?: boolean;
  
  salary_string?: string; 
  min_salary?: number;
  max_salary?: number;
  currency?: string; 

  country?: string;
  seniority?: string;
  discovered_at?: string; 
  
  description: string; 
  reposted?: boolean;
  date_reposted?: string; 
  country_code?: string; 
  job_expired?: boolean;
  
  industry_id?: string; 
  fetched_data?: string; 
  matching_phrase?: string[];
  matching_words?: string[];

  technologies?: Technology[]; 

  companyLogo?: string; 
  matchScore?: number; 
  matchExplanation?: string; 
}

/**
 * Represents the status of a job application.
 */
export type ApplicationStatus = "Interested" | "Saved" | "Applied" | "Interviewing" | "Offer" | "Rejected";

/**
 * Represents a job application tracked by the user.
 * These will be stored in a subcollection under the user.
 */
export interface TrackedApplication {
  id: string; // Firestore Document ID for the tracked application
  jobId: number; // ID from the JobListing (sample data)
  jobTitle: string;
  company: string;
  status: ApplicationStatus;
  appliedDate?: string; 
  notes?: string;
  lastUpdated: string; 
}

// Activity Logging Types
export type ActivityType = 
  | "MATCH_ANALYSIS_VIEWED"
  | "JOB_SAVED"
  | "JOB_UNSAVED"
  | "RESUME_GENERATED_FOR_JOB"
  | "COVER_LETTER_GENERATED_FOR_JOB"
  | "GENERAL_RESUME_GENERATED" // For profile page
  | "GENERAL_COVER_LETTER_GENERATED"; // For profile page

// Simplified activity structure for local storage
export interface LocalUserActivity {
  id: string; // Unique ID for the activity log entry
  type: ActivityType;
  timestamp: string; // ISO datetime string
  userId?: string; // Optional: if you want to associate with currentUser.id
  jobId?: number;
  jobTitle?: string;
  company?: string;
  details?: { [key: string]: any }; // Generic details
}
