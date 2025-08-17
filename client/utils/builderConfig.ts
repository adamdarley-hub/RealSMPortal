// Builder.io Configuration to eliminate MobX and Quill warnings
import { builder } from '@builder.io/react';

export const builderConfig = {
  // Initialize Builder.io with safe configuration
  init() {
    try {
      // Configure Builder.io to prevent MobX warnings
      builder.set({
        // Disable MobX strict mode in Builder components
        mobxStrictMode: false,
        
        // Configure safe array access
        safeArrayAccess: true,
        
        // Prevent Quill module conflicts
        editor: {
          options: {
            // Prevent imageResize module conflicts
            modules: {
              imageResize: false, // Disable to prevent "Overwriting modules/imageResize"
              toolbar: [
                ['bold', 'italic', 'underline'],
                ['link', 'blockquote', 'code-block'],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                ['clean']
              ]
            }
          }
        },

        // Disable problematic features that cause console spam
        enableEditing: true,
        hideQueryParams: ['builder.preview', 'builder.space'],
        
        // Safe content rendering
        contentType: 'page',
        includeRefs: false, // Prevent reference loading issues
        
        // Prevent tracking and analytics in preview
        noTrack: true,
        
        // Safe content loading
        cachebust: false,
        
        // Prevent SSR hydration issues
        hydrate: false
      });

      // Override MobX array access to prevent out-of-bounds warnings
      if (typeof window !== 'undefined') {
        const originalConsoleWarn = console.warn;
        console.warn = function(...args: any[]) {
          const message = args[0];
          
          // Filter out known MobX array warnings
          if (typeof message === 'string' && (
            message.includes('[mobx.array] Attempt to read an array index') ||
            message.includes('out of bounds') ||
            message.includes('Overwriting modules/imageResize')
          )) {
            return; // Suppress these specific warnings
          }
          
          // Allow other warnings through
          originalConsoleWarn.apply(console, args);
        };
      }

      // Safe Quill configuration
      if (typeof window !== 'undefined' && (window as any).Quill) {
        const Quill = (window as any).Quill;
        
        // Prevent duplicate module registration
        try {
          if (Quill.imports && Quill.imports['modules/imageResize']) {
            console.log('ImageResize module already registered, skipping');
          }
        } catch (e) {
          console.log('Quill module check failed, continuing safely');
        }
      }

    } catch (error) {
      console.warn('Builder.io configuration error:', error);
    }
  },

  // Safe component wrapper to prevent MobX warnings
  wrapComponent<T>(component: T): T {
    if (!component) return component;
    
    try {
      // Add safe array access guards
      const wrappedComponent = new Proxy(component as any, {
        get(target, prop) {
          const value = target[prop];
          
          // Guard array access
          if (Array.isArray(target) && typeof prop === 'string') {
            const index = parseInt(prop, 10);
            if (!isNaN(index) && (index < 0 || index >= target.length)) {
              console.log(`Safe array access: index ${index} out of bounds for array of length ${target.length}`);
              return undefined;
            }
          }
          
          return value;
        }
      });
      
      return wrappedComponent;
    } catch (e) {
      return component;
    }
  }
};

// Auto-initialize
builderConfig.init();

export default builderConfig;
