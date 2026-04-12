import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    // if (!session || (session.user as any).role !== 'ADMIN') {
    //   return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    // }

    // Fetch all emails grouped broadly, or just the latest 100 for MVP
    const emails = await prisma.emailMessage.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    return NextResponse.json({ success: true, emails });
  } catch (error: any) {
    console.error('FETCH EMAILS ERROR:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
