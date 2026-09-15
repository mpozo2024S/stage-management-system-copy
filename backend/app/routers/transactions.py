from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models import models
from app.schemas.transaction import InventoryTransactionResponse

router = APIRouter(prefix="/transactions", tags=["Transactions"])


@router.get("", response_model=List[InventoryTransactionResponse])
@router.get("/", response_model=List[InventoryTransactionResponse], include_in_schema=False)
def get_transactions(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return (
        db.query(models.InventoryTransaction)
        .options(
            joinedload(models.InventoryTransaction.item),
            joinedload(models.InventoryTransaction.user),
        )
        .order_by(models.InventoryTransaction.timestamp.desc(), models.InventoryTransaction.id.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
