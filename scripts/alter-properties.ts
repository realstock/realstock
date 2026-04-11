import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  try {
    // Check if the column exists first
    const result = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='properties' AND column_name='boosted_until';
    `;
    
    if (Array.isArray(result) && result.length === 0) {
      console.log('Adding boosted_until column...');
      await prisma.$executeRaw`ALTER TABLE properties ADD COLUMN boosted_until TIMESTAMP;`;
      console.log('Column added successfully.');
    } else {
      console.log('Column boosted_until already exists.');
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

main().finally(() => prisma.$disconnect());
