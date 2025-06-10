
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.backend.db.users import router as users_router
import firebase_admin
from firebase_admin import credentials
from dotenv import load_dotenv
import os
from src.backend.db.jobs import router as jobs_router
from src.backend.db.resume import router as resume_router
from src.backend.db.activities import router as activities_router

load_dotenv(dotenv_path=".env")

app = FastAPI()

# Define allowed origins
# It's better to be specific than using "*" in production if possible.
origins = [
    "https://6000-firebase-studio-1749207465319.cluster-fdkw7vjj7bgguspe3fbbc25tra.cloudworkstations.dev",
    "http://localhost:9002", # Your Next.js dev environment
    "http://localhost:3000", # Another common local dev port
    # Add your production frontend URL here when you have one
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # Allows specific origins
    allow_credentials=True, # Allows cookies/authorization headers
    allow_methods=["*"],    # Allows all methods (GET, POST, PUT, DELETE, OPTIONS, etc.)
    allow_headers=["*"],    # Allows all headers (Content-Type, Authorization, etc.)
)

@app.on_event("startup")
async def startup_event():
    # Initialize Firebase Admin SDK
    cred_path = os.getenv("FIREBASE_ADMIN_CREDENTIALS")
    if cred_path and os.path.exists(cred_path):
        try:
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
            print("Firebase Admin SDK initialized from credential file path.")
        except Exception as e:
             print(f"Error initializing Firebase Admin SDK from file path: {e}")
             # Handle initialization errors from file path
    else:
        print("FIREBASE_ADMIN_CREDENTIALS environment variable not set or file not found. Firebase Admin SDK not initialized.")
        # Handle the case where the environment variable is not set or the file doesn't exist

app.include_router(users_router)
app.include_router(jobs_router)
app.include_router(resume_router)
app.include_router(activities_router)

