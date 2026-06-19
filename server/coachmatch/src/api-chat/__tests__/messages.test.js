import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockStream } = vi.hoisted(() => ({
  mockStream: {
    channel: vi.fn(),
    getMessage: vi.fn(),
    updateMessage: vi.fn(),
    deleteMessage: vi.fn(),
  },
}));

vi.mock("../../shared/streamClient.js", () => ({
  getStreamClient: () => mockStream,
  __resetStreamClientForTests: () => {},
}));

import {
  sendMessage,
  listMessages,
  updateMessage,
  deleteMessage,
} from "../service/messages.js";
import * as handlers from "../messages.js";

const makeChannel = (id, members) => ({
  id,
  state: { members: Object.fromEntries(members.map((m) => [m, { user_id: m }])) },
  query: vi.fn().mockResolvedValue({ messages: [] }),
  sendMessage: vi.fn(),
});

const authEvent = (sub, extra = {}) => ({
  requestContext: { authorizer: { jwt: { claims: { sub } } } },
  ...extra,
});

beforeEach(() => vi.clearAllMocks());

describe("chat / messages (service)", () => {
  it("envia mensagem quando membro", async () => {
    const ch = makeChannel("c1", ["u1", "u2"]);
    ch.sendMessage.mockResolvedValue({
      message: { id: "m1", text: "oi", user: { id: "u1" }, created_at: "t" },
    });
    mockStream.channel.mockReturnValue(ch);

    const res = await sendMessage({ userId: "u1", channelId: "c1", text: "oi" });

    expect(ch.sendMessage).toHaveBeenCalledWith({ text: "oi", user_id: "u1" });
    expect(res).toMatchObject({ id: "m1", text: "oi", userId: "u1" });
  });

  it("bloqueia envio de não-membro (403)", async () => {
    const ch = makeChannel("c1", ["u2", "u3"]);
    mockStream.channel.mockReturnValue(ch);
    await expect(
      sendMessage({ userId: "u1", channelId: "c1", text: "oi" })
    ).rejects.toThrow("Acesso negado");
  });

  it("lista mensagens da conversa", async () => {
    const ch = makeChannel("c1", ["u1", "u2"]);
    ch.query.mockResolvedValue({
      messages: [{ id: "m1", text: "oi", user: { id: "u2" }, created_at: "t" }],
    });
    mockStream.channel.mockReturnValue(ch);

    const res = await listMessages({ userId: "u1", channelId: "c1", limit: 10, before: "m9" });
    expect(ch.query).toHaveBeenCalledWith(
      expect.objectContaining({ messages: { limit: 10, id_lt: "m9" } })
    );
    expect(res).toHaveLength(1);
  });

  it("edita mensagem do próprio autor", async () => {
    mockStream.getMessage.mockResolvedValue({
      message: { id: "m1", text: "old", user: { id: "u1" } },
    });
    mockStream.updateMessage.mockResolvedValue({
      message: { id: "m1", text: "novo", user: { id: "u1" }, updated_at: "t" },
    });

    const res = await updateMessage({ userId: "u1", messageId: "m1", text: "novo" });
    expect(mockStream.updateMessage).toHaveBeenCalledWith({ id: "m1", text: "novo" }, "u1");
    expect(res.text).toBe("novo");
  });

  it("bloqueia edição de mensagem de outro autor (403)", async () => {
    mockStream.getMessage.mockResolvedValue({
      message: { id: "m1", text: "old", user: { id: "u2" } },
    });
    await expect(
      updateMessage({ userId: "u1", messageId: "m1", text: "x" })
    ).rejects.toThrow("suas próprias mensagens");
  });

  it("apaga mensagem do próprio autor", async () => {
    mockStream.getMessage.mockResolvedValue({ message: { id: "m1", user: { id: "u1" } } });
    mockStream.deleteMessage.mockResolvedValue({
      message: { id: "m1", deleted_at: "t", user: { id: "u1" } },
    });
    const res = await deleteMessage({ userId: "u1", messageId: "m1" });
    expect(mockStream.deleteMessage).toHaveBeenCalledWith("m1");
    expect(res.deletedAt).toBe("t");
  });
});

describe("chat / messages (handlers)", () => {
  it("valida texto vazio no envio (400)", async () => {
    const res = await handlers.send(
      authEvent("u1", { pathParameters: { id: "c1" }, body: JSON.stringify({ text: "" }) })
    );
    expect(res.statusCode).toBe(400);
  });

  it("envia mensagem via handler (200)", async () => {
    const ch = makeChannel("c1", ["u1", "u2"]);
    ch.sendMessage.mockResolvedValue({
      message: { id: "m1", text: "oi", user: { id: "u1" }, created_at: "t" },
    });
    mockStream.channel.mockReturnValue(ch);
    const res = await handlers.send(
      authEvent("u1", { pathParameters: { id: "c1" }, body: JSON.stringify({ text: "oi" }) })
    );
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).text).toBe("oi");
  });
});
