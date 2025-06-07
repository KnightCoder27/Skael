# Guide: Interacting with the Backend API for Data Handling

## Introduction

This guide provides instructions for frontend developers using Next.js, React, and TypeScript on how to effectively interact with the backend API. The backend, built with FastAPI, SQLAlchemy, and PostgreSQL, serves as the central data store for the application. It exposes RESTful API endpoints that the frontend will utilize to perform operations such as creating, reading, updating, and deleting data.

## Backend API Endpoints

The backend API endpoints are organized into logical groups based on the data they manage. You can explore the interactive API documentation (Swagger UI) at `/docs` when the backend is running.

### Users Endpoints (`/users`)

*   **`POST /users/`**
    *   **Description:** Creates a new user account.
    *   **Request:**
        *   JSON Body (based on `UserIn` Pydantic model):
```
typescript
interface UserIn {
              username: string;
              email: string;
              number: string;
              password: string;
            }
```
*   **Response:**
        *   JSON Body: `{"msg": "User registered", "id": number}`
        *   Status Codes: 201 Created, 400 Bad Request (if email already registered)
*   **`POST /users/login`**
    *   **Description:** Authenticates a user.
    *   **Request:**
        *   JSON Body (based on `UserLogin` Pydantic model):
```
typescript
interface UserLogin {
              email: string;
              password: string;
            }
```
*   **Response:**
        *   JSON Body: `{"msg": "Login successful", "user_id": number}` (Note: In a real application, this would typically return an authentication token like a JWT)
        *   Status Codes: 200 OK, 401 Unauthorized (invalid credentials)
*   **`GET /users/{id}`**
    *   **Description:** Retrieves details for a specific user by ID.
    *   **Request:**
        *   Path Parameter: `id` (integer)
    *   **Response:**
        *   JSON Body (based on `UserOut` Pydantic model):
```
typescript
interface UserOut {
              id: number;
              username: string;
              phone_number: string | null;
              email_id: string;
              job_role: string | null;
              skills: string[]; // List of technology names
              experience: number | null;
              preferred_locations: string[]; // List of location names
              remote_preference: string | null; // "Remote", "Hybrid", "Onsite"
              professional_summary: string | null;
              expected_salary: number | null;
              resume: string | null; // File path or URL
              joined_date: string; // ISO 8601 date string
            }
```
*   Status Codes: 200 OK, 404 Not Found
    *   **Authentication/Authorization:** Requires authentication (Firebase ID token). **Note:** You should implement authorization logic in the frontend and/or backend to ensure users can only access their own data.
*   **`PUT /users/{id}`**
    *   **Description:** Updates details for a specific user by ID.
    *   **Request:**
        *   Path Parameter: `id` (integer)
        *   JSON Body (based on `UserUpdate` Pydantic model - fields are optional):
```
typescript
interface UserUpdate {
              username?: string;
              number?: string;
              desired_job_role?: string;
              skills?: string; // Comma-separated string of skill names
              experience?: number;
              preferred_locations?: string; // Comma-separated string of location names
              remote_preference?: "Remote" | "Hybrid" | "Onsite";
              professional_summary?: string;
              expected_salary?: number;
              resume?: string; // File path or URL
            }
```
*   **Response:**
        *   JSON Body: `{"msg": "User updated"}`
        *   Status Codes: 200 OK, 404 Not Found
    *   **Authentication/Authorization:** Requires authentication (Firebase ID token). **Note:** You should implement authorization logic in the frontend and/or backend to ensure users can only update their own data.
*   **`DELETE /users/{id}`**
    *   **Description:** Deletes a user by ID.
    *   **Request:**
        *   Path Parameter: `id` (integer)
    *   **Response:**
        *   JSON Body: `{"msg": "User deleted"}`
        *   Status Codes: 200 OK, 404 Not Found
    *   **Authentication/Authorization:** Requires authentication (Firebase ID token). **Note:** Implement strict authorization for this endpoint.
*   **`POST /users/{id}/feedback`**
    *   **Description:** Logs user feedback for a specific user.
    *   **Request:**
        *   Path Parameter: `id` (integer)
        *   JSON Body (based on `FeedbackIn` Pydantic model):
```
typescript
interface FeedbackIn {
              feedback: string;
              metadata?: { [key: string]: any }; // Optional metadata
            }
```
*   **Response:**
        *   JSON Body: `{"msg": "Feedback logged", "activity_id": string}`
        *   Status Codes: 200 OK, 404 Not Found (if user not found)
    *   **Authentication/Authorization:** Requires authentication (Firebase ID token).

### Jobs Endpoints (`/jobs`)

