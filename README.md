# Stage Management System Team

An asset and inventory management system featuring role-based access control (RBAC) and (potentially) integrated smart assistant capabilities.

---

## Tech Stack

**Frontend**

- **React**
- **TailwindCSS**

**Backend & Database**

- **FastAPI** (Python Backend Framework)
- **PostgreSQL** (Relational Database)

---

## Backend Quick Start

Follow these steps to set up the backend environment and start the development server.

### Initial Setup

Open your terminal (PowerShell recommended for Windows) and run the following commands:

```powershell
cd backend

# Create a virtual environment named 'venv'
python -m venv venv

# Activate the virtual environment
.\venv\Scripts\activate

# Install all required dependencies
pip install -r requirements.txt
```

### Environment Setup

Create a file called `.env` inside the `backend/` folder with the following:

```
DATABASE_URL=supabase_session_pooler_url
```

Contact Aiden for the data password to put into the database url.

### Start the Server

Once your environment is activated and dependencies are installed, start the FastAPI server:

```powershell
uvicorn app.main:app --reload --port 8000
```

---

## Stopping & Resuming Work

### Stopping the Server

To pause or stop the backend server at any time:

1. Click into the terminal window running `uvicorn`.
2. Press `Ctrl + C` on your keyboard.

When you are completely done working for the day, you can deactivate your virtual environment by typing:

```powershell
deactivate
```

### Resuming Development (Next Session)

When you are ready to start coding again, open your terminal and run the following to get back up and running:

```powershell
# 1. Navigate to your project root directory (in my case it is the below)
cd "F:\UM Study Units\CPS2002\stage-management-system"

# 2. Switch to the backend folder
cd backend

# 3. Reactivate the existing virtual environment
.\venv\Scripts\activate

# 4. Start the server again
uvicorn app.main:app --reload --port 8000
```
