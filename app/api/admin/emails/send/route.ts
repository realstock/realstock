import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { Resend } from 'resend';

// Delay the initialization to prevent Next.js build errors when env is omitted

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    // Assuming role validation if needed
    // if (!session || (session.user as any).role !== 'ADMIN') {
    //   return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    // }

    const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy");

    const { to, subject, htmlBody, inReplyToId } = await req.json();

    if (!to || !subject || !htmlBody) {
        return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const fromEmail = process.env.EMAIL_FROM || 'RealStock <contato@realstock.com.br>';

    // Send the email via Resend
    const resendResponse = await resend.emails.send({
      from: fromEmail,
      to,
      subject,
      html: htmlBody,
    });

    if (resendResponse.error) {
        return NextResponse.json({ success: false, error: resendResponse.error.message }, { status: 500 });
    }

    // Save outbound email to DB
    const emailData: any = {
      sender: fromEmail,
      recipient: to,
      subject,
      htmlBody,
      direction: 'OUTBOUND',
      status: 'READ',
    };

    if (inReplyToId) {
        emailData.inReplyToId = inReplyToId;
    }

    const savedEmail = await prisma.emailMessage.create({
      data: emailData
    });

    return NextResponse.json({ success: true, id: savedEmail.id, resendId: resendResponse.data?.id });
  } catch (error: any) {
    console.error('EMAIL SEND ERROR:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
