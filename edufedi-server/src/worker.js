export default {
    async fetch(request, env, ctx) {
      const url = new URL(request.url);
  
      if (
        url.pathname.startsWith('/.well-known/webfinger') ||
        url.pathname.startsWith('/outbox') ||
        url.pathname.startsWith('/users') || 
        url.pathname.startsWith('/inbox')
      ) {
        url.hostname = 'api.edufedi.com';
        
        // Clone headers and set X-Forwarded-Host
        const headers = new Headers(request.headers);
        headers.set('X-Forwarded-Host', 'edufedi.com');
        
        const newRequest = new Request(url.toString(), {
          method: request.method,
          headers,
          body: request.body,
          redirect: 'follow'
        });
        return fetch(newRequest);
      }
  
      url.hostname = 'www.edufedi.com';
      return fetch(url.toString(), request);
    }
  };
  