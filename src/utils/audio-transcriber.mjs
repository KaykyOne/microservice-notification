//* Node Imports
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import { promises as fsPromises } from "node:fs";
import os from "node:os";
import path from "node:path";

//* Package Imports
import OpenAI from "openai";

const DEFAULT_MODEL = "gpt-4o-transcribe";
const DEFAULT_TIMEOUT_MS = 60_000;

function resolveApiKey(apiKey) {
  const resolvedApiKey = apiKey || process.env.OPENAI_KEY || process.env.OPENAI_API_KEY;

  if (!resolvedApiKey) {
    throw new Error("OPENAI_KEY or OPENAI_API_KEY is required to transcribe audio");
  }

  return resolvedApiKey;
}

function createOpenAIClient(apiKey) {
  return new OpenAI({
    apiKey: resolveApiKey(apiKey)
  });
}

function resolveTimeoutMs(timeoutMs) {
  if (timeoutMs === undefined) {
    return DEFAULT_TIMEOUT_MS;
  }

  const parsedTimeout = Number(timeoutMs);

  if (!Number.isFinite(parsedTimeout) || parsedTimeout <= 0) {
    throw new Error("Transcription timeout must be a positive number of milliseconds");
  }

  return parsedTimeout;
}

function normalizeAudioBuffer(audio) {
  if (Buffer.isBuffer(audio)) {
    return audio;
  }

  if (audio instanceof ArrayBuffer) {
    return Buffer.from(audio);
  }

  if (audio instanceof Uint8Array) {
    return Buffer.from(audio.buffer, audio.byteOffset, audio.byteLength);
  }

  if (typeof audio === "string") {
    const base64Audio = audio.includes(",") ? audio.split(",").pop() : audio;
    return Buffer.from(base64Audio || "", "base64");
  }

  throw new TypeError("Audio must be a Buffer, Uint8Array, ArrayBuffer, or base64 string");
}

function assertNonEmptyAudio(size) {
  if (size === 0) {
    throw new Error("Audio is empty; make sure the WhatsApp media content is downloaded before transcribing");
  }
}

async function assertReadableAudioFile(audioPath) {
  const stats = await fsPromises.stat(audioPath);

  if (!stats.isFile()) {
    throw new Error(`Audio path is not a file: ${audioPath}`);
  }

  assertNonEmptyAudio(stats.size);
}

async function removeFileIfNeeded(audioPath, deleteFile = false) {
  if (!deleteFile) return;

  try {
    await fsPromises.unlink(audioPath);
  } catch (error) {
    if ((error).code !== "ENOENT") {
      throw error;
    }
  }
}

export async function transcribeAudioFile(
  audioPath,
  options = {}
) {
  try {
    await assertReadableAudioFile(audioPath);

    const client = createOpenAIClient(options.apiKey);
    const request = {
      file: fs.createReadStream(audioPath),
      model: options.model || DEFAULT_MODEL,
      response_format: "json",
      stream: false
    };

    if (options.language) {
      request.language = options.language;
    }

    if (options.prompt) {
      request.prompt = options.prompt;
    }

    const transcription = await client.audio.transcriptions.create(request, {
      timeout: resolveTimeoutMs(options.timeoutMs ?? options.timeout)
    });
    return transcription.text || "";
  } finally {
    await removeFileIfNeeded(audioPath, options.deleteFile);
  }
}

export async function transcribeAudioBuffer(
  audio,
  options = {}
) {
  const audioBuffer = normalizeAudioBuffer(audio);
  assertNonEmptyAudio(audioBuffer.length);

  const tempDir = options.tempDir || os.tmpdir();
  const fileName = options.fileName || "audio.ogg";
  const safeFileName = path.basename(fileName).replace(/[^\w.-]/g, "_");
  const audioPath = path.join(tempDir, `${Date.now()}-${randomUUID()}-${safeFileName}`);

  await fsPromises.mkdir(tempDir, { recursive: true });
  await fsPromises.writeFile(audioPath, audioBuffer);

  return transcribeAudioFile(audioPath, {
    ...options,
    deleteFile: true
  });
}
