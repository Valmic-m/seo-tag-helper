# SEO Tag Helper Tool - Claude Memory

## Project Overview
A zero-cost automated SEO analysis tool built with React, Node.js, and Puppeteer that scans websites and generates Word document reports with optimization recommendations.

## Architecture
- **Frontend**: React with TypeScript (Vercel free tier)
- **Backend**: Node.js + Express + TypeScript (Render.com free tier)  
- **Database**: PostgreSQL (Supabase free tier)
- **Queue**: In-memory JavaScript queue (no Redis to keep free)
- **Scraping**: Puppeteer with lightweight configuration
- **Reports**: Word documents via docx library

## Key Features
- Scans up to 50 pages, 3 levels deep
- Analyzes titles, meta descriptions, headings, images
- Generates professional Word reports with brand colors
- Runs entirely on free hosting tiers
- Auto-cleanup after 3 hours to manage storage

## Development Commands
```bash
# Setup (run once)
./setup.sh

# Backend development
cd backend && npm run dev

# Frontend development  
cd frontend && npm start

# Build backend
cd backend && npm run build

# Build frontend
cd frontend && npm run build
```

## Deployment
- Backend: Deploy to Render.com using render.yaml
- Frontend: Deploy to Vercel using vercel.json
- Database: Supabase with schema from database/schema.sql

## Environment Variables
- Backend needs: SUPABASE_URL, SUPABASE_ANON_KEY, FRONTEND_URL, BACKEND_URL
- Frontend needs: REACT_APP_API_URL

## Free Tier Limits
- Vercel: 100GB bandwidth/month
- Render.com: 750 hours/month (24/7 operation)
- Supabase: 500MB storage

## Important Notes
- Backend sleeps after 15min inactivity on Render.com free tier
- Self-ping mechanism during business hours (8AM-10PM)
- Automatic cleanup of expired data every hour
- Memory-optimized for 512MB RAM limit
- Blocks unnecessary resources during scraping to save bandwidth