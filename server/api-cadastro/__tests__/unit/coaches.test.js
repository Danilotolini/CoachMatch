import express, { json } from "express";
import request from "supertest";
import jwt from "jsonwebtoken";

const SECRET = "minha-chave-secreta-de-teste";

function makeToken(payload = {}) {
  return jwt.sign({ sub: "coach_001", ...payload }, SECRET, { expiresIn: "1h" });
}

function buildApp() {
  const app = express();
  app.use(json());

  const authMiddleware = (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ message: "Token inválido ou expirado" });
      const token = authHeader.split(" ")[1];
      jwt.verify(token, SECRET);
      next();
    } catch {
      return res.status(401).json({ message: "Token inválido ou expirado" });
    }
  };

  const registerCoach = (req, res) => {
    res.status(201).json({ created: true });
  };

  app.post("/coaches", authMiddleware, registerCoach);
  app.get("/me", authMiddleware, (req, res) => res.json({ ok: true }));
  app.put("/coaches/me", authMiddleware, (req, res) => res.json({ ok: true }));
  app.post("/coaches/me/submit-for-review", authMiddleware, (req, res) => res.json({ ok: true }));

  return app;
}

describe("POST /coaches", () => {
  it("retorna 401 sem token", async () => {
    const res = await request(buildApp()).post("/coaches").send({ coachId: "abc" });
    expect(res.status).toBe(401);
  });

  it("retorna 401 com token invalido", async () => {
    const res = await request(buildApp())
      .post("/coaches")
      .set("Authorization", "Bearer token-invalido")
      .send({ coachId: "abc" });
    expect(res.status).toBe(401);
  });

  it("retorna 401 com token expirado", async () => {
    const token = jwt.sign({ sub: "coach_001" }, SECRET, { expiresIn: -1 });
    const res = await request(buildApp())
      .post("/coaches")
      .set("Authorization", `Bearer ${token}`)
      .send({ coachId: "abc" });
    expect(res.status).toBe(401);
  });

  it("retorna 401 sem o prefixo Bearer", async () => {
    const token = makeToken();
    const res = await request(buildApp())
      .post("/coaches")
      .set("Authorization", token)
      .send({ coachId: "abc" });
    expect(res.status).toBe(401);
  });

  it("cria coach com token valido", async () => {
    const token = makeToken();
    const res = await request(buildApp())
      .post("/coaches")
      .set("Authorization", `Bearer ${token}`)
      .send({ coachId: "abc" });
    expect(res.status).toBe(201);
  });
});

describe("GET /me", () => {
  it("retorna 401 sem token", async () => {
    const res = await request(buildApp()).get("/me");
    expect(res.status).toBe(401);
  });

  it("retorna 200 com token valido", async () => {
    const token = makeToken();
    const res = await request(buildApp())
      .get("/me")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});

describe("PUT /coaches/me", () => {
  it("retorna 401 sem token", async () => {
    const res = await request(buildApp()).put("/coaches/me").send({});
    expect(res.status).toBe(401);
  });

  it("retorna 200 com token valido", async () => {
    const token = makeToken();
    const res = await request(buildApp())
      .put("/coaches/me")
      .set("Authorization", `Bearer ${token}`)
      .send({ email: "novo@email.com" });
    expect(res.status).toBe(200);
  });
});

describe("POST /coaches/me/submit-for-review", () => {
  it("retorna 401 sem token", async () => {
    const res = await request(buildApp()).post("/coaches/me/submit-for-review");
    expect(res.status).toBe(401);
  });

  it("retorna 200 com token valido", async () => {
    const token = makeToken();
    const res = await request(buildApp())
      .post("/coaches/me/submit-for-review")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});
