from fastapi import APIRouter, Depends, HTTPException, status, Security
from sqlalchemy.orm import Session
from typing import Optional, List, Any
from src.backend.db.users import get_current_user # Import the dependency
from src.backend.models.models import get_db, UserActivityLog
from src.backend.models.schemas import UserActivityOut # Import the new schema
from pydantic import BaseModel

router = APIRouter(prefix="/activity", tags=["activity"])

class ActivityIn(BaseModel):
    user_id: int
    job_id: Optional[int] = None # Assuming job_id is integer in UserActivityLog model
    action_type: str
    metadata: Optional[dict] = None

@router.post("/log")
def log_activity(activity_in: ActivityIn, db: Session = Depends(get_db)):
    try:
        activity = UserActivityLog(
            user_id=activity_in.user_id,
            # Assuming job_id in UserActivityLog model is nullable and can accept None
            job_id=activity_in.job_id,
            action_type=activity_in.action_type,
            activity_metadata=activity_in.metadata # Corrected field name based on models.py
        )
        db.add(activity)
        db.commit()
        db.refresh(activity)
        return {"msg": "Activity logged", "activity_id": str(activity.id)}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error logging activity: {e}")

# Use the correct response_model and user_id type
@router.get("/user/{user_id}", response_model=List[UserActivityOut])
def get_user_activities(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Security(get_current_user) # Add the dependency
):
    try:
        # Optional: Add authorization check if needed (e.g., ensure current_user['uid'] matches the user_id in your DB)
        # if current_user['uid'] != str(user_id): # Assuming user_id in your DB is linked to Firebase UID
        activities = db.query(UserActivityLog).filter(UserActivityLog.user_id == user_id).all()
        # Map SQLAlchemy objects to Pydantic models
        return [UserActivityOut.model_validate(activity) for activity in activities]
    except Exception as e:
        # No rollback needed for a GET request unless you're doing writes in the try block
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error fetching user activities: {e}")