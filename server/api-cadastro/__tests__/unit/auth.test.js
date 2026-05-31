import express, { json } from "express";
import request from "supertest";
import jwt from "jsonwebtoken";

const SECRET = "minha-chave-secreta-de-teste";

function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "Token inválido ou expirado" });
    const token = authHeader.split(" ")[1];
    jwt.verify(token, SECRET);
    next();
  } catch {
    return res.status(401).json({ message: "Token inválido ou expirado" });
  }
}

function buildApp() {
  const app = express();
  app.use(json());
  app.get("/protected", authMiddleware, (req, res) => res.json({ ok: true }));
  return app;
}

describe("authMiddleware", () => {
  it("bloqueia requisicao sem header authorization", async () => {
    const res = await request(buildApp()).get("/protected");
    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Token inválido ou expirado");
  });

  it("bloqueia token com assinatura incorreta", async () => {
    const token = jwt.sign({ sub: "u1" }, "chave-errada");
    const res = await request(buildApp())
      .get("/protected")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(401);
  });

  it("bloqueia token expirado", async () => {
    const token = jwt.sign({ sub: "u1" }, SECRET, { expiresIn: -1 });
    const res = await request(buildApp())
      .get("/protected")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(401);
  });

  it("bloqueia token malformado", async () => {
    const res = await request(buildApp())
      .get("/protected")
      .set("Authorization", "Bearer nao.e.um.jwt");
    expect(res.status).toBe(401);
  });

  it("bloqueia header sem prefixo Bearer", async () => {
    const token = jwt.sign({ sub: "u1" }, SECRET);
    const res = await request(buildApp())
      .get("/protected")
      .set("Authorization", token);
    expect(res.status).toBe(401);
  });

  it("bloqueia string vazia como token", async () => {
    const res = await request(buildApp())
      .get("/protected")
      .set("Authorization", "Bearer ");
    expect(res.status).toBe(401);
  });

  it("permite acesso com token valido", async () => {
    const token = jwt.sign({ sub: "u1" }, SECRET, { expiresIn: "1h" });
    const res = await request(buildApp())
      .get("/protected")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it("retorna json com message em caso de erro", async () => {
    const res = await request(buildApp()).get("/protected");
    expect(res.headers["content-type"]).toMatch(/json/);
    expect(res.body).toHaveProperty("message");
  });
});
