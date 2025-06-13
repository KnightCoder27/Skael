# Skael-Backend

Python backend to interact with database using FastAPI


# Backend API & Models Guide

This document provides a comprehensive guide to the backend API endpoints and data models for frontend integration. All endpoints return JSON responses with a `messages` key indicating success or error, and relevant data in a descriptive key.

---

## Authentication

- Most endpoints require authentication. Pass the user's token as required by your frontend logic.

---

## User Endpoints (`/users`)

### Register User

- **POST** `/users/`
- **Body:**
  ```json
  {
    "user_name": "string",
    "email_id": "string",
    "password": "string",
    ...
  }
  ```
- **Response:** `{ "messages": "success", "user_id": "..." }`

### Login

- **POST** `/users/login`
- **Body:** `{ "email": "string", "password": "string" }`
- **Response:** `{ "messages": "success", "user_id": ... }`

### Get User

- **GET** `/users/{id}`
- **Response:** User profile object

### Update User

- **PUT** `/users/{id}`
- **Body:** Partial user fields
- **Response:** `{ "messages": "success", "user_id": ... }`

### Delete User

- **DELETE** `/users/{id}`
- **Response:** `{ "messages": "success", "user_id": ... }`

---

## Job Endpoints (`/jobs`)

### Fetch Jobs from Theirstack

- **POST** `/jobs/fetch_jobs`
- **Body:** UserProfile (see models)
- **Response:** `{ "messages": "success", "jobs_fetched": N, "jobs": [...] }`

### List All Jobs

- **GET** `/jobs/list_jobs/`
- **Response:** `{ "messages": "success", "jobs": [JobListingResponse, ...] }`

### Filter/Relevant Jobs

- **POST** `/jobs/relevant_jobs`
- **Body:** JobFilterRequest
- **Response:** `{ "messages": "success", "jobs": [JobListingResponse, ...] }`

### Get Job by ID

- **GET** `/jobs/{id}`
- **Response:** JobListingResponse

### Save Job

- **POST** `/jobs/{id}/save`
- **Body:** SaveJob
- **Response:** `{ "messages": "success", "activity_id": ... }`

### Analyze Job

- **POST** `/jobs/{id}/analyze`
- **Body:** AnalyzeResultIn
- **Response:** `{ "messages": "success", "activity_id": ... }`

### Delete Saved Job

- **DELETE** `/jobs/{id}/save?user_id=...`
- **Response:** `{ "messages": "success", "msg": "Saved job deleted" }`

### Get Match Score

- **GET** `/jobs/{id}/match_score?user_id=...`
- **Response:** AnalyzeResultOut

---

## Resume Endpoints (`/resumes`)

### Upload/Generate Resume

- **POST** `/resumes/generate`
- **Body:** ResumeIn
- **Response:** `{ "messages": "success", "resume_id": ... }`

### Get User Resumes

- **GET** `/resumes/user/{user_id}`
- **Response:** `{ "messages": "success", "resumes": [UserResumeOut, ...] }`

### Apply to Job

- **POST** `/resumes/apply`
- **Form Data:** `user_id`, `job_id`
- **Response:** `{ "messages": "success", "activity_id": ... }`

---

## Activity Endpoints (`/activity`)

### Log Activity

- **POST** `/activity/log`
- **Body:** ActivityIn
- **Response:** `{ "messages": "success", "activity_id": ... }`

### Get User Activities

- **GET** `/activity/user/{user_id}`
- **Response:** `{ "messages": "success", "activities": [UserActivityOut, ...] }`

---

## Data Models (Pydantic Schemas)

### UserProfile

- Fields: user_name, email_id, phone_number, desired_job_role, skills, experience, preferred_locations, remote_preference, professional_summary, expected_salary, resume, joined_date, etc.

### JobListingResponse

- Fields: id, job_title, url, date_posted, company, company_domain, location, remote, hybrid, salary_string, min_salary, max_salary, currency, country, seniority, description, reposted, date_reposted, country_code, job_expired, industry_id, matching_phrase, matching_words, experience, key_info, technologies, hiring_team, etc.

### SaveJob

- Fields: user_id, job_id, action_type, activity_metadata

### AnalyzeResultIn / AnalyzeResultOut

- Fields: user_id, job_id, score, explanation

### ResumeIn / UserResumeOut

- Fields: user_id, job_id, source, content, created_at

### ActivityIn / UserActivityOut

- Fields: user_id, job_id, action_type, metadata, created_at

---

## Country Codes

- Use the `/countries` table for ISO alpha-2 codes. Always pass alpha-2 codes to Theirstack.

---

## General Notes

- All endpoints return a `messages` key for status and wrap data in a descriptive key.
- Errors are returned with appropriate HTTP status and a `detail` key.
- All date/time fields are ISO 8601 strings.
- For authentication, pass tokens as required by your frontend logic.

---

For any questions or further details, contact the backend team.