import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockStream } = vi.hoisted(() => ({
  mockStream: {
    channel: vi.fn(),
    queryChannels: vi.fn(),
  },
}));

vi.mock("../../shared/streamClient.js", () => ({
  getStreamClient: () => mockStream,
  __resetStreamClientForTests: () => {},
}));

import {
  createConversation,
  listConversations,
  updateConversation,
  deleteConversation,
} from "../service/conversations.js";
import * as handlers from "../conversations.js";

const makeChannel = (id, members, data = {}) => ({
  id,
  data: { ...data },
  state: {
    members: Object.fromEntries(members.map((m) => [m, { user_id: m }])),
    messages: [],
  },
  create: vi.fn().mockResolvedValue(undefined),
  query: vi.fn().mockResolvedValue({ messages: [] }),
  updatePartial: vi.fn().mockResolvedValue(undefined),
  hide: vi.fn().mockResolvedValue(undefined),
});

const authEvent = (sub, extra = {}) => ({
  requestContext: { authorizer: { jwt: { claims: { sub } } } },
  ...extra,
});

beforeEach(() => vi.clearAllMocks());

describe("chat / conversations (service)", () => {
  it("cria conversa entre dois usuários", async () => {
    const ch = makeChannel("dm_aaa_bbb", ["u1", "u2"]);
    mockStream.channel.mockReturnValue(ch);

    const res = await createConversation({ userId: "u1", peerId: "u2" });

    expect(ch.create).toHaveBeenCalled();
    expect(res.id).toBe("dm_aaa_bbb");
    expect(res.members).toEqual(expect.arrayContaining(["u1", "u2"]));
  });

  it("rejeita conversa consigo mesmo", async () => {
    await expect(createConversation({ userId: "u1", peerId: "u1" })).rejects.toThrow(
      "consigo mesmo"
    );
  });

  it("exige peerId", async () => {
    await expect(createConversation({ userId: "u1" })).rejects.toThrow("peerId");
  });

  it("lista conversas do usuário", async () => {
    mockStream.queryChannels.mockResolvedValue([makeChannel("c1", ["u1", "u2"])]);
    const res = await listConversations({ userId: "u1" });
    expect(mockStream.queryChannels).toHaveBeenCalledWith(
      { type: "messaging", members: { $in: ["u1"] } },
      { last_message_at: -1 },
      expect.objectContaining({ state: true })
    );
    expect(res).toHaveLength(1);
  });

  it("atualiza conversa quando membro", async () => {
    const ch = makeChannel("c1", ["u1", "u2"], { name: "antigo" });
    mockStream.channel.mockReturnValue(ch);
    await updateConversation({ userId: "u1", channelId: "c1", data: { name: "novo" } });
    expect(ch.updatePartial).toHaveBeenCalledWith({ set: { name: "novo" } });
  });

  it("bloqueia atualização de não-membro (403)", async () => {
    const ch = makeChannel("c1", ["u2", "u3"]);
    mockStream.channel.mockReturnValue(ch);
    await expect(
      updateConversation({ userId: "u1", channelId: "c1", data: { name: "x" } })
    ).rejects.toThrow("Acesso negado");
  });

  it("oculta conversa para o usuário", async () => {
    const ch = makeChannel("c1", ["u1", "u2"]);
    mockStream.channel.mockReturnValue(ch);
    const res = await deleteConversation({ userId: "u1", channelId: "c1" });
    expect(ch.hide).toHaveBeenCalledWith("u1");
    expect(res).toEqual({ id: "c1", hidden: true });
  });
});

describe("chat / conversations (handlers)", () => {
  it("retorna 401 sem usuário", async () => {
    const res = await handlers.list({});
    expect(res.statusCode).toBe(401);
  });

  it("valida body na criação (400)", async () => {
    const res = await handlers.create(authEvent("u1", { body: JSON.stringify({}) }));
    expect(res.statusCode).toBe(400);
  });

  it("cria conversa via handler (200)", async () => {
    const ch = makeChannel("dm_x", ["u1", "u2"]);
    mockStream.channel.mockReturnValue(ch);
    const res = await handlers.create(
      authEvent("u1", { body: JSON.stringify({ peerId: "u2" }) })
    );
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).members).toContain("u1");
  });

  it("exige id da conversa no update (400)", async () => {
    const res = await handlers.update(authEvent("u1", { body: JSON.stringify({ name: "x" }) }));
    expect(res.statusCode).toBe(400);
  });
});
