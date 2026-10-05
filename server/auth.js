// Only the Sites dispatcher supplies these trusted headers in production.
// Do not expose this Worker through a second, unfiltered workers.dev origin.
export function currentUser(request) {
  const id = request.headers.get('oai-authenticated-user-id');
  const email = request.headers.get('oai-authenticated-user-email');
  if (!id || !email) return null;
  let displayName = email;
  if (request.headers.get('oai-authenticated-user-full-name-encoding') === 'percent-encoded-utf-8') {
    try { displayName = decodeURIComponent(request.headers.get('oai-authenticated-user-full-name') || '') || email; } catch {}
  }
  return {id, displayName};
}
