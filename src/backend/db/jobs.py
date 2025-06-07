from fastapi import APIRouter, Depends, HTTPException, status, Form, Path
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from src.backend.models.models import get_db, JobListing, Technology, Company, User, UserActivityLog, MatchScoreLog, Location
from src.backend.models.schemas import AnalyzeResult, APIResponse, JobListingCreate, JobListingResponse, CompanyCreate, CompanyResponse, UserProfile
# from llm_services.cleaning_agent import api_data
from datetime import datetime
from src.backend.api.theirstack import fetch_jobs
from sqlalchemy import func, or_

from .users import get_current_user # Assuming get_current_user is in users.py

router = APIRouter(prefix="/jobs", tags=["jobs"])

def get_or_create_company(db: Session, company_data: dict) -> Company:
    """Gets an existing company by api_company_id or creates a new one."""
    company_id = company_data.get("id")
    if not company_id:
        # Handle cases where company_id might be missing in API data
        # Perhaps log a warning or raise an error depending on your requirements
        print(f"[WARNING] Company data missing 'id': {company_data.get('name')}")
        return None # Or raise an error

    existing_company = db.query(Company).filter(Company.api_company_id == str(company_id)).first()
    if existing_company:
        return existing_company

    # Clean company data if needed (assuming api_data is defined elsewhere)
    # company_clean_result = api_data(company_data) # Uncomment if api_data is used for companies
    # company_data["long_description"] = company_clean_result.get("cleaned_description", "") # Uncomment if api_data is used for companies

    new_company = Company(
        api_company_id=str(company_data.get("id")),
        company_name=company_data.get("name"),
        company_domain=company_data.get("domain"),
        industry=company_data.get("industry"),
        country=company_data.get("country"),
        country_code=company_data.get("country_code") or "",
        url=company_data.get("url"),
        long_description=company_data.get("long_description"), # Use cleaned description if applicable
        linkedin_url=company_data.get("linkedin_url"),
        linkedin_id=company_data.get("linkedin_id"),
        industry_id=str(company_data.get("industry_id")) if company_data.get("industry_id") is not None else None,
        logo=company_data.get("logo"),
        fetched_date=datetime.now() # Add fetched_date here
    )
    db.add(new_company)
    # Don't commit here, let the calling function handle the commit
    # db.flush() # Optional: if you need the ID immediately, but bulk add is better without flush
    return new_company

def get_or_create_technologies(db: Session, skill_names: List[str]) -> List[Technology]:
    """Finds or creates Technology objects based on skill names."""
    tech_objects = []
    for name in skill_names:
        tech = db.query(Technology).filter(Technology.technology_name.ilike(name)).first()
        if not tech:
            tech = Technology(technology_name=name, technology_slug=name.lower().replace(" ", "-"))
            db.add(tech)
            # db.flush() # Optional: if you need the ID immediately
        tech_objects.append(tech)
    return tech_objects

@router.post("/fetch_jobs")
async def get_jobs(user: UserProfile, db: Session = Depends(get_db)):
    try:
        print(user)
        jobs = fetch_jobs(user.model_dump())
    except Exception as e:
        print(f"[Backend ERROR] Error fetching jobs: {e}")
        return JSONResponse(status_code=500, content={"detail": f"Error fetching jobs: {e}"})

    try:
        res = save_job_db(user, jobs, db)
        return {"status": "success", "jobs_fetched": len(jobs), 'jobs' : jobs}
    except Exception as e:
        print(f"[Backend ERROR] Error saving jobs to DB: {e}")
        # You might want to rollback the transaction here if save_job_db didn't handle it
        db.rollback()
        return JSONResponse(status_code=500, content={"detail": f"Error saving jobs to DB: {e}"})

