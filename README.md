# Rosemary Catering & Restaurant ERP

A comprehensive, enterprise-grade Catering & Restaurant ERP application ported from Base44 to a standalone React + Vite + Supabase architecture, optimized for local development and cloud hosting (e.g. Bolt.new, Vercel, Netlify).

---

## Overview & Architecture

* **Frontend:** React 18, Vite, Tailwind CSS, Radix UI / shadcn/ui, Lucide Icons, Recharts, TanStack Query.
* **Backend / Database:** Supabase (PostgreSQL with RLS, Auth, Storage, and Edge Functions).
* **Scale:**
  * **179 Database Tables** defined with dual timestamps, UUID primary keys, foreign key performance indexes, and Row-Level Security.
  * **146 Supabase Edge Functions** ported to modern Deno runtime with CORS headers and Supabase service-role client.
  * **60 Frontend Pages & Modules** spanning Catering Management, POS, Inventory, Manufacturing, CRM, Butchery, HR & Attendance, and Executive Analytics.

---

## Getting Started

### 1. Prerequisites
* Node.js 18+ (or Bun)
* npm or pnpm or bun

### 2. Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Configure your Supabase credentials:
```env
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-or-publishable-key>
VITE_SUPABASE_PUBLISHABLE_KEY=<your-anon-or-publishable-key>
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Database Setup
Apply the full database migration located at:
```bash
supabase/migrations/20261118000000_rosemary_schema.sql
```
You can execute this SQL directly in your **Supabase Dashboard -> SQL Editor** or via the Supabase CLI (`supabase db push`).

### 5. Edge Functions
Edge Functions are located in:
```bash
supabase/functions/
```
Deploy functions using the Supabase CLI:
```bash
supabase functions deploy
```

### 6. Development & Build
* Start local dev server:
  ```bash
  npm run dev
  ```
* Production build:
  ```bash
  npm run build
  ```
* Preview production build:
  ```bash
  npm run preview
  ```

---

## License & Attribution
Rosemary Catering & Restaurant ERP
