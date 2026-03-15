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

export async function GET(request, { params }) {
  const { chatId } = await params;
  try {
    const p = getPool();
    const [messages] = await p.execute(`
      SELECT * FROM wa_messages
      WHERE contact_wa_id = ?
      ORDER BY timestamp ASC
      LIMIT 100
    `, [decodeURIComponent(chatId)]);
    return NextResponse.json({ messages });
  } catch (err) {
    return NextResponse.json({ messages: [], error: err.message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  const { chatId } = await params;
  try {
    // Use .text() + JSON.parse() to avoid Next.js 16 body locked issue
    const raw = await request.text();
    const { text } = JSON.parse(raw);

    if (!text?.trim()) {
      return NextResponse.json({ error: 'Message text required' }, { status: 400 });
    }

    const waClient = globalThis.__waClient;
    if (!waClient) {
      return NextResponse.json({ error: 'WhatsApp client not ready' }, { status: 503 });
    }

    const result = await waClient.sendMessage(decodeURIComponent(chatId), text.trim());
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error('Send message error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
