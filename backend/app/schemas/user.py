from pydantic import BaseModel, ConfigDict
from app.models.models import UserRole

# USER CREATE SCHEMA
# This defines the exact data we expect from the frontend when a new user tries to register.
class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: UserRole = UserRole.CREW

# USER RESPONSE SCHEMA
# This is what we send back to the frontend after a user registers.
class UserResponse(BaseModel):
    # This tells Pydantic to read the data even if it's an SQLAlchemy model
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    role: UserRole

# UPDATE ROLE SCHEMA
# Used by Admin to change a user's role.
class UpdateRole(BaseModel):
    role: UserRole
    
# TOKEN SCHEMA
# Standard format for returning a JWT token upon login.
class Token(BaseModel):
    access_token: str
    token_type: str