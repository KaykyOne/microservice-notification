//* Node Imports
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

//* Config Imports
import config from "./config.json" with { type: "json" };

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let configCopia = JSON.parse(JSON.stringify(config));

const configPath = join(__dirname, "./config.json");

function setBotWhatsappStarted(value: boolean) {
    configCopia.whatsappStatus = value;
    writeFileSync(configPath, JSON.stringify(configCopia, null, 2));
};

function setBotEmailStarted(value: boolean) {
    configCopia.emailStatus = value;
    writeFileSync(configPath, JSON.stringify(configCopia, null, 2));
};

function setBotSmsStarted(value: boolean) {
    configCopia.smsStatus = value;
    writeFileSync(configPath, JSON.stringify(configCopia, null, 2));
};

export {
    setBotWhatsappStarted,
    setBotEmailStarted,
    setBotSmsStarted
}
export default configCopia;
