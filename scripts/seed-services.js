const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando seed de serviços...");
  
  // 1. Verificar se o serviço com slug "aluguel-temporada" já existe
  const existingService = await prisma.siteService.findUnique({
    where: { slug: "aluguel-temporada" }
  });
  
  if (existingService) {
    console.log("Serviço 'aluguel-temporada' já existe cadastrado.");
    return;
  }
  
  // 2. Verificar ou criar a taxa correspondente
  let fee = await prisma.siteFee.findFirst({
    where: { name: "Taxa de Aluguel por Temporada" }
  });
  
  if (!fee) {
    console.log("Criando taxa administrativa 'Taxa de Aluguel por Temporada'...");
    fee = await prisma.siteFee.create({
      data: {
        name: "Taxa de Aluguel por Temporada",
        type: "FIXED",
        value: 10.00,
        description: "Taxa cobrada do anfitrião para revelar o contato do hóspede no aluguel por temporada",
        isActive: true
      }
    });
  }
  
  // 3. Criar o serviço "Aluguel por Temporada" e associar à taxa
  console.log("Criando serviço 'Aluguel por Temporada'...");
  await prisma.siteService.create({
    data: {
      name: "Aluguel por Temporada",
      slug: "aluguel-temporada",
      description: "Serviço de intermediação de reservas e liberação de contatos de hóspedes",
      isActive: true,
      feeId: fee.id
    }
  });
  
  console.log("Seed concluído com sucesso!");
}

main()
  .catch(e => {
    console.error("Erro no seed de serviços:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
