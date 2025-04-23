export default {
    async fetch(request, env, ctx) {
      const url = new URL(request.url);
  
      // Handle federation endpoints without /api prefix
      if (
        url.pathname.startsWith('/.well-known/webfinger') ||
        url.pathname.startsWith('/outbox') ||
        url.pathname.startsWith('/users') || 
        url.pathname.startsWith('/inbox')
      ) {
        url.hostname = 'api.edufedi.com';
        const newRequest = new Request(url.toString(), {
          method: request.method,
          headers: request.headers,
          body: request.body,
          redirect: 'follow'
        });
        return fetch(newRequest);
      }
  
      // Route /api/* to backend
      if (url.pathname.startsWith('/api')) {
        url.hostname = 'api.edufedi.com';
        url.pathname = url.pathname.replace('/api', '');
        return fetch(new Request(url, request));
      }
  
      // Route everything else to frontend
      url.hostname = 'www.edufedi.com';
      return fetch(url.toString(), request);
    }
  }
  