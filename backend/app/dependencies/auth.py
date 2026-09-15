import os
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
from fastapi.security import OAuth2PasswordBearer, HTTPBearer
from fastapi import HTTPException, status
from jose import JWTError, jwt
from fastapi import Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import models

# SECRET_KEY: This is like the master key for our server. It is used to digitally sign the JWT tokens. 
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY is not set in environment variables")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60  # Tokens expire in 1 hour for security

# This sets up Bcrypt for password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    # This takes the plain text password from the login screen, hashes it, 
    # and checks if the result matches the hash saved in the database.
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    # This simply generates the scrambled hash before we save a new user.
    return pwd_context.hash(password)

def create_access_token(data: dict):
    # Make a copy of the data we want to put in the token
    to_encode = data.copy()

    # Calculate the exact time the token should expire
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    
    # Create the JWT string using the data, our secret key and the math algorithm
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


# This tells FastAPI that protected routes expect a Bearer token in the 
# Authorization header. The tokenUrl points to our login endpoint.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
http_bearer = HTTPBearer()

# This function is injected into any route that requires a logged-in user.
# It reads the JWT from the request header, decodes it and returns the current user's data.
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    
    # Define the error we'll raise if anything goes wrong with the token
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Decode the JWT using our secret key and algorithm
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        # Extract the email ('sub') from the token payload
        email: str = payload.get("sub")
        
        # If there's no email in the token, it's invalid
        if email is None:
            raise credentials_exception
            
    except JWTError:
        # If the token is expired, tampered with, or malformed, reject it
        raise credentials_exception
    
    # Look up the actual user in the database using the email from the token
    user = db.query(models.User).filter(models.User.email == email).first()
    
    if user is None:
        raise credentials_exception
        
    return user

# This is a factory function. It returns a dependency tailored to a specific set of allowed roles. 
# Usage example: Depends(require_roles(["Admin", "InventoryManager"]))
def require_roles(allowed_roles: list[str]):
    
    def role_checker(current_user: models.User = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {allowed_roles}"
            )
        return current_user
    
    return role_checker