// MCP Integration Guard - Prevents OAuth refresh loops in Builder.io preview
export const mcpGuard = {
  // Check if we're in a preview/sandbox environment
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
      // If we can't access location, assume sandbox
      return true;
    }
  },

  // Check if we should allow MCP OAuth operations
  shouldAllowMcpOAuth(): boolean {
    return !this.isPreviewEnvironment() && process.env.NODE_ENV === 'production';
  },

  // Safe MCP operation wrapper
  safeMcpOperation<T>(operation: () => Promise<T>, fallback: T): Promise<T> {
    if (!this.shouldAllowMcpOAuth()) {
      console.log('MCP operation blocked in preview/sandbox environment');
      return Promise.resolve(fallback);
    }
    
    return operation().catch((error) => {
      console.warn('MCP operation failed:', error);
      return fallback;
    });
  },

  // Disable MCP integrations in preview
  getMcpConfig() {
    if (this.isPreviewEnvironment()) {
      return {
        vercel: { enabled: false },
        netlify: { enabled: false },
        oauth: { enabled: false },
        refresh: { enabled: false }
      };
    }
    
    return {
      vercel: { enabled: true },
      netlify: { enabled: true },
      oauth: { enabled: true },
      refresh: { enabled: true }
    };
  }
};

// Global MCP configuration
if (typeof window !== 'undefined') {
  const config = mcpGuard.getMcpConfig();
  
  // Disable OAuth refresh in preview environments
  if (!config.oauth.enabled) {
    // Override any global OAuth refresh functions
    (window as any).__MCP_OAUTH_DISABLED__ = true;
    
    // Block common OAuth refresh patterns
    const originalFetch = window.fetch;
    window.fetch = function(input: RequestInfo | URL, init?: RequestInit) {
      const url = typeof input === 'string' ? input : input.toString();
      
      // Block OAuth refresh endpoints in preview
      if (url.includes('/oauth/refresh') || url.includes('/mcp/oauth')) {
        console.log('Blocked OAuth request in preview:', url);
        return Promise.reject(new Error('OAuth blocked in preview environment'));
      }
      
      return originalFetch.call(this, input, init);
    };
  }
}

export default mcpGuard;