*   **`POST /jobs/fetch_jobs`**
    *   **Description:** Fetches job listings from an external API and saves them to the database.
    *   **Request:**
        *   JSON Body (based on `UserProfile` Pydantic model - likely a subset of user data used for fetching criteria):
```
typescript
interface UserProfile {
              // ... relevant user profile fields for job fetching ...
            }
```
*   **Response:**
        *   JSON Body: `{"status": "success", "jobs_fetched": number, "jobs": any[]}` (The structure of the `jobs` list might vary depending on the external API response and how it's processed before saving).
        *   Status Codes: 200 OK, 500 Internal Server Error (error fetching or saving jobs)
    *   **Authentication/Authorization:** Requires authentication (Firebase ID token).
*   **`GET /jobs/list_jobs/`**
    *   **Description:** Retrieves a paginated list of all job listings.
    *   **Request:**
        *   Query Parameters:
            *   `skip` (integer, optional, default: 0): Number of records to skip.
            *   `limit` (integer, optional, default: 100): Maximum number of records to return.
    *   **Response:**
        *   JSON Body (List of `JobListingResponse` Pydantic models):
```
typescript
interface JobListingResponse {
              id: number;
              api_id: string | null;
              job_title: string;
              url: string | null;
              date_posted: string | null; // Date string
              employment_status: string | null;
              matching_phrase: string[] | null;
              matching_words: string[] | null;
              company: string | null; // Raw company name
              company_domain: string | null;
              company_obj_id: number | null; // Foreign key to Company model
              final_url: string | null;
              source_url: string | null;
              location: string | null;
              remote: boolean | null;
              hybrid: boolean | null;
              salary_string: string | null;
              min_salary: number | null;
              max_salary: number | null;
              currency: string | null;
              country: string | null;
              seniority: string | null;
              discovered_at: string; // ISO 8601 datetime string
              description: string | null;
              reposted: boolean | null;
              date_reposted: string | null; // Date string
              country_code: string | null;
              job_expired: boolean | null;
              industry_id: string | null;
              fetched_data: string | null; // Date string
              technologies: string[]; // List of technology names
            }
```
*   Status Codes: 200 OK, 500 Internal Server Error
    *   **Authentication/Authorization:** Requires authentication (Firebase ID token).
*   **`POST /jobs/relevant_jobs`**
    *   **Description:** Retrieves job listings relevant to a user's skills.
    *   **Request:**
        *   Query Parameters:
            *   `skip` (integer, optional, default: 0)
            *   `limit` (integer, optional, default: 100)
        *   JSON Body (based on `UserProfile` Pydantic model, specifically using the `skills` field):
```
typescript
interface UserProfile {
              skills: string[]; // List of user's skills
              // ... other relevant fields for filtering ...
            }
```
*   **Response:**
        *   JSON Body (List of `JobListingResponse` Pydantic models - Note: The response model in the code is `List[JobListingCreate]`, which might be incorrect; it should likely be `List[JobListingResponse]` for consistency with `/list_jobs/`): The expected response structure is the same as `/list_jobs/`.
        *   Status Codes: 200 OK, 500 Internal Server Error
    *   **Authentication/Authorization:** Requires authentication (Firebase ID token).
*   **`GET /jobs/`**
    *   **Description:** Retrieves job listings based on technology and location filters.
    *   **Request:**
        *   Query Parameters:
            *   `technology` (string, optional): Filter by technology name.
            *   `location` (string, optional): Filter by location name.
    *   **Response:**
        *   JSON Body (List of `JobListingResponse` Pydantic models): The expected response structure is the same as `/list_jobs/`.
        *   Status Codes: 200 OK, 500 Internal Server Error
*   **`GET /jobs/{id}`**
    *   **Description:** Retrieves a specific job listing by ID.
    *   **Request:**
        *   Path Parameter: `id` (integer)
    *   **Response:**
        *   JSON Body (based on `JobListingResponse` Pydantic model - Note: The response model in the code is not explicitly set, but it should likely return a single job listing object similar to the `JobListingResponse` schema): The expected response structure is similar to a single item in the `JobListingResponse` list.
        *   Status Codes: 200 OK, 404 Not Found, 500 Internal Server Error (if a database error occurs)
*   **`POST /jobs/{id}/save`**
    *   **Description:** Logs a job save activity for a user.
    *   **Request:**
        *   Path Parameter: `id` (integer - job ID)
        *   Form Data:
            *   `user_id` (integer): The ID of the user saving the job.
    *   **Response:**
        *   JSON Body: `{"msg": "Job saved", "activity_id": string}`
        *   Status Codes: 200 OK, 500 Internal Server Error (if a database error occurs)
    *   **Authentication/Authorization:** Requires authentication (Firebase ID token). **Note:** You should implement authorization logic to ensure the `user_id` provided in the form data matches the authenticated user's ID.
*   **`POST /jobs/{id}/analyze`**
    *   **Description:** Logs a job analysis/match score for a user.
    *   **Request:**
        *   Path Parameter: `id` (integer - job ID)
        *   Form Data:
            *   `user_id` (integer): The ID of the user.
    *   **Response:**
        *   JSON Body (based on `AnalyzeResult` Pydantic model):
```
typescript
interface AnalyzeResult {
              score: number;
              explanation: string;
            }
```
*   Status Codes: 200 OK, 500 Internal Server Error (if a database error occurs)
    *   **Authentication/Authorization:** Requires authentication (Firebase ID token). **Note:** You should implement authorization logic to ensure the `user_id` provided in the form data matches the authenticated user's ID.

### Resumes Endpoints (`/resumes`)

*   **`POST /resumes/generate`**
    *   **Description:** Generates and saves a user resume.
    *   **Request:**
        *   JSON Body (based on `ResumeIn` Pydantic model):
```
typescript
interface ResumeIn {
              user_id: number; // Integer
              job_id?: number | null; // Integer, optional
              source: string; // e.g., "from_profile", "from_job"
              content: string; // Resume content (e.g., text, markdown)
            }
```
*   **Response:**
        *   JSON Body: `{"msg": "Resume generated", "resume_id": string}`
        *   Status Codes: 200 OK, 500 Internal Server Error (if a database error occurs)
    *   **Authentication/Authorization:** Requires authentication (Firebase ID token). **Note:** You should implement authorization logic to ensure the `user_id` provided in the request body matches the authenticated user's ID.
*   **`GET /resumes/user/{user_id}`**
    *   **Description:** Retrieves resumes for a specific user.
    *   **Request:**
        *   Path Parameter: `user_id` (integer)
    *   **Response:**
        *   JSON Body (List of `UserResumeOut` Pydantic models):
```
typescript
interface UserResumeOut {
              id: string; // UUID
              user_id: number; // Integer
              job_id: number | null; // Integer, optional
              source: string;
              content: string;
              created_at: string; // ISO 8601 datetime string
            }
```
*   Status Codes: 200 OK, 500 Internal Server Error (if a database error occurs)
    *   **Authentication/Authorization:** Requires authentication (Firebase ID token). **Note:** You should implement authorization logic to ensure the `user_id` in the path matches the authenticated user's ID.
*   **`POST /resumes/apply`**
    *   **Description:** Logs a job application activity.
    *   **Request:**
        *   Form Data:
            *   `user_id` (integer): The ID of the user applying.
            *   `job_id` (integer): The ID of the job being applied for.
    *   **Response:**
        *   JSON Body: `{"msg": "Application logged", "activity_id": string}`
        *   Status Codes: 200 OK, 500 Internal Server Error (if a database error occurs)
    *   **Authentication/Authorization:** Requires authentication (Firebase ID token). **Note:** You should implement authorization logic to ensure the `user_id` provided in the form data matches the authenticated user's ID.

### Activities Endpoints (`/activity`)

*   **`POST /activity/log`**
    *   **Description:** Logs a user activity.
    *   **Request:**
        *   JSON Body (based on `ActivityIn` Pydantic model):
```
typescript
interface ActivityIn {
              user_id: number; // Integer
              job_id?: number | null; // Integer, optional
              action_type: string; // e.g., "job_saved", "match_scored", "resume_generated", "job_applied"
              metadata?: { [key: string]: any } | null; // Optional metadata (JSONB)
            }
```
*   **Response:**
        *   JSON Body: `{"msg": "Activity logged", "activity_id": string}`
        *   Status Codes: 200 OK, 500 Internal Server Error (if a database error occurs)
    *   **Authentication/Authorization:** Requires authentication (Firebase ID token). **Note:** You should implement authorization logic to ensure the `user_id` provided in the request body matches the authenticated user's ID.
*   **`GET /activity/user/{user_id}`**
    *   **Description:** Retrieves activity logs for a specific user.
    *   **Request:**
        *   Path Parameter: `user_id` (integer)
    *   **Response:**
        *   JSON Body (List of `UserActivityOut` Pydantic models):
```
typescript
interface UserActivityOut {
              id: string; // UUID
              user_id: number; // Integer
              job_id: number | null; // Integer, optional
              action_type: string;
              activity_metadata: { [key: string]: any } | null; // JSONB data
              created_at: string; // ISO 8601 datetime string
            }
```
*   Status Codes: 200 OK, 500 Internal Server Error (if a database error occurs)
    *   **Authentication/Authorization:** Requires authentication (Firebase ID token). **Note:** You should implement authorization logic to ensure the `user_id` in the path matches the authenticated user's ID.

## Making API Requests from the Frontend (Next.js/React/TypeScript)

You can use the built-in `fetch` API or a library like Axios to make HTTP requests to the backend. Using a library often provides more convenient features like automatic JSON parsing and error handling.

**Using `fetch` API:**
```
typescript
import { UserLogin } from './interfaces'; // Assuming you have interfaces for your models

const loginUser = async (credentials: UserLogin) => {
  try {
    const response = await fetch('YOUR_BACKEND_URL/users/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Login failed');
    }

    const data = await response.json();
    return data; // Contains msg and user_id
  } catch (error) {
    console.error('API Error:', error);
    throw error; // Re-throw to be handled by the calling component
  }
};

// Example of a protected GET request
const fetchUserData = async (userId: number, firebaseIdToken: string) => {
  try {
    const response = await fetch(`YOUR_BACKEND_URL/users/${userId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${firebaseIdToken}`, // Include the Firebase ID token
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to fetch user data');
    }

    const userData: UserOut = await response.json();
    return userData;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};
```
**Using Axios (Recommended):**

First, install Axios: `npm install axios` or `yarn add axios`.
```
typescript
import axios from 'axios';
import { UserLogin, UserOut } from './interfaces'; // Assuming you have interfaces

const API_BASE_URL = 'YOUR_BACKEND_URL'; // Replace with your backend URL

const loginUser = async (credentials: UserLogin) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/users/login`, credentials);
    return response.data; // Contains msg and user_id
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      // Handle specific HTTP errors
      console.error('Login API Error:', error.response.data);
      throw new Error(error.response.data.detail || 'Login failed');
    } else {
      console.error('An unexpected error occurred:', error);
      throw new Error('An unexpected error occurred during login');
    }
  }
};

