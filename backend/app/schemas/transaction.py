from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class TransactionItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str


class TransactionUser(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str


class InventoryTransactionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    item_id: int
    user_id: int
    action: str
    quantity: int
    timestamp: Optional[datetime] = None
    notes: Optional[str] = None
    item: Optional[TransactionItem] = None
    user: Optional[TransactionUser] = None
