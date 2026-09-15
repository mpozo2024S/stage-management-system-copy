from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from datetime import datetime, timezone
from typing import List

from app.database import get_db
from app.models.models import Production, ProductionItem, Item, ProductionStatus
from app.schemas.production import (
    ProductionBatchAssign,
    ProductionBatchReturn,
    ProductionCreate,
    ProductionResponse,
    ProductionItemAssign,
    ProductionUpdate,
)
from app.dependencies.auth import get_current_user, require_roles
from app.transaction_logging import log_inventory_transaction

router = APIRouter(prefix="/productions", tags=["productions"])

def serialize_production(production: Production):
    return {
        "id": production.id,
        "name": production.name,
        "description": production.description,
        "status": production.status,
        "created_at": production.created_at,
        "created_by_user_id": production.created_by_user_id,
        "production_items": [
            {
                "id": pi.id,
                "item_id": pi.item_id,
                "item_name": pi.item.name if pi.item else None,
                "quantity_assigned": pi.quantity_assigned,
                "returned": pi.returned,
                "returned_at": pi.returned_at,
            }
            for pi in production.production_items
        ],
    }


def sync_item_in_use(db: Session, item_id: int):
    db.flush()
    has_unreturned_assignment = (
        db.query(ProductionItem)
        .filter(
            ProductionItem.item_id == item_id,
            ProductionItem.returned == False
        )
        .first()
        is not None
    )
    item = db.query(Item).filter(Item.id == item_id).first()
    if item:
        item.in_use = has_unreturned_assignment


def assign_items_to_production(
    production: Production,
    assignments: list[ProductionItemAssign],
    db: Session,
    current_user,
):
    quantities_by_item_id = {}
    for assignment in assignments:
        if assignment.quantity_assigned <= 0:
            raise HTTPException(status_code=422, detail="Quantity assigned must be greater than 0")
        quantities_by_item_id[assignment.item_id] = (
            quantities_by_item_id.get(assignment.item_id, 0) + assignment.quantity_assigned
        )

    items_by_id = {}
    for item_id, quantity_assigned in quantities_by_item_id.items():
        item = db.query(Item).filter(Item.id == item_id).first()
        if not item:
            raise HTTPException(status_code=404, detail=f"Item {item_id} not found")
        available_quantity = max(0, item.available_quantity or 0)
        if available_quantity < quantity_assigned:
            raise HTTPException(
                status_code=400,
                detail="Not enough available quantity"
            )
        items_by_id[item_id] = item

    production_items = []
    for item_id, quantity_assigned in quantities_by_item_id.items():
        item = items_by_id[item_id]
        item.available_quantity -= quantity_assigned
        item.in_use = True

        production_item = ProductionItem(
            production_id=production.id,
            item_id=item_id,
            quantity_assigned=quantity_assigned
        )
        production_items.append(production_item)
        db.add(production_item)
        log_inventory_transaction(
            db,
            item_id=item.id,
            user_id=current_user.id,
            action="checkout",
            quantity=quantity_assigned,
            notes=f"Assigned to production: {production.name}",
        )

    return production_items


# GET /productions. All users can view
@router.get("/", response_model=List[ProductionResponse])
def get_productions(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    productions = (
        db.query(Production)
        .options(joinedload(Production.production_items).joinedload(ProductionItem.item))
        .order_by(Production.created_at.desc(), Production.id.desc())
        .all()
    )
    return [serialize_production(production) for production in productions]

# GET /productions/{id}. All users can view
@router.get("/{production_id}", response_model=ProductionResponse)
def get_production(
    production_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    production = db.query(Production).filter(Production.id == production_id).first()
    if not production:
        raise HTTPException(status_code=404, detail="Production not found")
    return serialize_production(production)

# POST /productions. Admin and Inventory Manager only
@router.post("/", response_model=ProductionResponse)
def create_production(
    data: ProductionCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(["Admin", "InventoryManager"]))
):
    production = Production(
        name=data.name,
        description=data.description,
        created_by_user_id=current_user.id
    )
    db.add(production)
    db.commit()
    db.refresh(production)
    return serialize_production(production)


@router.put("/{production_id}", response_model=ProductionResponse)
def update_production(
    production_id: int,
    data: ProductionUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(["Admin", "InventoryManager"]))
):
    production = db.query(Production).filter(Production.id == production_id).first()
    if not production:
        raise HTTPException(status_code=404, detail="Production not found")

    production.name = data.name
    production.description = data.description
    db.commit()
    db.refresh(production)
    return serialize_production(production)

