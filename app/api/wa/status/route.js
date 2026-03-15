import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

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

export async function GET() {
  try {
    const p = getPool();
    const [rows] = await p.execute(
      `SELECT status, connected_phone, connected_name FROM wa_sessions WHERE session_key='default' LIMIT 1`
    );
    if (!rows.length) return NextResponse.json({ status: 'disconnected' });
    return NextResponse.json({ status: rows[0].status, phone: rows[0].connected_phone, name: rows[0].connected_name });
  } catch {
    return NextResponse.json({ status: 'disconnected' });
  }
}
