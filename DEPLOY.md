# Deploy Guide — PickOps API

## Prerequisites
- Node.js 18+
- Supabase project
- LINE Developer account

## Setup
1. `npm install`
2. Copy `.env.example` → `.env`
3. ใส่ credentials

## Development
`npm run dev`  # starts on port 3000

## Production Deploy Options
### Option A: Railway (แนะนำ)
- `railway init`
- `railway up`

### Option B: Render
- Connect GitHub repo
- Build command: `npm run build`
- Start command: `npm start`

### Option C: Google Cloud Run
- `gcloud run deploy pickops-api`
