from typing import Optional

from app.models import models


def log_inventory_transaction(db, *, item_id: int, user_id: int, action: str, quantity: int, notes: Optional[str] = None):
    transaction = models.InventoryTransaction(
        item_id=item_id,
        user_id=user_id,
        action=action,
        quantity=quantity,
        notes=notes,
    )
    db.add(transaction)
    return transaction
