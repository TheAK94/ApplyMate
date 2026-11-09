
import { useEffect, useState } from "react";
import {
  BriefcaseBusiness,
  UserRound,
  Sparkles,
  LoaderCircle,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  RefreshCcw
} from "lucide-react";

import {
  sendProfileToAgent,
  sendResumeToAgent
} from "../services/agentClient";

const API_URL = "http://localhost:5000/api/agent";

type ActivityStep = {
  id: number;
  message: string;
  status: "in_progress" | "completed" | "error";
};

type ProgressResponse = {
  success: boolean;
  running: boolean;
  progress: {
    status: "idle" | "running" | "completed" | "error";
    message: string;
    steps: ActivityStep[];
  };
};

function App() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [steps, setSteps] = useState<ActivityStep[]>([]);
  const [error, setError] = useState("");

  const openProfile = async () => {
    try {
      await chrome.tabs.create({
        url: chrome.runtime.getURL("profile.html")
      });
    } catch (error) {
      console.error("Unable to open profile:", error);
      setError("Unable to open your profile.");
    }
  };

  // Poll backend for live agent activity
  useEffect(() => {
    if (!loading) return;

    const pollProgress = async () => {
      try {
        const response = await fetch(`${API_URL}/progress`);
        const data: ProgressResponse = await response.json();

        if (!response.ok || !data.success) return;

        setSteps(data.progress.steps || []);

        if (data.progress.status === "completed") {
          setStatus("Completed");
          setLoading(false);
        } else if (data.progress.status === "error") {
          setStatus("Something went wrong");
          setError(data.progress.message);
          setLoading(false);
        } else {
          setStatus("Working");
        }
      } catch (error) {
        console.error("Progress polling failed:", error);
      }
    };

    pollProgress();

    const interval = window.setInterval(pollProgress, 1000);

    return () => window.clearInterval(interval);
  }, [loading]);

  const handleStartFilling = async () => {
    setLoading(true);
    setStatus("Preparing");
    setSteps([]);
    setError("");

    try {
      const profileResponse = await sendProfileToAgent();

      if (!profileResponse.success) {
        throw new Error(
          profileResponse.message || "Profile transfer failed."
        );
      }

      await sendResumeToAgent();

      const response = await fetch(`${API_URL}/run`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to start ApplyMate agent."
        );
      }

      setStatus("Working");
    } catch (err) {
      console.error("ApplyMate error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );

      setStatus("Something went wrong");
      setLoading(false);
    }
  };
  
  const handleReset = async () => {
    // Clear visible activity immediately
    setSteps([]);
    setError("");
    setStatus(loading ? "Working" : "Ready");

    try {
      const response = await fetch(`${API_URL}/reset`, {
        method: "POST"
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to clear activity.");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to clear activity."
      );
    }
  };


  const renderStepIcon = (step: ActivityStep) => {
    if (step.status === "completed") {
      return <CheckCircle2 size={17} className="step-completed" />;
    }

    if (step.status === "error") {
      return <AlertCircle size={17} className="step-error" />;
    }

    return <LoaderCircle size={17} className="spin step-active" />;
  };

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <div className="brand-icon">
            <BriefcaseBusiness size={21} />
          </div>

          <div>
            <h1>ApplyMate</h1>
            <span>APPLICATION ASSISTANT</span>
          </div>
        </div>

        <div className="header-actions">
          <div className={`status ${loading ? "working" : ""}`}>
            <span />
            {status}
          </div>

          <button
            className="reset-button"
            onClick={handleReset}
            title="Clear activity"
          >
            <RefreshCcw size={15} />
          </button>
        </div>
      </header>

      <main>
        <section className="profile-card">
          <div className="profile-icon">
            <UserRound size={22} />
          </div>

          <div className="profile-info">
            <strong>Your profile</strong>
            <span>Manage your application information</span>
          </div>

          <button
            className="manage-profile-button"
            onClick={openProfile}
            disabled={loading}
          >
            Manage
            <ExternalLink size={14} />
          </button>
        </section>

        <section className="analyze-card">
          <div className="section-heading">
            <div>
              <h3>Fill your application</h3>
              <p>
                Open an internship application and let
                ApplyMate handle the process.
              </p>
            </div>
          </div>

          <button
            className="analyze-button"
            onClick={handleStartFilling}
            disabled={loading}
          >
            {loading ? (
              <LoaderCircle className="spin" size={18} />
            ) : (
              <Sparkles size={18} />
            )}

            {loading ? "Working..." : "Start Filling"}
          </button>

          {/* Live Activity - only show when there is activity */}
          {(steps.length > 0 || error || status === "Completed") && (
            <div className="live-activity">
              <div className="activity-heading">
                <h3>Live Activity</h3>

                {loading && (
                  <span className="activity-indicator">
                    <span />
                    Live
                  </span>
                )}
              </div>

              <div className="activity-list">
                {steps.map((step) => (
                  <div className="activity-item" key={step.id}>
                    <div className="activity-step-icon">
                      {renderStepIcon(step)}
                    </div>

                    <div className="activity-step-content">
                      <span>{step.message}</span>
                      <small>
                        {step.status === "completed"
                          ? "Completed"
                          : step.status === "error"
                            ? "Failed"
                            : "In progress"}
                      </small>
                    </div>
                  </div>
                ))}
              </div>

              {status === "Completed" && (
                <div className="completion-message">
                  <CheckCircle2 size={17} />
                  <span>
                    Application filling completed. Review the form before submitting.
                  </span>
                </div>
              )}

              {error && (
                <div className="error">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}
            </div>
          )}

        </section>
      </main>

      <footer>
        <span>ApplyMate v0.1.0</span>
        <span>Built for smarter applications</span>
      </footer>
    </div>
  );
}

export default App;
