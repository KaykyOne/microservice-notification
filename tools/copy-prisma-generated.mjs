import { cp, mkdir } from "fs/promises";
import path from "path";

const source = path.resolve("prisma", "generated");
const target = path.resolve("dist", "prisma", "generated");
const audioTranscriberSource = path.resolve("tools", "audio-transcriber.mjs");
const audioTranscriberTarget = path.resolve("dist", "tools", "audio-transcriber.mjs");

await mkdir(path.dirname(target), { recursive: true });
await cp(source, target, { recursive: true, force: true });

await mkdir(path.dirname(audioTranscriberTarget), { recursive: true });
await cp(audioTranscriberSource, audioTranscriberTarget, { force: true });
