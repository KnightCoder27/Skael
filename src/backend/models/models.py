from sqlalchemy import create_engine, Column, Integer, String, Boolean, Text, Date, ForeignKey, Enum, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from sqlalchemy.dialects.postgresql import ARRAY, UUID, JSONB
from sqlalchemy import Table
import datetime
import enum
import os
import uuid
# import contextlib

# --- Database Setup ---
# Replace with your PostgreSQL connection string
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

Base = declarative_base()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# --- Association Tables for Many-to-Many Relationships ---
# Association table for User and Technology (skills)
user_skills_association_table = Table(
    'user_skills_association',
    Base.metadata,
    Column('user_id', Integer, ForeignKey('users.id'), primary_key=True),
    Column('technology_id', Integer, ForeignKey('technologies.id'), primary_key=True)
)

# Association table for User and Location (preferred locations)
user_preferred_locations_association_table = Table(
    'user_preferred_locations_association',
    Base.metadata,
    Column('user_id', Integer, ForeignKey('users.id'), primary_key=True),
    Column('location_id', Integer, ForeignKey('location.id'), primary_key=True)
)

# Association table for JobListing and Technology
job_technologies_association_table = Table(
    'job_technologies_association',
    Base.metadata,
    Column('job_listing_id', Integer, ForeignKey('job_listings.id'), primary_key=True),
    Column('technology_id', Integer, ForeignKey('technologies.id'), primary_key=True)
)

# --- Enums ---
class RemotePreference(enum.Enum):
    REMOTE = "Remote"
    HYBRID = "Hybrid"
    ONSITE = "Onsite"

# --- Models ---

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True, index=True)
    user_name = Column(String, index=True)
    phone_number = Column(String, unique=True, nullable=True)
    email_id = Column(String, unique=True, index=True)
    password = Column(String) # Consider hashing passwords before storing
    desired_job_role = Column(String, nullable=True)

    # Many-to-many relationship with Technologies for skills
    skills = relationship(
        'Technology',
        secondary=user_skills_association_table,
        back_populates='users_with_skill'
    )

    experience = Column(Integer, comment="Years of experience")
    
    # Many-to-many relationship with Location for preferred_locations
    preferred_locations = relationship(
        'Location',
        secondary=user_preferred_locations_association_table,
        back_populates='users_preferring_location'
    )
    
    remote_preference = Column(Enum(RemotePreference), default=RemotePreference.ONSITE)
    professional_summary = Column(Text, nullable=True)
    
    # Foreign Key to Tiers table
    preferred_tier_id = Column(Integer, ForeignKey('tiers.id'), nullable=True)
    preferred_tier = relationship("Tier", back_populates="users")

    expected_salary = Column(String, nullable=True) # Could be a range or specific amount string
    resume = Column(String, nullable=True, comment="File path or URL to resume")
    joined_date = Column(DateTime, nullable=True)

class Location(Base):
    __tablename__ = 'location'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True) # e.g., "New York", "London"

    # Back-reference for users
    users_preferring_location = relationship(
        'User',
        secondary=user_preferred_locations_association_table,
        back_populates='preferred_locations'
    )


class Company(Base):
    __tablename__ = 'companies'
    id = Column(Integer, primary_key=True, index=True)
    api_company_id = Column(String, unique=True, nullable=True, index=True, comment="ID from the external API's company_object")
    company_name = Column(String, index=True)
    company_domain = Column(String, unique=True, index=True)
    industry = Column(String, nullable=True)
    country = Column(String, nullable=True)
    country_code = Column(String(2), nullable=True) # e.g., US, IN
    url = Column(String, nullable=True)
    long_description = Column(Text, nullable=True)
    linkedin_url = Column(String, nullable=True)
    linkedin_id = Column(String, nullable=True)
    logo = Column(String, nullable=True)


    # Not a direct foreign key, based on API data
    industry_id = Column(String, nullable=True, comment="API sourced industry identifier")
    # One-to-many relationship with Tiers
    tiers = relationship("Tier", back_populates="company")
    # One-to-many relationship with JobListings
    job_listings = relationship("JobListing", back_populates="company_obj")
    fetched_date = Column(Date, nullable=True)


class Tier(Base):
    __tablename__ = 'tiers'
    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign Key to Companies table
    company_id = Column(Integer, ForeignKey('companies.id'), nullable=False)
    company = relationship("Company", back_populates="tiers")
    
    tier_rank = Column(String, nullable=True) # e.g., "Tier 1", "Gold"

    # Back-reference for users
    users = relationship("User", back_populates="preferred_tier")


