import { createContext, useContext, ReactNode } from 'react';
import { builder } from '@builder.io/react';

// Initialize Builder.io with your public API key
// You'll need to replace this with your actual Builder.io API key
builder.init(import.meta.env.VITE_PUBLIC_BUILDER_KEY || 'a0b2fe3b0e09431caaa97bd8f93a665d');

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
