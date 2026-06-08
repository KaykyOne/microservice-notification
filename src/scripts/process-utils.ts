import { openSync } from "fs";
import { mkdir, readFile, rm, writeFile } from "fs/promises";
import path from "path";
import { spawn, spawnSync } from "child_process";

const RUNTIME_DIR = path.resolve(".runtime");

function isWindows() {
    return process.platform === "win32";
}

function npmCommand() {
    return isWindows() ? "npm.cmd" : "npm";
}

function pm2Command() {
    return isWindows() ? "pm2.cmd" : "pm2";
}

function powershellCommand() {
    const systemRoot = process.env.SystemRoot || "C:\\WINDOWS";
    return path.join(systemRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
}

function pidPath(name: string) {
    return path.join(RUNTIME_DIR, `${name}.pid`);
}

function logPath(name: string, type: "out" | "err") {
    return path.join(RUNTIME_DIR, `${name}.${type}.log`);
}

function psQuote(value: string) {
    return `'${value.replace(/'/g, "''")}'`;
}

async function ensureRuntimeDir() {
    await mkdir(RUNTIME_DIR, { recursive: true });
}

function isProcessRunning(pid: number) {
    try {
        process.kill(pid, 0);
        return true;
    } catch {
        return false;
    }
}

async function readPid(name: string) {
    try {
        const value = await readFile(pidPath(name), "utf8");
        const pid = Number(value.trim());
        return Number.isInteger(pid) && pid > 0 ? pid : null;
    } catch {
        return null;
    }
}

async function removePid(name: string) {
    await rm(pidPath(name), { force: true });
}

async function startDetachedService(name: string, entrypoint: string) {
    await ensureRuntimeDir();

    const currentPid = await readPid(name);
    if (currentPid && isProcessRunning(currentPid)) {
        console.log(`Microservico ja esta rodando. PID: ${currentPid}`);
        return currentPid;
    }

    if (isWindows()) {
        const argumentList = `"${entrypoint.replace(/"/g, '\\"')}"`;
        const command = [
            `$process = Start-Process -FilePath ${psQuote(process.execPath)}`,
            `-ArgumentList ${psQuote(argumentList)}`,
            `-WorkingDirectory ${psQuote(process.cwd())}`,
            `-RedirectStandardOutput ${psQuote(logPath(name, "out"))}`,
            `-RedirectStandardError ${psQuote(logPath(name, "err"))}`,
            "-WindowStyle Hidden",
            "-PassThru;",
            "$process.Id"
        ].join(" ");
        const result = spawnSync(powershellCommand(), ["-NoProfile", "-Command", command], {
            cwd: process.cwd(),
            encoding: "utf8",
            windowsHide: true
        });

        if (result.status !== 0) {
            throw new Error(result.stderr || result.stdout || "Falha ao iniciar microservico com Start-Process.");
        }

        const pid = Number(result.stdout.trim());
        if (!Number.isInteger(pid) || pid <= 0) {
            throw new Error(`PID invalido retornado pelo Start-Process: ${result.stdout}`);
        }

        await writeFile(pidPath(name), String(pid));
        console.log(`Microservico iniciado. PID: ${pid}`);
        console.log(`Logs: ${logPath(name, "out")} e ${logPath(name, "err")}`);
        return pid;
    }

    const out = openSync(logPath(name, "out"), "a");
    const err = openSync(logPath(name, "err"), "a");
    const child = spawn(process.execPath, [entrypoint], {
        cwd: process.cwd(),
        detached: true,
        stdio: ["ignore", out, err],
        windowsHide: true
    });

    child.unref();
    await writeFile(pidPath(name), String(child.pid));
    console.log(`Microservico iniciado. PID: ${child.pid}`);
    console.log(`Logs: ${logPath(name, "out")} e ${logPath(name, "err")}`);
    return child.pid;
}

async function stopDetachedService(name: string) {
    const pid = await readPid(name);

    if (!pid) {
        console.log("Nenhum PID encontrado para o microservico.");
        return;
    }

    if (!isProcessRunning(pid)) {
        await removePid(name);
        console.log("PID antigo removido. Microservico nao estava rodando.");
        return;
    }

    if (isWindows()) {
        const result = spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "inherit" });
        if (result.status !== 0) {
            throw new Error(`Falha ao parar o microservico pelo PID ${pid}.`);
        }
    } else {
        process.kill(-pid, "SIGTERM");
    }

    await removePid(name);
    console.log(`Microservico parado. PID: ${pid}`);
}

function runChecked(command: string, args: string[], label: string) {
    console.log(label);
    const result = spawnSync(command, args, {
        cwd: process.cwd(),
        stdio: "inherit",
        windowsHide: true
    });

    if (result.status !== 0) {
        throw new Error(`Comando falhou: ${command} ${args.join(" ")}`);
    }
}

export {
    ensureRuntimeDir,
    isProcessRunning,
    npmCommand,
    pm2Command,
    removePid,
    runChecked,
    startDetachedService,
    stopDetachedService
};
