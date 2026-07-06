//* Infra Imports
import { whatsapp } from "../infra/index.js";

async function main() {
    await whatsapp.startBot();
    console.log("Fluxo de conexao do WhatsApp iniciado.");
    console.log("Escaneie o QR Code no terminal, se ele aparecer.");
    console.log("Status atual:", whatsapp.getBotStatus());
    console.log("Pressione Ctrl+C para encerrar este script.");
}

process.on("SIGINT", async () => {
    await whatsapp.destruirSessao();
    process.exit(0);
});

process.on("SIGTERM", async () => {
    await whatsapp.destruirSessao();
    process.exit(0);
});

main().catch((error) => {
    console.error("Erro ao conectar WhatsApp:", error);
    process.exit(1);
});
