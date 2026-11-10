"""NIRF Analytics Dashboard — Application Configuration.

Loads environment variables, configures paths, and sets up CORS & API metadata.
"""

from pathlib import Path
from typing import List, Optional, Union
import json

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def find_project_root() -> Path:
    """Locate the repository project root directory reliably."""
    current = Path(__file__).resolve().parent
    for parent in [current] + list(current.parents):
        # Look for landmark directories/files that identify the NIRF_DASHBOARD root
        if (parent / "data" / "Processed" / "NIRF_Master_Dataset.csv").exists():
            return parent
        if (parent / "backend" / "app").exists():
            return parent
    # Default to 4 levels up from backend/app/core/config.py
    return Path(__file__).resolve().parent.parent.parent.parent


PROJECT_ROOT = find_project_root()
DEFAULT_DATASET_PATH = PROJECT_ROOT / "data" / "Processed" / "NIRF_Master_Dataset.csv"


class Settings(BaseSettings):
    """Application settings and runtime configuration."""

    model_config = SettingsConfigDict(
        env_file=[
            str(PROJECT_ROOT / ".env"),
            str(PROJECT_ROOT / "backend" / ".env"),
        ],
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application Information
    PROJECT_NAME: str = "NIRF Analytics Dashboard"
    DESCRIPTION: str = (
        "Official institutional ranking analytics and intelligence platform "
        "covering nine cycles (2017–2025) of NIRF rankings across 17 disciplines."
    )
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Server & API Configuration
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    API_PREFIX: str = "/api"

    # CORS Origins for Frontend Integration
    BACKEND_CORS_ORIGINS: List[str] = Field(
        default_factory=lambda: [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ]
    )

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            if v.startswith("[") and v.endswith("]"):
                try:
                    return json.loads(v)
                except Exception:
                    pass
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, (list, tuple)):
            return list(v)
        return [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ]

    # Dataset Location
    MASTER_DATASET_PATH: Optional[str] = None
    LOG_LEVEL: str = "INFO"

    # Multi-Layer External AI Engine Configuration
    # Layer 2: First External AI API
    FIRST_AI_API_KEY: Optional[str] = None
    FIRST_AI_PROVIDER: str = "gemini"  # openai, gemini, anthropic, openrouter, ollama, generic
    FIRST_AI_MODEL: str = "gemini-3.5-flash"
    FIRST_AI_BASE_URL: Optional[str] = None
    FIRST_AI_ENABLED: bool = True

    # Layer 3: Second External AI API (Newly Integrated Supplementary Intelligence Engine)
    SECOND_AI_API_KEY: Optional[str] = None
    SECOND_AI_PROVIDER: str = "gemini"
    SECOND_AI_MODEL: str = "gemini-3.5-flash"
    SECOND_AI_BASE_URL: Optional[str] = None
    SECOND_AI_ENABLED: bool = True

    # Multi-API Orchestration Parameters
    MULTI_AI_FAILOVER_ENABLED: bool = True
    LLM_TEMPERATURE: float = 0.1
    LLM_TIMEOUT: float = 20.0
    LLM_MAX_RETRIES: int = 2
    LLM_MAX_TOKENS: int = 3500
    LLM_CONFIDENCE_THRESHOLD: float = 0.85

    # Backward Compatibility Aliases (maps to First AI API if set)
    LLM_PROVIDER: str = "gemini"
    LLM_API_KEY: Optional[str] = None
    LLM_MODEL: str = "gemini-3.5-flash"
    LLM_BASE_URL: Optional[str] = None
    LLM_ENABLED: bool = True

    @property
    def dataset_file_path(self) -> Path:
        """Resolve the active path to NIRF_Master_Dataset.csv."""
        if self.MASTER_DATASET_PATH:
            p = Path(self.MASTER_DATASET_PATH)
            if p.exists():
                return p
        return DEFAULT_DATASET_PATH


settings = Settings()

