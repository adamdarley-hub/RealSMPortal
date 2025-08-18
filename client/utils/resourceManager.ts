// Resource Manager - Remove unnecessary preloads and third-party scripts
export const resourceManager = {
  // Third-party scripts to block in preview
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
    'zendesk',
    'hubspot'
  ],

  // Check if we're in preview mode
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
      return true;
    }
  },

  // Remove unused preload links
  cleanPreloads(): void {
    const preloads = document.querySelectorAll('link[rel="preload"]');
    const usedResources = new Set<string>();
    
    // Collect actually used resources
    const allResources = document.querySelectorAll([
      'link[href]:not([rel="preload"])',
      'script[src]',
      'img[src]',
      'video[src]',
      'audio[src]'
    ].join(', '));
    
    allResources.forEach(element => {
      const resource = element.getAttribute('href') || element.getAttribute('src');
      if (resource) usedResources.add(resource);
    });

    // Remove preloads for unused resources
    preloads.forEach(preload => {
      const href = preload.getAttribute('href');
      if (href) {
        const isUsed = usedResources.has(href);
        const isEssential = this.isEssentialResource(href);
        
        if (!isUsed && !isEssential) {
          console.log('🗑️ Removing unused preload:', href);
          preload.remove();
        }
      }
    });
  },

  // Check if resource is essential
  isEssentialResource(href: string): boolean {
    return (
      href.includes('font') ||
      href.includes('css') ||
      href.endsWith('.js') ||
      href.endsWith('.css') ||
      href.includes('critical')
    );
  },

  // Block third-party scripts
  blockThirdPartyScripts(): void {
    if (!this.isPreviewMode()) return;

    // Override script creation
    const originalCreateElement = document.createElement;
    document.createElement = function(tagName: string, options?: ElementCreationOptions) {
      const element = originalCreateElement.call(this, tagName, options);
      
      if (tagName.toLowerCase() === 'script') {
        const script = element as HTMLScriptElement;
        
        // Monitor src changes
        const originalSetAttribute = script.setAttribute;
        script.setAttribute = function(name: string, value: string) {
          if (name === 'src' && resourceManager.shouldBlockScript(value)) {
            console.log('🚫 Blocked third-party script:', value);
            return;
          }
          return originalSetAttribute.call(this, name, value);
        };

        // Monitor direct src property
        Object.defineProperty(script, 'src', {
          set: function(value: string) {
            if (resourceManager.shouldBlockScript(value)) {
              console.log('🚫 Blocked third-party script (src):', value);
              return;
            }
            Object.defineProperty(this, '_src', { value, writable: true });
          },
          get: function() {
            return this._src || '';
          },
          configurable: true
        });
      }
      
      return element;
    };
  },

  // Check if script should be blocked
  shouldBlockScript(src: string): boolean {
    if (!src || !this.isPreviewMode()) return false;
    
    const srcLower = src.toLowerCase();
    return this.blockedScripts.some(blocked => srcLower.includes(blocked));
  },

  // Remove existing third-party scripts
  removeExistingScripts(): void {
    if (!this.isPreviewMode()) return;

    const scripts = document.querySelectorAll('script[src]');
    scripts.forEach(script => {
      const src = script.getAttribute('src');
      if (src && this.shouldBlockScript(src)) {
        console.log('🗑️ Removing existing third-party script:', src);
        script.remove();
      }
    });
  },

  // Disable third-party globals
  disableThirdPartyGlobals(): void {
    if (!this.isPreviewMode()) return;

    // Disable common third-party globals
    const globals = {
      wootric: undefined,
      wootric_survey_immediately: false,
      LDClient: undefined,
      ldclient: undefined,
      FS: undefined,
      Hotjar: undefined,
      hj: () => {},
      gtag: () => {},
      ga: () => {},
      analytics: { track: () => {}, page: () => {}, identify: () => {} },
      mixpanel: { track: () => {}, identify: () => {} },
      Intercom: () => {},
      drift: { load: () => {} }
    };

    Object.entries(globals).forEach(([key, value]) => {
      (window as any)[key] = value;
    });

    console.log('🚫 Disabled third-party globals for preview');
  },

  // Clean up meta tags
  cleanMetaTags(): void {
    // Remove problematic meta tags that might interfere
    const problematicMetas = document.querySelectorAll([
      'meta[name*="google"]',
      'meta[name*="facebook"]', 
      'meta[name*="twitter"]',
      'meta[property*="og:"]',
      'meta[property*="fb:"]'
    ].join(', '));

    if (this.isPreviewMode()) {
      problematicMetas.forEach(meta => {
        const name = meta.getAttribute('name') || meta.getAttribute('property');
        console.log('🗑️ Removing meta tag for preview:', name);
        meta.remove();
      });
    }
  },

  // Initialize resource manager
  init(): void {
    if (typeof window !== 'undefined') {
      // Disable third-party integrations immediately
      this.disableThirdPartyGlobals();
      this.blockThirdPartyScripts();
      
      // Clean up on DOM ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          this.removeExistingScripts();
          this.cleanPreloads();
          this.cleanMetaTags();
        });
      } else {
        this.removeExistingScripts();
        this.cleanPreloads(); 
        this.cleanMetaTags();
      }
      
      // Periodic cleanup
      setInterval(() => {
        if (this.isPreviewMode()) {
          this.removeExistingScripts();
          this.cleanPreloads();
        }
      }, 3000);

      console.log('🧹 Resource manager initialized');
    }
  }
};

// Auto-initialize
resourceManager.init();

export default resourceManager;
