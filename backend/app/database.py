import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./judgechain.db")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    from app.models import db_models  # noqa: F401 — ensures models are registered
    Base.metadata.create_all(engine)
    # Idempotent migration for columns added after initial schema
    from sqlalchemy import text, inspect
    with engine.connect() as conn:
        existing = [c["name"] for c in inspect(engine).get_columns("submissions")]
        if "judge_submitted" not in existing:
            conn.execute(text("ALTER TABLE submissions ADD COLUMN judge_submitted BOOLEAN DEFAULT 0"))
            conn.commit()
