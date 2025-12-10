from fastapi import FastAPI
from endpoints import health, events, search
from database import Base, engine
from models.event import Event



app = FastAPI(title="EventFinder API")

app.include_router(health.router, prefix="/api/v1", tags=["health"])
app.include_router(events.router, prefix="/api/v1", tags=["events"])
app.include_router(search.router, prefix="/api/v1", tags=["search"])

@app.get("/")
async def root():
    return {"message": "EventFinder API"}

Base.metadata.create_all(bind=engine)