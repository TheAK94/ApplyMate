
const express = require("express");
const router = express.Router();

const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

const {
  setProfile,
  getProfile,
  getResumePath
} = require("../services/agentContext");

let isAgentRunning = false;

let progress = {
  status: "idle",
  message: "Ready to fill your application.",
  steps: [],
  updatedAt: new Date().toISOString()
};

function updateProgress(status, message, stepNumber = null) {
  if (status === "step") {
    progress.steps = progress.steps.map((step) => ({
      ...step,
      status: "completed"
    }));

    progress.steps.push({
      id: stepNumber ?? progress.steps.length + 1,
      message,
      status: "in_progress"
    });

    progress.status = "running";
    progress.message = message;
  } else if (status === "complete") {
    progress.steps = progress.steps.map((step) => ({
      ...step,
      status: "completed"
    }));

    progress.status = "completed";
    progress.message = message;
  } else if (status === "error") {
    progress.status = "error";
    progress.message = message;

    progress.steps = progress.steps.map((step) =>
      step.status === "in_progress"
        ? { ...step, status: "error" }
        : step
    );
  } else if (status === "starting") {
    progress.status = "running";
    progress.message = message;
    progress.steps = [];
  }

  progress.updatedAt = new Date().toISOString();
}

// Receive profile from Chrome extension
router.post("/profile", (req, res) => {
  try {
    const { profile } = req.body;

    if (!profile || typeof profile !== "object" || Array.isArray(profile)) {
      return res.status(400).json({
        success: false,
        message: "Valid profile is required."
      });
    }

    setProfile(profile);

    return res.json({
      success: true,
      message: "Profile received successfully."
    });
  } catch (error) {
    console.error("Profile transfer failed:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to receive profile."
    });
  }
});

// Python agent retrieves profile
router.get("/profile", (req, res) => {
  const profile = getProfile();

  if (!profile) {
    return res.status(404).json({
      success: false,
      message: "No profile has been received yet."
    });
  }

  return res.json({
    success: true,
    profile
  });
});

// Python agent sends live progress here
router.post("/progress", (req, res) => {
  const { status, message, stepNumber } = req.body;

  const allowedStatuses = ["starting", "step", "complete", "error"];

  if (!allowedStatuses.includes(status) || typeof message !== "string") {
    return res.status(400).json({
      success: false,
      message: "Invalid progress update."
    });
  }

  updateProgress(status, message, stepNumber);

  return res.json({ success: true });
});

// Extension reads live progress
router.get("/progress", (req, res) => {
  return res.json({
    success: true,
    running: isAgentRunning,
    progress
  });
});

// Reset activity display (does not delete profile or resume)
router.post("/reset", (req, res) => {
  progress = {
    status: isAgentRunning ? "running" : "idle",
    message: isAgentRunning
      ? "Activity cleared."
      : "Ready to fill your application.",
    steps: [],
    updatedAt: new Date().toISOString()
  };

  return res.json({ success: true });
});

// Start Python Browser Use agent
router.post("/run", (req, res) => {
  if (isAgentRunning) {
    return res.status(409).json({
      success: false,
      message: "ApplyMate agent is already running."
    });
  }

  const profile = getProfile();
  const resumePath = getResumePath();

  if (!profile) {
    return res.status(400).json({
      success: false,
      message: "Please transfer your profile first."
    });
  }

  if (!resumePath || !fs.existsSync(resumePath)) {
    return res.status(400).json({
      success: false,
      message: "Please upload your resume first."
    });
  }

  const agentDir = path.resolve(__dirname, "../../agent");
  const pythonPath = path.join(
    agentDir,
    "venv",
    "Scripts",
    "python.exe"
  );
  const scriptPath = path.join(agentDir, "main.py");

  if (!fs.existsSync(pythonPath) || !fs.existsSync(scriptPath)) {
    return res.status(500).json({
      success: false,
      message: "Python agent or virtual environment not found."
    });
  }

  isAgentRunning = true;
  updateProgress("starting", "Starting ApplyMate agent...");

  const pythonProcess = spawn(
    pythonPath,
    [scriptPath],
    {
      cwd: agentDir,
      windowsHide: true
    }
  );

  pythonProcess.stdout.on("data", (data) => {
    console.log("[ApplyMate]", data.toString());
  });

  pythonProcess.stderr.on("data", (data) => {
    console.error("[ApplyMate]", data.toString());
  });

  pythonProcess.on("error", (error) => {
    console.error("Python process error:", error);

    updateProgress("error", "Unable to start the Python agent.");
    isAgentRunning = false;
  });

  pythonProcess.on("close", (code) => {
    isAgentRunning = false;

    // Python normally sends its own completion/error update.
    if (code !== 0 && progress.status !== "error") {
      updateProgress(
        "error",
        "The agent stopped unexpectedly. Please try again."
      );
    }
  });

  return res.status(202).json({
    success: true,
    message: "ApplyMate agent started."
  });
});

module.exports = router;
