// Font Manager - Handle CORS font issues in Builder.io preview
export const fontManager = {
  // System font stacks as fallbacks
  systemFonts: {
    sans: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    serif: 'Georgia, Cambria, "Times New Roman", Times, serif',
    mono: 'Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    display: '"SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },

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

  // Remove external font links that cause CORS issues
  removeExternalFonts(): void {
    if (!this.isPreviewMode()) return;

    const fontLinks = document.querySelectorAll([
      'link[href*="fonts.googleapis.com"]',
      'link[href*="fonts.gstatic.com"]', 
      'link[href*="builder.io"]',
      'link[href*="cdn."]',
      'link[rel="preload"][as="font"]'
    ].join(', '));

    fontLinks.forEach(link => {
      const href = link.getAttribute('href');
      console.log('🚫 Removing external font link in preview:', href);
      link.remove();
    });
  },

  // Replace font families with system alternatives
  replaceFontFamilies(): void {
    if (!this.isPreviewMode()) return;

    const styleSheets = Array.from(document.styleSheets);
    
    styleSheets.forEach(sheet => {
      try {
        const rules = Array.from(sheet.cssRules || []);
        rules.forEach(rule => {
          if (rule instanceof CSSStyleRule && rule.style.fontFamily) {
            const originalFont = rule.style.fontFamily;
            const newFont = this.getSafeFont(originalFont);
            if (newFont !== originalFont) {
              rule.style.fontFamily = newFont;
              console.log('🔄 Replaced font:', originalFont, '→', newFont);
            }
          }
        });
      } catch (e) {
        // Cross-origin stylesheet, skip
      }
    });
  },

  // Get safe system font for preview
  getSafeFont(fontFamily: string): string {
    if (!this.isPreviewMode()) return fontFamily;

    const fontMap: Record<string, string> = {
      'Inter': this.systemFonts.sans,
      'Roboto': this.systemFonts.sans,
      'Open Sans': this.systemFonts.sans,
      'Lato': this.systemFonts.sans,
      'Montserrat': this.systemFonts.sans,
      'Source Sans Pro': this.systemFonts.sans,
      'Helvetica Neue': this.systemFonts.sans,
      'Playfair Display': this.systemFonts.serif,
      'Merriweather': this.systemFonts.serif,
      'PT Serif': this.systemFonts.serif,
      'Fira Code': this.systemFonts.mono,
      'Source Code Pro': this.systemFonts.mono,
      'JetBrains Mono': this.systemFonts.mono
    };

    // Check if font is in our map
    for (const [external, system] of Object.entries(fontMap)) {
      if (fontFamily.includes(external)) {
        return system;
      }
    }

    return fontFamily;
  },

  // Add safe font CSS
  addSafeFontCSS(): void {
    if (!this.isPreviewMode()) return;

    const style = document.createElement('style');
    style.textContent = `
      /* Safe fonts for Builder.io preview */
      body, * {
        font-family: ${this.systemFonts.sans} !important;
      }
      
      .font-mono, .font-monospace, code, pre {
        font-family: ${this.systemFonts.mono} !important;
      }
      
      .font-serif {
        font-family: ${this.systemFonts.serif} !important;
      }
      
      h1, h2, h3, h4, h5, h6 {
        font-family: ${this.systemFonts.display} !important;
      }
    `;
    
    document.head.appendChild(style);
    console.log('✅ Added safe font CSS for preview');
  },

  // Initialize font manager
  init(): void {
    if (typeof window !== 'undefined') {
      // Remove external fonts immediately
      this.removeExternalFonts();
      
      // Add safe fonts
      this.addSafeFontCSS();
      
      // Watch for DOM changes
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          this.removeExternalFonts();
          this.replaceFontFamilies();
        });
      } else {
        this.replaceFontFamilies();
      }
      
      // Periodic cleanup
      setInterval(() => {
        if (this.isPreviewMode()) {
          this.removeExternalFonts();
        }
      }, 2000);
    }
  }
};

// Auto-initialize
fontManager.init();

export default fontManager;
