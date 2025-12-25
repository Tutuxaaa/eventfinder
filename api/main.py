from fastapi import FastAPI
from endpoints import health, events, search, photo_search
from database import Base, engine
from models.event import Event
from fastapi.middleware.cors import CORSMiddleware
from endpoints import photo_debug
from endpoints import scrape
from endpoints import photo_lookup
from endpoints import auth
from auth import hash_password


app = FastAPI(title="EventFinder API")

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

app.include_router(health.router, prefix="/api/v1", tags=["health"])
app.include_router(events.router, prefix="/api/v1", tags=["events"])
app.include_router(search.router, prefix="/api/v1", tags=["search"])
app.include_router(photo_search.router, prefix="/api/v1", tags=["photo_search"])
app.include_router(photo_debug.router, prefix="/api/v1")
app.include_router(scrape.router, prefix="/api/v1", tags=["scrape"])
app.include_router(photo_lookup.router, prefix="/api/v1", tags=["photo_lookup"])
app.include_router(auth.router, prefix="/api/v1", tags=["auth"])

def create_test_user():
    # Хешируем пароль
    hashed_password = hash_password("test123")  # или любой другой пароль
    
    # Сохраняем пользователя в БД
    # Предположим, у вас есть модель User
    from models.user import User, SessionLocal
    
    db = SessionLocal()
    user = db.query(User).filter(User.username == "mcg").first()
    
    if not user:
        user = User(
            username="mcg",
            email="test@example.com",
            hashed_password=hashed_password
        )
        db.add(user)
        db.commit()
        print(f"Created user: mcg / test123")

@app.get("/")
async def root():
    return {"message": "EventFinder API"}

Base.metadata.create_all(bind=engine)