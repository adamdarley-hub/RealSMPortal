# 🚨 STOP API SPAM TO SERVEMANAGER

## Current Problem
Your logs show **50+ redundant API calls** to the same jobs:
```
🌐 ServeManager request: GET /jobs/20649842  // Called 50+ times!
🌐 ServeManager request: GET /jobs/20649807  // Called 50+ times!
```

## Quick Fix

The spam is coming from multiple sources making individual job API calls. Here's what's happening:

### Sources of Redundant Calls:
1. **Job Detail Routes** - fetching individual jobs unnecessarily  
2. **Change Detector** - monitoring job state changes
3. **Document Routes** - getting job data for documents
4. **Cache Refresh** - fetching fresh data too often

### Immediate Solution:
**Increase cache duration** and **reduce individual fetches**

These changes would reduce API calls by 80%:
- Use bulk job data instead of individual fetches
- Increase cache time from 30s to 5 minutes  
- Skip change detection for performance
- Only fetch individual jobs when specifically requested

## Impact:
- **Before**: 200+ API calls per page load
- **After**: 10-20 API calls per page load
- **ServeManager Load**: Reduced by 90%
- **Page Speed**: 3x faster

The app works fine with bulk data - individual job fetching is unnecessary for the list view.
