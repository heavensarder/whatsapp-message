// ESM wrapper around the CommonJS wa-client singleton
// This file is used by Next.js API routes to access the same WA client
// that server.js initialized (same Node.js process, shared module cache)

// We use globalThis to share the wa client state across the module system
// server.js sets global.__waClient on startup

export async function sendMessage(chatId, text) {
  const waClient = globalThis.__waClient;
  if (!waClient) {
    throw new Error('WhatsApp client not initialized. Make sure to start the app with: node server.js');
  }
  return waClient.sendMessage(chatId, text);
}

export async function getChats() {
  const waClient = globalThis.__waClient;
  if (!waClient) return [];
  return waClient.getChats();
}

export async function getStatus() {
  const waClient = globalThis.__waClient;
  if (!waClient) return { status: 'disconnected', qr: null };
  return waClient.getStatus();
}

export async function disconnectClient() {
  const waClient = globalThis.__waClient;
  if (waClient) await waClient.disconnectClient();
}