# POST /productions/{id}/assign. Assign an item to a production
# Reduces available_quantity on the item
@router.post("/{production_id}/assign")
def assign_item(
    production_id: int,
    data: ProductionItemAssign,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(["Admin", "InventoryManager"]))
):
    production = db.query(Production).filter(Production.id == production_id).first()
    if not production:
        raise HTTPException(status_code=404, detail="Production not found")
    if production.status == ProductionStatus.ENDED:
        raise HTTPException(status_code=400, detail="Cannot assign items to an ended production")

    assign_items_to_production(production, [data], db, current_user)
    db.commit()
    return {"message": f"Assigned {data.quantity_assigned} of item {data.item_id} to production {production_id}"}


@router.post("/{production_id}/assign-batch")
def assign_items_batch(
    production_id: int,
    data: ProductionBatchAssign,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(["Admin", "InventoryManager"]))
):
    production = db.query(Production).filter(Production.id == production_id).first()
    if not production:
        raise HTTPException(status_code=404, detail="Production not found")
    if production.status == ProductionStatus.ENDED:
        raise HTTPException(status_code=400, detail="Cannot assign items to an ended production")

    production_items = assign_items_to_production(production, data.items, db, current_user)
    db.commit()
    return {
        "message": f"Assigned {len(production_items)} item groups to production {production_id}",
        "items_assigned": len(production_items),
    }

# POST /productions/{id}/return-all. Bulk return all items to stock
# Sets returned=True on all ProductionItems, restores available_quantity
@router.post("/{production_id}/return-all")
def return_all_items(
    production_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(["Admin", "InventoryManager"]))
):
    production = db.query(Production).filter(Production.id == production_id).first()
    if not production:
        raise HTTPException(status_code=404, detail="Production not found")

    unreturned = db.query(ProductionItem).filter(
        ProductionItem.production_id == production_id,
        ProductionItem.returned == False
    ).all()

    now = datetime.now(timezone.utc)
    for pi in unreturned:
        item = db.query(Item).filter(Item.id == pi.item_id).first()
        if item:
            item.available_quantity += pi.quantity_assigned
            log_inventory_transaction(
                db,
                item_id=item.id,
                user_id=current_user.id,
                action="return",
                quantity=pi.quantity_assigned,
                notes=f"Returned from production: {production.name}",
            )
        pi.returned = True
        pi.returned_at = now
        sync_item_in_use(db, pi.item_id)

    production.status = ProductionStatus.ENDED
    db.commit()
    return {"message": f"All items returned from production {production_id}", "items_returned": len(unreturned)}


# POST /productions/{id}/return/{production_item_id}. Return one item individually
@router.post("/{production_id}/return/{production_item_id}")
def return_single_item(
    production_id: int,
    production_item_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(["Admin", "InventoryManager"]))
):
    pi = db.query(ProductionItem).filter(
        ProductionItem.id == production_item_id,
        ProductionItem.production_id == production_id
    ).first()
    if not pi:
        raise HTTPException(status_code=404, detail="Production item not found")
    if pi.returned:
        raise HTTPException(status_code=400, detail="Item already returned")

    item = db.query(Item).filter(Item.id == pi.item_id).first()
    if item:
        item.available_quantity += pi.quantity_assigned
        log_inventory_transaction(
            db,
            item_id=item.id,
            user_id=current_user.id,
            action="return",
            quantity=pi.quantity_assigned,
            notes=f"Returned from production {production_id}",
        )

    pi.returned = True
    pi.returned_at = datetime.now(timezone.utc)
    sync_item_in_use(db, pi.item_id)
    db.commit()
    return {"message": f"Item {pi.item_id} returned to stock", "quantity_returned": pi.quantity_assigned}


@router.post("/{production_id}/return-batch")
def return_items_batch(
    production_id: int,
    data: ProductionBatchReturn,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(["Admin", "InventoryManager"]))
):
    production = db.query(Production).filter(Production.id == production_id).first()
    if not production:
        raise HTTPException(status_code=404, detail="Production not found")

    production_items = (
        db.query(ProductionItem)
        .filter(
            ProductionItem.production_id == production_id,
            ProductionItem.id.in_(data.production_item_ids),
            ProductionItem.returned == False
        )
        .all()
    )

    if len(production_items) != len(set(data.production_item_ids)):
        raise HTTPException(status_code=400, detail="One or more selected items are not returnable")

    now = datetime.now(timezone.utc)
    for pi in production_items:
        item = db.query(Item).filter(Item.id == pi.item_id).first()
        if item:
            item.available_quantity += pi.quantity_assigned
            log_inventory_transaction(
                db,
                item_id=item.id,
                user_id=current_user.id,
                action="return",
                quantity=pi.quantity_assigned,
                notes=f"Returned from production: {production.name}",
            )
        pi.returned = True
        pi.returned_at = now
        sync_item_in_use(db, pi.item_id)

    db.commit()
    return {
        "message": f"Returned {len(production_items)} item groups from production {production_id}",
        "items_returned": len(production_items),
    }
