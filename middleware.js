// middleware.js — optional password for the whole site (Vercel Routing Middleware).
// Set SITE_PASSWORD in Vercel's environment variables to turn it on; the browser then asks
// for it once (any user name). With no SITE_PASSWORD the site stays open, as before.
export const config = {
  // Everything except the Monday email job, which Vercel's cron calls with its own secret.
  matcher: ['/((?!api/hiv-digest).*)'],
};

function sameText(a, b) {
  // Compare in constant time so the password can't be guessed from response timings.
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export default function middleware(request) {
  const password = process.env.SITE_PASSWORD;
  if (!password) return undefined;

  const header = request.headers.get('authorization') || '';
  if (header.startsWith('Basic ')) {
    try {
      const decoded = atob(header.slice(6));
      const given = decoded.slice(decoded.indexOf(':') + 1);
      if (sameText(given, password)) return undefined;
    } catch {}
  }
  return new Response('Password required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Catalyst", charset="UTF-8"' },
  });
}
