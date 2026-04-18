# 🚀 Production Deployment Guide

This guide details the exact steps to deploy both your **JudgeNod** (`inmodel-c`) services and the **landing-page-solana** repository.

---

## 🏗️ 1. Deploying the Backend (`inmodel-c/backend`)
*Target Platform: Railway or Render*

The FastAPI backend runs the scoring engine and handles Solana transactions.

1. **Navigate to the Backend Directory:**
   ```bash
   cd /Users/friday/Development/inmodel-c/backend
   ```
2. **Login to Railway CLI (if using Railway):**
   ```bash
   railway login
   railway init
   ```
3. **Deploy:**
   ```bash
   railway up
   ```
4. **Configure Environment Variables (in your Railway Dashboard):**
   - `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`
   - `GITHUB_TOKEN`
   - `SOLANA_RPC_URL`
   - `PROGRAM_ID`
   - `DATABASE_URL` (If you want to use PostgreSQL, otherwise it uses a local SQLite file which resets on deployment)

---

## 🎨 2. Deploying the Dashboard (hacknod-web repo)
*Target Platform: Vercel | URL: https://hacknod.inmodel.in*

Note: The frontend dashboard is now managed in a separate repository. This section remains for historical reference or for new frontend instances.

1. **Navigate & Login:**
   ```bash
   cd /Users/friday/Development/inmodel-c/dashboard
   npx vercel login
   ```
2. **Deploy to Vercel:**
   ```bash
   npx vercel --prod
   ```
3. **Configure Environment Variables:**
   - Wait for Vercel to ask you to set up the project. Once deployed, go to the Vercel dashboard and set:
     - `NEXT_PUBLIC_API_URL` (Set this to the production URL from Step 1)
     - `NEXT_PUBLIC_SOLANA_RPC_URL`

---

## 🛠️ 3. Publishing the CLI Tool (`inmodel-c/cli`)
*Target Platform: NPM Registry*

Publishing the CLI allows participants to run `npx judgenod submit`.

1. **Navigate to the CLI Directory:**
   ```bash
   cd /Users/friday/Development/inmodel-c/cli
   ```
2. **Update the API URL:**
   - Open `src/config.ts` (or equivalent).
   - Ensure the `API_URL` points to your newly deployed backend URL instead of `localhost:8000`.
3. **Build & Publish:**
   ```bash
   npm run build
   npm login
   npm publish
   ```

---

## 🌍 4. Deploying the Landing Page (`landing-page-solana`)
*Target Platform: Vercel*

The standalone Solana marketing/landing page.

1. **Navigate to the Project:**
   ```bash
   cd /Users/friday/Development/landing-page-solana
   ```
2. **Deploy:**
   ```bash
   npx vercel login
   npx vercel --prod
   ```
3. **Configure Environment Variables (Vercel):**
   - Set any necessary keys according to the `.env.example` in `landing-page-solana/`.

---

### 🎉 Post-Deployment Checklist
- [x] Run `npx judgenod submit` locally to verify it hits the production backend.
- [x] Test navigating to the Vercel URLs for the Dashboard and Landing Page.
- [x] Connect your Phantom wallet on the dashboard and ensure no CORS errors appear in your browser console.
