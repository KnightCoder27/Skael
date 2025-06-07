from fastapi import APIRouter, Depends, HTTPException, status, Form, Path, Security
from sqlalchemy.orm import Session
from typing import Optional, List, Any
from src.backend.models.models import get_db, UserResume, UserActivityLog
from src.backend.models.schemas import UserResumeOut, BaseModel
from .users import get_current_user # Assuming get_current_user is in users.py

router = APIRouter(prefix="/resumes", tags=["resumes"])

class ResumeIn(BaseModel):
    user_id: int
    job_id: Optional[str] = None
    source: str
    content: str

@router.post("/generate")
def generate_resume(resume_in: ResumeIn, db: Session = Depends(get_db)):
    try:
        resume = UserResume(
            user_id=resume_in.user_id,
            job_id=resume_in.job_id,
            source=resume_in.source,
            content=resume_in.content
        )
        db.add(resume)
        db.commit()
        db.refresh(resume)
        return {"msg": "Resume generated", "resume_id": str(resume.id)}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error generating resume: {e}")

@router.get("/user/{user_id}", response_model=List[UserResumeOut])
def get_user_resumes(user_id: int = Path(...), db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    try:
        resumes = db.query(UserResume).filter(UserResume.user_id == user_id).all()
        # Map SQLAlchemy objects to Pydantic models
        return [UserResumeOut.model_validate(resume) for resume in resumes]
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error fetching user resumes: {e}")

@router.post("/apply")
def apply_job(user_id: int = Form(...), job_id: int = Form(...), db: Session = Depends(get_db)):
    try:
        activity = UserActivityLog(
            user_id=user_id,
            job_id=job_id,
            action_type="job_applied",
            metadata=None
        )
        db.add(activity)
        db.commit()
        db.refresh(activity)
        return {"msg": "Application logged", "activity_id": str(activity.id)}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error logging application: {e}")
