from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from app.main import app
from app.database import get_db
from app.models.models import UserRole


def test_login_returns_token_for_valid_credentials():
    """Valid credentials return a JWT access token"""
    mock_session = MagicMock()
    mock_user = MagicMock()
    mock_user.email = "admin@test.com"
    mock_user.password_hash = "$2b$12$placeholder"
    mock_user.role = UserRole.ADMIN
    mock_session.query.return_value.filter.return_value.first.return_value = mock_user

    def override_get_db():
        yield mock_session

    app.dependency_overrides[get_db] = override_get_db

    with patch("app.dependencies.auth.verify_password", return_value=True):
        with patch("app.dependencies.auth.create_access_token", return_value="fake.jwt.token"):
            client = TestClient(app)
            response = client.post("/auth/login", data={
                "username": "admin@test.com",
                "password": "password123"
            })

    app.dependency_overrides.clear()
    assert response.status_code == 200
    assert response.json()["access_token"] == "fake.jwt.token"
    assert response.json()["token_type"] == "bearer"


def test_login_returns_401_for_wrong_password():
    """Wrong password returns 401 without hitting a real database"""
    mock_session = MagicMock()
    mock_user = MagicMock()
    mock_user.password_hash = "$2b$12$placeholder"
    mock_session.query.return_value.filter.return_value.first.return_value = mock_user

    def override_get_db():
        yield mock_session

    app.dependency_overrides[get_db] = override_get_db

    with patch("app.dependencies.auth.verify_password", return_value=False):
        client = TestClient(app)
        response = client.post("/auth/login", data={
            "username": "admin@test.com",
            "password": "wrongpassword"
        })

    app.dependency_overrides.clear()
    assert response.status_code == 401


def test_login_returns_401_for_nonexistent_user():
    """Login attempt for an email that doesn't exist returns 401"""
    mock_session = MagicMock()
    mock_session.query.return_value.filter.return_value.first.return_value = None

    def override_get_db():
        yield mock_session

    app.dependency_overrides[get_db] = override_get_db

    client = TestClient(app)
    response = client.post("/auth/login", data={
        "username": "nobody@test.com",
        "password": "password123"
    })

    app.dependency_overrides.clear()
    assert response.status_code == 401


def test_register_returns_400_for_duplicate_email():
    """Registering with an already-existing email returns 400"""
    mock_session = MagicMock()
    existing_user = MagicMock()
    mock_session.query.return_value.filter.return_value.first.return_value = existing_user

    def override_get_db():
        yield mock_session

    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)
    response = client.post("/auth/register", json={
        "name": "Duplicate",
        "email": "existing@test.com",
        "password": "password123",
        "role": "Crew"
    })

    app.dependency_overrides.clear()
    assert response.status_code == 400

def test_register_with_missing_email_returns_422():
    """Registration with missing required field returns 422 validation error"""
    client = TestClient(app)
    response = client.post("/auth/register", json={
        "name": "No Email User",
        "password": "password123",
        "role": "Crew"
    })
    assert response.status_code == 422


def test_register_with_missing_password_returns_422():
    """Registration with missing password returns 422 validation error"""
    client = TestClient(app)
    response = client.post("/auth/register", json={
        "name": "No Password User",
        "email": "nopassword@test.com",
        "role": "Crew"
    })
    assert response.status_code == 422

def test_get_items_with_invalid_token_returns_401():
    """Tampered or expired JWT token returns 401"""
    client = TestClient(app)
    response = client.get("/items/", headers={"Authorization": "Bearer invalidtoken"})
    assert response.status_code == 401    