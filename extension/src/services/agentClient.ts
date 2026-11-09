import { getProfile } from "../storage/profileStorage";
import { getResume } from "../storage/resumeStorage";

const API_URL = "http://localhost:5000/api/agent";

export async function sendProfileToAgent() {
  try {
    // Get saved profile from chrome.storage.local
    const profile = await getProfile();

    // Send profile to Node backend
    const response = await fetch(`${API_URL}/profile`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ profile })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to send profile");
    }

    console.log("Profile sent to agent:", data.message);

    return {
      success: true,
      message: data.message
    };

  } catch (error) {
    console.error("Profile transfer error:", error);

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to connect to backend"
    };
  }
}

export async function sendResumeToAgent() {
  try {
    const resume = await getResume();

    if (!resume || resume.size === 0) {
      throw new Error("No resume found in extension storage.");
    }

    const profile = await getProfile();
    const fileName = profile.resume?.fileName || "resume.pdf";

    const buffer = await resume.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    let binary = "";

    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }

    const fileData = btoa(binary);

    const response = await fetch(`${API_URL}/resume`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        fileName,
        fileData
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Resume transfer failed");
    }

    console.log("Resume transferred:", data);

    return data;

  } catch (error) {
    console.error("Resume transfer error:", error);

    throw error;
  }
}