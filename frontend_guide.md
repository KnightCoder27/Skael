# Skael Frontend Guide: Plan-Based Restrictions & Usage Limits

---

## 1. Overview

The backend exposes:

- Plan-based page access (Free, Pro, Premium)
- Feature usage limits like `job_fetches_per_day`, `resume_gen_per_month`, etc.
- A single API: `/api/user/usage` returns current plan & remaining usage

---

## API: `/api/user/usage`

### Example response:

`{   "plan": "Pro",   "remaining": {     "job_fetches_per_day": { "used": 3, "limit": 10 }, "job_fetches_per_month": { "used": 3, "limit": 50 }, "resumes_per_month": { "used": 1, "limit": 5 }, "cover_letters_per_month": { "used": 1, "limit": 5 }   },   "accessible_pages": ["relevant_pages", "list_jobs"] }`

---

## What the Frontend Needs To Do

---

### 1. Fetch Usage on Login or Page Load

- On login / refresh, call `/api/user/usage`
- Save the `plan`, `limits`, and `accessible_pages` in **global state** (Zustand, Context, Redux)

---

### 2. Page Access Control

Use route guard or page-level check:

`if (!accessiblePages.includes("relevant_pages")) {   router.replace("/upgrade"); }`

You can also fully block rendering:

`if (!accessiblePages.includes("list_jobs")) {   return <Error403 message="Upgrade your plan to view this page." />; }`

---

### 3. Feature Usage Blocking (e.g. Job Fetch or Resume Button)

`const jobLimit = limits["job_fetches_per_day"]; if (jobLimit.used >= jobLimit.limit) {   alert("You’ve reached your daily job fetch limit. Upgrade your plan.");   return; }`

Then allow the action if under limit:

`await axios.post("/api/generate-job");`

You can also show usage visually:

`<Text>You’ve used {jobLimit.used} of {jobLimit.limit} daily job fetches</Text> <Progress value={(jobLimit.used / jobLimit.limit) * 100} />`

---

### 4. Optional: Disable Buttons

`<Button disabled={jobLimit.used >= jobLimit.limit}>   Fetch AI Jobs </Button>`

---

## Pages to Restrict Based on Plan

Page

Plan Requirement

`/dashboard`

All plans

`/job-matches`

All plans

`/resume-builder`

Pro and above

`/analytics`

Premium only

Add those to `accessible_pages` returned by API.

---

## Final Frontend Checklist

- Call `/user/plan/usage` after login and cache globally
- Use `accessible_pages` to restrict page routes
- Use `limits` to block buttons/submit actions when exhausted
- Show usage info (used/limit) with alerts or UI cues