// Example of a protected GET request with Axios
const fetchUserData = async (userId: number, firebaseIdToken: string) => {
  try {
    const response = await axios.get<UserOut>(`${API_BASE_URL}/users/${userId}`, {
      headers: {
        'Authorization': `Bearer ${firebaseIdToken}`, // Include the Firebase ID token
      },
    });
    return response.data; // User data conforming to UserOut interface
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      console.error('Fetch User API Error:', error.response.data);
      throw new Error(error.response.data.detail || 'Failed to fetch user data');
    } else {
      console.error('An unexpected error occurred:', error);
      throw new Error('An unexpected error occurred while fetching user data');
    }
  }
};
```
## Authentication Flow (Frontend Perspective)

1.  **User signs up or logs in using Firebase Authentication** on the frontend (using `firebase/auth` SDK).
2.  Upon successful authentication, get the current user's Firebase ID token using `firebase.auth().currentUser.getIdToken()`.
3.  Store this ID token securely. Consider using React Context or a state management library to make the current user and their token accessible throughout your application.
4.  For any protected API endpoint call to your backend, retrieve the current valid ID token and include it in the `Authorization: Bearer <token>` header.
5.  The Firebase SDK automatically handles refreshing ID tokens. Ensure your logic always retrieves the *current* token before making a backend API call.

## Authorization (Frontend Perspective)

While the backend enforces authorization, the frontend can enhance the user experience by implementing some client-side authorization logic:

*   **Check User ID:** Before allowing a user to edit or delete a resource (like their profile), check if the resource's user ID matches the authenticated user's ID.
*   **Disable UI Elements:** Disable buttons or form fields for actions the user is not authorized to perform.
*   **Handle 403 Responses:** Implement logic to display a "Permission Denied" message or redirect the user if the backend returns a 403 Forbidden status code.

## Error Handling in the Frontend

*   Provide guidance on how to handle errors from API requests (network errors, backend errors).
*   Suggest displaying user-friendly error messages based on the error response from the backend.

## Example Code Snippets

*   Include practical code snippets in TypeScript demonstrating how to make API calls, include the authorization header, and handle responses using `fetch` or a library like Axios.

## Tools and Libraries

*   Mention useful frontend libraries:
    *   Data fetching: Axios, React Query, SWR.
    *   Form handling: React Hook Form, Formik.
    *   State management (optional, but can be helpful for managing fetched data): Zustand, Redux Toolkit, Recoil.

## Conclusion

*   Summarize the key takeaways.
*   Encourage frontend developers to refer to this guide and the backend's Swagger UI documentation.