class JobListing(Base):
    __tablename__ = 'job_listings'
    id = Column(Integer, primary_key=True, index=True)
    unique_input_id = Column(String, unique=True, nullable=True) # If applicable from your input source
    api_id = Column(String, unique=True, nullable=True, index=True) # ID from the external API
    job_title = Column(String)
    url = Column(String, nullable=True)
    date_posted = Column(Date, nullable=True)
    employment_status = Column(Text,nullable=True)
    
    # Store company name as string from API for now, but also link to Company table
    company = Column(String, index=True) # Raw company name from API response

    # Link to the Company model via company_domain
    # This is a conceptual link rather than a strict FK if company_domain isn't unique for all companies
    # However, for consistency and querying, a FK to company.id is better if company_id is available
    # For now, I'll assume company_domain is used for joining/filtering, and keep 'company' as string.
    # If 'company' in job_listings should be a true FK to 'companies.id'
    company_domain = Column(String, index=True) # Company domain from API

    # Foreign Key to the Companies table using company_domain for relationship
    # Note: This means 'company_domain' in JobListing should match 'company_domain' in Company.
    # For a strict FK, 'company_id' is preferred.
    company_obj_id = Column(Integer, ForeignKey('companies.id'), nullable=True)
    company_obj = relationship("Company", back_populates="job_listings")


    final_url = Column(String, nullable=True)
    source_url = Column(String, nullable=True)
    location = Column(String, nullable=True)
    remote = Column(Boolean, default=False)
    hybrid = Column(Boolean, default=False)
    
    salary_string = Column(String, nullable=True) # Original salary string from API
    min_salary = Column(Integer, nullable=True)
    max_salary = Column(Integer, nullable=True)
    currency = Column(String(3), nullable=True) # e.g., USD, EUR, INR

    country = Column(String, nullable=True)
    seniority = Column(String, nullable=True)
    discovered_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    description = Column(Text, nullable=True)
    reposted = Column(Boolean, default=False)
    date_reposted = Column(Date, nullable=True)
    country_code = Column(String(2), nullable=True)
    job_expired = Column(Boolean, default=False)
    
    # API sourced industry identifier - not a direct foreign key constraint
    industry_id = Column(String, nullable=True, comment="API sourced industry identifier, linking to companies.industry_id")
    fetched_data = Column(Date, nullable=True)
    matching_phrase = Column(ARRAY(String), nullable=True)
    matching_words = Column(ARRAY(String), nullable=True)

    # Many-to-many relationship with Technologies for associated technologies
    technologies = relationship(
        'Technology',
        secondary=job_technologies_association_table,
        back_populates='job_listings_with_tech'
    )


class Technology(Base):
    __tablename__ = 'technologies'
    id = Column(Integer, primary_key=True, index=True)
    technology_name = Column(String, unique=True, index=True)
    technology_slug = Column(String, unique=True, index=True)
    category = Column(String, nullable=True)
    category_slug = Column(String, nullable=True)
    logo = Column(String, nullable=True)
    logo_thumbnail = Column(String, nullable=True)
    one_liner = Column(String, nullable=True)
    url = Column(String, nullable=True)
    description = Column(Text, nullable=True) # Use Text for potentially longer descriptions

    # Back-reference for users who have this skill
    users_with_skill = relationship(
        'User',
        secondary=user_skills_association_table,
        back_populates='skills'
    )

    # Back-reference for job listings that mention this technology
    job_listings_with_tech = relationship(
        'JobListing',
        secondary=job_technologies_association_table,
        back_populates='technologies'
    )


class UserActivityLog(Base):
    __tablename__ = 'user_activity_log'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    job_id = Column(Integer, ForeignKey('job_listings.id'))
    action_type = Column(String, nullable=False)  # e.g. 'job_saved', 'match_scored', 'resume_generated'
    activity_metadata = Column(JSONB)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class UserResume(Base):
    __tablename__ = 'user_resume'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    job_id = Column(Integer, ForeignKey('job_listings.id'), nullable=True)
    source = Column(String)  # 'from_profile', 'from_job'
    content = Column(Text)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class MatchScoreLog(Base):
    __tablename__ = 'match_score_log'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    job_id = Column(Integer, ForeignKey('job_listings.id'))
    score = Column(Integer, nullable=False)
    explanation = Column(Text)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


# @contextlib.contextmanager 
def get_db():
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception as e:
        db.rollback()
        raise(e)
    finally:
        db.close()


# --- Function to Create Tables ---
def create_all_tables():
    Base.metadata.create_all(bind=engine)
    print("All tables created successfully.")

# --- How to use ---
if __name__ == "__main__":
    # Example of creating tables
    # Call this function once to set up your database schema
    create_all_tables()

    # Example of opening a session (for FastAPI dependency injection)
    # def get_db():
    #     db = SessionLocal()
    #     try:
    #         yield db
    #     finally:
    #         db.close()
    pass