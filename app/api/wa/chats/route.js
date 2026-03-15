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
    const [contacts] = await p.execute(`
      SELECT wa_id, name, push_name, phone, last_message, last_message_time,
             unread_count, is_group, avatar_url
      FROM wa_contacts
      ORDER BY last_message_time DESC
      LIMIT 100
    `);
    return NextResponse.json({ chats: contacts });
  } catch (err) {
    console.error('Chats error:', err);
    return NextResponse.json({ chats: [], error: err.message }, { status: 500 });
  }
}
