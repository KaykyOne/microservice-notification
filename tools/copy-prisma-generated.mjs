import { cp, mkdir } from "fs/promises";
import path from "path";

const source = path.resolve("prisma", "generated");
const target = path.resolve("dist", "prisma", "generated");

await mkdir(path.dirname(target), { recursive: true });
await cp(source, target, { recursive: true, force: true });

