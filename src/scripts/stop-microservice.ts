import { stopDetachedService } from "./process-utils.js";

stopDetachedService("notification-service").catch((error) => {
    console.error("Erro ao parar microservico:", error);
    process.exit(1);
});
