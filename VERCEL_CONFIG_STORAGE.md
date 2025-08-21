# Vercel Configuration Storage Solution

This solution addresses the issue where API configurations weren't persisting in Vercel's serverless environment due to the stateless nature of serverless functions.

## What Was Changed

### 1. **Persistent Storage Service** (`server/services/config-storage.ts`)

- Uses Supabase database to store API configurations persistently
- Automatically falls back to global memory and environment variables if Supabase isn't available
- Stores ServeManager, Stripe, and Radar configurations securely

### 2. **Configuration Helper** (`server/utils/config-helper.ts`)

- Provides a unified interface for accessing configurations
- Implements caching to avoid repeated database calls (5-minute cache)
- Environment variables always take precedence over stored values
- Validates configurations before returning them

### 3. **Database Schema** (`sql/supabase-schema.sql`)

- Added `api_configurations` table to store service configurations
- Includes fields for all supported services (ServeManager, Stripe, Radar)
- Has proper indexes and RLS policies

### 4. **Updated API Endpoints**

- All API endpoints now use the new configuration system
- Cache is automatically cleared when configurations are updated
- Supports both database storage and fallback modes

## How It Works

### Configuration Priority (High to Low)

1. **Environment Variables** (set in Vercel dashboard)
2. **Supabase Database** (persistent across deployments)
3. **Global Memory** (temporary, lost on cold starts)

### Storage Flow

1. When you save configuration in the UI:

   - If Supabase is available: Saves to database ✅
   - If Supabase unavailable: Falls back to global memory ⚠️

2. When APIs need configuration:
   - Checks cache first (5-minute expiry)
   - Loads from effective source (env vars → database → global memory)
   - Caches result for performance

## Setup Instructions

### Option 1: Use Supabase (Recommended)

1. **Connect Supabase** to your project (if not already connected)
2. **Run the schema** from `sql/supabase-schema.sql` in your Supabase SQL editor
3. **Save your configuration** in the app's Settings → API Configuration
4. **Configurations will persist** across all deployments ✅

### Option 2: Use Environment Variables

1. **Go to Vercel Dashboard** → Your Project → Settings → Environment Variables
2. **Add these variables**:
   - `SERVEMANAGER_BASE_URL=https://www.servemanager.com/api`
   - `SERVEMANAGER_API_KEY=your_api_key_here`
3. **Redeploy** your application
4. **Configurations will persist** across deployments ✅

### Option 3: Temporary (Not Recommended for Production)

- Save configuration in the UI without Supabase
- Works until the next cold start/deployment ⚠️

## Testing Your Configuration

Visit `https://your-app.vercel.app/api/test-config` to see:

- Which storage method is being used
- Whether your configuration is properly loaded
- The source of each configuration value

## Key Benefits

✅ **Persistent Storage**: Configurations survive deployments and cold starts
✅ **Automatic Fallback**: Graceful degradation if storage is unavailable
✅ **Performance**: Caching reduces database calls
✅ **Security**: Environment variables take precedence for sensitive values
✅ **Backward Compatible**: Works with existing file-based configurations

## Troubleshooting

### If configurations aren't loading:

1. Check `/api/test-config` endpoint for detailed status
2. Verify Supabase connection and schema
3. Check Vercel environment variables
4. Look at function logs in Vercel dashboard

### If Supabase isn't available:

- The system will automatically fall back to environment variables and global memory
- Set environment variables in Vercel for persistence
- Consider connecting Supabase for better storage

## Files Changed

- `server/services/config-storage.ts` (new)
- `server/utils/config-helper.ts` (new)
- `sql/supabase-schema.sql` (updated)
- `api/config.ts` (updated)
- `api/test-config.ts` (updated)
- `api/jobs.ts`, `api/clients.ts`, `api/invoices.ts`, `api/court_cases.ts` (updated)
- `server/routes/servemanager.ts` (updated)
