//* Package Imports
import * as z from "zod";

export const messageSchema = z.object({
    id: z.string().cuid(),
    text: z.string().min(1).max(500),
    type: z.enum(["EMAIL", "WHATSAPP", "SMS"]),
    webhook: z.string().url().optional(),
    webhookSent: z.boolean().default(false),
    webhookSentAt: z.date().optional(),
    createdAt: z.date().default(() => new Date()),
    phone: z.string().min(10).max(15),
    status: z.enum(["PENDING", "SENT", "FAILED", "SCHEDULED"]).default("PENDING"),
    forAt: z.date().default(() => new Date()),
});

export type Message = z.infer<typeof messageSchema>;
