import { startBot, getBotStatus, destruirSessao } from "../infra/whatsapp/baileys.js";

async function main() {
    await startBot();
    console.log("Fluxo de conexao do WhatsApp iniciado.");
    console.log("Escaneie o QR Code no terminal, se ele aparecer.");
    console.log("Status atual:", getBotStatus());
    console.log("Pressione Ctrl+C para encerrar este script.");
}

process.on("SIGINT", async () => {
    await destruirSessao();
    process.exit(0);
});

process.on("SIGTERM", async () => {
    await destruirSessao();
    process.exit(0);
});

main().catch((error) => {
    console.error("Erro ao conectar WhatsApp:", error);
    process.exit(1);
});
