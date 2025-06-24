#!/bin/bash

# SEO Tag Helper Tool - Vercel Deployment Script

echo "🚀 Starting Vercel deployment for SEO Tag Helper Tool"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Check if frontend directory exists
if [ ! -d "frontend" ]; then
    echo "❌ Error: frontend directory not found."
    exit 1
fi

# Navigate to frontend directory
cd frontend

echo "📦 Installing dependencies..."
npm install

echo "🏗️  Building frontend..."
npm run build

echo "☁️  Deploying to Vercel..."
npx vercel --prod

echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Set the REACT_APP_API_URL environment variable in Vercel dashboard"
echo "2. Update your backend's FRONTEND_URL and CORS_ORIGIN environment variables"
echo "3. Test the deployment by visiting your Vercel URL"
echo ""
echo "Need help? Check the deployment guide in deploy/README.md"