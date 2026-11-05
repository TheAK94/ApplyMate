const express = require("express");
const { analyzeForm } = require("../controllers/aiController");

const router = express.Router();

router.post("/analyze", analyzeForm);

module.exports = router;