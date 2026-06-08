import { rm } from "fs/promises";
import path from "path";

const SESSION_PATH = path.resolve("sessions", "whatsapp-baileys");

async function main() {
    await rm(SESSION_PATH, { recursive: true, force: true });
    console.log(`Sessao do WhatsApp removida: ${SESSION_PATH}`);
}

main().catch((error) => {
    console.error("Erro ao remover sessao do WhatsApp:", error);
    process.exit(1);
});
