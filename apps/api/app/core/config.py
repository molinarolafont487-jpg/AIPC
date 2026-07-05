from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "development"
    app_base_url: str = "http://localhost:3000"
    api_base_url: str = "http://localhost:8000"
    database_url: str = "postgresql+psycopg://phantom:phantom@localhost:5432/phantom"
    redis_url: str = "redis://localhost:6379/0"
    jwt_secret: str = "replace-in-local-dev"
    model_provider: str = "openai-compatible"
    model_base_url: str = "http://localhost:11434/v1"
    model_api_key: str = "local-dev"
    model_chat_model: str = "qwen2.5:14b"
    local_llm_model: str = "qwen2.5:14b"
    embedding_model: str = "text-embedding-3-small"
    embedding_dimension: int = 1536
    feishu_app_id: str = ""
    feishu_app_secret: str = ""
    feishu_verification_token: str = ""
    feishu_encrypt_key: str = ""
    feishu_webhook_url: str = ""

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )


settings = Settings()
