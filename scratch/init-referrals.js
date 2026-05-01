const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando ativação da rede...");

  // 1. Dar 5 créditos para todos os usuários atuais
  const users = await prisma.user.findMany();
  console.log(`Encontrados ${users.length} usuários.`);

  for (const user of users) {
    const referralCode = `${user.name.split(' ')[0].toUpperCase()}-${user.id}`;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        viralizarCredits: 5,
        referralCode: referralCode
      }
    });
    console.log(`Ativado: ${user.name} | Créditos: 5 | Código: ${referralCode}`);
  }

  // 2. Definir o primeiro usuário como ADMIN se necessário
  if (users.length > 0) {
      await prisma.user.update({
          where: { id: users[0].id },
          data: { role: 'ADMIN' }
      });
      console.log(`Usuário ${users[0].name} definido como ADMIN da raiz.`);
  }

  console.log("Rede inicializada com sucesso!");
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
