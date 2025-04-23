export default {
    async fetch(request, env, ctx) {
      const url = new URL(request.url);
  
      // Handle federation endpoints first
      if (
        url.pathname.startsWith('/.well-known/webfinger') ||
        url.pathname.startsWith('/users') || 
        url.pathname.startsWith('/inbox')
      ) {
        url.hostname = 'api.edufedi.com';
        
        // Preserve headers and override Host
        const headers = new Headers(request.headers);
        headers.set('X-Forwarded-Host', 'edufedi.com'); // Critical for Fedify URI generation
        
        const newRequest = new Request(url.toString(), {
          method: request.method,
          headers: headers, // Forward modified headers
          body: request.body,
          redirect: 'follow'
        });
        return fetch(newRequest);
      }
  
      // Route /api/* to backend (non-federation)
      if (url.pathname.startsWith('/api')) {
        url.hostname = 'api.edufedi.com';
        url.pathname = url.pathname.replace('/api', '');
        return fetch(new Request(url, request));
      }
  
      // Route everything else to frontend
      url.hostname = 'www.edufedi.com';
      return fetch(url.toString(), request);
    }
  };
  