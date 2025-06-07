from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, Form, Path
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
from src.backend.models.models import get_db, User, Technology, Location, UserActivityLog, RemotePreference
from pydantic import BaseModel
from passlib.context import CryptContext  # type: ignore
from fastapi.security import HTTPBearer
from fastapi import Security
import firebase_admin
from firebase_admin import auth
from passlib.context import CryptContext  # type: ignore
from src.backend.models.schemas import UserOut # Import the UserOut model

# Define the hashing context

router = APIRouter(prefix="/users", tags=["users"])

security_scheme = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_current_user(token: str = Security(security_scheme)):
    """FastAPI dependency to get the current authenticated user from a Firebase ID token."""
    try:
        # Verify the Firebase ID token
        decoded_token = auth.verify_id_token(token)
        # You can access user information from the decoded_token, e.g., decoded_token['uid']
        return decoded_token
    except Exception as e:
        print(f"[Backend ERROR] Error verifying Firebase ID token: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def hash_password(password):
    return pwd_context.hash(password)

def handle_user_skills(db: Session, user: User, skill_names: list[str]):
    """Helper function to update user skills, creating new technologies if needed."""
    tech_objects = db.query(Technology).filter(Technology.technology_name.in_(skill_names)).all()
    existing_skill_names = {tech.technology_name for tech in tech_objects}
    for name in skill_names:
        if name not in existing_skill_names:
            new_tech = Technology(technology_name=name)
            db.add(new_tech)
            tech_objects.append(new_tech)
    user.skills = tech_objects

def handle_user_locations(db: Session, user: User, location_names: list[str]):
    """Helper function to update user preferred locations, creating new locations if needed."""
    location_objects = db.query(Location).filter(Location.name.in_(location_names)).all()
    existing_location_names = {loc.name for loc in location_objects}
    for name in location_names:
        if name not in existing_location_names:
            new_location = Location(name=name)
            db.add(new_location)
            location_objects.append(new_location)
    user.preferred_locations = location_objects


class UserIn(BaseModel):
    username: str
    email: str
    number: str
    password: str

class UserUpdate(BaseModel):
    username: Optional[str] = None
    number: Optional[str] = None
    desired_job_role: Optional[str] = None
    skills: Optional[str] = None
    experience: Optional[int] = None
    preferred_locations: Optional[str] = None
    remote_preference: Optional[str] = None
    professional_summary: Optional[str] = None
    expected_salary: Optional[int] = None
    resume: Optional[str] = None
    password: Optional[str] = None  # Add password to update model

class UserLogin(BaseModel):
    email: str
    password: str

class FeedbackIn(BaseModel):
    feedback: str
    metadata: Optional[dict] = None

@router.post("/register", status_code=201)
def create_user(user_in: UserIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email_id == user_in.email).first()
    if user:
        raise HTTPException(status_code=400, detail="Email already registered")
    username = user_in.username.lower()
    number = int(user_in.number)
    joined_at = datetime.now()
    hashed = hash_password(user_in.password)
    new_user = User(user_name=username, email_id=user_in.email, phone_number=number, password=hashed, joined_date=joined_at)
    db.add(new_user) # Add the new user to the session
    db.commit() # Commit the transaction
    db.refresh(new_user) # Refresh the user object to get the ID
    return {"msg": "User registered", "id": new_user.id} # Return success message and user ID

@router.get("/{id}", response_model=UserOut) # Use UserOut as the response_model
def get_user(id: int = Path(...), db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    # Optional: Add authorization check here if the user can only access their own profile
    # if current_user.get('uid') != str(id): # Assuming id in path is the Firebase UID, adjust if necessary
    #     raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this user's profile")

    user = db.query(User).filter(User.id == id).first() # Assuming id in path is the database ID
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user_details = {
        'id': user.id,
        'email_id': user.email_id,
        'job_role': user.desired_job_role,
        'skills': [tech.technology_name for tech in user.skills],
        'experience': user.experience,
        'preferred_locations': [loc.name for loc in user.preferred_locations], # Assuming Location model has 'name'
        'remote_preference': user.remote_preference.value if user.remote_preference else None,
        'professional_summary': user.professional_summary,
        'expected_salary': user.expected_salary,
        'resume': user.resume,
        'joined_date': user.joined_date # Include joined_date
    }

@router.put("/{id}")
def update_user(id: int, update: UserUpdate, db: Session = Depends(get_db)):
    current_user: dict = Depends(get_current_user)
    # Optional: Add authorization check here
    
    # if current_user.get('uid') != str(id): # Assuming id in path is the Firebase UID, adjust if necessary
    #     raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to update this user's profile")

    user = db.query(User).filter(User.id == id).first() # Assuming id in path is the database ID
    if user:
        if update.username:
            user.user_name = update.username
        if update.number:
            user.phone_number = update.number
        if update.desired_job_role:
            user.desired_job_role = update.desired_job_role.lower()
        if update.experience is not None:
            user.experience = update.experience
        if update.remote_preference:
            user.remote_preference = update.remote_preference.upper()
        if update.password:
            user.password = hash_password(update.password) # Hash and update password
        if update.professional_summary:
            user.professional_summary = update.professional_summary.lower()
        if update.expected_salary is not None:
            user.expected_salary = update.expected_salary
        if update.resume:
            user.resume = update.resume
        if update.skills:
            handle_user_skills(db, user, [skill.strip().lower() for skill in update.skills.split(",") if skill.strip()])
        if update.preferred_locations:
            handle_user_locations(db, user, [loc.strip().lower() for loc in update.preferred_locations.split(",") if loc.strip()])
    db.commit()
    return {"msg": "User updated"}

@router.delete("/{id}")
def delete_user(id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return {"msg": "User deleted"}

@router.post("/{id}/feedback")
def log_feedback(id: int, feedback: FeedbackIn, db: Session = Depends(get_db)):
    activity = UserActivityLog(
        user_id=id,
        job_id=None,
        action_type="feedback",
        metadata={"feedback": feedback.feedback, **(feedback.metadata or {})}
    )
    db.add(activity)
    db.commit()
    db.refresh(activity)
    return {"msg": "Feedback logged", "activity_id": str(activity.id)}

@router.post("/login")
def login(user_login: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email_id == user_login.email).first()
    if not user or not verify_password(user_login.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    return {"msg": "Login successful", "user_id": user.id}
    return {"msg": "Feedback logged", "activity_id": str(activity.id)}
