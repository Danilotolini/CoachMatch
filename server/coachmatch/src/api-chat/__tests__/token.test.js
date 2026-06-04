const mockStream = {
  upsertUser: jest.fn(),
  createToken: jest.fn(),
};

jest.mock("../../shared/streamClient.js", () => ({
  getStreamClient: () => mockStream,
  __resetStreamClientForTests: () => {},
}));

import { issueToken } from "../service/token.js";
import { handler } from "../token.js";

describe("chat / token", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.STREAM_API_KEY = "key_123";
  });

  it("faz upsert do usuário e emite token", async () => {
    mockStream.createToken.mockReturnValue("tkn_abc");

    const res = await issueToken({ userId: "u1", name: "João", email: "j@x.com" });

    expect(mockStream.upsertUser).toHaveBeenCalledWith({
      id: "u1",
      name: "João",
      role: "user",
    });
    expect(res).toMatchObject({ apiKey: "key_123", userId: "u1", token: "tkn_abc" });
    expect(typeof res.expiresAt).toBe("string");
  });

  it("usa email/userId como nome quando name ausente", async () => {
    mockStream.createToken.mockReturnValue("t");
    await issueToken({ userId: "u1", email: "j@x.com" });
    expect(mockStream.upsertUser).toHaveBeenCalledWith(
      expect.objectContaining({ name: "j@x.com" })
    );
  });

  it("exige userId", async () => {
    await expect(issueToken({})).rejects.toThrow("userId é obrigatório");
  });

  it("handler retorna 401 sem usuário autenticado", async () => {
    const res = await handler({});
    expect(res.statusCode).toBe(401);
  });

  it("handler emite token (200) a partir das claims", async () => {
    mockStream.createToken.mockReturnValue("tkn");
    const event = {
      requestContext: { authorizer: { jwt: { claims: { sub: "u1", email: "j@x.com" } } } },
    };
    const res = await handler(event);
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toMatchObject({ userId: "u1", token: "tkn" });
  });
});
