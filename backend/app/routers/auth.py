from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import models
from app.schemas import user as user_schemas
from app.dependencies import auth as auth_utils

# We use APIRouter to group all authentication-related endpoints under '/auth'
router = APIRouter(prefix="/auth", tags=["Authentication"])

# POST /auth/register
# Expects: Name, Email, Password, Role (from UserCreate schema)
# Returns: The new user's profile (from UserResponse schema)
@router.post("/register", response_model=user_schemas.UserResponse)
def register_user(user: user_schemas.UserCreate, db: Session = Depends(get_db)):

    # Check if email already exists
    existing_user = db.query(models.User).filter(models.User.email == user.email).first()

    # If the email is found, throw an HTTP 400 Bad Request error
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash the password
    hashed_pw = auth_utils.get_password_hash(user.password)
    
    # Save new user to database
    new_user = models.User(
        name=user.name,
        email=user.email,
        password_hash=hashed_pw,
        role=user.role
    )

    # Add the user to the database session and commit
    db.add(new_user)
    db.commit()

    # Refresh retrieves the new ID that Supabase just generated for us
    db.refresh(new_user)
    
    return new_user

# POST /auth/login
# Expects: username (email) and password from a standard login form
# Returns: The JWT Access Token
@router.post("/login", response_model=user_schemas.Token)
def login_user(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    
    # Find the user in the DB. OAuth2 standards always call the field 'username', but we are using it to store the user's email address.
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    
    # Check if user exists and password is correct
    if not user or not auth_utils.verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Generate JWT Token including their role if login is successful.
    access_token = auth_utils.create_access_token(
        data={"sub": user.email, "role": user.role}
    )
    
    return {"access_token": access_token, "token_type": "bearer"}