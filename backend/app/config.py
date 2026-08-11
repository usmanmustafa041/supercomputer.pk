"""Settings, read from the environment.

Everything with a sensible local default so `docker compose up` works with no
setup, but nothing secret is hard-coded — SECRET_KEY must be set in anything
resembling production and the app refuses to start with the default there.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # --- database -------------------------------------------------------
    postgres_user: str = "supercomputers"
    postgres_password: str = "supercomputers"
    postgres_db: str = "supercomputers"
    postgres_host: str = "db"
    postgres_port: int = 5432

    # --- auth -----------------------------------------------------------
    secret_key: str = "dev-only-change-me"
    access_token_minutes: int = 60 * 12
    algorithm: str = "HS256"

    # --- first admin, created on first boot so the portal is reachable ---
    admin_email: str = "admin@supercomputers.pk"
    admin_password: str = "changeme"

    environment: str = "development"
    cors_origins: str = "http://localhost:3000"

    @property
    def database_url(self) -> str:
        return (
            f"postgresql+psycopg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @property
    def cors_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.environment.lower() in {"production", "prod"}

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    s = Settings()
    if s.is_production and s.secret_key == "dev-only-change-me":
        raise RuntimeError(
            "SECRET_KEY is still the development default. Set a real one before "
            "running in production — every issued token would otherwise be forgeable."
        )
    return s
