from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base, SessionLocal


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        from app.seed import seed_demo_data
        seed_demo_data(db)
    yield


app = FastAPI(title="Telemedicine API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.routes_tenants import router as tenants_router
from app.routes_auth import router as auth_router
from app.routes_users import router as users_router
from app.routes_appointments import router as appointments_router
from app.routes_prescriptions import router as prescriptions_router
from app.routes_records import router as records_router
from app.routes_availability import router as availability_router

app.include_router(tenants_router)
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(appointments_router)
app.include_router(prescriptions_router)
app.include_router(records_router)
app.include_router(availability_router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "telemedicine"}
