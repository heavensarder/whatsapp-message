import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mysql from 'mysql2/promise';

const JWT_SECRET = process.env.JWT_SECRET || 'wh4ts4pp_s3cr3t';

let pool = null;
function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || '',
      database: process.env.DB_NAME || 'whatsapp-message',
      waitForConnections: true,
      connectionLimit: 10,
    });
  }
  return pool;
}

export async function POST(request) {
  try {
    // Use .text() then JSON.parse to avoid "body locked" issue in Next.js 16
    const raw = await request.text();
    const { email, password } = JSON.parse(raw);

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const p = getPool();
    const [users] = await p.execute(
      'SELECT * FROM admin_users WHERE email = ? LIMIT 1',
      [email.toLowerCase().trim()]
    );

    if (!users.length) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const user = users[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name },
    });

    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24,
      path: '/',
    });

    return response;
  } catch (err) {
    console.error('Login error:', err.message, err.stack);
    return NextResponse.json({ error: 'Server error: ' + err.message }, { status: 500 });
  }
}
