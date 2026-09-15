from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import models
from app.schemas import user as user_schemas
from app.dependencies.auth import get_current_user, require_roles

router = APIRouter(prefix="/users", tags=["Users"])

# GET /users/me — returns the currently logged in user
@router.get("/me", response_model=user_schemas.UserResponse)
def get_me(current_user: models.User = Depends(get_current_user)):
    return current_user

# GET /users — Admin only
@router.get("/", response_model=list[user_schemas.UserResponse])
def get_users(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(["Admin"]))
):
    return db.query(models.User).all()

# PUT /users/:id/role — Admin only
@router.put("/{user_id}/role", response_model=user_schemas.UserResponse)
def update_user_role(
    user_id: int,
    role_data: user_schemas.UpdateRole,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(["Admin"]))
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.role = role_data.role
    db.commit()
    db.refresh(user)
    return user

# DELETE /users/:id — Admin only
@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(["Admin"]))
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return {"message": f"User {user_id} deleted"}