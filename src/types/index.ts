
/**
 * Enum for specifying remote work preferences.
 */
export type RemotePreference = "Remote" | "Hybrid" | "Onsite" | "Flexible";

/**
 * Represents a geographical location.
 */
export interface Location {
  id: number;
  name: string; // e.g., "New York", "London"
  // users_preferring_location?: User[]; // Back-reference (many-to-many with User)
}

/**
 * Represents a technology or skill.
 */
export interface Technology {
  id: number;
  technology_name: string;
  technology_slug: string;
  category?: string;
  category_slug?: string;
  logo?: string; // URL to logo
  logo_thumbnail?: string; // URL to thumbnail
  one_liner?: string;
  url?: string; // URL to technology's official page
  description?: string; // Text for potentially longer descriptions
  // users_with_skill?: User[]; // Back-reference (many-to-many with User)
  // job_listings_with_tech?: JobListing[]; // Back-reference (many-to-many with JobListing)
}

/**
 * Represents a company tier (e.g., "Tier 1", "Gold").
 */
export interface Tier {
  id: number;
  company_id: number; // Foreign Key to Company
  // company?: Company; // Direct relationship
  tier_rank?: string;
  // users?: User[]; // Back-reference (users who prefer this tier)
}

/**
 * Represents a company.
 */
export interface Company {
  id: number;
  api_company_id?: string; // ID from the external API's company_object
  company_name: string;
  company_domain: string;
  industry?: string;
  country?: string;
  country_code?: string; // e.g., US, IN (2 characters)
  url?: string; // Company website
  long_description?: string;
  linkedin_url?: string;
  linkedin_id?: string;
  logo?: string; // URL to company logo
  industry_id?: string; // API sourced industry identifier
  tiers?: Tier[]; // One-to-many relationship
  // job_listings?: JobListing[]; // One-to-many relationship
  fetched_date?: string; // ISO date string
}

/**
 * Represents a user of the application.
 * Replaces the old UserProfileData.
 */
export interface User {
  id: number;
  user_name?: string; // Was 'name' in UserProfileData
  phone_number?: string;
  email_id: string; // Was 'email' in UserProfileData, unique
  password?: string; // Should ideally not be stored client-side directly in production
  
  professional_summary?: string; // Was 'rawText' in UserProfileData, for resume/LinkedIn summary
  desired_job_role?: string; // Partially covers 'preferences' from UserProfileData
  
  skills?: Technology[]; // Many-to-many with Technologies - populated from skills_list_text for now
  skills_list_text?: string; // Temporary field to store comma-separated skills as text

  experience?: number; // Years of experience
  
  preferred_locations?: Location[]; // Many-to-many with Location
  location_string?: string; // Simple string for current profile form, was 'location' in UserProfileData
  country?: string; // User's country

  remote_preference?: RemotePreference;
  
  preferred_tier_id?: number; // Foreign Key to Tiers
  // preferred_tier?: Tier;
  expected_salary?: string; // Could be a range or specific amount string
  resume?: string; // File path or URL to resume
  joined_date?: string; // ISO datetime string

  // Other text-based preferences from old UserProfileData can be stored in a generic field if needed
  // e.g., general_preferences_text?: string; // Was 'preferences' in UserProfileData if desired_job_role isn't enough
}

/**
 * Represents a job listing.
 * Replaces the old JobOpportunity.
 */
export interface JobListing {
  id: number; 
  unique_input_id?: string; 
  api_id?: string; 
  job_title: string; 
  url?: string; 
  date_posted?: string; 
  employment_status?: string;
  
  company: string; 
  company_domain?: string; 
  company_obj_id?: number; 
  company_obj?: Company; 

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
 */
export interface TrackedApplication {
  jobId: number; 
  jobTitle: string;
  company: string;
  status: ApplicationStatus;
  appliedDate?: string; 
  notes?: string;
  lastUpdated: string; 
}
