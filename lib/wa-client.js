const { Client, LocalAuth } = require('whatsapp-web.js');
const { query } = require('./db');

let client = null;
let clientStatus = 'disconnected'; // disconnected | qr_pending | connected
let currentQR = null;
let io = null; // Socket.io reference

function setIO(socketIO) {
  io = socketIO;
}

function getStatus() {
  return { status: clientStatus, qr: currentQR };
}

async function initClient() {
  if (client) return;

  client = new Client({
    authStrategy: new LocalAuth({ dataPath: '.wwebjs_auth' }),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
      ],
    },
  });

  client.on('qr', async (qr) => {
    console.log('📱 QR Code received — scan with WhatsApp');
    currentQR = qr;
    clientStatus = 'qr_pending';

    // Update DB status
    await query(`UPDATE wa_sessions SET status='qr_pending' WHERE session_key='default'`).catch(() => {});

    // Emit to all connected admin browsers
    if (io) io.emit('wa:qr', { qr });
    if (io) io.emit('wa:status', { status: 'qr_pending' });
  });

  client.on('ready', async () => {
    console.log('✅ WhatsApp client is ready!');
    currentQR = null;
    clientStatus = 'connected';

    const info = client.info;
    const phone = info?.wid?.user || '';
    const name = info?.pushname || '';

    await query(
      `UPDATE wa_sessions SET status='connected', connected_phone=?, connected_name=?, connected_at=NOW() WHERE session_key='default'`
      , [phone, name]
    ).catch(() => {});

    if (io) io.emit('wa:status', { status: 'connected', phone, name });
  });

  client.on('disconnected', async (reason) => {
    console.log('⚠️ WhatsApp disconnected:', reason);
    clientStatus = 'disconnected';
    currentQR = null;
    client = null;

    await query(`UPDATE wa_sessions SET status='disconnected' WHERE session_key='default'`).catch(() => {});

    if (io) io.emit('wa:status', { status: 'disconnected' });
  });

  client.on('message', async (msg) => {
    try {
      const chatId = msg.from;
      const body = msg.body || '';
      const timestamp = msg.timestamp;
      const messageId = msg.id?._serialized || `${chatId}_${timestamp}`;

      // Get contact info
      const contact = await msg.getContact();
      const contactName = contact.pushname || contact.name || contact.number || chatId;

      // Upsert contact
      await query(`
        INSERT INTO wa_contacts (wa_id, name, push_name, phone, last_message, last_message_time, unread_count)
        VALUES (?, ?, ?, ?, ?, FROM_UNIXTIME(?), 1)
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          push_name = VALUES(push_name),
          last_message = VALUES(last_message),
          last_message_time = VALUES(last_message_time),
          unread_count = unread_count + 1,
          updated_at = NOW()
      `, [chatId, contactName, contact.pushname || '', contact.number || '', body, timestamp]);

      // Insert message
      await query(`
        INSERT IGNORE INTO wa_messages (message_id, contact_wa_id, direction, body, timestamp, status)
        VALUES (?, ?, 'inbound', ?, ?, 'delivered')
      `, [messageId, chatId, body, timestamp]);

      // Broadcast to admin
      if (io) {
        io.emit('wa:message', {
          id: messageId,
          from: chatId,
          contactName,
          body,
          timestamp,
          direction: 'inbound',
        });
      }
    } catch (err) {
      console.error('Error handling message:', err.message);
    }
  });

  client.on('auth_failure', () => {
    console.error('❌ Auth failure');
    clientStatus = 'disconnected';
    client = null;
    if (io) io.emit('wa:status', { status: 'disconnected', error: 'auth_failure' });
  });

  try {
    await client.initialize();
  } catch (err) {
    console.error('Client init error:', err.message);
    client = null;
  }
}

async function sendMessage(chatId, text) {
  if (!client || clientStatus !== 'connected') {
    throw new Error('WhatsApp not connected');
  }

  const id = chatId.includes('@') ? chatId : `${chatId}@c.us`;
  const result = await client.sendMessage(id, text);

  // Save to DB
  const messageId = result.id?._serialized || `${id}_${Date.now()}`;
  const timestamp = Math.floor(Date.now() / 1000);

  await query(`
    INSERT IGNORE INTO wa_messages (message_id, contact_wa_id, direction, body, timestamp, status)
    VALUES (?, ?, 'outbound', ?, ?, 'sent')
  `, [messageId, id, text, timestamp]);

  // Update contact's last message
  await query(`
    UPDATE wa_contacts SET last_message=?, last_message_time=FROM_UNIXTIME(?), updated_at=NOW()
    WHERE wa_id=?
  `, [text, timestamp, id]);

  return { messageId, timestamp };
}

async function getChats() {
  if (!client || clientStatus !== 'connected') {
    return [];
  }
  try {
    const chats = await client.getChats();
    return chats.slice(0, 100).map(c => ({
      id: c.id._serialized,
      name: c.name,
      lastMessage: c.lastMessage?.body || '',
      timestamp: c.lastMessage?.timestamp || 0,
      unreadCount: c.unreadCount || 0,
      isGroup: c.isGroup,
    }));
  } catch (err) {
    console.error('getChats error:', err.message);
    return [];
  }
}

async function getChatMessages(chatId, limit = 50) {
  if (!client || clientStatus !== 'connected') {
    return [];
  }
  try {
    const id = chatId.includes('@') ? chatId : `${chatId}@c.us`;
    const chat = await client.getChatById(id);
    const messages = await chat.fetchMessages({ limit });
    return messages.map(m => ({
      id: m.id._serialized,
      body: m.body,
      timestamp: m.timestamp,
      fromMe: m.fromMe,
      direction: m.fromMe ? 'outbound' : 'inbound',
    }));
  } catch (err) {
    console.error('getChatMessages error:', err.message);
    return [];
  }
}

async function disconnectClient() {
  if (client) {
    await client.destroy();
    client = null;
    clientStatus = 'disconnected';
    if (io) io.emit('wa:status', { status: 'disconnected' });
  }
}

async function checkNumberExists(phone) {
  if (!client || clientStatus !== 'connected') return true; // assume valid if not connected
  try {
    const cleanPhone = phone.replace(/[^\d]/g, '');
    const numberId = await client.getNumberId(cleanPhone);
    return !!numberId;
  } catch {
    return true; // assume valid on error
  }
}

module.exports = {
  initClient,
  getStatus,
  sendMessage,
  getChats,
  getChatMessages,
  disconnectClient,
  checkNumberExists,
  setIO,
};
