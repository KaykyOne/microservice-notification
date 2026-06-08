import { startDetachedService } from "./process-utils.js";

startDetachedService("notification-service", "dist/server.js").catch((error) => {
    console.error("Erro ao iniciar microservico:", error);
    process.exit(1);
});
