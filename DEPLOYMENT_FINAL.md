# Vercel Deployment - Final Configuration

## Files Structure

```
backend/
├── api/
│   ├── index.js          ← Vercel entry point
│   └── index.ts          ← TypeScript source (backup)
├── server.ts             ← Main Express app
├── vercel.json           ← Vercel config
├── package.json          ← Build scripts
└── tsconfig.json         ← TypeScript config
```

## Critical Environment Variables for Vercel

Set these EXACTLY in Vercel Dashboard:

```bash
MONGODB_URI=mongodb+srv://gyneclinicsdev_db_user:corNR7JmkjfGSj4U@cluster0.gvs9iuh.mongodb.net/gyneclinics?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=2FxXT1NTf2K1Mo4i6AOvtdI
JWT_REFRESH_SECRET=PWj0fI#&DsZY9w$8tHe11*yr9F45K*j2xj&fceGZ!tEnMNZcEN
JWT_EXPIRE=7d
NODE_ENV=production
IMAGEBB_API_KEY=8e5691634c513ea3f568ede1970f9506
IMAGEBB_CLOUD_NAME=Arsahak99
```

## Deploy Steps

### 1. Commit All Changes

```bash
git add .
git commit -m "Fix Vercel deployment configuration"
git push origin main
```

### 2. Deploy via Vercel Dashboard

1. Go to https://vercel.com/dashboard
2. Import your repository
3. **Important Settings:**

   - Framework Preset: `Other`
   - Root Directory: `backend`
   - Build Command: `npm run vercel-build`
   - Output Directory: `dist`
   - Install Command: `npm install`

4. Add all environment variables (see above)
5. Click "Deploy"

### 3. Or Deploy via CLI

```bash
cd backend
vercel --prod
```

## Troubleshooting

If deployment still fails, check Vercel logs:

1. Go to Vercel Dashboard → Your Project → Deployments
2. Click on the failed deployment
3. Click "View Function Logs"
4. Look for specific error messages

## Common Issues Fixed

✅ MongoDB URI now includes database name `/gyneclinics`
✅ Build command compiles TypeScript to JavaScript
✅ Proper module exports for CommonJS
✅ Simplified vercel.json configuration
✅ Database connection optimized for serverless
✅ Environment variables properly formatted

## Test After Deployment

```bash
# Health check
curl https://your-app.vercel.app/api/health

# Expected response
{
  "success": true,
  "status": "healthy",
  "database": "connected"
}
```

## MongoDB Atlas Checklist

✅ Network Access allows 0.0.0.0/0
✅ Database user has correct credentials
✅ Database name is `gyneclinics`
✅ Connection string includes all query parameters
