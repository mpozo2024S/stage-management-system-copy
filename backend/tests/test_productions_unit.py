from unittest.mock import MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app.dependencies.auth import get_current_user
from app.database import get_db
from app.models.models import UserRole, ProductionStatus


def mock_admin():
    user = MagicMock()
    user.id = 1
    user.role = UserRole.ADMIN
    user.email = "admin@test.com"
    return user


def mock_crew():
    user = MagicMock()
    user.id = 2
    user.role = UserRole.CREW
    user.email = "crew@test.com"
    return user


def mock_inventory_manager():
    user = MagicMock()
    user.id = 3
    user.role = UserRole.INVENTORY_MANAGER
    user.email = "manager@test.com"
    return user


def test_get_productions_returns_list_for_authenticated_user():
    """Any authenticated user can retrieve the full productions list"""
    mock_session = MagicMock()
    mock_session.query.return_value.all.return_value = []

    def override_get_db():
        yield mock_session

    app.dependency_overrides[get_current_user] = mock_admin
    app.dependency_overrides[get_db] = override_get_db

    client = TestClient(app)
    response = client.get("/productions/")

    app.dependency_overrides.clear()
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_get_production_by_id_returns_404_when_not_found():
    """Requesting a non-existent production ID returns 404"""
    mock_session = MagicMock()
    mock_session.query.return_value.filter.return_value.first.return_value = None

    def override_get_db():
        yield mock_session

    app.dependency_overrides[get_current_user] = mock_admin
    app.dependency_overrides[get_db] = override_get_db

    client = TestClient(app)
    response = client.get("/productions/999")

    app.dependency_overrides.clear()
    assert response.status_code == 404


def test_create_production_is_forbidden_for_crew_role():
    """A Crew user cannot create productions"""
    app.dependency_overrides[get_current_user] = mock_crew

    client = TestClient(app)
    response = client.post("/productions/", json={"name": "Hamlet"})

    app.dependency_overrides.clear()
    assert response.status_code == 403


def test_assign_item_is_forbidden_for_crew_role():
    """A Crew user cannot assign items to a production"""
    app.dependency_overrides[get_current_user] = mock_crew

    client = TestClient(app)
    response = client.post("/productions/1/assign", json={"item_id": 1, "quantity_assigned": 3})

    app.dependency_overrides.clear()
    assert response.status_code == 403


def test_assign_item_to_ended_production_returns_400():
    """Assigning an item to an ended production returns 400"""
    mock_session = MagicMock()
    mock_production = MagicMock()
    mock_production.status = ProductionStatus.ENDED
    mock_session.query.return_value.filter.return_value.first.return_value = mock_production

    def override_get_db():
        yield mock_session

    app.dependency_overrides[get_current_user] = mock_admin
    app.dependency_overrides[get_db] = override_get_db

    client = TestClient(app)
    response = client.post("/productions/1/assign", json={"item_id": 1, "quantity_assigned": 3})

    app.dependency_overrides.clear()
    assert response.status_code == 400
    assert response.json()["detail"] == "Cannot assign items to an ended production"


def test_assign_item_returns_404_when_item_does_not_exist():
    """Assigning a non-existent item to a production returns 404"""
    mock_session = MagicMock()
    mock_production = MagicMock()
    mock_production.status = ProductionStatus.ACTIVE
    mock_session.query.return_value.filter.return_value.first.side_effect = [mock_production, None]

    def override_get_db():
        yield mock_session

    app.dependency_overrides[get_current_user] = mock_admin
    app.dependency_overrides[get_db] = override_get_db

    client = TestClient(app)
    response = client.post("/productions/1/assign", json={"item_id": 999, "quantity_assigned": 3})

    app.dependency_overrides.clear()
    assert response.status_code == 404


def test_assign_item_returns_400_when_insufficient_quantity():
    """Assigning more than the available quantity of an item returns 400"""
    mock_session = MagicMock()
    mock_production = MagicMock()
    mock_production.status = ProductionStatus.ACTIVE
    mock_item = MagicMock()
    mock_item.available_quantity = 2
    mock_session.query.return_value.filter.return_value.first.side_effect = [mock_production, mock_item]

    def override_get_db():
        yield mock_session

    app.dependency_overrides[get_current_user] = mock_admin
    app.dependency_overrides[get_db] = override_get_db

    client = TestClient(app)
    response = client.post("/productions/1/assign", json={"item_id": 1, "quantity_assigned": 10})

    app.dependency_overrides.clear()
    assert response.status_code == 400
    assert response.json()["detail"] == "Not enough available quantity"


def test_return_all_returns_404_when_production_not_found():
    """Bulk return on a non-existent production returns 404"""
    mock_session = MagicMock()
    mock_session.query.return_value.filter.return_value.first.return_value = None

    def override_get_db():
        yield mock_session

    app.dependency_overrides[get_current_user] = mock_admin
    app.dependency_overrides[get_db] = override_get_db

    client = TestClient(app)
    response = client.post("/productions/999/return-all")

    app.dependency_overrides.clear()
    assert response.status_code == 404


def test_return_all_is_forbidden_for_crew_role():
    """A Crew user cannot bulk return items from a production"""
    app.dependency_overrides[get_current_user] = mock_crew

    client = TestClient(app)
    response = client.post("/productions/1/return-all")

    app.dependency_overrides.clear()
    assert response.status_code == 403


def test_return_single_item_returns_400_when_already_returned():
    """Returning an item that has already been returned returns 400"""
    mock_session = MagicMock()
    mock_pi = MagicMock()
    mock_pi.returned = True
    mock_session.query.return_value.filter.return_value.filter.return_value.first.return_value = mock_pi

    def override_get_db():
        yield mock_session

    app.dependency_overrides[get_current_user] = mock_admin
    app.dependency_overrides[get_db] = override_get_db

    client = TestClient(app)
    response = client.post("/productions/1/return/1")

    app.dependency_overrides.clear()
    assert response.status_code == 400
    assert response.json()["detail"] == "Item already returned"


def test_return_single_item_returns_404_when_not_found():
    """Returning a production item ID that does not exist returns 404"""
    mock_session = MagicMock()
    mock_session.query.return_value.filter.return_value.first.return_value = None 

    def override_get_db():
        yield mock_session

    app.dependency_overrides[get_current_user] = mock_admin
    app.dependency_overrides[get_db] = override_get_db

    client = TestClient(app)
    response = client.post("/productions/999/return/999")

    app.dependency_overrides.clear()
    assert response.status_code == 404


def test_return_single_item_is_forbidden_for_crew_role():
    """A Crew user cannot return individual items from a production"""
    app.dependency_overrides[get_current_user] = mock_crew

    client = TestClient(app)
    response = client.post("/productions/1/return/1")

    app.dependency_overrides.clear()
    assert response.status_code == 403

def test_assign_item_returns_422_when_quantity_is_zero_or_negative():
    """Assigning an item with quantity_assigned <= 0 is rejected at schema level with 422"""
    app.dependency_overrides[get_current_user] = mock_admin

    client = TestClient(app)
    response_zero = client.post("/productions/1/assign", json={"item_id": 1, "quantity_assigned": 0})
    response_negative = client.post("/productions/1/assign", json={"item_id": 1, "quantity_assigned": -1})

    app.dependency_overrides.clear()
    assert response_zero.status_code == 422
    assert response_negative.status_code == 422