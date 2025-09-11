# Workflow Builder POC

A modern, full-stack boilerplate application built for rapid prototyping of **Gloo Impact** features and proof-of-concepts.

## 🚀 Overview

This application serves as a foundational template for building and testing new features for Gloo Impact. It includes a complete authentication system, modern UI components, database integration, and all the essential infrastructure needed to quickly spin up new POCs.

## ✨ Features

### 🔐 Authentication System
- **Email/Password Authentication** via Supabase Auth
- **Role-based Access Control** (Admin/User roles)
- **Protected Routes** with automatic redirects
- **User Management** with profile information

### 🎨 Modern UI/UX
- **Radix UI Components** for consistent, accessible design
- **System-based Dark Mode** that follows user preferences
- **Theme-aware Logo** switching (light/dark variants)
- **Responsive Design** with mobile-first approach
- **Custom F37Jan & Poppins Fonts**

### 🗄️ Database & Backend
- **Supabase** for authentication and database
- **Prisma ORM** for type-safe database operations
- **PostgreSQL** database with migrations
- **API Routes** for server-side functionality

### ⚡ Developer Experience
- **Next.js 15.5.2** with App Router
- **Turbopack** for lightning-fast development builds
- **TypeScript** for type safety
- **Auto Port Management** (kills processes on port 3000)
- **Hot Module Reload** with optimized refresh

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | Next.js 15.5.2 |
| **Language** | TypeScript |
| **Bundler** | Turbopack (Rust-based) |
| **Database** | PostgreSQL via Supabase |
| **ORM** | Prisma |
| **Authentication** | Supabase Auth |
| **UI Components** | Radix UI |
| **Styling** | CSS-in-JS with Radix themes |
| **Icons** | Phosphor Icons |

## 🚀 Quick Start

### Prerequisites
- **Node.js** >= 18.18.0
- **npm** or **yarn**
- **Supabase** account and project

### 1. Clone & Install
```bash
git clone <repository-url>
cd workflow-builder-poc/app
npm install
```

### 2. Environment Setup
Create `.env.local` file:
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your_publishable_key
NEXT_PRIVATE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your_secret_key

# Database URLs
DATABASE_URL=your_database_url
DIRECT_URL=your_direct_database_url
```

### 3. Database Setup
```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Optional: Seed data
npm run seed:organizations
```

### 4. Start Development
```bash
npm run dev
```

Visit `http://localhost:3000` to see your application running with Turbopack! 🚀

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── auth/              # Authentication pages
│   ├── api/               # API routes
│   └── layout.tsx         # Root layout with providers
├── components/            # Reusable UI components
│   ├── AuthProvider.tsx   # Global auth context
│   ├── ThemeProvider.tsx  # Dark mode theme provider
│   ├── LayoutContent.tsx  # Conditional layout rendering
│   ├── Sidebar.tsx        # Navigation sidebar
│   └── ThemeLogo.tsx      # Theme-aware logo component
├── lib/                   # Utility libraries
│   └── supabase.ts        # Singleton Supabase client
└── styles/                # Global styles and fonts

prisma/
├── schema.prisma          # Database schema
└── migrations/            # Database migrations

public/
├── images/                # Static assets
│   ├── gloo-impact-logo-light.svg
│   └── gloo-impact-logo-dark.svg
└── fonts/                 # Custom font files
```

## 🔧 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with Turbopack |
| `npm run dev:clean` | Clean ports 3000-3002 and start fresh |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run prisma:migrate` | Run database migrations |
| `npm run prisma:generate` | Generate Prisma client |

## 🏗️ Building New Features

This boilerplate is designed for rapid POC development. Here's how to add new features:

### 1. Database Changes
```bash
# Modify prisma/schema.prisma
# Then run:
npm run prisma:migrate
```

### 2. New Pages
```bash
# Create in src/app/your-feature/page.tsx
# Automatic routing with App Router
```

### 3. API Endpoints
```bash
# Create in src/app/api/your-endpoint/route.ts
# Built-in API routes
```

### 4. Components
```bash
# Add to src/components/YourComponent.tsx
# Use Radix UI for consistency
```

## 🔐 Authentication Flow

The app implements a complete authentication system:

1. **Unauthenticated users** → Redirected to `/auth`
2. **Sign up/Sign in** → Email/password with Supabase
3. **Email verification** → Handled via callback route
4. **Authenticated users** → Access to protected routes
5. **Role-based access** → Admin/User permissions

## 🎨 Theming System

Built-in dark mode support:
- **System preference detection** - follows OS setting
- **Automatic switching** - light/dark themes
- **Theme-aware components** - all UI adapts
- **Semantic color tokens** - consistent across themes

## 📊 Performance Optimizations

- ✅ **Turbopack** for faster development builds
- ✅ **Singleton Supabase client** to prevent multiple instances
- ✅ **Optimized auth flow** with minimal re-renders
- ✅ **Smart route protection** with efficient redirects
- ✅ **CSS-in-JS** with Radix UI for optimal bundle size

## 🔍 Debugging & Development

### Common Issues
- **Port conflicts**: Use `npm run dev:clean` to clear ports
- **Auth loops**: Check browser extensions (OnePassword, etc.)
- **Theme issues**: Verify CSS variables are properly applied
- **Database errors**: Ensure Supabase connection and migrations

### Development Tools
- **React DevTools** - Component debugging
- **Supabase Studio** - Database management (linked in sidebar)
- **TypeScript** - Compile-time error checking
- **Next.js DevTools** - Performance insights

## 🚀 Deployment

Ready for deployment to Vercel, Netlify, or any Node.js hosting:

```bash
npm run build
npm run start
```

Environment variables must be configured in your deployment platform.

## 🤝 Contributing to Gloo Impact POCs

This boilerplate is designed to accelerate POC development for Gloo Impact features:

1. **Fork this template** for new POCs
2. **Build your feature** using the existing infrastructure
3. **Test thoroughly** with the authentication system
4. **Document changes** in feature-specific README sections
5. **Share learnings** back to the team

## 📝 License

This project is part of the Gloo Impact ecosystem and follows internal licensing guidelines.

---

**Built with ❤️ by the Gloo Impact Team**

*Ready to build the next great feature? Start coding! 🚀*
