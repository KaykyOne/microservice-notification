import { npmCommand, pm2Command, runChecked } from "./process-utils.js";

async function main() {
    runChecked(npmCommand(), ["run", "build"], "Rodando build...");

    const pm2 = pm2Command();
    runChecked(pm2, ["--version"], "Verificando PM2...");

    try {
        runChecked(pm2, ["delete", "notify"], "Removendo processo PM2 antigo, se existir...");
    } catch {
        console.log("Nenhum processo PM2 antigo chamado notify encontrado.");
    }

    runChecked(pm2, ["start", npmCommand(), "--name", "notify", "--", "run", "start"], "Iniciando PM2 como notify...");
    runChecked(pm2, ["save"], "Salvando lista de processos PM2...");
    console.log("Processo PM2 notify iniciado.");
}

main().catch((error) => {
    console.error("Erro ao iniciar PM2 notify:", error);
    process.exit(1);
});
