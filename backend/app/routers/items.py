from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.models import models
from app.dependencies.auth import get_current_user, require_roles
from app.schemas import item as item_schemas
from app.schemas.transaction import InventoryTransactionResponse
from app.transaction_logging import log_inventory_transaction

# This file contains all inventory-related API endpoints.
# Each route is protected, either requiring any logged-in user or a specific role

router = APIRouter(prefix="/items", tags=["Inventory"])


def serialize_item_response(item: models.Item):
    return {
        "id": item.id,
        "name": item.name,
        "description": item.description if isinstance(item.description, str) else None,
        "total_quantity": item.total_quantity,
        "available_quantity": item.available_quantity,
        "in_use": item.in_use if isinstance(item.in_use, bool) else False,
        "unit": item.unit if isinstance(item.unit, str) else None,
        "reorder_threshold": item.reorder_threshold if isinstance(item.reorder_threshold, int) else 0,
        "weight_per_unit": item.weight_per_unit if isinstance(item.weight_per_unit, (int, float)) else None,
        "category_id": item.category_id,
        "location_id": item.location_id,
        "condition": item.condition,
        "image_url": item.image_url if isinstance(item.image_url, str) else None,
        "height_cm": item.height_cm if isinstance(item.height_cm, (int, float)) else None,
        "width_cm": item.width_cm if isinstance(item.width_cm, (int, float)) else None,
        "depth_cm": item.depth_cm if isinstance(item.depth_cm, (int, float)) else None,
        "colour": item.colour if isinstance(item.colour, str) else None,
    }

# GET /items
# Returns the inventory list with pagination, category/location data,
# and all production assignments linked to each item.
# Any logged-in user can view this.
@router.get("/")
def get_items(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    items = (
        db.query(models.Item)
        .options(
            joinedload(models.Item.category),
            joinedload(models.Item.location),
            joinedload(models.Item.production_items).joinedload(models.ProductionItem.production)
        )
        .offset(skip)
        .limit(limit)
        .all()
    )

    return [
        {
            "id": item.id,
            "name": item.name,
            "description": item.description,
            "total_quantity": item.total_quantity,
            "available_quantity": item.available_quantity,
            "in_use": item.in_use,
            "unit": item.unit,
            "reorder_threshold": item.reorder_threshold,
            "weight_per_unit": item.weight_per_unit,
            "category_id": item.category_id,
            "location_id": item.location_id,
            "condition": item.condition,
            "image_url": item.image_url,
            "height_cm": item.height_cm,
            "width_cm": item.width_cm,
            "depth_cm": item.depth_cm,
            "colour": item.colour,
            "category": {
                "id": item.category.id,
                "name": item.category.name,
                "material_type": item.category.material_type
            } if item.category else None,
            "location": {
                "id": item.location.id,
                "name": item.location.name
            } if item.location else None,
            "productions": [
                {
                    "production_id": production_item.production_id,
                    "production_name": production_item.production.name if production_item.production else None,
                    "status": production_item.production.status if production_item.production else None,
                    "quantity_assigned": production_item.quantity_assigned,
                    "returned": production_item.returned,
                    "returned_at": production_item.returned_at
                }
                for production_item in item.production_items
            ]
        }
        for item in items
    ]


# GET /items/categories
@router.get("/categories")
def get_categories(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return db.query(models.Category).all()


# GET /items/locations
@router.get("/locations")
def get_locations(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return db.query(models.Location).all()


# GET /items/{item_id}
# Returns a single item by its ID.
# Any logged-in user can view individual items.
@router.get("/{item_id}")
def get_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Item not found")
    return item


# POST /items
# Adds a new item after validating quantity consistency and foreign key references.
# Only Admin or Inventory Manager can add items.
@router.post("/", response_model=item_schemas.ItemResponse)
def create_item(
    item_data: item_schemas.ItemCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(["Admin", "InventoryManager"]))
):
    if item_data.available_quantity > item_data.total_quantity:
        raise HTTPException(
            status_code=400,
            detail="Available quantity cannot be greater than total quantity"
        )

    category = db.query(models.Category).filter(models.Category.id == item_data.category_id).first()
    if category is None:
        raise HTTPException(status_code=400, detail="Category not found")

    location = db.query(models.Location).filter(models.Location.id == item_data.location_id).first()
    if location is None:
        raise HTTPException(status_code=400, detail="Location not found")

    new_item = models.Item(**item_data.model_dump())
    new_item.in_use = False
    db.add(new_item)
    db.flush()

    if new_item.available_quantity > 0:
        log_inventory_transaction(
            db,
            item_id=new_item.id,
            user_id=current_user.id,
            action="adjustment",
            quantity=new_item.available_quantity,
            notes="Initial item quantity recorded on creation",
        )

    db.commit()
    db.refresh(new_item)

    return serialize_item_response(new_item)


# DELETE /items/{item_id}
# Removes an item from the inventory.
# Only Admin can delete items.
@router.delete("/{item_id}")
def delete_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(["Admin"]))
):
    item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Item not found")
    db.delete(item)
    db.commit()
    return {"message": f"Item {item_id} deleted successfully"}


