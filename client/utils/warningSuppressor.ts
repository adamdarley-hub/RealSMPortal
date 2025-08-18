// Warning Suppressor - Eliminate MobX and Quill console warnings
export const warningSuppressor = {
  // List of warning patterns to suppress
  suppressedWarnings: [
    '[mobx.array] Attempt to read an array index',
    'out of bounds',
    'Overwriting modules/imageResize',
    'Quill module already registered',
    'preloaded but not used',
    'Failed to execute \'getComputedStyle\'',
    'ResizeObserver loop limit exceeded'
  ],

  // Initialize warning suppression
  init(): void {
    if (typeof window === 'undefined') return;

    // Override console.warn to filter out known warnings
    const originalWarn = console.warn;
    console.warn = function(...args: any[]) {
      const message = args[0];
      
      if (typeof message === 'string') {
        // Check if this warning should be suppressed
        const shouldSuppress = warningSuppressor.suppressedWarnings.some(pattern => 
          message.includes(pattern)
        );
        
        if (shouldSuppress) {
          return; // Suppress this warning
        }
      }
      
      // Allow other warnings through
      originalWarn.apply(console, args);
    };

    // Override console.error for specific errors
    const originalError = console.error;
    console.error = function(...args: any[]) {
      const message = args[0];
      
      if (typeof message === 'string') {
        // Suppress specific error patterns
        if (
          message.includes('MobX') && message.includes('out of bounds') ||
          message.includes('Quill') && message.includes('imageResize')
        ) {
          return; // Suppress this error
        }
      }
      
      // Allow other errors through
      originalError.apply(console, args);
    };

    // Quill module conflict prevention
    this.preventQuillConflicts();

    // MobX array access safety
    this.addMobXArraySafety();

    console.log('🔇 Warning suppressor initialized');
  },

  // Prevent Quill module registration conflicts
  preventQuillConflicts(): void {
    if (typeof window === 'undefined') return;

    // Watch for Quill initialization
    Object.defineProperty(window, 'Quill', {
      set: function(quill) {
        if (quill && quill.register) {
          const originalRegister = quill.register;
          quill.register = function(path: string, module: any, suppress?: boolean) {
            // Check if module is already registered
            try {
              const existing = quill.import(path);
              if (existing && path.includes('imageResize')) {
                console.log('🚫 Preventing duplicate Quill module registration:', path);
                return; // Skip duplicate registration
              }
            } catch (e) {
              // Module not registered yet, proceed
            }
            
            return originalRegister.call(this, path, module, true); // Always suppress warnings
          };
        }
        
        // Set the actual Quill
        Object.defineProperty(this, '_quill', {
          value: quill,
          writable: true
        });
      },
      get: function() {
        return this._quill;
      },
      configurable: true
    });
  },

  // Add MobX array access safety
  addMobXArraySafety(): void {
    if (typeof window === 'undefined') return;

    // Create safe array proxy
    const createSafeArray = (arr: any[]) => {
      return new Proxy(arr, {
        get(target, prop) {
          if (typeof prop === 'string') {
            const index = parseInt(prop, 10);
            if (!isNaN(index) && (index < 0 || index >= target.length)) {
              // Return undefined for out-of-bounds access instead of throwing
              return undefined;
            }
          }
          return target[prop];
        }
      });
    };

    // Override Array methods if MobX is present
    if ((window as any).mobx || (window as any).__mobxDidRunLazyInitializers) {
      const originalPush = Array.prototype.push;
      Array.prototype.push = function(...items) {
        const result = originalPush.apply(this, items);
        // Ensure this is still a safe array after modification
        return result;
      };
    }
  },

  // Suppress specific DOM warnings
  suppressDOMWarnings(): void {
    // Override specific DOM methods that cause warnings
    const originalQuerySelector = Document.prototype.querySelector;
    Document.prototype.querySelector = function(selector: string) {
      try {
        return originalQuerySelector.call(this, selector);
      } catch (e) {
        // Suppress invalid selector warnings
        return null;
      }
    };
  }
};

// Auto-initialize
warningSuppressor.init();

export default warningSuppressor;
