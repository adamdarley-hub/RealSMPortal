/**
 * Utility to bypass analytics interference with fetch API
 */

// Store reference to original fetch before any analytics can override it
const originalFetch = window.fetch;

export function getCleanFetch(): typeof fetch {
  // Try to get the original fetch if it's been stored
  if ((window as any).__originalFetch) {
    return (window as any).__originalFetch;
  }
  
  // If fetch seems to be monkey-patched, create XMLHttpRequest wrapper
  const fetchString = window.fetch.toString();
  if (fetchString.includes('FullStory') || fetchString.length > 200) {
    console.log('🔧 Analytics interference detected, using XMLHttpRequest wrapper');
    return createXHRFetch();
  }
  
  return originalFetch || window.fetch;
}

function createXHRFetch(): typeof fetch {
  return function xhrFetch(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const url = typeof input === 'string' ? input : input.toString();
      const method = init?.method || 'GET';
      
      xhr.open(method, url);
      
      // Set headers
      if (init?.headers) {
        const headers = new Headers(init.headers);
        headers.forEach((value, key) => {
          xhr.setRequestHeader(key, value);
        });
      }
      
      // Set timeout
      xhr.timeout = 15000;
      
      xhr.onload = () => {
        const response = new Response(xhr.responseText, {
          status: xhr.status,
          statusText: xhr.statusText,
          headers: new Headers()
        });
        resolve(response);
      };
      
      xhr.onerror = () => reject(new Error('Network error'));
      xhr.ontimeout = () => reject(new Error('Request timeout'));
      xhr.onabort = () => reject(new Error('Request aborted'));
      
      xhr.send(init?.body as string);
    });
  };
}

// Store original fetch before it can be overridden
if (typeof window !== 'undefined' && !((window as any).__originalFetch)) {
  (window as any).__originalFetch = window.fetch;
}

// Export clean fetch for immediate use
export const cleanFetch = getCleanFetch();
