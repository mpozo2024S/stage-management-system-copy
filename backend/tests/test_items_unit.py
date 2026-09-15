from unittest.mock import MagicMock
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from app.main import app
from app.dependencies.auth import get_current_user
from app.database import get_db
from app.models.models import UserRole

def mock_admin():
    user = MagicMock()
    user.role = UserRole.ADMIN
    user.email = "admin@test.com"
    return user

def mock_crew():
    user = MagicMock()
    user.role = UserRole.CREW
    user.email = "crew@test.com"
    return user

def mock_inventory_manager():
    user = MagicMock()
    user.id = 3
    user.role = UserRole.INVENTORY_MANAGER
    user.email = "manager@test.com"
    return user

def test_get_items_returns_list_for_authenticated_user():
    """Any authenticated user can retrieve the full inventory list"""
    mock_session = MagicMock()
    mock_session.query.return_value.options.return_value.offset.return_value.limit.return_value.all.return_value = []

    def override_get_db():
        yield mock_session

    app.dependency_overrides[get_current_user] = mock_admin
    app.dependency_overrides[get_db] = override_get_db

    client = TestClient(app)
    response = client.get("/items/")

    app.dependency_overrides.clear()
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_get_item_by_id_returns_404_when_item_does_not_exist():
    """Requesting a non-existent item ID returns 404"""
    mock_session = MagicMock()
    mock_session.query.return_value.filter.return_value.first.return_value = None

    def override_get_db():
        yield mock_session

    app.dependency_overrides[get_current_user] = mock_admin
    app.dependency_overrides[get_db] = override_get_db

    client = TestClient(app)
    response = client.get("/items/999999")

    app.dependency_overrides.clear()
    assert response.status_code == 404


def test_create_item_is_forbidden_for_crew_role():
    """A Crew user cannot create inventory items"""
    app.dependency_overrides[get_current_user] = mock_crew

    client = TestClient(app)
    response = client.post("/items/", json={
        "name": "Crew Item",
        "total_quantity": 5,
        "available_quantity": 5,
        "category_id": 1,
        "location_id": 1,
        "condition": "Good"
    })

    app.dependency_overrides.clear()
    assert response.status_code == 403


def test_update_item_is_forbidden_for_crew_role():
    """A Crew user cannot update inventory items"""
    app.dependency_overrides[get_current_user] = mock_crew

    client = TestClient(app)
    response = client.put("/items/1", json={
        "total_quantity": 5,
        "available_quantity": 5
    })

    app.dependency_overrides.clear()
    assert response.status_code == 403


def test_delete_item_is_forbidden_for_inventory_manager():
    """An Inventory Manager cannot delete items (only Admin can)"""
    app.dependency_overrides[get_current_user] = mock_inventory_manager

    client = TestClient(app)
    response = client.delete("/items/1")

    app.dependency_overrides.clear()
    assert response.status_code == 403


def test_get_categories_returns_list_for_authenticated_user():
    """Categories endpoint returns a list for any authenticated user"""
    mock_session = MagicMock()
    mock_session.query.return_value.all.return_value = []

    def override_get_db():
        yield mock_session

    app.dependency_overrides[get_current_user] = mock_admin
    app.dependency_overrides[get_db] = override_get_db

    client = TestClient(app)
    response = client.get("/items/categories")

    app.dependency_overrides.clear()
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_get_locations_returns_list_for_authenticated_user():
    """Locations endpoint returns a list for any authenticated user"""
    mock_session = MagicMock()
    mock_session.query.return_value.all.return_value = []

    def override_get_db():
        yield mock_session

    app.dependency_overrides[get_current_user] = mock_admin
    app.dependency_overrides[get_db] = override_get_db

    client = TestClient(app)
    response = client.get("/items/locations")

    app.dependency_overrides.clear()
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_create_item_with_negative_quantity_rejected():
    """Negative total quantity should be rejected before hitting the database"""
    app.dependency_overrides[get_current_user] = mock_admin

    client = TestClient(app)
    response = client.post("/items/", json={
        "name": "Negative Item",
        "total_quantity": -1,
        "available_quantity": 0,
        "category_id": 1,
        "location_id": 1,
        "condition": "Good"
    })

    app.dependency_overrides.clear()
    assert response.status_code == 422

