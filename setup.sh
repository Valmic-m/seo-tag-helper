#!/bin/bash

# SEO Tag Helper Tool - Local Development Setup Script

echo "🚀 Setting up SEO Tag Helper Tool for local development"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ and try again."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2)
if [ "$(printf '%s\n' "16.0.0" "$NODE_VERSION" | sort -V | head -n1)" != "16.0.0" ]; then
    echo "❌ Node.js version 16+ required. You have $NODE_VERSION"
    exit 1
fi

echo "✅ Node.js version $NODE_VERSION detected"

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Setup backend
echo "🔧 Setting up backend..."
cd backend

if [ ! -f ".env" ]; then
    echo "📄 Creating backend .env file..."
    cp .env.example .env
    echo "⚠️  Please edit backend/.env with your Supabase credentials"
fi

echo "📦 Installing backend dependencies..."
npm install

echo "🏗️  Building backend..."
npm run build

cd ..

# Setup frontend
echo "🔧 Setting up frontend..."
cd frontend

if [ ! -f ".env" ]; then
    echo "📄 Creating frontend .env file..."
    cp .env.example .env
    echo "✅ Frontend .env created with default settings"
fi

echo "📦 Installing frontend dependencies..."
npm install

cd ..

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Set up your Supabase database:"
echo "   - Create a new project at https://supabase.com"
echo "   - Run the SQL from database/schema.sql"
echo "   - Update backend/.env with your Supabase URL and key"
echo ""
echo "2. Start the development servers:"
echo "   Backend:  cd backend && npm run dev"
echo "   Frontend: cd frontend && npm start"
echo ""
echo "3. Visit http://localhost:3001 to use the application"
echo ""
echo "For deployment instructions, see deploy/README.md"