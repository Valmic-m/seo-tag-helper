# SEO Tag Helper Tool

> 🚀 A zero-cost automated SEO analysis tool that scans websites and generates optimized metadata recommendations

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D16.0.0-green.svg)
![Status](https://img.shields.io/badge/status-active-success.svg)

## 🎯 Overview

The SEO Tag Helper Tool automatically crawls your website, analyzes content, and generates professional SEO recommendations - all while running entirely on free hosting services. Perfect for small businesses and developers who need SEO insights without the enterprise price tag.

### ✨ Key Features

- **Automated Website Scanning** - Crawls up to 50 pages, 3 levels deep
- **Smart SEO Analysis** - Evaluates titles, meta descriptions, and image alt texts
- **Professional Reports** - Generates downloadable Word documents with actionable recommendations
- **Brand Customization** - Include your brand colors in reports
- **Zero Cost** - Runs entirely on free tiers (Vercel, Render.com, Supabase)

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ and npm
- Free accounts on:
  - [Supabase](https://supabase.com) (database)
  - [Render.com](https://render.com) (backend hosting)
  - [Vercel](https://vercel.com) (frontend hosting)
  - [Resend](https://resend.com) (optional - for email delivery)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/seo-tag-helper.git
   cd seo-tag-helper
   ```

2. **Set up the database**
   - Create a new Supabase project
   - Run the SQL schema from `database/schema.sql`
   - Copy your Supabase URL and anon key

3. **Configure the backend**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env with your Supabase credentials
   ```

4. **Configure the frontend**
   ```bash
   cd ../frontend
   npm install
   cp .env.example .env
   # Edit .env with your backend URL
   ```

### Local Development

**Backend:**
```bash
cd backend
npm run dev
# Server runs on http://localhost:3000
```

**Frontend:**
```bash
cd frontend
npm start
# App runs on http://localhost:3001
```

## 🌐 Deployment

### Deploy Backend to Render.com

1. Push your code to GitHub
2. Connect your repo to Render.com
3. Use the included `render.yaml` configuration
4. Set environment variables in Render dashboard

### Deploy Frontend to Vercel

```bash
cd frontend
npm install -g vercel
vercel
# Follow the prompts
```

## 📊 Architecture

```
┌─────────────────────┐     ┌────────────────────┐     ┌─────────────────┐
│  React Frontend     │     │  Node.js Backend   │     │   PostgreSQL    │
│  (Vercel Free)     │ ←──→ │  (Render Free)     │ ←──→ │ (Supabase Free) │
└─────────────────────┘     └────────────────────┘     └─────────────────┘
                                      ↓
                            ┌────────────────────┐
                            │ Puppeteer Scraper  │
                            │ (Single Instance)  │
                            └────────────────────┘
```

## 🔧 Configuration

### Environment Variables

**Backend (.env):**
```env
NODE_ENV=production
PORT=3000
SUPABASE_URL=your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
FRONTEND_URL=https://your-app.vercel.app
BACKEND_URL=https://your-backend.onrender.com
RESEND_API_KEY=your-key # Optional
```

**Frontend (.env):**
```env
REACT_APP_API_URL=https://your-backend.onrender.com
```

## 📈 Free Tier Limits

| Service | Free Tier | Our Usage | 
|---------|-----------|-----------|
| Vercel | 100GB/month | ~10GB/month |
| Render.com | 750 hours/month | 24/7 running |
| Supabase | 500MB storage | ~100MB |
| Resend | 100 emails/day | Optional |

## 🛣️ Roadmap

- [x] Basic website scanning
- [x] SEO recommendations
- [x] Word document reports
- [ ] PDF export option
- [ ] Scheduled scanning
- [ ] Multi-language support
- [ ] Chrome extension

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with React, Node.js, and Puppeteer
- Hosted on Vercel, Render.com, and Supabase
- Word document generation using docx library

## 📞 Support

- Create an [Issue](https://github.com/yourusername/seo-tag-helper/issues) for bug reports
- Check out the [Wiki](https://github.com/yourusername/seo-tag-helper/wiki) for detailed documentation
- Read the [PRD](docs/PRD.pdf) and [TDD](docs/TDD.md) for complete specifications

---

Made with ❤️ by [Your Name](https://github.com/yourusername)