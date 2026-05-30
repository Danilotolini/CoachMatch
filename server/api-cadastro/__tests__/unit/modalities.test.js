import express, { json } from "express";
import request from "supertest";
import modalities from "../../routes/modalities.js";

const app = express();
app.use(json());
app.use(modalities);

describe("GET /modalities", () => {
  it("retorna status 200", async () => {
    const res = await request(app).get("/modalities");
    expect(res.status).toBe(200);
  });

  it("retorna um array de modalidades em data", async () => {
    const res = await request(app).get("/modalities");
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("retorna os campos de paginacao corretos", async () => {
    const res = await request(app).get("/modalities");
    expect(res.body).toMatchObject({
      page: 1,
      limit: 20,
      total: expect.any(Number),
    });
  });

  it("total bate com o tamanho do array data", async () => {
    const res = await request(app).get("/modalities");
    expect(res.body.total).toBe(res.body.data.length);
  });

  it("cada modalidade tem id e name", async () => {
    const res = await request(app).get("/modalities");
    for (const mod of res.body.data) {
      expect(mod).toHaveProperty("id");
      expect(mod).toHaveProperty("name");
    }
  });

  it("nenhuma modalidade tem name vazio", async () => {
    const res = await request(app).get("/modalities");
    for (const mod of res.body.data) {
      expect(mod.name.trim().length).toBeGreaterThan(0);
    }
  });

  it("retorna content-type json", async () => {
    const res = await request(app).get("/modalities");
    expect(res.headers["content-type"]).toMatch(/json/);
  });

  it("nao aceita POST em /modalities", async () => {
    const res = await request(app).post("/modalities").send({});
    expect(res.status).toBe(404);
  });
});
