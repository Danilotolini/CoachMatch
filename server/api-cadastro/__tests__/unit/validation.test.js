import Joi from "joi";

const coachSchema = Joi.object({
  coachId: Joi.string().uuid().required(),
  email: Joi.string().pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
  status: Joi.string().valid("PENDING_PROFILE", "APPROVED"),
});

function validateMiddleware(schema) {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }
    next();
  };
}

import express, { json } from "express";
import request from "supertest";

function buildApp() {
  const app = express();
  app.use(json());
  app.post("/test", validateMiddleware(coachSchema), (req, res) => res.status(200).json({ ok: true }));
  return app;
}

describe("validateMiddleware com coachSchema", () => {
  it("passa com payload valido completo", async () => {
    const res = await request(buildApp()).post("/test").send({
      coachId: "550e8400-e29b-41d4-a716-446655440000",
      email: "coach@email.com",
      status: "APPROVED",
    });
    expect(res.status).toBe(200);
  });

  it("passa com apenas coachId (campos opcionais ausentes)", async () => {
    const res = await request(buildApp()).post("/test").send({
      coachId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(res.status).toBe(200);
  });

  it("rejeita payload sem coachId", async () => {
    const res = await request(buildApp()).post("/test").send({
      email: "coach@email.com",
    });
    expect(res.status).toBe(400);
  });

  it("rejeita coachId que nao e uuid", async () => {
    const res = await request(buildApp()).post("/test").send({
      coachId: "nao-e-um-uuid",
    });
    expect(res.status).toBe(400);
  });

  it("rejeita email com formato invalido", async () => {
    const res = await request(buildApp()).post("/test").send({
      coachId: "550e8400-e29b-41d4-a716-446655440000",
      email: "email-sem-arroba",
    });
    expect(res.status).toBe(400);
  });

  it("rejeita status fora dos valores permitidos", async () => {
    const res = await request(buildApp()).post("/test").send({
      coachId: "550e8400-e29b-41d4-a716-446655440000",
      status: "INVALIDO",
    });
    expect(res.status).toBe(400);
  });

  it("rejeita payload vazio", async () => {
    const res = await request(buildApp()).post("/test").send({});
    expect(res.status).toBe(400);
  });

  it("retorna mensagem de erro em caso de falha", async () => {
    const res = await request(buildApp()).post("/test").send({});
    expect(res.body).toHaveProperty("message");
    expect(typeof res.body.message).toBe("string");
  });

  it("aceita status PENDING_PROFILE", async () => {
    const res = await request(buildApp()).post("/test").send({
      coachId: "550e8400-e29b-41d4-a716-446655440000",
      status: "PENDING_PROFILE",
    });
    expect(res.status).toBe(200);
  });
});
