import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const waClient = globalThis.__waClient;
    if (waClient) await waClient.disconnectClient();
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
