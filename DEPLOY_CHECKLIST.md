# Vercel Deploy Checklist - Calculadora Retencoes

## ✅ Code Ready (All Committed)
- [x] Build passes locally (`npm run build` ✅)
- [x] All 17 routes compile (17/17 static/dynamic)
- [x] TypeScript passes
- [x] Prisma schema valid
- [x] Next.js 16.3.6 in dependencies

---

## 🔧 Vercel Dashboard Configuration (Required)

### 1. Root Directory (CRITICAL)
**Settings → General → Root Directory**
```
calculadora-app
```

### 2. Environment Variables (Settings → Environment Variables)
| Variable | Value | Scope |
|----------|-------|-------|
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` (generate once) | All |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` (update after 1st deploy) | All |
| `DATABASE_URL` | **Auto** (Postgres → Connect) | All |
| `KV_REST_API_URL` | **Auto** (KV → Connect) | All |
| `KV_REST_API_TOKEN` | **Auto** (KV → Connect) | All |
| `CNPJ_IO_TOKEN` | Optional (fallback) | All |

### 3. Storage (Storage tab - REQUIRED for shared data)
| Storage | Action | Name |
|---------|--------|------|
| **Postgres** | Create Database | `calculadora-db` |
| **KV (Redis)** | Create Database | `calculadora-kv` |

### 4. After First Deploy - Update NEXTAUTH_URL
After first deploy, copy the actual URL and update:
```
NEXTAUTH_URL = https://your-actual-vercel-url.vercel.app
```

---

## 🔄 After Deploy - Database Setup

Run locally after first successful deploy:
```bash
cd calculadora-app
npx prisma migrate deploy
npx prisma db seed
```

This creates admin/user accounts:
- **admin** / `admin123`
- **user** / `user123`

---

## 🔍 Verify Deployment

| Check | Expected |
|-------|----------|
| Build logs show | `calculadora-app` as root |
| `/login` | Loads gradient login page |
| `/fiscal/calculadora` | Calculator works |
| `/contabil/dre` | DRE loads |
| Sidebar | Fiscal/Contabil modules expand |
| Login | `admin` / `admin123` works |

---

## 🚨 Common Issues & Fixes

| Error | Fix |
|-------|-----|
| "No Next.js version detected" | Set Root Directory = `calculadora-app` |
| "DATABASE_URL not found" | Create Postgres storage, env var auto-injected |
| "KV_REST_API_URL not found" | Create KV storage, env var auto-injected |
| Login fails | Run `prisma migrate deploy && prisma db seed` |
| 404 on routes | Check Root Directory = `calculadora-app` |

---

## 📁 File Structure (Verified)

```
calculadora-retencoes/
├── vercel.json                    # Root config (points to subdir)
├── calculadora-app/
│   ├── vercel.json                # Next.js config
│   ├── package.json               # Next.js 16.3.6 ✓
│   ├── prisma/schema.prisma       # Schema ✓
│   ├── prisma/seed.ts             # Seed script ✓
│   ├── app/                       # App Router pages ✓
│   ├── components/                # UI components ✓
│   ├── lib/                       # Auth, DB, KV, CNPJ, Calculations ✓
│   └── middleware.ts              # Auth + Rate limit ✓
```

---

## 🚀 Quick Deploy Commands

```bash
# Local verification
cd calculadora-app
npm run build          # Must pass
npm run dev            # Test locally

# After Vercel deploy
npx prisma migrate deploy
npx prisma db seed
```

---

## 🆘 If Still Failing

1. **Clear Vercel cache**: Settings → Functions → Clear Build Cache
2. **Check Root Directory**: Must be exactly `calculadora-app`
3. **Check Build Logs**: Look for "calculadora-app" in build output
4. **Clear Cache & Redeploy**: Settings → Functions → Clear Build Cache → Redeploy