import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

const listAllGoalsMock = vi.fn();

vi.mock("../../../repository/goals.js", () => ({
  listAllGoals: listAllGoalsMock,
}));

const goalsRouter = (await import("../goals.js")).default;

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use(goalsRouter);
  return app;
};

describe("GET /goals", () => {
  beforeEach(() => {
    listAllGoalsMock.mockReset();
  });

  it("retorna 200 com data, page, limit e total", async () => {
    const items = [
      { id: "1", name: "Emagrecer" },
      { id: "2", name: "Ganhar massa" },
    ];
    listAllGoalsMock.mockResolvedValueOnce(items);

    const res = await request(buildApp()).get("/goals");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      data: items,
      page: 1,
      limit: 20,
      total: 2,
    });
  });

  it("retorna lista vazia com total 0 quando nao ha goals", async () => {
    listAllGoalsMock.mockResolvedValueOnce([]);

    const res = await request(buildApp()).get("/goals");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: [], page: 1, limit: 20, total: 0 });
  });

  it("retorna 500 quando o repository falha", async () => {
    listAllGoalsMock.mockRejectedValueOnce(new Error("DDB indisponivel"));

    const res = await request(buildApp()).get("/goals");

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "Erro ao buscar goals" });
  });
});
