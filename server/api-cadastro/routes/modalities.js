import { Router } from "express";
import { listAllModalities } from "../../repository/modalities.js";

const router = Router();

router.get("/modalities", async (req, res) => {
  try {
    const modalities = await listAllModalities();
    res.json({
      data: modalities,
      page: 1,
      limit: 20,
      total: modalities.length,
    });
  } catch (error) {
    console.error("Erro ao listar modalities:", error);
    res.status(500).json({ error: "Erro ao buscar modalities" });
  }
});

export default router;
