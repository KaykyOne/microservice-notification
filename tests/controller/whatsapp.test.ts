//* Library Imports
import { beforeEach, describe, expect, test, vi } from "vitest";
import type * as z from "zod";

//* Type Imports
import type { Request, Response } from "express";

//* Schema Imports
import { messageSchema } from "../../src/schemas/message.js";

type MessagePayload = z.input<typeof messageSchema>;

const mocks = vi.hoisted(() => ({
  sendMessageService: vi.fn(),
}));

vi.mock(import("../../src/http/services/whatsapp.service.js"), () => ({
  sendMessageService: mocks.sendMessageService,
}));

vi.mock("../../src/utils/logger.js", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

const { sendMessage } = await import("../../src/http/controller/whatsapp.controller.js");

function makeRequest(body: unknown): Request {
  return { body } as Request;
}

function makeResponse(): Response {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  };

  res.status.mockReturnValue(res);

  return res as unknown as Response;
}

describe("sendMessage controller", () => {
  beforeEach(() => {
    mocks.sendMessageService.mockReset();
  });

  test("retorna 400 quando text ou phone nao sao enviados", async () => {
    const req = makeRequest({
      text: "Ola!",
    });
    const res = makeResponse();

    await sendMessage(req, res);

    expect(mocks.sendMessageService).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "As propriedades text ou phone nao foram encontradas!",
    });
  });

  test("retorna 200 quando a mensagem e enviada com sucesso", async () => {
    const message: MessagePayload = {
      id: "clx1234560000000000000000",
      text: "Ola!",
      phone: "11999999999",
      type: "WHATSAPP",
    };
    const req = makeRequest(message);
    const res = makeResponse();

    mocks.sendMessageService.mockResolvedValue(undefined);

    await sendMessage(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(mocks.sendMessageService).toHaveBeenCalledWith(message);
    expect(res.json).toHaveBeenCalledWith({
      message: "Mensagem enviada com sucesso!",
    });
  });
});