def test_create_item_with_zero_available_quantity_is_valid():
    """Zero available quantity is valid — item exists but is fully checked out"""
    mock_session = MagicMock()
    mock_item = MagicMock()
    mock_item.id = 1
    mock_item.name = "All Checked Out Item"
    mock_item.total_quantity = 10
    mock_item.available_quantity = 0
    mock_item.category_id = 1
    mock_item.location_id = 1
    mock_item.condition = "Good"

    mock_session.query.return_value.filter.return_value.first.return_value = MagicMock()  # category/location found
    mock_session.refresh.side_effect = lambda obj: setattr(obj, "id", 1)

    def override_get_db():
        yield mock_session

    app.dependency_overrides[get_current_user] = mock_admin
    app.dependency_overrides[get_db] = override_get_db

    client = TestClient(app)
    response = client.post("/items/", json={
        "name": "All Checked Out Item",
        "total_quantity": 10,
        "available_quantity": 0,
        "category_id": 1,
        "location_id": 1,
        "condition": "Good"
    })

    app.dependency_overrides.clear()
    assert response.status_code == 200


def test_update_item_allowed_for_inventory_manager():
    """Inventory Manager can update items — only delete is restricted to Admin"""
    mock_session = MagicMock()
    mock_item = MagicMock()
    mock_item.id = 1
    mock_item.name = "Plank"
    mock_item.total_quantity = 10
    mock_item.available_quantity = 5
    mock_item.category_id = 1
    mock_item.location_id = 1
    mock_item.condition = "Good"
    mock_item.image_url = None
    mock_item.height_cm = None
    mock_item.width_cm = None
    mock_item.depth_cm = None
    mock_item.colour = None

    mock_session.query.return_value.filter.return_value.first.return_value = mock_item
    mock_session.refresh.side_effect = lambda obj: None

    def override_get_db():
        yield mock_session

    app.dependency_overrides[get_current_user] = mock_inventory_manager
    app.dependency_overrides[get_db] = override_get_db

    client = TestClient(app)
    response = client.put("/items/1", json={
        "name": "Plank",
        "total_quantity": 10,
        "available_quantity": 5,
        "category_id": 1,
        "location_id": 1,
        "condition": "Good"
    })

    app.dependency_overrides.clear()
    assert response.status_code == 200

def test_update_item_returns_404_for_nonexistent_item():
    """PUT on an item ID that does not exist returns 404"""
    mock_session = MagicMock()
    mock_session.query.return_value.filter.return_value.first.return_value = None

    def override_get_db():
        yield mock_session

    app.dependency_overrides[get_current_user] = mock_admin
    app.dependency_overrides[get_db] = override_get_db

    client = TestClient(app)
    response = client.put("/items/999999", json={
        "name": "Ghost Item",
        "total_quantity": 5,
        "available_quantity": 3,
        "category_id": 1,
        "location_id": 1,
        "condition": "Good"
    })

    app.dependency_overrides.clear()
    assert response.status_code == 404


def test_update_item_returns_400_when_available_exceeds_total():
    """PUT where available_quantity > total_quantity returns 400"""
    mock_session = MagicMock()
    mock_item = MagicMock()
    mock_session.query.return_value.filter.return_value.first.return_value = mock_item

    def override_get_db():
        yield mock_session

    app.dependency_overrides[get_current_user] = mock_admin
    app.dependency_overrides[get_db] = override_get_db

    client = TestClient(app)
    response = client.put("/items/1", json={
        "name": "Bad Update",
        "total_quantity": 5,
        "available_quantity": 10,
        "category_id": 1,
        "location_id": 1,
        "condition": "Good"
    })

    app.dependency_overrides.clear()
    assert response.status_code == 400
    assert response.json()["detail"] == "Available quantity cannot be greater than total quantity"


def test_delete_item_returns_404_for_nonexistent_item():
    """Admin attempting to delete an item that does not exist returns 404"""
    mock_session = MagicMock()
    mock_session.query.return_value.filter.return_value.first.return_value = None

    def override_get_db():
        yield mock_session

    app.dependency_overrides[get_current_user] = mock_admin
    app.dependency_overrides[get_db] = override_get_db

    client = TestClient(app)
    response = client.delete("/items/999999")

    app.dependency_overrides.clear()
    assert response.status_code == 404

def test_create_item_with_invalid_category_returns_400():
    """POST /items with a category_id that doesn't exist returns 400"""
    mock_session = MagicMock()
    mock_session.query.return_value.filter.return_value.first.return_value = None

    def override_get_db():
        yield mock_session

    app.dependency_overrides[get_current_user] = mock_admin
    app.dependency_overrides[get_db] = override_get_db

    client = TestClient(app)
    response = client.post("/items/", json={
        "name": "Bad Category Item",
        "total_quantity": 5,
        "available_quantity": 5,
        "category_id": 9999,
        "location_id": 1,
        "condition": "Good"
    })

    app.dependency_overrides.clear()
    assert response.status_code == 400   

