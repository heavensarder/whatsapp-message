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

// POST /api/wa/new-chat — start a new chat with a phone number
export async function POST(request) {
  try {
    const raw = await request.text();
    const { phone, name } = JSON.parse(raw);

    if (!phone?.trim()) {
      return NextResponse.json({ error: 'Phone number required' }, { status: 400 });
    }

    // Sanitize phone: strip spaces, dashes, +, parentheses — digits only
    const cleanPhone = phone.replace(/[^\d]/g, '');
    if (cleanPhone.length < 7) {
      return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 });
    }

    const waId = `${cleanPhone}@c.us`;
    const contactName = name?.trim() || cleanPhone;

    // Check WhatsApp client is connected
    const waClient = globalThis.__waClient;
    if (!waClient) {
      return NextResponse.json({ error: 'WhatsApp not connected' }, { status: 503 });
    }

    const status = waClient.getStatus();
    if (status.status !== 'connected') {
      return NextResponse.json({ error: 'WhatsApp not connected. Please scan QR code first.' }, { status: 503 });
    }

    // Verify number exists on WhatsApp
    let isValid = false;
    try {
      const result = await waClient.checkNumberExists(cleanPhone);
      isValid = result;
    } catch {
      // If check fails, proceed anyway (some WA versions don't support this)
      isValid = true;
    }

    if (!isValid) {
      return NextResponse.json({ error: 'This number is not registered on WhatsApp' }, { status: 404 });
    }

    // Upsert contact into DB so it appears in sidebar
    const p = getPool();
    await p.execute(`
      INSERT INTO wa_contacts (wa_id, name, push_name, phone, last_message, last_message_time, unread_count)
      VALUES (?, ?, ?, ?, '', NULL, 0)
      ON DUPLICATE KEY UPDATE
        name = IF(? != '', ?, name),
        updated_at = NOW()
    `, [waId, contactName, contactName, cleanPhone, contactName, contactName]);

    return NextResponse.json({
      success: true,
      contact: { wa_id: waId, name: contactName, phone: cleanPhone, unread_count: 0 },
    });
  } catch (err) {
    console.error('New chat error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
