
export type JobOpportunity = {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  fullDescription?: string; // For detailed view
  url?: string;
  salary?: string;
  postedDate?: string;
  tags?: string[];
  companyLogo?: string; // URL to a logo image
  matchScore?: number;
  matchExplanation?: string;
};

export type UserProfileData = {
  name?: string;
  email?: string;
  location?: string;
  rawText: string; // Resume content / detailed summary
  preferences: string; // Job preferences
  // Potentially add more structured fields later
  // e.g., skills: string[], experience: ExperienceEntry[]
};

export type ApplicationStatus = "Interested" | "Saved" | "Applied" | "Interviewing" | "Offer" | "Rejected";

export type TrackedApplication = {
  jobId: string; // Corresponds to JobOpportunity.id
  jobTitle: string;
  company: string;
  status: ApplicationStatus;
  appliedDate?: string; // ISO date string
  notes?: string;
  lastUpdated: string; // ISO date string
};
