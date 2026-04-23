import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // Assuming lib/prisma exists based on general structure

export async function POST(req: Request) {
  try {
    // Resend Inbound Webhook payload structure:
    // { "from": "...", "to": "...", "subject": "...", "text": "...", "html": "...", "headers": ... }
    const rawBody = await req.text();
    console.log("INBOUND RAW BODY:", rawBody);
    let body;
    try {
        body = JSON.parse(rawBody);
    } catch(e) {
        return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
    }

    const payloadData = body.data || body;

    // Typical fields from Resend Inbound Webhook payload
    const from = payloadData.from || 'Unknown Sender';
    const toRaw = payloadData.to;
    const to = Array.isArray(toRaw) ? toRaw.join(", ") : (toRaw || 'Unknown Recipient');
    const subject = payloadData.subject || 'No Subject';
    const textBody = payloadData.text || '';
    const htmlBody = payloadData.html || '';

    // Check if there is an In-Reply-To header to thread messages
    let inReplyToId = null;
    let originalThreadId = null;

    // Resend provides headers usually as a string or array, but for robustness
    if (body.headers && Array.isArray(body.headers)) {
        const inReplyHeader = body.headers.find((h: any) => h.name?.toLowerCase() === 'in-reply-to');
        if (inReplyHeader) {
            inReplyToId = inReplyHeader.value;
        }
    }

    // Try to find if this thread already exists in the database
    let existingThreadMsg = null;
    if (inReplyToId) {
        // Here we could try matching message IDs if we stored them, but for simplicity
        // you might use regex on subject or sender to find the last message 
        // if exact headers aren't persisted. For this MVP, we save it as a new message.
    }

    const email = await prisma.emailMessage.create({
      data: {
        sender: from,
        recipient: to,
        subject: subject,
        textBody: textBody,
        htmlBody: htmlBody,
        direction: 'INBOUND',
        status: 'UNREAD',
      }
    });

    return NextResponse.json({ success: true, id: email.id });
  } catch (error: any) {
    console.error("INBOUND WEBHOOK ERROR:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
