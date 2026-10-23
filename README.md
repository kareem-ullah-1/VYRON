# PSO full stack

## Backend (Express + TypeScript + Prisma + PostgreSQL) - port 5122
cd backend
cp .env.example .env     # set DATABASE_URL, JWT_SECRET (>=32 chars), CORS_ORIGINS
npm install
npx prisma generate
npx prisma migrate deploy
npm run seed             # optional: demo categories, products, customers, suppliers (+ admin if SEED_ADMIN_* set)
npm run dev              # http://localhost:5122/api/health

First signup becomes Admin (public signup is off afterwards, ALLOW_PUBLIC_SIGNUP=false).
Alternatively set SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD and run `npm run seed`.
If the frontend is opened from another device, add its origin to CORS_ORIGINS.

## Frontend (Next.js 14) - port 3000
cd frontend
npm install
npm run dev
frontend/.env already points to http://localhost:5122/api

## Images on Cloudflare R2 (private bucket, no public URL)
In backend/.env set:
  STORAGE_DRIVER=r2
  R2_ACCOUNT_ID=...  R2_ACCESS_KEY_ID=...  R2_SECRET_ACCESS_KEY=...  R2_BUCKET=...
  R2_PUBLIC_URL=            (leave blank)
Uploads go to R2; only the key (e.g. products/<uuid>.png) is stored in the database.
The API returns ProductImageKeys (the keys) and ProductImages (URLs the browser can load,
served by the backend at /api/files/<key>). Set PUBLIC_BASE_URL to the backend's public address
when it is not on localhost.

## Deploying to Vercel
Use two Vercel projects from this repo.

Backend (Root Directory `backend`, or the repo root which uses vercel.json):
  DATABASE_URL (pooled/serverless-friendly Postgres URL), JWT_SECRET (>=32 chars),
  CORS_ORIGINS=https://<your-frontend>.vercel.app   (exact origin, no trailing slash, comma-separate extras)
  TRUST_PROXY=1, PUBLIC_BASE_URL=https://<your-backend>.vercel.app
  STORAGE_DRIVER=r2 + R2_* vars   (Vercel's filesystem is read-only: local uploads will not work)
  Run `npx prisma migrate deploy` once against the production database (Vercel does not run migrations).

Frontend (Root Directory `frontend`):
  NEXT_PUBLIC_API_URL=https://<your-backend>.vercel.app/api   (build-time var: redeploy after changing)
