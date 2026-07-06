//* Prisma Imports
import { prismaManager } from "../../prisma/prisma.js";

await prismaManager.message.deleteMany();

prismaManager.$disconnect().then(() => {
    console.log("Mensagens apagadas com sucesso!");
    process.exit(0);
}).catch((error) => {
    console.error("Erro ao apagar mensagens:", error);
    process.exit(1);
})
