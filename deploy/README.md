# Deployment Guide

This guide walks you through deploying the SEO Tag Helper Tool to free hosting services.

## Prerequisites

1. **Supabase Account** - [supabase.com](https://supabase.com)
2. **Render.com Account** - [render.com](https://render.com)
3. **Vercel Account** - [vercel.com](https://vercel.com)
4. **GitHub Repository** - Code pushed to GitHub

## Step 1: Database Setup (Supabase)

1. Create a new project on Supabase
2. Go to the SQL Editor
3. Run the SQL from `database/schema.sql`
4. Note your project URL and anon key from Settings → API

## Step 2: Backend Deployment (Render.com)

1. **Connect Repository**
   - Go to Render.com dashboard
   - Click "New" → "Web Service"
   - Connect your GitHub repository

2. **Configure Service**
   - Use the included `render.yaml` configuration
   - Or manually configure:
     - **Build Command:** `cd backend && npm install && npm run build`
     - **Start Command:** `cd backend && node dist/server.js`
     - **Environment:** Node.js
     - **Plan:** Free

3. **Environment Variables**
   Set these in the Render.com dashboard:
   ```
   NODE_ENV=production
   PORT=3000
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-supabase-anon-key
   FRONTEND_URL=https://your-app.vercel.app
   BACKEND_URL=https://your-backend.onrender.com
   CORS_ORIGIN=https://your-app.vercel.app
   RATE_LIMIT_WINDOW_MS=60000
   RATE_LIMIT_MAX_REQUESTS=20
   ```

4. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment (first deploy takes 5-10 minutes)
   - Note your backend URL (e.g., `https://your-backend.onrender.com`)

## Step 3: Frontend Deployment (Vercel)

### Option A: Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Deploy**
   ```bash
   cd frontend
   vercel
   ```

3. **Set Environment Variable**
   ```bash
   vercel env add REACT_APP_API_URL
   # Enter your Render.com backend URL
   ```

### Option B: Vercel Dashboard

1. **Connect Repository**
   - Go to Vercel dashboard
   - Click "New Project"
   - Import your GitHub repository

2. **Configure**
   - **Framework:** Create React App
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `build`

3. **Environment Variables**
   ```
   REACT_APP_API_URL=https://your-backend.onrender.com
   ```

4. **Deploy**
   - Click "Deploy"
   - Note your frontend URL (e.g., `https://your-app.vercel.app`)

## Step 4: Update Backend Configuration

1. Go back to Render.com dashboard
2. Update these environment variables with your actual URLs:
   ```
   FRONTEND_URL=https://your-app.vercel.app
   BACKEND_URL=https://your-backend.onrender.com
   CORS_ORIGIN=https://your-app.vercel.app
   ```
3. Redeploy the backend service

## Step 5: Testing

1. Visit your frontend URL
2. Enter a website URL to analyze
3. Check that the scan completes successfully
4. Test report generation and download

## Free Tier Limitations

### Render.com Free Plan
- **Sleep after 15 minutes** of inactivity
- **750 hours/month** (sufficient for 24/7 operation)
- **512MB RAM** 
- **Cold start delays** (10-30 seconds after sleep)

### Vercel Free Plan
- **100GB bandwidth/month**
- **1000 deployments/month**
- **Unlimited static hosting**

### Supabase Free Plan
- **500MB database storage**
- **2GB bandwidth/month**
- **50,000 monthly active users**

## Monitoring and Maintenance

### Keep Backend Alive
The backend includes a self-ping mechanism during business hours to minimize sleep time.

### Database Cleanup
The system automatically removes expired sessions (older than 3 hours).

### Logs and Monitoring
- **Render.com:** Check logs in the dashboard
- **Vercel:** Check function logs in the dashboard
- **Supabase:** Monitor usage in the dashboard

## Scaling Considerations

When you outgrow free tiers:

1. **Render.com Starter ($7/month)**
   - No sleep
   - More reliable performance

2. **Supabase Pro ($25/month)**
   - 8GB storage
   - More bandwidth

3. **Add Redis Queue**
   - Better job management
   - Multiple workers

## Troubleshooting

### Backend Won't Start
- Check environment variables are set correctly
- Verify Supabase connection details
- Check build logs for errors

### Frontend Can't Connect to Backend
- Verify `REACT_APP_API_URL` is set correctly
- Check CORS configuration
- Ensure backend is running

### Scan Fails
- Check backend logs for Puppeteer errors
- Verify target website is accessible
- Check for rate limiting

### Database Issues
- Verify Supabase connection
- Check database schema is created
- Monitor storage usage

## Security Notes

- Never commit `.env` files
- Use environment variables for all secrets
- Regularly rotate API keys
- Monitor for unusual usage patterns