from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from datetime import datetime
from app.models.models import ProductionStatus

# PRODUCTION ITEM ASSIGN SCHEMA
# This defines the data we expect from the frontend when assigning an item to a production.
class ProductionItemAssign(BaseModel):
    item_id: int
    quantity_assigned: int = Field(..., gt=0, description="Must be greater than 0")

class ProductionBatchAssign(BaseModel):
    items: List[ProductionItemAssign] = Field(..., min_length=1)

class ProductionBatchReturn(BaseModel):
    production_item_ids: List[int] = Field(..., min_length=1)

# PRODUCTION CREATE SCHEMA
# This defines the data we expect from the frontend when creating a new production.
class ProductionCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None

class ProductionUpdate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None

# PRODUCTION ITEM RESPONSE SCHEMA
# This is what we send back for each item assignment record inside a production.
# returned_at is null until the item has been returned to stock.
class ProductionItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    item_id: int
    quantity_assigned: int
    returned: bool
    returned_at: Optional[datetime]
    item_name: Optional[str] = None

# PRODUCTION RESPONSE SCHEMA
# This is what we send back to the frontend for a full production record.
# production_items contains every item assignment ever made to this production
class ProductionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    description: Optional[str]
    status: ProductionStatus
    created_at: datetime
    created_by_user_id: int
    production_items: List[ProductionItemResponse] = []
