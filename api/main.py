from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import Base, engine
from endpoints import health, search
from endpoints import auth as auth_endpoints
from endpoints import events, external, photo_debug, photo_lookup, photo_search, public, scrape, seo, users
from models.event import Event  # noqa: F401
from models.event_file import EventFile  # noqa: F401
from models.refresh_token import RefreshToken  # noqa: F401
from models.user import User  # noqa: F401
from settings import get_settings

settings = get_settings()

app = FastAPI(title=settings.app_name, version=settings.app_version)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(seo.router, tags=["seo"])
app.include_router(health.router, prefix="/api/v1", tags=["health"])
app.include_router(events.router, prefix="/api/v1", tags=["events"])
app.include_router(users.router, prefix="/api/v1", tags=["rbac"])
app.include_router(search.router, prefix="/api/v1", tags=["search"])
app.include_router(photo_search.router, prefix="/api/v1", tags=["photo_search"])
app.include_router(photo_debug.router, prefix="/api/v1", tags=["photo_debug"])
app.include_router(scrape.router, prefix="/api/v1", tags=["scrape"])
app.include_router(photo_lookup.router, prefix="/api/v1", tags=["photo_lookup"])
app.include_router(public.router, prefix="/api/v1", tags=["public"])
app.include_router(external.router, prefix="/api/v1", tags=["external"])
app.include_router(auth_endpoints.router, prefix="/api/v1", tags=["auth"])


@app.get("/")
async def root():
    return {"message": settings.app_name, "version": settings.app_version}


@app.get("/api/v1")
async def api_root():
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "labs_ready": [1, 2, 3, 4, 5, 6],
        "features": [
            "rbac",
            "access-refresh tokens",
            "server-side filtering",
            "event file attachments",
            "public seo catalog",
            "external api integration",
            "automated tests",
            "containerized deployment",
        ],
    }


Base.metadata.create_all(bind=engine)
