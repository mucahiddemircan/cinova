# Cinova 🎬

Welcome to **Cinova** (formerly _watchlist-project_), a modern, comprehensive movie and TV show tracking platform. Cinova is designed for cinephiles who want to discover content, manage custom watchlists, interact with an AI chatbot, and build a social network of followings.

The platform is powered by an asynchronous **FastAPI** backend, a state-of-the-art **Next.js** frontend, and integrates with **Supabase** for database management and user authentication.

---

## 🏗️ Repository Architecture

This repository is structured as a multi-component workspace:

```
├── backend/            # FastAPI + SQLModel + Supabase backend api
├── frontend/           # Modern Next.js + React + Tailwind CSS client
└── frontend-legacy/    # Legacy Vite + React codebase (preserved for reference/migration)
```

- **[Backend (FastAPI)](./backend)**: Asynchronous REST API serving as the backend core. It handles data sync with Supabase, authentication checks, movie discovery integration via TMDB, and AI processing.
- **[Frontend (Next.js)](./frontend)**: Next-generation React framework implementing localized UI, modern styling, dynamic loaders, and optimal server-side routing.
- **[Frontend Legacy (Vite + React)](./frontend-legacy)**: The original Vite-based React interface. Preserved to verify migration stability and reference past UI layouts.

---

## ✨ Features

- **Personalized Watchlists**: Mark items as "Watchlist" or "Watched", like/dislike, or add them to customizable theme lists.
- **AI Recommendation Engine**: Utilizes sentence embeddings (`all-MiniLM-L6-v2`) to perform semantic re-ranking on candidate titles matching your tastes.
- **AI Support Chatbot**: Integrated support chatbot leveraging LangChain and Google Gemini to answer platform questions in real-time.
- **Social & Follows**: Follow other users, direct message/interact, and stay updated with activities.
- **Multi-language Support**: Fully localized in English and Turkish out-of-the-box.

---

## 🚀 Quick Start

### 1. Prerequisites

- [Python 3.13+](https://www.python.org/)
- [Node.js 18+](https://nodejs.org/)
- [uv](https://github.com/astral-sh/uv) (Fast Python Package Installer)

---

### 2. Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   uv sync
   ```
3. Copy `.env.example` (or create a `.env` file) and fill in your keys:
   ```env
   SECRET_KEY="your-secret-key"
   DATABASE_URL="postgresql+asyncpg://..."
   SUPABASE_URL="https://..."
   SUPABASE_ANON_KEY="..."
   SUPABASE_JWT_SECRET="..."
   SUPABASE_SERVICE_ROLE_KEY="..."
   TMDB_API_KEY="your-tmdb-key"
   GOOGLE_API_KEY="your-gemini-key"
   ```
4. Run migrations:
   ```bash
   uv run alembic upgrade head
   ```
5. Run the dev server:
   ```bash
   uv run uvicorn src.app.main:app --reload --port 8000
   ```
   _Swagger API docs will be available at `http://localhost:8000/docs`._

---

### 3. Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure your local environment in `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL="https://..."
   NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
   NEXT_PUBLIC_API_URL="http://localhost:8000/api/v1"
   ```
4. Run the Next.js development server:
   ```bash
   npm run dev
   ```
   _The application will launch at `http://localhost:3000`._

---

### 4. Legacy Frontend (Optional)

If you need to verify or reference the previous interface:

```bash
cd ../frontend-legacy
npm install
npm run dev
```
