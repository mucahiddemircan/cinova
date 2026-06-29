# Cinova - Backend API 🚀

This is the backend service for **Cinova**. It is built using **FastAPI**, **SQLModel**, and **Supabase (PostgreSQL)**.

The API handles authentication, movie metadata retrieval, user interaction tracking, personalized recommendations, and integrates an AI chatbot assistant.

---

## 🛠️ Tech Stack & Libraries

- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Asynchronous, High-Performance)
- **Database & ORM**: [Supabase](https://supabase.com/) & [SQLModel](https://sqlmodel.tiangolo.com/) (SQLAlchemy + Pydantic)
- **AI/LLM Support**: [LangChain](https://www.langchain.com/) & [Google Gemini 3.1 Flash Lite](https://ai.google.dev/)
- **Embeddings & Search**: [Sentence-Transformers](https://www.sbert.net/) (`all-MiniLM-L6-v2` model)
- **Package Manager**: [uv](https://github.com/astral-sh/uv) (Fast, modern alternative to pip/poetry)
- **Database Migrations**: [Alembic](https://alembic.sqlalchemy.org/)

---

## 📂 Backend Project Structure

```
backend/
├── migrations/          # Alembic database migration scripts
├── src/
│   └── app/
│       ├── api/          # FastAPI routers and endpoints
│       ├── core/         # Core config, constants, and security
│       ├── models/       # SQLModel database schemas
│       ├── services/     # Recommendation engine, chatbot service
│       ├── utils/        # Image processors, slug generators, helpers
│       ├── dependencies.py
│       └── main.py       # FastAPI application entry point
├── pyproject.toml
└── uv.lock
```

---

## ⚙️ Configuration

Before running the API, create a `.env` file in the root of the `backend/` directory:

```env
# Server Configuration
SECRET_KEY="generate-a-strong-random-key"

# Supabase Credentials
DATABASE_URL="postgresql+asyncpg://<user>:<password>@<host>:<port>/postgres"
SUPABASE_URL="https://<project-id>.supabase.co"
SUPABASE_ANON_KEY="eyJhbG..."
SUPABASE_JWT_SECRET="jwt-signing-secret"
SUPABASE_JWKS_URL="https://<project-id>.supabase.co/auth/v1/.well-known/jwks.json"
SUPABASE_SERVICE_ROLE_KEY="service-role-superkey"

# Third-Party APIs
TMDB_API_KEY="your-the-movie-database-key"
GOOGLE_API_KEY="your-google-gemini-api-key"
```

---

## 🏃 Running Locally

### 1. Install Dependencies
Make sure you have `uv` installed. Run the following command inside `backend/`:
```bash
uv sync
```

### 2. Apply Migrations
Set up your database tables by running:
```bash
uv run alembic upgrade head
```

### 3. Start the API Server
Launch the local development server with live reload:
```bash
uv run uvicorn src.app.main:app --reload --port 8000
```

Once started:
- **Interactive Documentation (Swagger)**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Alternative Documentation (ReDoc)**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## 🔒 Security & Performance
- All API diagnostics (like JWT exceptions) are logged to the standard terminal output (`logger.warning`). No local file writers are utilized.
- All secrets are loaded through `pydantic-settings` to avoid hardcoding credentials in git history.
