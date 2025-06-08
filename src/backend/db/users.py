
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, Form, Path, Request
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
from src.backend.models.models import get_db, User, Technology, Location, UserActivityLog, RemotePreference
from pydantic import BaseModel
from passlib.context import CryptContext  # type: ignore
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import Security
import firebase_admin
from firebase_admin import auth
from src.backend.models.schemas import UserOut # Import the UserOut model

# Define the hashing context

router = APIRouter(prefix="/users", tags=["users"])

security_scheme = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_current_user(request: Request, token_credentials: HTTPAuthorizationCredentials = Security(security_scheme)):
    """FastAPI dependency to get the current authenticated user from a Firebase ID token."""
    
    auth_header = request.headers.get('Authorization')
    print(f"[Backend DEBUG] get_current_user: Raw Authorization header received: '{auth_header}'")

    if not token_credentials or not token_credentials.credentials:
        print(f"[Backend ERROR] get_current_user: Token credentials missing or empty. Scheme: {token_credentials.scheme if token_credentials else 'N/A'}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials - token missing or empty in credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    id_token_str = token_credentials.credentials
    print(f"[Backend DEBUG] get_current_user: Token string from HTTPAuthorizationCredentials: '{id_token_str[:20]}...' (length: {len(id_token_str)})")

    if not id_token_str: # Explicit check for empty string after extraction
        print(f"[Backend ERROR] get_current_user: Extracted id_token_str is empty.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials - extracted token string is empty",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
        print(f"[Backend DEBUG] get_current_user: Attempting to verify token starting with: {id_token_str[:20]}...")
        decoded_token = auth.verify_id_token(id_token_str)
        print(f"[Backend DEBUG] get_current_user: Token verified successfully for UID: {decoded_token.get('uid')}")
        return decoded_token
    except firebase_admin.auth.InvalidIdTokenError as e:
        print(f"[Backend ERROR] Error verifying Firebase ID token (InvalidIdTokenError): {e}")
        if "ID token must be a non-empty string" in str(e) and not id_token_str:
             print(f"[Backend CRITICAL] Confirmed: verify_id_token received an empty string despite earlier checks.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid ID token: {e}",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        print(f"[Backend ERROR] Error verifying Firebase ID token (General Exception): {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed due to a server error during token verification.",
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

@router.post("/", status_code=201) # Changed from /register to /
def create_user(user_in: UserIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email_id == user_in.email).first()
    if user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Ensure phone number is a string before trying to convert if needed, or handle if it's meant to be stored as int
    # For now, assuming User model's phone_number is string. If it's int, ensure conversion here.
    # Example if User.phone_number is an integer:
    # try:
    #     phone_number_int = int(user_in.number)
    # except ValueError:
    #     raise HTTPException(status_code=400, detail="Invalid phone number format")

    new_user = User(
        user_name=user_in.username.lower(), # Changed from user_name to username to match UserIn
        email_id=user_in.email,
        phone_number=user_in.number, # Assuming User.phone_number is String. If int, use phone_number_int
        password=hash_password(user_in.password),
        joined_date=datetime.now()
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"msg": "User registered", "id": new_user.id}

@router.get("/{id}", response_model=UserOut)
def get_user(id: int = Path(...), db: Session = Depends(get_db), current_firebase_user: dict = Depends(get_current_user)):
    # current_firebase_user now contains the decoded token including 'uid'
    # You might want to compare current_firebase_user['uid'] with something in your User model
    # if you link Firebase UIDs to your internal user IDs.
    # For now, just checking if the user exists by internal ID.
    
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Constructing UserOut Pydantic model from the SQLAlchemy User object
    return UserOut(
        id=user.id,
        user_name=user.user_name, # In User model, it's user_name
        email_id=user.email_id, # In User model, it's email_id
        phone_number=user.phone_number,
        desired_job_role=user.desired_job_role,
        skills=[tech.technology_name for tech in user.skills if tech.technology_name], # Ensure names exist
        experience=user.experience,
        preferred_locations=[loc.name for loc in user.preferred_locations if loc.name], # Ensure names exist
        remote_preference=user.remote_preference.value if user.remote_preference else None,
        professional_summary=user.professional_summary,
        expected_salary=str(user.expected_salary) if user.expected_salary is not None else None, # Ensure string if model expects it
        resume=user.resume,
        joined_date=user.joined_date
    )


@router.put("/{id}")
def update_user(id: int, update_data: UserUpdate, db: Session = Depends(get_db), current_firebase_user: dict = Depends(get_current_user)):
    # Similar authorization check as in get_user might be needed
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    update_dict = update_data.model_dump(exclude_unset=True)

    if 'username' in update_dict:
        user.user_name = update_dict['username']
    if 'number' in update_dict:
        user.phone_number = update_dict['number']
    if 'desired_job_role' in update_dict:
        user.desired_job_role = update_dict['desired_job_role'].lower()
    if 'experience' in update_dict:
        user.experience = update_dict['experience']
    if 'remote_preference' in update_dict and update_dict['remote_preference']:
        try:
            user.remote_preference = RemotePreference(update_dict['remote_preference'].upper())
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid remote preference value.")
    if 'password' in update_dict and update_dict['password']:
        user.password = hash_password(update_dict['password'])
    if 'professional_summary' in update_dict:
        user.professional_summary = update_dict['professional_summary'].lower()
    if 'expected_salary' in update_dict:
        user.expected_salary = str(update_dict['expected_salary']) # Assuming stored as string
    if 'resume' in update_dict:
        user.resume = update_dict['resume']
    
    if 'skills' in update_dict and update_dict['skills']:
        handle_user_skills(db, user, [skill.strip().lower() for skill in update_dict['skills'].split(',') if skill.strip()])
    if 'preferred_locations' in update_dict and update_dict['preferred_locations']:
        handle_user_locations(db, user, [loc.strip().lower() for loc in update_dict['preferred_locations'].split(',') if loc.strip()])
    
    db.commit()
    return {"msg": "User updated"}

@router.delete("/{id}")
def delete_user(id: int, db: Session = Depends(get_db), current_firebase_user: dict = Depends(get_current_user)):
    # Authorization check recommended
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return {"msg": "User deleted"}

@router.post("/{id}/feedback")
def log_feedback(id: int, feedback: FeedbackIn, db: Session = Depends(get_db), current_firebase_user: dict = Depends(get_current_user)):
    # Authorization check recommended
    activity = UserActivityLog(
        user_id=id,
        job_id=None, 
        action_type="feedback",
        activity_metadata={"feedback": feedback.feedback, **(feedback.metadata or {})} # activity_metadata, not metadata
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


