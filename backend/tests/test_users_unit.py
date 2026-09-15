from unittest.mock import MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app.dependencies.auth import get_current_user
from app.database import get_db
from app.models.models import UserRole


def mock_admin():
    user = MagicMock()
    user.id = 1
    user.name = "Admin User"
    user.email = "admin@test.com"
    user.role = UserRole.ADMIN
    user.created_at = None
    return user


def mock_crew():
    user = MagicMock()
    user.id = 2
    user.name = "Crew User"
    user.email = "crew@test.com"
    user.role = UserRole.CREW
    user.created_at = None
    return user


def test_get_me_returns_current_user():
    """GET /users/me returns the currently authenticated user"""
    app.dependency_overrides[get_current_user] = mock_admin

    client = TestClient(app)
    response = client.get("/users/me")

    app.dependency_overrides.clear()
    assert response.status_code == 200
    assert response.json()["email"] == "admin@test.com"
    assert response.json()["role"] == "Admin"


def test_get_users_blocked_for_non_admin():
    """GET /users/ is blocked for non-Admin roles"""
    app.dependency_overrides[get_current_user] = mock_crew

    client = TestClient(app)
    response = client.get("/users/")

    app.dependency_overrides.clear()
    assert response.status_code == 403


def test_get_users_allowed_for_admin():
    """GET /users/ returns list of all users for Admin"""
    mock_session = MagicMock()
    mock_session.query.return_value.all.return_value = []

    def override_get_db():
        yield mock_session

    app.dependency_overrides[get_current_user] = mock_admin
    app.dependency_overrides[get_db] = override_get_db

    client = TestClient(app)
    response = client.get("/users/")

    app.dependency_overrides.clear()
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_update_user_role_returns_404_for_nonexistent_user():
    """PUT /users/{id}/role returns 404 if user does not exist"""
    mock_session = MagicMock()
    mock_session.query.return_value.filter.return_value.first.return_value = None

    def override_get_db():
        yield mock_session

    app.dependency_overrides[get_current_user] = mock_admin
    app.dependency_overrides[get_db] = override_get_db

    client = TestClient(app)
    response = client.put("/users/999999/role", json={"role": "Crew"})

    app.dependency_overrides.clear()
    assert response.status_code == 404


def test_update_user_role_blocked_for_non_admin():
    """PUT /users/{id}/role is blocked for non-Admin roles"""
    app.dependency_overrides[get_current_user] = mock_crew

    client = TestClient(app)
    response = client.put("/users/1/role", json={"role": "Crew"})

    app.dependency_overrides.clear()
    assert response.status_code == 403


def test_delete_user_returns_404_for_nonexistent_user():
    """DELETE /users/{id} returns 404 if user does not exist"""
    mock_session = MagicMock()
    mock_session.query.return_value.filter.return_value.first.return_value = None

    def override_get_db():
        yield mock_session

    app.dependency_overrides[get_current_user] = mock_admin
    app.dependency_overrides[get_db] = override_get_db

    client = TestClient(app)
    response = client.delete("/users/999999")

    app.dependency_overrides.clear()
    assert response.status_code == 404


def test_delete_user_blocked_for_non_admin():
    """DELETE /users/{id} is blocked for non-Admin roles"""
    app.dependency_overrides[get_current_user] = mock_crew

    client = TestClient(app)
    response = client.delete("/users/1")

    app.dependency_overrides.clear()
    assert response.status_code == 403

def test_update_user_role_succeeds_for_admin():
    """Admin can successfully update a user's role"""
    mock_session = MagicMock()
    mock_user = MagicMock()
    mock_user.id = 2
    mock_user.name = "Some User"
    mock_user.email = "user@test.com"
    mock_user.role = UserRole.CREW
    mock_user.created_at = None
    mock_session.query.return_value.filter.return_value.first.return_value = mock_user

    def override_get_db():
        yield mock_session

    app.dependency_overrides[get_current_user] = mock_admin
    app.dependency_overrides[get_db] = override_get_db

    client = TestClient(app)
    response = client.put("/users/2/role", json={"role": "InventoryManager"})

    app.dependency_overrides.clear()
    assert response.status_code == 200


def test_delete_user_succeeds_for_admin():
    """Admin can successfully delete an existing user"""
    mock_session = MagicMock()
    mock_user = MagicMock()
    mock_session.query.return_value.filter.return_value.first.return_value = mock_user

    def override_get_db():
        yield mock_session

    app.dependency_overrides[get_current_user] = mock_admin
    app.dependency_overrides[get_db] = override_get_db

    client = TestClient(app)
    response = client.delete("/users/2")

    app.dependency_overrides.clear()
    assert response.status_code == 200    