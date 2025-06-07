from datetime import date, datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

# --- Pydantic Models for your API Response Structure ---

class UserProfile(BaseModel):
    job_titles: list
    skills: list
    experience: int
    locations: list
    countries: list
    remote: bool | None = None

class APITechnologySlugs(BaseModel):
    technology_slugs: Optional[List[str]] = None

class APICompanyObject(BaseModel):
    """Corresponds to the 'company_object' nested within each job data item."""
    id: Optional[str] = None # API's company ID (string)
    name: Optional[str] = None
    domain: Optional[str] = None
    industry: Optional[str] = None
    country: Optional[str] = None
    country_code: Optional[str] = None
    employee_count: Optional[int] = None
    logo: Optional[str] = None
    num_jobs: Optional[int] = None
    num_technologies: Optional[int] = None
    url: Optional[str] = None
    industry_id: Optional[int] = None # API's industry ID
    linkedin_url: Optional[str] = None
    linkedin_id: Optional[str] = None
    long_description: Optional[str] = None
    founded_year: Optional[int] = None
    annual_revenue_usd: Optional[int] = None
    total_funding_usd: Optional[int] = None
    city: Optional[str] = None
    postal_code: Optional[str] = None
    technology_slugs: Optional[List[str]] = None # Technologies associated with the company
    # Add other fields from company_object as needed

class APIJobListingItem(BaseModel):
    """Corresponds to each item in the 'data' list of the API response."""
    id: int # API's job ID
    job_title: str
    url: Optional[str] = None
    date_posted: Optional[date] = None # Assuming format "YYYY-MM-DD"
    company: str # Raw company name from API
    technologies: int
    employment_status: Optional[List]
    final_url: Optional[str] = None
    source_url: Optional[str] = None
    location: Optional[str] = None
    remote: Optional[bool] = False
    hybrid: Optional[bool] = False
    salary_string: Optional[str] = None
    min_annual_salary: Optional[int] = None
    max_annual_salary: Optional[int] = None
    salary_currency: Optional[str] = None
    country: Optional[str] = None
    seniority: Optional[str] = None
    country_code: Optional[str] = None
    discovered_at: Optional[datetime] = None # Assuming format "YYYY-MM-DDTHH:MM:SS"
    company_domain: str
    description: Optional[str] = None
    reposted: Optional[bool] = False
    date_reposted: Optional[date] = None # Assuming format "YYYY-MM-DD"
    company_object: APICompanyObject # Nested Pydantic model for company details
    matching_phrase: Optional[List] = None
    matching_words: Optional[List] = None
    # Add other fields from the API response that you might want to validate
    # e.g., 'short_location', 'long_location', 'state_code', 'latitude', 'longitude', etc.


class APIResponse(BaseModel):
    """Overall Pydantic model for the entire API response."""
    metadata: Dict[str, Any] # You can create a specific Pydantic model for metadata if you need to validate its fields
    data: List[APIJobListingItem]

# --- Pydantic Model for User Response ---
class UserOut(BaseModel):
    id: int
    username: str = Field(alias="user_name") # Map DB field name to desired output name
    email: str = Field(alias="email_id")
    phone_number: Optional[str] = None
    desired_job_role: Optional[str] = None
    skills: List[str] = [] # Will be populated with technology names
    experience: Optional[int] = None
    preferred_locations: List[str] = [] # Will be populated with location names
    remote_preference: Optional[str] = None
    professional_summary: Optional[str] = None
    expected_salary: Optional[str] = None # Assuming this might be a string based on model
    resume: Optional[str] = None
    joined_date: Optional[datetime] = None

    class Config:
        from_attributes = True # For Pydantic v2

# --- Pydantic Model for User Login ---
class UserLogin(BaseModel):
    email: str
    password: str

# --- Existing Pydantic Models for your Database Schema (from previous answer) ---

class JobListingBase(BaseModel):
    unique_input_id: Optional[str] = None
    api_id: Optional[str] = None
    job_title: str
    url: Optional[str] = None
    date_posted: Optional[date] = None
    company: str
    company_domain: Optional[str]
    employment_status: Optional[List]
    company_obj_id: Optional[int] = None
    final_url: Optional[str] = None
    source_url: Optional[str] = None
    location: Optional[str] = None
    remote: bool = False
    hybrid: bool = False
    salary_string: Optional[str] = None
    min_salary: Optional[int] = None
    max_salary: Optional[int] = None
    currency: Optional[str] = Field(None, max_length=3)
    country: Optional[str] = None
    seniority: Optional[str] = None
    description: Optional[str] = None
    reposted: bool = False
    date_reposted: Optional[date] = None
    country_code: Optional[str] = Field(None, max_length=2)
    job_expired: bool = False
    industry_id: Optional[str] = None # API sourced industry identifier
    fetched_date: Optional[datetime] = None
    matching_phrase: Optional[List] = None
    matching_words: Optional[List] = None

    # For technologies in the response, we might want to return the actual names
    technologies: Optional[List[str]] = None # List of technology names or slugs for input

    class Config:
        from_attributes = True # For Pydantic v2

class JobListingCreate(JobListingBase):
    pass

class JobListingResponse(JobListingBase):
    id: int
    discovered_at: datetime
    technologies: List[str] = [] # For output, ensure it's a list of names/slugs

    class Config:
        from_attributes = True

# Also define Pydantic models for Company for use in your application's API
class CompanyBase(BaseModel):
    api_company_id: Optional[str] = None
    company_name: Optional[str] = None
    company_domain: Optional[str] = None
    industry: Optional[str] = None
    country: Optional[str] = None
    country_code: Optional[str] = Field(None, max_length=2)
    url: Optional[str] = None
    long_description: Optional[str] = None
    linkedin_url: Optional[str] = None
    linkedin_id: Optional[str] = None
    industry_id: Optional[str] = None
    logo: Optional[str] = None
    fetched_date: Optional[datetime] = None

    class Config:
        from_attributes = True

class CompanyCreate(CompanyBase):
    # All fields from CompanyBase are optional, so no need for more fields here.
    # Adjust if you have mandatory fields for Company creation.
    pass

class CompanyResponse(CompanyBase):
    id: int # DB generated ID

    class Config:
        from_attributes = True

# Pydantic models for Technology
class TechnologyBase(BaseModel):
    # Mapping 'name' from JSON to 'technology_name' attribute
    technology_name: str = Field(alias="name")
    # Mapping 'slug' from JSON to 'technology_slug' attribute
    technology_slug: str = Field(alias="slug")
    category: Optional[str] = None
    category_slug: Optional[str] = None
    logo: Optional[str] = None
    logo_thumbnail: Optional[str] = None
    one_liner: Optional[str] = None
    url: Optional[str] = None
    description: Optional[str] = None
    jobs: Optional[int] = None

#     class Config:
#         from_attributes = True

class TechnologyCreate(TechnologyBase):
    pass

# class TechnologyResponse(TechnologyBase):
#     id: int

#     class Config:
#         from_attributes = True

class AnalyzeResult(BaseModel):
    score: int
    explanation: Optional[str] = None

# Pydantic model for UserResume output
class UserResumeOut(BaseModel):
    id: int
    user_id: int
    job_id: Optional[int] = None
    source: str
    content: str
    created_at: datetime
    class Config:
        from_attributes = True

# Pydantic model for UserActivityLog output
class UserActivityOut(BaseModel):
    id: int
    user_id: int
    job_id: Optional[int] = None
    action_type: str
    activity_metadata: Optional[Dict[str, Any]] = None # Assuming metadata is a dictionary or JSONB
    created_at: datetime

    class Config:
        from_attributes = True