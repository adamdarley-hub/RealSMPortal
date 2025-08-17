import { createContext, useContext, ReactNode } from 'react';
import { builder } from '@builder.io/react';

// Initialize Builder.io with your public API key
// You'll need to replace this with your actual Builder.io API key
builder.init(process.env.VITE_BUILDER_PUBLIC_KEY || 'a0b2fe3b0e09431caaa97bd8f93a665d');

export interface BuilderContextType {
  isEditMode: boolean;
  isPreviewMode: boolean;
}

const BuilderContext = createContext<BuilderContextType>({
  isEditMode: false,
  isPreviewMode: false,
});

export function BuilderProvider({ children }: { children: ReactNode }) {
  // Detect if we're in Builder.io edit mode
  const isEditMode = typeof window !== 'undefined' && 
    (window.location.search.includes('builder.preview=') || 
     window.location.search.includes('builder.space=') ||
     window.parent !== window);
     
  const isPreviewMode = typeof window !== 'undefined' && 
    window.location.search.includes('builder.preview=');

  // Enable Builder.io editing features when in edit mode
  if (isEditMode && typeof window !== 'undefined') {
    builder.set({ includeRefs: true });
  }

  return (
    <BuilderContext.Provider value={{ isEditMode, isPreviewMode }}>
      {children}
    </BuilderContext.Provider>
  );
}

export const useBuilder = () => useContext(BuilderContext);
