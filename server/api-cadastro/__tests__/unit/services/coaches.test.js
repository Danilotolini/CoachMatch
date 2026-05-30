import express, { json } from "express";
import request from "supertest";

function registerCoach(req, res) {
  const body = req.body;
  if (!body || Object.keys(body).length === 0) {
    return res.status(400).json({ message: "Payload vazio" });
  }
  return res.status(201).json({ created: true, data: body });
}

function buildApp() {
  const app = express();
  app.use(json());
  app.post("/coaches", registerCoach);
  return app;
}

describe("registerCoach service", () => {
  it("retorna 201 ao receber payload valido", async () => {
    const res = await request(buildApp()).post("/coaches").send({
      coachId: "550e8400-e29b-41d4-a716-446655440000",
      email: "coach@email.com",
    });
    expect(res.status).toBe(201);
  });

  it("retorna created true no body", async () => {
    const res = await request(buildApp()).post("/coaches").send({
      coachId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(res.body.created).toBe(true);
  });

  it("retorna os dados enviados no campo data", async () => {
    const payload = { coachId: "550e8400-e29b-41d4-a716-446655440000", email: "a@b.com" };
    const res = await request(buildApp()).post("/coaches").send(payload);
    expect(res.body.data).toMatchObject(payload);
  });

  it("retorna 400 com payload vazio", async () => {
    const res = await request(buildApp()).post("/coaches").send({});
    expect(res.status).toBe(400);
  });

  it("retorna content-type json", async () => {
    const res = await request(buildApp()).post("/coaches").send({
      coachId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(res.headers["content-type"]).toMatch(/json/);
  });
});
