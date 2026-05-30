# JME — Production Deployment Guide

This guide deploys:
- **Backend** (FastAPI) → Render Web Service
- **Frontend** (React + Vite) → Render Static Site  
- **Database** (PostgreSQL) → Already live on Render

> Your DB is already running at `dpg-d8br6f8g4nts73fv3970-a` on Render. No action needed for the DB.

---

## Prerequisites

- GitHub repo: `https://github.com/vilaparthibhaskar/JME.git`
- Render account: `https://render.com`
- All latest changes pushed to `main` branch ✅

---

## Step 1 — Deploy the Backend (FastAPI)

### 1.1 Create a Web Service on Render

1. Go to [render.com/dashboard](https://dashboard.render.com) → **New** → **Web Service**
2. Connect your GitHub repo → select `vilaparthibhaskar/JME`
3. Fill in the settings:

| Field | Value |
|---|---|
| **Name** | `jme-backend` |
| **Root Directory** | `backend` |
| **Runtime** | `Python 3` |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `uvicorn main:app --host 0.0.0.0 --port $PORT` |
| **Instance Type** | Free (or Starter for always-on) |

### 1.2 Set Environment Variables

In the Render Web Service → **Environment** tab, add these:

| Key | Value |
|---|---|
| `DATABASE_URL` | `postgresql://jmedb_user:jggmuZbh4XoLtjL8omcYQOSmNh98P8Ib@dpg-d8br6f8g4nts73fv3970-a.virginia-postgres.render.com/jmedb` |
| `SECRET_KEY` | Generate a strong random string (see tip below) |
| `ADMIN_SECRET_KEY` | `Bhaskar@Secret` (or change it) |
| `ALLOWED_ORIGINS` | Leave **blank for now** — fill in after Step 2 gives you the frontend URL |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `480` |

> **Tip — generate a SECRET_KEY:**  
> Run this in any Python terminal:  
> ```python
> import secrets; print(secrets.token_hex(32))
> ```
> Copy the output as your `SECRET_KEY`.

### 1.3 Deploy

Click **Create Web Service**. Render will install dependencies and start the server.

Wait for the deployment to show **Live**. Your backend URL will be:
```
https://jme-backend.onrender.com
```
(exact name depends on what you named it in step 1.1)

### 1.4 Verify backend is running

Open in browser:
```
https://jme-backend.onrender.com/api/health
```
Expected response:
```json
{"status": "healthy", "database": "connected"}
```

---

## Step 2 — Deploy the Frontend (React + Vite)

### 2.1 Create a Static Site on Render

1. Go to Render dashboard → **New** → **Static Site**
2. Connect the same GitHub repo
3. Fill in the settings:

| Field | Value |
|---|---|
| **Name** | `jme-frontend` |
| **Root Directory** | `frontend` |
| **Build Command** | `npm install && npm run build` |
| **Publish Directory** | `frontend/dist` |

### 2.2 Set Environment Variables (Build-time)

In the Static Site → **Environment** tab:

| Key | Value |
|---|---|
| `VITE_API_URL` | `https://jme-backend.onrender.com` (your backend URL from Step 1) |

> ⚠️ This must be set **before** the first build. Vite bakes the URL into the JS bundle at build time.

### 2.3 Deploy

Click **Create Static Site**. Render builds with `npm run build` and serves the `dist/` folder.

Your frontend URL will be:
```
https://jme-frontend.onrender.com
```

### 2.4 Verify

Open `https://jme-frontend.onrender.com` — the home page should load.

---

## Step 3 — Wire Backend CORS to Frontend URL

Now that you have both URLs, go back to the **backend** Web Service:

1. Render dashboard → `jme-backend` → **Environment**
2. Set `ALLOWED_ORIGINS` to your frontend URL:
   ```
   https://jme-frontend.onrender.com
   ```
3. Click **Save Changes** — Render will auto-redeploy the backend.

---

## Step 4 — End-to-End Smoke Test

Run through this checklist in order:

- [ ] Open `https://jme-frontend.onrender.com`
- [ ] Click **Sign Up** — create a test account
- [ ] Log in with that account
- [ ] Go to **Versions** → create a version with name, email, skills
- [ ] Go to **Resume** → select a version → click **Download Resume**
- [ ] Verify the `.docx` file downloads and opens correctly
- [ ] Go to **Settings** → update Full Name and Resume File Name → Save
- [ ] Log out → log back in → verify data persists

---

## Step 5 — Custom Domain (Optional)

If you have a domain (e.g., `jme.yourdomain.com`):

**Frontend:**
1. Render → Static Site → **Custom Domains** → Add `jme.yourdomain.com`
2. Add a CNAME record in your DNS pointing to the Render static site URL

**Backend:**
1. Render → Web Service → **Custom Domains** → Add `api.yourdomain.com`
2. Update `ALLOWED_ORIGINS` on the backend to `https://jme.yourdomain.com`
3. Update `VITE_API_URL` on the frontend to `https://api.yourdomain.com` and **trigger a redeploy**

---

## Environment Variables Reference

### Backend (Render Web Service)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ Yes | PostgreSQL connection string |
| `SECRET_KEY` | ✅ Yes | JWT signing secret — long random string |
| `ADMIN_SECRET_KEY` | ✅ Yes | Key needed to register admin accounts |
| `ALLOWED_ORIGINS` | ✅ Yes | Comma-separated frontend URLs for CORS |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | JWT lifetime in minutes (default: 480) |

### Frontend (Render Static Site)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | ✅ Yes | Full URL of the deployed backend |

---

## Redeployment (After Code Changes)

Every `git push origin main` will **automatically trigger redeployments** on both services if you enabled **Auto-Deploy** in Render (it's on by default).

Manual redeploy: Render dashboard → service → **Manual Deploy** → **Deploy latest commit**

---

## Troubleshooting

### Frontend shows blank page or 404 on refresh
Render Static Sites don't handle client-side routing by default. Add a rewrite rule:  
Render → Static Site → **Redirects/Rewrites** → Add:
```
Source:      /*
Destination: /index.html
Status:      200 (Rewrite)
```

### API calls fail (Network Error / CORS error)
1. Check `VITE_API_URL` is set correctly in the frontend environment (no trailing slash)
2. Check `ALLOWED_ORIGINS` on the backend includes the exact frontend URL
3. Trigger a manual redeploy on both services after any env var change

### Backend crashes on startup
Check the Render logs. Most likely cause: `SECRET_KEY` environment variable is not set — the app will refuse to start without it.

### Free tier backend goes to sleep
Render Free tier spins down after 15 minutes of inactivity. The first request after sleep takes ~30 seconds. Upgrade to **Starter ($7/mo)** to keep it always-on, or use an uptime monitoring service (e.g. UptimeRobot) to ping `/api/health` every 10 minutes.

### Database connection errors
The `DATABASE_URL` on Render includes the internal hostname. If you're connecting from outside Render (e.g. local machine), use the **external hostname** from the Render PostgreSQL dashboard instead.
