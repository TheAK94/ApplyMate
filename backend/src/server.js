const express = require("express");
const cors = require("cors");
require("dotenv").config();

const aiRoutes = require("../routes/aiRoutes");
const agentRoutes = require("../routes/agentRoutes");
const resumeRoutes = require("../routes/resumeRoutes");

const app = express();

app.use(cors());
app.use(express.json({ limit: "5mb" }));

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "ApplyMate AI Backend is running!"
  });
});

app.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "healthy"
  });
});

app.use("/api/ai", aiRoutes);
app.use("/api/agent", agentRoutes);
app.use("/api/agent/resume", resumeRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`ApplyMate backend running on port ${PORT}`);
});