# PUT /items/{item_id}
# Updates an existing item after validating quantity consistency and foreign key references.
# Only Admin or Inventory Manager can update items.
@router.put("/{item_id}", response_model=item_schemas.ItemResponse)
def update_item(
    item_id: int,
    item_data: item_schemas.ItemUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(["Admin", "InventoryManager"]))
):
    item = db.query(models.Item).filter(models.Item.id == item_id).first()

    if item is None:
        raise HTTPException(status_code=404, detail="Item not found")

    if item_data.available_quantity > item_data.total_quantity:
        raise HTTPException(
            status_code=400,
            detail="Available quantity cannot be greater than total quantity"
        )

    category = db.query(models.Category).filter(models.Category.id == item_data.category_id).first()
    if category is None:
        raise HTTPException(status_code=400, detail="Category not found")

    location = db.query(models.Location).filter(models.Location.id == item_data.location_id).first()
    if location is None:
        raise HTTPException(status_code=400, detail="Location not found")

    quantity_change = item_data.available_quantity - item.available_quantity

    item.name = item_data.name
    item.description = item_data.description
    item.total_quantity = item_data.total_quantity
    item.available_quantity = item_data.available_quantity
    item.category_id = item_data.category_id
    item.location_id = item_data.location_id
    item.condition = item_data.condition
    item.unit = item_data.unit
    item.reorder_threshold = item_data.reorder_threshold
    item.weight_per_unit = item_data.weight_per_unit
    item.height_cm = item_data.height_cm
    item.width_cm = item_data.width_cm
    item.depth_cm = item_data.depth_cm
    item.colour = item_data.colour

    if quantity_change != 0:
        action = "adjustment" if quantity_change > 0 else "checkout"
        log_inventory_transaction(
            db,
            item_id=item.id,
            user_id=current_user.id,
            action=action,
            quantity=abs(quantity_change),
            notes="Available quantity changed while editing item details",
        )

    db.commit()
    db.refresh(item)

    return serialize_item_response(item)


# PATCH /items/{item_id}/quantity
# Adjusts available quantity without editing the whole item.
# Only Inventory Manager can change item quantity.
@router.patch("/{item_id}/quantity", response_model=item_schemas.ItemResponse)
def update_item_quantity(
    item_id: int,
    quantity_data: item_schemas.ItemQuantityUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(["InventoryManager"]))
):
    item = db.query(models.Item).filter(models.Item.id == item_id).first()

    if item is None:
        raise HTTPException(status_code=404, detail="Item not found")

    new_available_quantity = item.available_quantity + quantity_data.quantity_change

    if new_available_quantity < 0:
        raise HTTPException(
            status_code=400,
            detail="Available quantity cannot go below 0"
        )

    if new_available_quantity > item.total_quantity:
        raise HTTPException(
            status_code=400,
            detail="Available quantity cannot be greater than total quantity"
        )

    item.available_quantity = new_available_quantity
    action = "adjustment" if quantity_data.quantity_change > 0 else "checkout"
    log_inventory_transaction(
        db,
        item_id=item.id,
        user_id=current_user.id,
        action=action,
        quantity=abs(quantity_data.quantity_change),
        notes="Manual stock adjustment",
    )

    db.commit()
    db.refresh(item)

    return serialize_item_response(item)


@router.get("/{item_id}/transactions", response_model=list[InventoryTransactionResponse])
def get_item_transactions(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Item not found")

    return (
        db.query(models.InventoryTransaction)
        .options(
            joinedload(models.InventoryTransaction.item),
            joinedload(models.InventoryTransaction.user),
        )
        .filter(models.InventoryTransaction.item_id == item_id)
        .order_by(models.InventoryTransaction.timestamp.desc(), models.InventoryTransaction.id.desc())
        .all()
    )


# POST /items/{item_id}/photos
# Stores image metadata for an item after the image has been uploaded to storage.
# Also updates item.image_url so the latest image can be shown directly in the inventory list.
# Only Inventory Manager can upload/link item photos.
@router.post("/{item_id}/photos", response_model=item_schemas.ItemPhotoResponse)
def add_item_photo(
    item_id: int,
    photo_data: item_schemas.ItemPhotoCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(["Admin", "InventoryManager"]))
):
    item = db.query(models.Item).filter(models.Item.id == item_id).first()

    if item is None:
        raise HTTPException(status_code=404, detail="Item not found")

    new_photo = models.ItemPhoto(
        item_id=item_id,
        uploaded_by=current_user.id,
        url=photo_data.url
    )

    item.image_url = photo_data.url

    db.add(new_photo)
    db.commit()
    db.refresh(new_photo)

    return new_photo
