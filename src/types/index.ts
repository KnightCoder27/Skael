
/**
 * Enum for specifying remote work preferences.
 */
export type RemotePreference = "Remote" | "Hybrid" | "Onsite";

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
  id: number; // Or string if API IDs are non-numeric
  unique_input_id?: string; // If applicable from your input source
  api_id?: string; // ID from the external API
  job_title: string; // Was 'title'
  url?: string; // Link to the job posting
  date_posted?: string; // ISO date string (was 'postedDate')
  employment_status?: string;
  
  company: string; // Raw company name from API response (was 'company')
  company_domain?: string; // Company domain from API
  company_obj_id?: number; // Foreign Key to Companies table
  company_obj?: Company; // The full company object

  final_url?: string;
  source_url?: string;
  location: string; // (was 'location')
  remote?: boolean;
  hybrid?: boolean;
  
  salary_string?: string; // Original salary string from API (was 'salary')
  min_salary?: number;
  max_salary?: number;
  currency?: string; // e.g., USD, EUR, INR (3 characters)

  country?: string;
  seniority?: string;
  discovered_at?: string; // ISO datetime string (default: datetime.datetime.utcnow)
  
  description: string; // Was 'description', 'fullDescription' can be merged or this used for full.
  reposted?: boolean;
  date_reposted?: string; // ISO date string
  country_code?: string; // e.g., US (2 characters)
  job_expired?: boolean;
  
  industry_id?: string; // API sourced industry identifier, linking to companies.industry_id
  fetched_data?: string; // ISO date string
  matching_phrase?: string[];
  matching_words?: string[];

  technologies?: Technology[]; // Many-to-many with Technologies (was 'tags' - can be derived)

  // Fields from old JobOpportunity to retain for AI/UI:
  companyLogo?: string; // Can be derived from company_obj.logo. Kept for easier transition.
  // tags?: string[]; // This is now covered by technologies. Removed to avoid redundancy.
  matchScore?: number; // AI-generated match score
  matchExplanation?: string; // AI-generated explanation
}

/**
 * Represents the status of a job application.
 */
export type ApplicationStatus = "Interested" | "Saved" | "Applied" | "Interviewing" | "Offer" | "Rejected";

/**
 * Represents a job application tracked by the user.
 */
export interface TrackedApplication {
  jobId: number; // Corresponds to JobListing.id
  jobTitle: string;
  company: string;
  status: ApplicationStatus;
  appliedDate?: string; // ISO date string
  notes?: string;
  lastUpdated: string; // ISO date string
  // jobListing?: JobListing; // Optional: link to the full job listing object for richer display
}
