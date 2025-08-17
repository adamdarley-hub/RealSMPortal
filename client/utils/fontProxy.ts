// Font Proxy utility to handle CORS issues in Builder.io preview
export const fontProxy = {
  // System font fallbacks that don't require external loading
  systemFonts: {
    sans: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    serif: 'Georgia, Cambria, "Times New Roman", Times, serif',
    mono: 'Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
  },

  // Check if we're in preview mode where external fonts might be blocked
  isPreviewMode(): boolean {
    if (typeof window === 'undefined') return false;
    
    try {
      const url = window.location.search;
      const hostname = window.location.hostname;
      return (
        url.includes('builder.preview=') ||
        url.includes('builder.space=') ||
        hostname.includes('builder.io') ||
        window.parent !== window
      );
    } catch (e) {
      return true; // Assume preview if we can't check
    }
  },

  // Replace external font URLs with system fonts in preview
  getFont(fontFamily: string): string {
    if (!this.isPreviewMode()) {
      return fontFamily; // Use original font in production
    }

    // Map common font families to system alternatives
    const fontMap: Record<string, string> = {
      'Inter': this.systemFonts.sans,
      'Roboto': this.systemFonts.sans,
      'Open Sans': this.systemFonts.sans,
      'Lato': this.systemFonts.sans,
      'Montserrat': this.systemFonts.sans,
      'Source Sans Pro': this.systemFonts.sans,
      'Playfair Display': this.systemFonts.serif,
      'Merriweather': this.systemFonts.serif,
      'PT Serif': this.systemFonts.serif,
      'Fira Code': this.systemFonts.mono,
      'Source Code Pro': this.systemFonts.mono,
      'JetBrains Mono': this.systemFonts.mono
    };

    return fontMap[fontFamily] || this.systemFonts.sans;
  },

  // Remove external font links in preview mode
  sanitizeFontLinks(): void {
    if (!this.isPreviewMode()) return;

    // Remove external font links that might cause CORS issues
    const fontLinks = document.querySelectorAll('link[href*="fonts.googleapis.com"], link[href*="fonts.gstatic.com"], link[href*="builder.io"]');
    fontLinks.forEach(link => {
      console.log('Removing external font link in preview:', link.getAttribute('href'));
      link.remove();
    });
  },

  // Initialize font proxy
  init(): void {
    if (typeof window !== 'undefined') {
      // Wait for DOM to be ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.sanitizeFontLinks());
      } else {
        this.sanitizeFontLinks();
      }
      
      // Also check after a short delay for dynamically loaded fonts
      setTimeout(() => this.sanitizeFontLinks(), 1000);
    }
  }
};

// Auto-initialize font proxy
fontProxy.init();

export default fontProxy;
