from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db
from app.routers import auth, items, user, productions, transactions
from app.models import models

app = FastAPI(
    title="Stage Management System API",
    description="CPS2002 Team 3 Backend",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(items.router)
app.include_router(user.router)
app.include_router(productions.router)
app.include_router(transactions.router)

@app.get("/")
async def root():
    return {
        "message": "Stage Management System Backend",
        "team": "Team 3 - CPS2002",
        "docs": "/docs",
        "redoc": "/redoc"
    }

@app.get("/health")
async def health(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected to Supabase"}
    except Exception as e:
        return {"status": "unhealthy", "database": f"failed to connect: {str(e)}"}