def test_patch_quantity_allowed_for_inventory_manager():
    """Inventory Manager can adjust available item quantity"""
    mock_session = MagicMock()
    mock_item = MagicMock()
    mock_item.id = 1
    mock_item.name = "Cable"
    mock_item.total_quantity = 10
    mock_item.available_quantity = 8
    mock_item.category_id = 1
    mock_item.location_id = 1
    mock_item.condition = "Good"
    mock_item.image_url = None
    mock_item.height_cm = None
    mock_item.width_cm = None
    mock_item.depth_cm = None
    mock_item.colour = None

    mock_session.query.return_value.filter.return_value.first.return_value = mock_item
    mock_session.refresh.side_effect = lambda obj: None

    def override_get_db():
        yield mock_session

    app.dependency_overrides[get_current_user] = mock_inventory_manager
    app.dependency_overrides[get_db] = override_get_db

    client = TestClient(app)
    response = client.patch("/items/1/quantity", json={
        "quantity_change": -3
    })

    app.dependency_overrides.clear()

    assert response.status_code == 200
    assert mock_item.available_quantity == 5
    mock_session.commit.assert_called_once()


def test_patch_quantity_returns_404_for_nonexistent_item():
    """PATCH quantity on an item ID that does not exist returns 404"""
    mock_session = MagicMock()
    mock_session.query.return_value.filter.return_value.first.return_value = None

    def override_get_db():
        yield mock_session

    app.dependency_overrides[get_current_user] = mock_inventory_manager
    app.dependency_overrides[get_db] = override_get_db

    client = TestClient(app)
    response = client.patch("/items/999999/quantity", json={
        "quantity_change": -1
    })

    app.dependency_overrides.clear()

    assert response.status_code == 404


def test_patch_quantity_rejects_negative_available_quantity():
    """Quantity adjustment cannot make available quantity go below 0"""
    mock_session = MagicMock()
    mock_item = MagicMock()
    mock_item.total_quantity = 10
    mock_item.available_quantity = 2

    mock_session.query.return_value.filter.return_value.first.return_value = mock_item

    def override_get_db():
        yield mock_session

    app.dependency_overrides[get_current_user] = mock_inventory_manager
    app.dependency_overrides[get_db] = override_get_db

    client = TestClient(app)
    response = client.patch("/items/1/quantity", json={
        "quantity_change": -5
    })

    app.dependency_overrides.clear()

    assert response.status_code == 400
    assert response.json()["detail"] == "Available quantity cannot go below 0"


def test_patch_quantity_rejects_available_above_total_quantity():
    """Quantity adjustment cannot make available quantity greater than total quantity"""
    mock_session = MagicMock()
    mock_item = MagicMock()
    mock_item.total_quantity = 10
    mock_item.available_quantity = 8

    mock_session.query.return_value.filter.return_value.first.return_value = mock_item

    def override_get_db():
        yield mock_session

    app.dependency_overrides[get_current_user] = mock_inventory_manager
    app.dependency_overrides[get_db] = override_get_db

    client = TestClient(app)
    response = client.patch("/items/1/quantity", json={
        "quantity_change": 5
    })

    app.dependency_overrides.clear()

    assert response.status_code == 400
    assert response.json()["detail"] == "Available quantity cannot be greater than total quantity"


def test_patch_quantity_is_forbidden_for_crew_role():
    """Crew user cannot adjust item quantity"""
    app.dependency_overrides[get_current_user] = mock_crew

    client = TestClient(app)
    response = client.patch("/items/1/quantity", json={
        "quantity_change": -1
    })

    app.dependency_overrides.clear()

    assert response.status_code == 403


def test_patch_quantity_is_forbidden_for_admin_role():
    """Admin cannot adjust item quantity because this action is restricted to Inventory Manager"""
    app.dependency_overrides[get_current_user] = mock_admin

    client = TestClient(app)
    response = client.patch("/items/1/quantity", json={
        "quantity_change": -1
    })

    app.dependency_overrides.clear()

    assert response.status_code == 403 

def test_patch_quantity_missing_quantity_change_returns_422():
    """Missing quantity_change returns validation error"""
    app.dependency_overrides[get_current_user] = mock_inventory_manager

    client = TestClient(app)
    response = client.patch("/items/1/quantity", json={})

    app.dependency_overrides.clear()

    assert response.status_code == 422

