import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

const listAllModalitiesMock = vi.fn();

vi.mock("../../../repository/modalities.js", () => ({
  listAllModalities: listAllModalitiesMock,
}));

const modalitiesRouter = (await import("../modalities.js")).default;

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use(modalitiesRouter);
  return app;
};

describe("GET /modalities", () => {
  beforeEach(() => {
    listAllModalitiesMock.mockReset();
  });

  it("retorna 200 com data, page, limit e total", async () => {
    const items = [
      { id: "1", name: "Musculação" },
      { id: "2", name: "Crossfit" },
    ];
    listAllModalitiesMock.mockResolvedValueOnce(items);

    const res = await request(buildApp()).get("/modalities");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      data: items,
      page: 1,
      limit: 20,
      total: 2,
    });
  });

  it("retorna lista vazia com total 0 quando nao ha modalities", async () => {
    listAllModalitiesMock.mockResolvedValueOnce([]);

    const res = await request(buildApp()).get("/modalities");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: [], page: 1, limit: 20, total: 0 });
  });

  it("retorna 500 quando o repository falha", async () => {
    listAllModalitiesMock.mockRejectedValueOnce(new Error("DDB indisponivel"));

    const res = await request(buildApp()).get("/modalities");

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "Erro ao buscar modalities" });
  });
});
