// Safe Storage Wrapper for Builder.io Preview Environment
export const safeStorage = {
  // Check if we're in Builder.io preview/sandbox
  isPreviewMode(): boolean {
    if (typeof window === 'undefined') return false;
    
    try {
      const url = window.location.search;
      const hostname = window.location.hostname;
      const inIframe = window.parent !== window;
      
      return (
        url.includes('builder.preview=') ||
        url.includes('builder.space=') ||
        hostname.includes('builder.io') ||
        inIframe
      );
    } catch (e) {
      return true; // Assume preview if we can't check
    }
  },

  // Safe localStorage wrapper
  localStorage: {
    getItem: (key: string): string | null => {
      if (safeStorage.isPreviewMode()) return null;
      try {
        return localStorage?.getItem(key) || null;
      } catch (e) {
        return null;
      }
    },
    setItem: (key: string, value: string): void => {
      if (safeStorage.isPreviewMode()) return;
      try {
        localStorage?.setItem(key, value);
      } catch (e) {
        // Silently fail in preview
      }
    },
    removeItem: (key: string): void => {
      if (safeStorage.isPreviewMode()) return;
      try {
        localStorage?.removeItem(key);
      } catch (e) {
        // Silently fail in preview
      }
    }
  },

  // Safe sessionStorage wrapper
  sessionStorage: {
    getItem: (key: string): string | null => {
      if (safeStorage.isPreviewMode()) return null;
      try {
        return sessionStorage?.getItem(key) || null;
      } catch (e) {
        return null;
      }
    },
    setItem: (key: string, value: string): void => {
      if (safeStorage.isPreviewMode()) return;
      try {
        sessionStorage?.setItem(key, value);
      } catch (e) {
        // Silently fail in preview
      }
    },
    removeItem: (key: string): void => {
      if (safeStorage.isPreviewMode()) return;
      try {
        sessionStorage?.removeItem(key);
      } catch (e) {
        // Silently fail in preview
      }
    }
  },

  // Safe cookie access
  cookies: {
    get: (name: string): string | null => {
      if (safeStorage.isPreviewMode()) return null;
      try {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
        return null;
      } catch (e) {
        return null;
      }
    },
    set: (name: string, value: string, options: any = {}): void => {
      if (safeStorage.isPreviewMode()) return;
      try {
        let cookieString = `${name}=${value}`;
        if (options.expires) cookieString += `; expires=${options.expires}`;
        if (options.path) cookieString += `; path=${options.path}`;
        if (options.domain) cookieString += `; domain=${options.domain}`;
        if (options.secure) cookieString += `; secure`;
        if (options.sameSite) cookieString += `; samesite=${options.sameSite}`;
        document.cookie = cookieString;
      } catch (e) {
        // Silently fail in preview
      }
    }
  }
};

// Override global storage in preview mode
if (typeof window !== 'undefined' && safeStorage.isPreviewMode()) {
  console.log('Builder.io preview detected - using safe storage wrappers');
  
  // Override localStorage
  Object.defineProperty(window, 'localStorage', {
    value: safeStorage.localStorage,
    writable: false,
    configurable: false
  });

  // Override sessionStorage  
  Object.defineProperty(window, 'sessionStorage', {
    value: safeStorage.sessionStorage,
    writable: false,
    configurable: false
  });
}

export default safeStorage;