def save_job_db(user: UserProfile, api_response: APIResponse, db: Session):
    companies_to_add = []
    jobs_to_add = []
    skills = []
    existing_job_ids = {
        j.api_id for j in db.query(JobListing.api_id).all()
    }

    for job_item in api_response:
        # Clean job
        job_id = str(job_item.get("id"))
        if job_id not in existing_job_ids:
            
            try:
                # Use agentic api_data to process description and extract skills
                result = api_data(job_item)
                # Expect result to be a dict with at least 'cleaned_description' and 'skills'
                if isinstance(result, dict):
                    job_item["description"] = result.get("cleaned_description", "")
                    skills = result.get("skills", [])
                else:
                    job_item["description"] = result
                    skills = []
            except Exception as e:
                print(f"[Backend ERROR] Error processing job item with api_data: {e}")

            # Get or create company
            company_obj_data = job_item.get("company_object")
            db_company = get_or_create_company(db, company_obj_data) if company_obj_data else None

            # Find or create Technology objects
            tech_objects = get_or_create_technologies(db, skills)

            # Create JobListing
            job_item["fetched_at"] = datetime.now() # Add fetched_at to job_item before creating JobListing
            new_job = JobListing(
                **JobListingCreate(
                    api_id=job_id,
                    job_title=job_item.get("job_title"),
                    # unique_input_id = job_item.get("unique_input_id"),
                    url=job_item.get("url"),
                    date_posted=job_item.get("date_posted"),
                    employment_status=job_item.get("employment_status"),
                    matching_phrase=job_item.get("matching_phrase"),
                    matching_words=job_item.get("matching_words"),
                    company=job_item.get("company"),
                    company_domain=job_item.get("company_domain"),
                    company_obj_id=db_company.id if db_company and hasattr(db_company, 'id') else None,
                    final_url=job_item.get("final_url"), # Ensure final_url is included if available
                    source_url=job_item.get("source_url"),
                    location=job_item.get("location"),
                    remote=job_item.get("remote"),
                    hybrid=job_item.get("hybrid"),
                    salary_string=job_item.get("salary_string"),
                    min_salary=job_item.get("min_annual_salary"),
                    max_salary=job_item.get("max_annual_salary"),
                    currency=job_item.get("salary_currency"),
                    country=job_item.get("country"),
                    seniority=job_item.get("seniority"),
                    description=job_item.get("description"),
                    reposted=job_item.get("reposted"),
                    date_reposted=job_item.get("date_reposted"),
                    country_code=job_item.get("country_code"),
                    job_expired=False, # Assume new jobs are not expired
                    industry_id=str(company_obj_data.get("industry_id")) if company_obj_data and company_obj_data.get("industry_id") is not None else None, # Get industry_id from company_obj_data
                ).model_dump(exclude_unset=True)
            )
            # Associate technologies
            new_job.technologies = tech_objects
            jobs_to_add.append(new_job)

    if jobs_to_add:
        db.add_all(jobs_to_add)
    db.commit()
    print(f"Job Listing in DB after commit: {db.query(Company).all()}")

    return {
        "message": "Ingestion complete.",
        "new_companies": len(companies_to_add),
        "new_jobs": len(jobs_to_add),
    }

@router.get("/list_jobs/", response_model=List[JobListingResponse])
async def read_job_listings(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """
    Retrieves a list of job listings.
    """
    db_jobs = db.query(JobListing).offset(skip).limit(limit).all()

    results = []
    for job in db_jobs:
        # Manually prepare the technologies list for the Pydantic response model
        # from SQLAlchemy's Technology objects
        tech_names = [tech.technology_name for tech in job.technologies]

        # Convert SQLAlchemy object to dictionary, update technologies, then create Pydantic model
        job_dict = job.__dict__.copy() # Use .__dict__.copy() to get a mutable dict
        job_dict['technologies'] = tech_names

        results.append(JobListingResponse(**job_dict))
    return results

@router.post('/relevant_jobs',response_model=List[JobListingCreate])
def relevant_jobs(user: UserProfile, skip: int = 0, limit: int = 100, db : Session = Depends(get_db), current_user: dict = Depends(get_current_user)):

    user= user.model_dump()
    skills = user.get("skills") or []  # e.g., ["python", "kafka"]
    
    if skills:
        filters = [func.lower(JobListing.description).like(f"%{skill.lower()}%") for skill in skills]
        db_jobs = db.query(JobListing).filter(or_(*filters)).offset(skip).limit(limit).all()
    else:
        db_jobs = db.query(JobListing).offset(skip).limit(limit).all()

    results = []
    for job in db_jobs:
        # Manually prepare the technologies list for the Pydantic response model
        # from SQLAlchemy's Technology objects
        tech_names = [tech.technology_name for tech in job.technologies]

        # Convert SQLAlchemy object to dictionary, update technologies, then create Pydantic model
        job_dict = job.__dict__.copy() # Use .__dict__.copy() to get a mutable dict
        job_dict['technologies'] = tech_names

        results.append(JobListingResponse(**job_dict))
    return results

@router.get("/", response_model=List[JobListingResponse])
def get_jobs(technology: Optional[str] = None, location: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(JobListing)
    if technology:
        query = query.join(JobListing.technologies).filter(Technology.technology_name == technology)
    if location:
        query = query.filter(JobListing.location == location)
    jobs = query.all()
    
    results = []
    for job in jobs:
        # Manually prepare the technologies list for the Pydantic response model
        tech_names = [tech.technology_name for tech in job.technologies]
        # Convert SQLAlchemy object to dictionary, update technologies, then create Pydantic model
        job_dict = job.__dict__.copy()
        job_dict['technologies'] = tech_names
        results.append(JobListingResponse(**job_dict))
    return results
    
@router.get("/{id}")
def get_job(id: int = Path(...), db: Session = Depends(get_db)):
    job = db.query(JobListing).filter(JobListing.id == id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

@router.post("/{id}/save")
def save_job(id: int, user_id: int = Form(...), db: Session = Depends(get_db)):
    # Log job save as activity
    activity = UserActivityLog(
        user_id=user_id,
        job_id=id,
        action_type="job_saved",
        metadata=None
    )
    db.add(activity)
    db.commit()
    db.refresh(activity)
    return {"msg": "Job saved", "activity_id": str(activity.id)}

@router.post("/{id}/analyze", response_model=AnalyzeResult)
def analyze_job(id: int, user_id: int = Form(...), db: Session = Depends(get_db)):
    # Dummy match score logic (replace with real logic/LLM)
    score = 78
    explanation = "Based on your interest in remote UI roles."
    match_log = MatchScoreLog(
        user_id=user_id,
        job_id=id,
        score=score,
        explanation=explanation
    )
    db.add(match_log)
    db.commit()
    db.refresh(match_log)
    return AnalyzeResult(score=score, explanation=explanation)
