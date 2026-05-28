const express = require("express")
const router = express.Router()

const GOALS = [
  { id: "1", name: "Emagrecer" },
  { id: "2", name: "Ganhar massa" },
  { id: "3", name: "Condicionamento físico" },
  { id: "4", name: "Saúde e bem-estar" },
  { id: "5", name: "Reabilitação" },
  { id: "6", name: "Performance esportiva" },
]

router.get("/goals", (req, res) => {
  res.json({
    data: GOALS,
    page: 1,
    limit: 20,
    total: GOALS.length,
  })
})

module.exports = router