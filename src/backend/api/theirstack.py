import requests
import json
import datetime
import os
import pandas as pd
from dotenv import load_dotenv 
from fastapi import Depends
from src.backend.models.models import get_db, JobListing


load_dotenv(dotenv_path=".env.local")

API_KEY = os.getenv("THEIRSTACK_API_KEY")

# --- Configuration ---
API_KEY = os.getenv("THEIRSTACK_API_KEY")
BASE_URL = "https://api.theirstack.com/v1"
JOBS_SEARCH_ENDPOINT = f"{BASE_URL}/jobs/search"

# --- File Paths ---
RESPONSE_CACHE_FILE = r"C:\Disk S\Learning\Job-Hunter\V2.1 - MVP\helper\response.json"
EXCEL_PATH = r"C:\Disk S\Learning\Job-Hunter\V2.1 - MVP\helper\jobs_listings.xlsx"

# --- Headers ---
headers = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {API_KEY}"
}

# --- Utility Functions ---

def map_experience_to_seniority(years_of_experience):
    if years_of_experience is None:
        return []
    elif years_of_experience < 1:
        return ["junior"]
    elif 1 <= years_of_experience < 3:
        return ["junior", "mid_level"]
    elif 3 <= years_of_experience < 7:
        return ["mid_level", "senior"]
    elif 7 <= years_of_experience < 10:
        return ["senior", "staff"]
    else:
        return ["senior", "staff", "c_level"]

def job_excel_db(EXCEL_PATH, data=[], get_id=False):
    df = pd.DataFrame(data)
    if os.path.exists(EXCEL_PATH):
        existing_df = pd.read_excel(EXCEL_PATH)
        if get_id:
            return list(existing_df['id'])
        df = pd.concat([existing_df, df], ignore_index=True)
    df['data_fetched_time'] = datetime.datetime.now()
    df.to_excel(EXCEL_PATH, sheet_name='Job Listings', index=False)


def job_db(db: Session = get_db()):
    job_id = db.query(JobListing.api_id).all()
    return job_id


# --- Main fetch function (called from FastAPI) ---
def fetch_jobs(user_input):
    print("Fetching jobs from Theirstack...")

    for key, value in user_input.items():
        if isinstance(value, str):
            # If the value is a string, convert it to lowercase
            user_input[key] = value.lower()
        elif isinstance(value, list) and all(isinstance(item, str) for item in value):
            # If the value is a list of strings, convert each string to lowercase
            user_input[key] = [item.lower() for item in value]
        else:
            # Otherwise, keep the value as is
            user_input[key] = value

    pass_payload = {
        "order_by": [{"desc": True, "field": "date_posted"}, {"desc": True, "field": "discovered_at"}],
        "offset": 0,
        "limit": 1,  # You can change this as needed
        "job_title_pattern_or": user_input.get("job_titles", []),
        "job_technology_slug_or": user_input.get("skills", []),
        "job_seniority_or": map_experience_to_seniority(user_input.get("experience")),
        "job_location_pattern_or": user_input.get("locations", []),
        "job_country_code_or": user_input.get("countries", ["IN"]),
        "remote": user_input.get("remote"),
        "posted_at_max_age_days": 30,
        "job_id_not": job_db(),
        "include_total_results": False,
        "blur_company_data": False
    }

    # Clean out empty keys
    pass_payload = {k: v for k, v in pass_payload.items() if v}

    print(pass_payload)

    response = requests.post(JOBS_SEARCH_ENDPOINT, headers=headers, json=pass_payload)
    print(response)

    if response.status_code == 422:
        print(f"\n422 Error Details: {response.text}")

    response.raise_for_status()

    data = response.json()
    jobs_on_page = data.get("data", [])
    data["response_received_at"] = str(datetime.datetime.now())

    # Save raw response
    with open(RESPONSE_CACHE_FILE, "a") as f:
        json.dump(data, f, indent=2)
        print("API response saved.")

    if jobs_on_page:
        print(f"Storing {len(jobs_on_page)} jobs to Excel.")
        job_excel_db(EXCEL_PATH, data=jobs_on_page)
    else:
        print("No jobs found or no new jobs discovered.")

    return jobs_on_page  # Return jobs for display

# You can test this file manually by uncommenting below:
# if __name__ == "__main__":
#     user_input = {
#         "job_titles": ["Software Engineer", "Web Developer"],
#         "skills": ["python", "django"],
#         "experience": 2,
#         "locations": ["Chennai", "Bangalore"],
#         "countries": ["IN"],
#         "remote": None
#     }
#     fetch_jobs_from_theirstack(user_input)

