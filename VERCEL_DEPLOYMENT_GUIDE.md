# Vercel Deployment Guide - DIRECT API KEYS

## 🚨 IMMEDIATE DEPLOYMENT STEPS

Your app is working locally but Vercel needs these exact environment variables:

### 1. **Set Environment Variables in Vercel Dashboard**

Go to: **Vercel Dashboard → Your Project → Settings → Environment Variables**

Add these **EXACT** variables:

```bash
# ServeManager API
SERVEMANAGER_API_URL=https://www.servemanager.com/api
SERVEMANAGER_API_KEY=mGcmzLfOxLXa5wCJfhbXgQ

# Supabase
VITE_SUPABASE_URL=https://hncvuqcsyuhjiepcloer.supabase.co
VITE_SUPABASE_ANON_KEY=[YOUR_SUPABASE_ANON_KEY]
SUPABASE_SERVICE_ROLE_KEY=[YOUR_SUPABASE_SERVICE_ROLE_KEY]

# Stripe
STRIPE_PUBLISHABLE_KEY=pk_live_51RwXXIGpVBuTTmSjd8ptklvwTTpFWjJ2REy6WVEWUifVoDC3rl3sgg0sNu81bEMxABzsNrOyq27J9lr26R2OMRMg00Ppnt3wax
STRIPE_SECRET_KEY=[YOUR_STRIPE_SECRET]
STRIPE_WEBHOOK_SECRET=[YOUR_STRIPE_WEBHOOK_SECRET]

# Build
NODE_VERSION=22
VITE_PUBLIC_BUILDER_KEY=__BUILDER_PUBLIC_KEY__
```

### 2. **Deploy Settings**

In Vercel Project Settings:
- **Build Command**: `npm run build:client`
- **Output Directory**: `dist/spa`
- **Install Command**: `npm install`
- **Node.js Version**: 22.x

### 3. **Fix Vercel API Routing**

Your `vercel.json` is already configured correctly:
```json
{
  "buildCommand": "npm run build:client",
  "outputDirectory": "dist/spa",
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### 4. **Force Redeploy**

After setting environment variables:
1. Go to **Deployments** tab
2. Click **"Redeploy"** on latest deployment
3. Select **"Use existing Build Cache"** = NO
4. Click **"Redeploy"**

## 🔧 CURRENT ISSUES FIXED

### Performance Issue (API Spam)
Your app is making 50+ redundant calls to ServeManager. This is fixed by:
- Using cached data properly
- Removing redundant individual job fetches
- Better error handling

### Environment Variables
The exact variables your app needs are listed above. Make sure they're set in Vercel.

## 🚨 TROUBLESHOOTING

### If You Still See Login Page:
1. **Check Environment Variables**: All must be set in Vercel
2. **Check Build Logs**: Look for build errors in Vercel dashboard
3. **Clear Browser Cache**: Hard refresh (Ctrl+F5)

### If API Calls Fail:
1. **Verify ServeManager Key**: `mGcmzLfOxLXa5wCJfhbXgQ` is working locally
2. **Check Supabase Keys**: Get them from your Supabase dashboard
3. **Stripe Keys**: Verify they match your account

### If Build Fails:
- Node.js version must be 22
- Check for any TypeScript errors
- Ensure all dependencies are in `package.json`

## 📝 NEXT STEPS

1. **Set the environment variables** (most important!)
2. **Redeploy without cache**
3. **Test the deployed app**
4. **Check browser console** for any remaining errors

The app is actually working perfectly locally - it's just a deployment configuration issue.
