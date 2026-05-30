import express, { json } from "express";
import request from "supertest";
import goals from "../../routes/goals.js";

const app = express();
app.use(json());
app.use(goals);

describe("GET /goals", () => {
  it("retorna status 200", async () => {
    const res = await request(app).get("/goals");
    expect(res.status).toBe(200);
  });

  it("retorna um array de objetivos em data", async () => {
    const res = await request(app).get("/goals");
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("retorna os campos de paginacao corretos", async () => {
    const res = await request(app).get("/goals");
    expect(res.body).toMatchObject({
      page: 1,
      limit: 20,
      total: expect.any(Number),
    });
  });

  it("total bate com o tamanho do array data", async () => {
    const res = await request(app).get("/goals");
    expect(res.body.total).toBe(res.body.data.length);
  });

  it("cada objetivo tem id e name", async () => {
    const res = await request(app).get("/goals");
    for (const goal of res.body.data) {
      expect(goal).toHaveProperty("id");
      expect(goal).toHaveProperty("name");
    }
  });

  it("nenhum objetivo tem name vazio", async () => {
    const res = await request(app).get("/goals");
    for (const goal of res.body.data) {
      expect(goal.name.trim().length).toBeGreaterThan(0);
    }
  });

  it("retorna content-type json", async () => {
    const res = await request(app).get("/goals");
    expect(res.headers["content-type"]).toMatch(/json/);
  });

  it("nao aceita POST em /goals", async () => {
    const res = await request(app).post("/goals").send({});
    expect(res.status).toBe(404);
  });
});
