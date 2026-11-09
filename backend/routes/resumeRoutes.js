
const express = require("express");
const router = express.Router();

const fs = require("fs");
const path = require("path");

const {
  setResumePath,
  getResumePath
} = require("../services/agentContext");

// Store uploaded resumes in backend/uploads
const uploadDir = path.join(__dirname, "../uploads");

fs.mkdirSync(uploadDir, { recursive: true });


// POST: Receive resume from Chrome extension
router.post("/", async (req, res) => {
  try {
    const { fileName, fileData } = req.body;

    if (!fileName || !fileData) {
      return res.status(400).json({
        success: false,
        message: "Resume filename and file data are required."
      });
    }

    // Decode Base64 into a PDF buffer
    const buffer = Buffer.from(fileData, "base64");

    // Validate PDF signature
    if (
      buffer.length === 0 ||
      buffer.subarray(0, 5).toString() !== "%PDF-"
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid or empty PDF file."
      });
    }

    // Save using a fixed filename
    const filePath = path.join(uploadDir, "resume.pdf");

    await fs.promises.writeFile(filePath, buffer);

    // Store the absolute path for Python
    setResumePath(filePath);

    console.log("Resume saved:", filePath);
    console.log("Resume size:", buffer.length, "bytes");

    return res.json({
      success: true,
      message: "Resume transferred successfully.",
      fileSize: buffer.length
    });

  } catch (error) {
    console.error("Resume transfer failed:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to save resume."
    });
  }
});


// GET: Return the saved resume path to Python
router.get("/", (req, res) => {
  try {
    const filePath = getResumePath();

    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: "No resume has been transferred yet."
      });
    }

    const stats = fs.statSync(filePath);

    if (stats.size === 0) {
      return res.status(400).json({
        success: false,
        message: "The saved resume file is empty."
      });
    }

    return res.json({
      success: true,
      filePath,
      fileSize: stats.size
    });

  } catch (error) {
    console.error("Resume retrieval failed:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve resume path."
    });
  }
});

module.exports = router;
