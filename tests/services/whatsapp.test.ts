//* Library Imports
import { beforeEach, describe, expect, test, vi } from "vitest";
import type * as z from "zod";

//* Schema Imports
import { messageSchema } from "../../src/schemas/message.js";

//* Type Imports
import type { Message } from "../../src/schemas/message.js";

type MessagePayload = z.input<typeof messageSchema>;

const createMessageMock = vi.fn();

vi.mock("../../prisma/prisma.js", () => ({
  prismaManager: {
    message: {
      create: createMessageMock,
    },
  },
}));

vi.mock("../../src/infra/index.js", () => ({
  whatsapp: {
    startBot: vi.fn(),
    enviarMensagem: vi.fn(),
    state: { iniciado: false },
    getBotStatus: vi.fn(),
  },
}));

vi.mock("../../src/utils/logger.js", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

const { sendMessageService } = await import("../../src/http/services/whatsapp.service.js");

describe("sendMessageService", () => {
  beforeEach(() => {
    createMessageMock.mockReset();
    createMessageMock.mockResolvedValue({});
  });

  test("salva uma mensagem imediata como pendente", async () => {
    const message: MessagePayload = {
      id: "clx1234560000000000000000",
      text: "Ola, mundo!",
      phone: "11999999999",
      type: "WHATSAPP",
    };
    await sendMessageService(message as Message);

    expect(createMessageMock).toHaveBeenCalledWith({
      data: {
        text: "Ola, mundo!",
        phone: "5511999999999@s.whatsapp.net",
        status: "PENDING",
        webhook: null,
        type: "WHATSAPP",
      },
    });
  });

  test("salva uma mensagem com data futura como agendada", async () => {
    const message: MessagePayload = {
      id: "clx1234570000000000000000",
      text: "Lembrete",
      phone: "11999999999",
      type: "WHATSAPP",
      webhook: "https://example.com/webhook",
      forAt: new Date("2026-07-10T10:00:00.000Z"),
    };
    await sendMessageService(message as Message);

    expect(createMessageMock).toHaveBeenCalledWith({
      data: {
        text: "Lembrete",
        phone: "5511999999999@s.whatsapp.net",
        status: "SCHEDULED",
        webhook: "https://example.com/webhook",
        type: "WHATSAPP",
        forAt: new Date("2026-07-10T10:00:00.000Z"),
      },
    });
  });
});
