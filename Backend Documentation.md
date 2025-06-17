# Backend API Documentation

This document provides a comprehensive reference for all API endpoints in the Skael-Backend. It details endpoint paths, HTTP methods, accepted parameters (with required/optional status), expected request/response formats, functionality, and error/exception handling. Use this as the definitive guide for frontend integration and development.

---

## Table of Contents
- [Users API](#users-api)
- [Jobs API](#jobs-api)
- [Companies API](#companies-api)
- [Locations API](#locations-api)
- [Technologies API](#technologies-api)
- [General Error Handling](#general-error-handling)

---

## Users API

### `POST /users/`
- **Description:** Register a new user.
- **Parameters:**
  - Body: `UserIn` (required)
    - `username` (str, required)
    - `email` (str, required)
    - `number` (str, optional)
    - `password` (str, required)
- **Returns:** `{ "messages": "success", "user_id": <id> }`
- **Errors:**
  - 400: Email already registered
  - 500: Server error

### `GET /users/{id}`
- **Description:** Get user profile by ID.
- **Parameters:**
  - Path: `id` (int, required)
- **Returns:** `UserOut` (user profile object)
- **Errors:**
  - 204: User not found

### `GET /users/{id}/full`
- **Description:** Get full user profile (with work experience, education, certifications).
- **Parameters:**
  - Path: `id` (int, required)
- **Returns:** `UserOut` (full user profile)
- **Errors:**
  - 204: User not found

### `PUT /users/{id}`
- **Description:** Update user profile.
- **Parameters:**
  - Path: `id` (int, required)
  - Body: `UserUpdate` (required)
- **Returns:** `{ "messages": "success", "user_id": <id> }`
- **Errors:**
  - 204: User not found
  - 400: Invalid input

### `DELETE /users/{id}`
- **Description:** Delete a user.
- **Parameters:**
  - Path: `id` (int, required)
- **Returns:** `{ "messages": "success", "user_id": <id> }`
- **Errors:**
  - 204: User not found

### `GET /users/`
- **Description:** List users (paginated).
- **Parameters:**
  - Query: `skip` (int, optional, default=0)
  - Query: `limit` (int, optional, default=100)
- **Returns:** `List[UserOut]`
- **Errors:**
  - 204: No users found

### `POST /users/advanced_query`
- **Description:** Advanced user search/filtering.
- **Parameters:**
  - Body: `UserAdvancedQuery` (optional fields for filtering)
- **Returns:** `List[UserOut]`
- **Errors:**
  - 204: No users found

### `GET /users/{id}/activities`
- **Description:** Get user activities.
- **Parameters:**
  - Path: `id` (int, required)
- **Returns:** `List[UserActivityOut]`
- **Errors:**
  - 204: User not found

### `POST /users/{id}/resume`
- **Description:** Upload or update user resume.
- **Parameters:**
  - Path: `id` (int, required)
  - Body: `ResumeIn` (required)
- **Returns:** `{ "messages": "success", "resume_id": <id> }`
- **Errors:**
  - 500: Server error

---

## Jobs API

### `GET /jobs/`
- **Description:** List jobs (paginated).
- **Parameters:**
  - Query: `skip` (int, optional, default=0)
  - Query: `limit` (int, optional, default=100)
- **Returns:** `List[JobListingResponse]`
- **Errors:**
  - 204: No jobs found

### `GET /jobs/{id}`
- **Description:** Get job by ID.
- **Parameters:**
  - Path: `id` (int, required)
- **Returns:** `JobListingResponse`
- **Errors:**
  - 204: Job not found

### `GET /jobs/{id}/full`
- **Description:** Get full job details (with company, technologies, hiring team).
- **Parameters:**
  - Path: `id` (int, required)
- **Returns:** `JobListingResponse`
- **Errors:**
  - 204: Job not found

### `POST /jobs/{id}/save`
- **Description:** Save a job for a user (creates activity log).
- **Parameters:**
  - Body: `SaveJob` (required)
- **Returns:** `{ "messages": "success", "activity_id": <id> }`
- **Errors:**
  - 500: Server error

### `POST /jobs/{id}/analyze`
- **Description:** Analyze a job for a user (creates match score log).
- **Parameters:**
  - Body: `AnalyzeResultIn` (required)
- **Returns:** `AnalyzeResultOut`
- **Errors:**
  - 500: Server error

### `GET /jobs/{id}/match_score`
- **Description:** Get match score for a user and job.
- **Parameters:**
  - Path: `id` (int, required)
  - Query: `user_id` (int, required)
- **Returns:** `AnalyzeResultOut`
- **Errors:**
  - 204: Match score not found

### `DELETE /jobs/{id}/save`
- **Description:** Delete a saved job for a user.
- **Parameters:**
  - Path: `id` (int, required)
  - Query: `user_id` (int, required)
- **Returns:** `{ "messages": "success", "msg": "Saved job deleted" }`
- **Errors:**
  - 204: Saved job not found

---

## Companies API

### `GET /companies/`
- **Description:** List companies (paginated).
- **Parameters:**
  - Query: `skip` (int, optional, default=0)
  - Query: `limit` (int, optional, default=100)
- **Returns:** `List[CompanyResponse]`
- **Errors:**
  - 204: No companies found

---

## Locations API

### `GET /locations/`
- **Description:** List locations (paginated).
- **Parameters:**
  - Query: `skip` (int, optional, default=0)
  - Query: `limit` (int, optional, default=100)
- **Returns:** `List[LocationResponse]`
- **Errors:**
  - 204: No locations found

---

## Technologies API

### `GET /technologies/`
- **Description:** List technologies (paginated).
- **Parameters:**
  - Query: `skip` (int, optional, default=0)
  - Query: `limit` (int, optional, default=100)
- **Returns:** `List[TechnologyResponse]`
- **Errors:**
  - 204: No technologies found

---

## General Error Handling
- **204 No Content:** Returned when a requested resource or list is not found.
- **400 Bad Request:** Returned for invalid input or request data.
- **500 Internal Server Error:** Returned for unexpected server/database errors.
- **All errors are logged** with context for debugging and traceability.

---

## Usage Notes
- All endpoints require authentication unless otherwise noted.
- All request/response bodies use JSON.
- Use the provided Pydantic models for request/response validation.
- For advanced queries, refer to the model definitions for accepted fields.

---

For further details on request/response models, see the backend codebase or contact the backend team.
