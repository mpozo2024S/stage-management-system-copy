from typing import Optional
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime

# ITEM CREATE SCHEMA
# This defines the exact data we expect from the frontend when adding a new inventory item.
# Physical detail fields are optional because not every item will have size/colour information.
class ItemCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    total_quantity: int = Field(..., ge=0)
    available_quantity: int = Field(..., ge=0)
    category_id: int = Field(..., gt=0)
    location_id: int = Field(..., gt=0)
    condition: str = Field(default="Good", max_length=50)
    description: Optional[str] = None
    unit: Optional[str] = Field(default=None, max_length=50)
    reorder_threshold: int = Field(default=0, ge=0)
    weight_per_unit: Optional[float] = Field(default=None, ge=0)

    height_cm: Optional[float] = Field(default=None, ge=0)
    width_cm: Optional[float] = Field(default=None, ge=0)
    depth_cm: Optional[float] = Field(default=None, ge=0)
    colour: Optional[str] = Field(default=None, max_length=50)


# ITEM RESPONSE SCHEMA
# This is what we send back to the frontend when returning an inventory item.
class ItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    total_quantity: int
    available_quantity: int
    category_id: int
    location_id: int
    condition: str
    description: Optional[str] = None
    in_use: bool = False
    unit: Optional[str] = None
    reorder_threshold: int = 0
    weight_per_unit: Optional[float] = None
    image_url: Optional[str] = None

    height_cm: Optional[float] = None
    width_cm: Optional[float] = None
    depth_cm: Optional[float] = None
    colour: Optional[str] = None


# ITEM UPDATE SCHEMA
# This defines the data we expect from the frontend when editing an existing item.
# All core fields are still required, but the new physical detail fields are optional.
class ItemUpdate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    total_quantity: int = Field(..., ge=0)
    available_quantity: int = Field(..., ge=0)
    category_id: int = Field(..., gt=0)
    location_id: int = Field(..., gt=0)
    condition: str = Field(default="Good", max_length=50)
    description: Optional[str] = None
    unit: Optional[str] = Field(default=None, max_length=50)
    reorder_threshold: int = Field(default=0, ge=0)
    weight_per_unit: Optional[float] = Field(default=None, ge=0)

    height_cm: Optional[float] = Field(default=None, ge=0)
    width_cm: Optional[float] = Field(default=None, ge=0)
    depth_cm: Optional[float] = Field(default=None, ge=0)
    colour: Optional[str] = Field(default=None, max_length=50)


# ITEM QUANTITY UPDATE SCHEMA
# Used by the PATCH quantity endpoint to adjust available stock.
# Positive values increase available stock, negative values decrease it.
class ItemQuantityUpdate(BaseModel):
    quantity_change: int


# ITEM PHOTO CREATE SCHEMA
# Used when linking an uploaded image URL to an item.
class ItemPhotoCreate(BaseModel):
    url: str = Field(..., min_length=1)


# ITEM PHOTO RESPONSE SCHEMA
# Returned after an uploaded image URL is linked to an item.
class ItemPhotoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    item_id: int
    uploaded_by: int
    url: str
    uploaded_at: datetime
