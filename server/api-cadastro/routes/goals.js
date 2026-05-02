import { Router } from "express";
import { listAllGoals } from "../../repository/goals.js";

const router = Router();

router.get("/goals", async (req, res) => {
  try {
    const goals = await listAllGoals();
    res.json({
      data: goals,
      page: 1,
      limit: 20,
      total: goals.length,
    });
  } catch (error) {
    console.error("Erro ao listar goals:", error);
    res.status(500).json({ error: "Erro ao buscar goals" });
  }
});

export default router;