def test_get_items_returns_associated_productions():
    """GET /items includes production assignment history for each item"""
    mock_session = MagicMock()

    mock_category = MagicMock()
    mock_category.id = 1
    mock_category.name = "Wood"
    mock_category.material_type = "Material"

    mock_location = MagicMock()
    mock_location.id = 1
    mock_location.name = "Storage Room"

    mock_production = MagicMock()
    mock_production.id = 1
    mock_production.name = "Macbeth"
    mock_production.status = "Active"

    mock_production_item = MagicMock()
    mock_production_item.production_id = 1
    mock_production_item.production = mock_production
    mock_production_item.quantity_assigned = 3
    mock_production_item.returned = False
    mock_production_item.returned_at = None

    mock_item = MagicMock()
    mock_item.id = 1
    mock_item.name = "Wood Plank"
    mock_item.description = "Basic plank"
    mock_item.total_quantity = 10
    mock_item.available_quantity = 7
    mock_item.category_id = 1
    mock_item.location_id = 1
    mock_item.condition = "Good"
    mock_item.height_cm = None
    mock_item.width_cm = None
    mock_item.depth_cm = None
    mock_item.colour = None
    mock_item.category = mock_category
    mock_item.location = mock_location
    mock_item.production_items = [mock_production_item]

    mock_session.query.return_value.options.return_value.offset.return_value.limit.return_value.all.return_value = [mock_item]

    def override_get_db():
        yield mock_session

    app.dependency_overrides[get_current_user] = mock_admin
    app.dependency_overrides[get_db] = override_get_db

    client = TestClient(app)
    response = client.get("/items/")

    app.dependency_overrides.clear()

    assert response.status_code == 200

    data = response.json()
    assert len(data) == 1
    assert data[0]["name"] == "Wood Plank"
    assert data[0]["category"]["name"] == "Wood"
    assert data[0]["location"]["name"] == "Storage Room"
    assert data[0]["productions"][0]["production_name"] == "Macbeth"
    assert data[0]["productions"][0]["quantity_assigned"] == 3
    assert data[0]["productions"][0]["returned"] is False

def test_add_item_photo_allowed_for_inventory_manager():
    """Inventory Manager can link an uploaded photo URL to an item"""
    mock_session = MagicMock()
    mock_item = MagicMock()
    mock_item.id = 1
    mock_item.image_url = None

    mock_session.query.return_value.filter.return_value.first.return_value = mock_item

    def refresh_side_effect(obj):
        obj.id = 1
        obj.item_id = 1
        obj.uploaded_by = 3
        obj.url = "https://example.com/item-photo.png"
        obj.uploaded_at = datetime.now(timezone.utc)

    mock_session.refresh.side_effect = refresh_side_effect

    def override_get_db():
        yield mock_session

    app.dependency_overrides[get_current_user] = mock_inventory_manager
    app.dependency_overrides[get_db] = override_get_db

    client = TestClient(app)
    response = client.post("/items/1/photos", json={
        "url": "https://example.com/item-photo.png"
    })

    app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json()["item_id"] == 1
    assert response.json()["uploaded_by"] == 3
    assert response.json()["url"] == "https://example.com/item-photo.png"
    assert mock_item.image_url == "https://example.com/item-photo.png"
    mock_session.add.assert_called_once()
    mock_session.commit.assert_called_once()


def test_add_item_photo_returns_404_for_nonexistent_item():
    """Adding a photo to an item ID that does not exist returns 404"""
    mock_session = MagicMock()
    mock_session.query.return_value.filter.return_value.first.return_value = None

    def override_get_db():
        yield mock_session

    app.dependency_overrides[get_current_user] = mock_inventory_manager
    app.dependency_overrides[get_db] = override_get_db

    client = TestClient(app)
    response = client.post("/items/999999/photos", json={
        "url": "https://example.com/item-photo.png"
    })

    app.dependency_overrides.clear()

    assert response.status_code == 404
    assert response.json()["detail"] == "Item not found"


def test_add_item_photo_is_forbidden_for_crew_role():
    """Crew user cannot link uploaded item photos"""
    app.dependency_overrides[get_current_user] = mock_crew

    client = TestClient(app)
    response = client.post("/items/1/photos", json={
        "url": "https://example.com/item-photo.png"
    })

    app.dependency_overrides.clear()

    assert response.status_code == 403


def test_add_item_photo_missing_url_returns_422():
    """Missing photo URL returns validation error"""
    app.dependency_overrides[get_current_user] = mock_inventory_manager

    client = TestClient(app)
    response = client.post("/items/1/photos", json={})

    app.dependency_overrides.clear()

    assert response.status_code == 422