import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  try {
    const result = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='users' AND column_name='portfolio_boosted_until';
    `;
    
    if (Array.isArray(result) && result.length === 0) {
      console.log('Adding portfolio_boosted_until column...');
      await prisma.$executeRaw`ALTER TABLE users ADD COLUMN portfolio_boosted_until TIMESTAMP;`;
      console.log('Column added successfully.');
    } else {
      console.log('Column portfolio_boosted_until already exists.');
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

main().finally(() => prisma.$disconnect());
