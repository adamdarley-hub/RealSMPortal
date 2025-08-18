// OAuth Guard - Prevents OAuth refresh loops in Builder.io preview
export const oauthGuard = {
  // Check if we're in preview environment where OAuth should be disabled
  isPreviewEnvironment(): boolean {
    if (typeof window === 'undefined') return false;
    
    try {
      const url = window.location.search;
      const hostname = window.location.hostname;
      const inIframe = window.parent !== window;
      
      return (
        url.includes('builder.preview=') ||
        url.includes('builder.space=') ||
        hostname.includes('builder.io') ||
        hostname.includes('vercel.app') ||
        hostname.includes('netlify.app') ||
        inIframe
      );
    } catch (e) {
      return true; // Assume preview if we can't check
    }
  },

  // Block OAuth refresh requests
  blockOAuthRefresh(): void {
    if (!this.isPreviewEnvironment()) return;

    // Override fetch to block OAuth requests
    const originalFetch = window.fetch;
    window.fetch = function(input: RequestInfo | URL, init?: RequestInit) {
      const url = typeof input === 'string' ? input : input.toString();
      
      // Block OAuth refresh endpoints
      if (
        url.includes('/oauth/refresh') || 
        url.includes('/mcp/oauth') ||
        url.includes('/api/v1/projects/mcp/oauth/refresh') ||
        url.includes('oauth/token') ||
        url.includes('refresh_token')
      ) {
        console.log('🚫 Blocked OAuth request in preview:', url);
        return Promise.reject(new Error('OAuth requests blocked in preview environment'));
      }
      
      return originalFetch.call(this, input, init);
    };

    // Block XMLHttpRequest OAuth calls
    const originalXHROpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method: string, url: string | URL, ...args: any[]) {
      const urlStr = url.toString();
      
      if (
        urlStr.includes('/oauth/refresh') || 
        urlStr.includes('/mcp/oauth') ||
        urlStr.includes('oauth/token') ||
        urlStr.includes('refresh_token')
      ) {
        console.log('🚫 Blocked XHR OAuth request in preview:', urlStr);
        throw new Error('OAuth requests blocked in preview environment');
      }
      
      return originalXHROpen.call(this, method, url, ...args);
    };
  },

  // Disable OAuth integrations
  disableOAuthIntegrations(): void {
    if (!this.isPreviewEnvironment()) return;

    // Disable common OAuth providers
    (window as any).__OAUTH_DISABLED__ = true;
    
    // Mock OAuth functions
    (window as any).refreshToken = () => Promise.resolve(null);
    (window as any).getAccessToken = () => Promise.resolve(null);
    (window as any).isAuthenticated = () => false;
    
    // Disable Vercel/Netlify OAuth
    (window as any).vercel = { ...((window as any).vercel || {}), oauth: null };
    (window as any).netlify = { ...((window as any).netlify || {}), oauth: null };
  },

  // Initialize OAuth guard
  init(): void {
    if (typeof window !== 'undefined') {
      this.blockOAuthRefresh();
      this.disableOAuthIntegrations();
      
      console.log('🛡️ OAuth guard initialized for preview environment');
    }
  }
};

// Auto-initialize if in preview
if (typeof window !== 'undefined' && oauthGuard.isPreviewEnvironment()) {
  oauthGuard.init();
}

export default oauthGuard;
