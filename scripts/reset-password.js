const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const email = "leobatisti@gmail.com";
  const novaSenha = "12131415";

  const hash = await bcrypt.hash(novaSenha, 10);

  const user = await prisma.user.update({
    where: { email },
    data: { password: hash },
  });

  console.log("Senha atualizada com sucesso para:", user.email);
}

main()
  .catch((e) => {
    console.error("Erro ao atualizar senha:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });