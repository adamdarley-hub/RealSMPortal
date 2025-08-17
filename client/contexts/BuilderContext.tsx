import { createContext, useContext, ReactNode } from 'react';
import { builder } from '@builder.io/react';

// Safe storage access wrapper for sandbox environments
const safeStorageAccess = {
  getItem: (key: string) => {
    try {
      return localStorage?.getItem(key) || null;
    } catch (e) {
      return null;
    }
  },
  setItem: (key: string, value: string) => {
    try {
      localStorage?.setItem(key, value);
    } catch (e) {
      // Silently fail in sandbox
    }
  },
  removeItem: (key: string) => {
    try {
      localStorage?.removeItem(key);
    } catch (e) {
      // Silently fail in sandbox
    }
  }
};

// Safe cookie access wrapper
const safeCookieAccess = {
  get: (name: string) => {
    try {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
      return null;
    } catch (e) {
      return null;
    }
  },
  set: (name: string, value: string, options: any = {}) => {
    try {
      let cookieString = `${name}=${value}`;
      if (options.expires) cookieString += `; expires=${options.expires}`;
      if (options.path) cookieString += `; path=${options.path}`;
      if (options.domain) cookieString += `; domain=${options.domain}`;
      if (options.secure) cookieString += `; secure`;
      if (options.sameSite) cookieString += `; samesite=${options.sameSite}`;
      document.cookie = cookieString;
    } catch (e) {
      // Silently fail in sandbox
    }
  }
};

// Initialize Builder.io with sandbox-safe configuration
try {
  builder.init(import.meta.env.VITE_PUBLIC_BUILDER_KEY || 'a0b2fe3b0e09431caaa97bd8f93a665d');

  // Configure Builder.io for sandbox safety
  builder.set({
    // Disable features that cause sandbox issues
    canTrack: false,
    noCache: true,
    // Use safe storage wrapper
    ...(typeof window !== 'undefined' && {
      storage: safeStorageAccess,
      cookies: safeCookieAccess
    })
  });
} catch (e) {
  console.warn('Builder.io initialization failed in sandbox:', e);
}

export interface BuilderContextType {
  isEditMode: boolean;
  isPreviewMode: boolean;
}

const BuilderContext = createContext<BuilderContextType>({
  isEditMode: false,
  isPreviewMode: false,
});

export function BuilderProvider({ children }: { children: ReactNode }) {
  // Safely detect if we're in Builder.io edit mode
  const isEditMode = typeof window !== 'undefined' && (() => {
    try {
      return (
        window.location.search.includes('builder.preview=') ||
        window.location.search.includes('builder.space=') ||
        window.parent !== window
      );
    } catch (e) {
      // Handle sandbox restrictions
      return false;
    }
  })();

  const isPreviewMode = typeof window !== 'undefined' && (() => {
    try {
      return window.location.search.includes('builder.preview=');
    } catch (e) {
      return false;
    }
  })();

  // Enable Builder.io editing features when in edit mode
  if (isEditMode && typeof window !== 'undefined') {
    try {
      builder.set({
        includeRefs: true,
        // Disable problematic features in sandbox
        cookies: false
      });
    } catch (e) {
      console.warn('Builder.io config restricted in sandbox:', e);
    }
  }

  return (
    <BuilderContext.Provider value={{ isEditMode, isPreviewMode }}>
      {children}
    </BuilderContext.Provider>
  );
}

export const useBuilder = () => useContext(BuilderContext);
