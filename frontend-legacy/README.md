# Cinova - Legacy React + Vite Frontend 🏛️

This directory contains the legacy frontend client for **Cinova**, built with **React**, **Vite**, and **Tailwind CSS**.

It is preserved here for reference during migrations, debugging, and checking past UI components.

---

## 🏃 Running Locally

### 1. Install Dependencies
Run this command in the `frontend-legacy/` directory:
```bash
npm install
```

### 2. Configure Environment
Create a `.env` file in the root of the `frontend-legacy/` directory:
```env
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-key"
VITE_API_URL="http://localhost:8000/api/v1"
```

### 3. Run Development Server
```bash
npm run dev
```

Open the URL shown in your terminal (typically `http://localhost:5173`) to view the legacy client.
