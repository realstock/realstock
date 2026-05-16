import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const property = await prisma.property.findUnique({
        where: { id: 11 }
    });
    console.log("Property fields:", Object.keys(property || {}));
}

main().catch(console.error).finally(() => prisma.$disconnect());
