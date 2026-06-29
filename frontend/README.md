# Cinova - Modern Next.js Frontend 💻

This is the Next.js frontend for **Cinova**. It implements a fully localized web interface for browsing movies, managing lists, checking recommendations, and interacting with the support chatbot.

---

## 🛠️ Tech Stack & Features

- **Framework**: [Next.js](https://nextjs.org/) (App Router, Server Actions)
- **Styling**: Tailwind CSS & Vanilla CSS
- **State & Query**: Supabase SSR Client
- **Internationalization (i18n)**: English & Turkish localized translations
- **Components**: Reusable, modular UI components with state management

---

## ⚙️ Configuration

Create a `.env.local` file in the root of the `frontend/` directory:

```env
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
NEXT_PUBLIC_API_URL="http://localhost:8000/api/v1"
```

---

## 🏃 Running Locally

### 1. Install Dependencies
Run this command in the `frontend/` directory:
```bash
npm install
```

### 2. Start the Development Server
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

---

## 🏗️ Production Build

To build the project for production:
```bash
npm run build
npm run start
```
