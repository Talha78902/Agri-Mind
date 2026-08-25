# AgriMind - React + Backend + Groq

This version has a working Node/Express backend for local development and Vercel API routes for deployment.

## What is included

- React + Vite frontend
- Login / Sign Up screen
- Backend auth endpoints
- Groq API proxy backend route
- Groq key kept in backend `.env`, not exposed in browser
- Vercel-ready `/api` serverless functions

## Local setup

1. Install packages:

```bash
npm install
```

2. Create `.env` in the main folder and add:

```env
GROQ_API_KEY=your_groq_api_key_here
JWT_SECRET=change_this_to_any_long_random_text
PORT=5000
```

3. Run frontend + backend together:

```bash
npm run dev
```

Open:

```text
http://localhost:5173
```

Backend health check:

```text
http://localhost:5000/api/health
```

## Vercel setup

Add Environment Variables in Vercel:

```env
GROQ_API_KEY=your_groq_api_key_here
JWT_SECRET=change_this_to_any_long_random_text
```

Vercel settings:

```text
Install Command: npm install
Build Command: npm run build
Output Directory: dist
```

Then redeploy.

## Git push

```bash
git init
git branch -M main
git remote add origin https://github.com/Talha78902/Agri-Mind.git
git add .
git commit -m "AgriMind with running backend"
git push -u origin main --force
```

## Note

Local backend stores users in `server/data/users.json`. On Vercel, demo signup/login works using serverless memory and browser session. For permanent public accounts, connect a real database later such as Supabase, Firebase, MongoDB, or PostgreSQL.
