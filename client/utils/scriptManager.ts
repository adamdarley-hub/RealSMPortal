// Script Manager - Disable third-party scripts in preview to reduce noise
export const scriptManager = {
  // Check if we're in preview/sandbox environment
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
        inIframe
      );
    } catch (e) {
      return true; // Assume preview if we can't check
    }
  },

  // List of third-party scripts to disable in preview
  blockedScripts: [
    'wootric',
    'launchdarkly',
    'figma',
    'fullstory',
    'hotjar',
    'google-analytics',
    'gtag',
    'mixpanel',
    'segment',
    'intercom',
    'drift',
    'zendesk'
  ],

  // Block third-party script loading
  blockThirdPartyScripts(): void {
    if (!this.isPreviewEnvironment()) return;

    // Override script creation to block third-party scripts
    const originalCreateElement = document.createElement;
    document.createElement = function(tagName: string, options?: ElementCreationOptions) {
      const element = originalCreateElement.call(this, tagName, options);
      
      if (tagName.toLowerCase() === 'script') {
        const script = element as HTMLScriptElement;
        
        // Monitor src attribute changes
        const originalSetAttribute = script.setAttribute;
        script.setAttribute = function(name: string, value: string) {
          if (name === 'src' && scriptManager.shouldBlockScript(value)) {
            console.log('Blocked third-party script in preview:', value);
            return;
          }
          return originalSetAttribute.call(this, name, value);
        };

        // Monitor direct src property changes
        Object.defineProperty(script, 'src', {
          set: function(value: string) {
            if (scriptManager.shouldBlockScript(value)) {
              console.log('Blocked third-party script in preview:', value);
              return;
            }
            Object.defineProperty(this, 'src', {
              value,
              writable: true,
              configurable: true
            });
          },
          get: function() {
            return this.getAttribute('src') || '';
          },
          configurable: true
        });
      }
      
      return element;
    };

    // Block inline scripts with third-party content
    const originalInnerHTMLSetter = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML')?.set;
    if (originalInnerHTMLSetter) {
      Object.defineProperty(Element.prototype, 'innerHTML', {
        set: function(value: string) {
          if (typeof value === 'string' && scriptManager.containsBlockedScript(value)) {
            console.log('Blocked inline script with third-party content in preview');
            return;
          }
          return originalInnerHTMLSetter.call(this, value);
        },
        get: function() {
          return Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML')?.get?.call(this) || '';
        },
        configurable: true
      });
    }
  },

  // Check if a script URL should be blocked
  shouldBlockScript(src: string): boolean {
    if (!src || !this.isPreviewEnvironment()) return false;
    
    const srcLower = src.toLowerCase();
    return this.blockedScripts.some(blocked => srcLower.includes(blocked));
  },

  // Check if content contains blocked script references
  containsBlockedScript(content: string): boolean {
    if (!content || !this.isPreviewEnvironment()) return false;
    
    const contentLower = content.toLowerCase();
    return this.blockedScripts.some(blocked => contentLower.includes(blocked));
  },

  // Remove existing third-party scripts
  removeExistingScripts(): void {
    if (!this.isPreviewEnvironment()) return;

    // Remove script tags with third-party sources
    const scripts = document.querySelectorAll('script[src]');
    scripts.forEach(script => {
      const src = script.getAttribute('src');
      if (src && this.shouldBlockScript(src)) {
        console.log('Removing existing third-party script:', src);
        script.remove();
      }
    });

    // Remove problematic link preloads
    const preloads = document.querySelectorAll('link[rel="preload"]');
    preloads.forEach(link => {
      const href = link.getAttribute('href');
      if (href && this.shouldBlockScript(href)) {
        console.log('Removing problematic preload:', href);
        link.remove();
      }
    });
  },

  // Clean up preload links that cause warnings
  cleanPreloads(): void {
    // Remove unused preloads that cause "preloaded but not used" warnings
    const preloads = document.querySelectorAll('link[rel="preload"]');
    const usedResources = new Set();
    
    // Check which resources are actually used
    const allLinks = document.querySelectorAll('link[href], script[src], img[src]');
    allLinks.forEach(element => {
      const resource = element.getAttribute('href') || element.getAttribute('src');
      if (resource) usedResources.add(resource);
    });

    // Remove preloads for unused resources
    preloads.forEach(preload => {
      const href = preload.getAttribute('href');
      if (href && !usedResources.has(href)) {
        console.log('Removing unused preload:', href);
        preload.remove();
      }
    });
  },

  // Override global variables that third-party scripts might use
  overrideGlobals(): void {
    if (!this.isPreviewEnvironment()) return;

    // Disable Wootric
    (window as any).wootric = undefined;
    (window as any).wootric_survey_immediately = false;

    // Disable LaunchDarkly
    (window as any).LDClient = undefined;
    (window as any).ldclient = undefined;

    // Disable FullStory
    (window as any).FS = undefined;

    // Disable other common third-party tools
    (window as any).gtag = () => {};
    (window as any).ga = () => {};
    (window as any).analytics = { track: () => {}, page: () => {}, identify: () => {} };
    (window as any).mixpanel = { track: () => {}, identify: () => {} };
  },

  // Initialize script manager
  init(): void {
    if (typeof window !== 'undefined') {
      this.overrideGlobals();
      this.blockThirdPartyScripts();
      
      // Clean up on DOM ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          this.removeExistingScripts();
          this.cleanPreloads();
        });
      } else {
        this.removeExistingScripts();
        this.cleanPreloads();
      }
      
      // Also clean up periodically
      setInterval(() => {
        if (this.isPreviewEnvironment()) {
          this.removeExistingScripts();
          this.cleanPreloads();
        }
      }, 5000);
    }
  }
};

// Auto-initialize
scriptManager.init();

export default scriptManager;
