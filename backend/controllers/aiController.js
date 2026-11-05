const { analyzeFields } = require("../services/aiService");

async function analyzeForm(req, res) {
  try {
    const { fields, profile } = req.body;

    if (!Array.isArray(fields) || !profile) {
      return res.status(400).json({
        success: false,
        message: "Fields and profile are required."
      });
    }

    const result = await analyzeFields(fields, profile);

    // Validate that AI only returned IDs belonging to supplied fields.
    const validFieldIds = new Set(
      fields.map(field => field.fieldId)
    );

    const matches = result.matches.filter(match =>
      validFieldIds.has(match.fieldId)
    );

    return res.json({
      success: true,
      matches
    });

  } catch (error) {
    console.error("AI analysis error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to analyze application fields."
    });
  }
}

module.exports = { analyzeForm };