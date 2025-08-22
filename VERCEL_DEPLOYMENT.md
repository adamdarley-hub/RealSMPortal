# Vercel Deployment Configuration

Your Vercel deployment is showing demo data because it's missing the required environment variables. Here's how to fix it:

## Required Environment Variables for Vercel

### 1. ServeManager API Configuration
```
SERVEMANAGER_API_URL=https://www.servemanager.com/api
SERVEMANAGER_API_KEY=your_actual_api_key_here
```

### 2. Supabase Configuration
```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 3. Other Required Variables
```
NODE_VERSION=22
VITE_PUBLIC_BUILDER_KEY=__BUILDER_PUBLIC_KEY__
PING_MESSAGE=ping pong
```

## How to Set Environment Variables in Vercel

1. Go to your Vercel dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add each variable above with your actual values

## Getting Your API Keys

### ServeManager API Key
- Log into your ServeManager account
- Go to API settings
- Copy your API key

### Supabase Keys  
- Go to your Supabase project dashboard
- Settings → API
- Copy the Project URL and anon/public key
- For service role key, copy the service_role key (keep this secret)

## Performance Fixes Applied

✅ **Re-enabled caching** - Jobs page now caches data for 30 seconds
✅ **Disabled auto-sync** - Removed aggressive background polling
✅ **Optimized health checks** - Reduced timeout from 10s to 5s
✅ **Increased sync interval** - Changed from 60s to 5 minutes

## After Setting Environment Variables

1. Redeploy your Vercel project
2. The app should now show real ServeManager data instead of demo data
3. Navigation should be much faster due to caching improvements

## Local vs Production

- **Local**: Uses environment variables + real ServeManager API
- **Vercel**: Was missing environment variables, falling back to demo data
- **Fix**: Set the environment variables above in Vercel settings
