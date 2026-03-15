import { NextResponse } from 'next/server';

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Redirect root to login
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  // Protect dashboard - cookie-only check (no body read)
  if (pathname.startsWith('/admin/dashboard')) {
    const token = request.cookies.get('auth_token')?.value;
    if (!token) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
    // Basic JWT expiry check without signature verification (safe for redirect only)
    try {
      const parts = token.split('.');
      if (parts.length !== 3) throw new Error('bad token');
      const payload = JSON.parse(
        Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
      );
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        return NextResponse.redirect(new URL('/admin/login', request.url));
      }
    } catch {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  // Protect WA API routes
  if (pathname.startsWith('/api/wa/')) {
    const token = request.cookies.get('auth_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  // IMPORTANT: Do not touch body - return next() for POST routes
  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/admin/dashboard/:path*', '/api/wa/:path*'],
};
