import { handleApi } from './api.js';

export default {
  async fetch(request, env) {
    if (new URL(request.url).pathname.startsWith('/api/')) return handleApi(request, env);
    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response('Assets unavailable', {status: 503});
  },
};
