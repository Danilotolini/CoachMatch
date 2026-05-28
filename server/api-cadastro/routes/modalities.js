const express = require("express")
const router = express.Router()

const MODALITIES = [
  { id: "1", name: "Musculação" },
  { id: "2", name: "Crossfit" },
  { id: "3", name: "Funcional" },
  { id: "4", name: "Natação" },
  { id: "5", name: "Pilates" },
  { id: "6", name: "Yoga" },
  { id: "7", name: "Corrida" },
]

router.get("/modalities", (req, res) => {
  res.json({
    data: MODALITIES,
    page: 1,
    limit: 20,
    total: MODALITIES.length,
  })
})

module.exports = router