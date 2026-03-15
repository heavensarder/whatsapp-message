// Edge-compatible JWT verification (no Node.js crypto module)
// Uses jose library or manual base64 decode for Edge runtime

export function verifyToken(token) {
  try {
    // Simple JWT decode for middleware (just decode, don't verify signature in edge)
    // Full verification happens in API routes using jsonwebtoken
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    // Check expiry
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
