
import { useState, useEffect } from "react";

import {
  BriefcaseBusiness,
  UserRound,
  FileText,
  ScanSearch,
  Sparkles,
  CheckCircle2,
  Globe,
  LoaderCircle,
  ExternalLink
} from "lucide-react";

import { extractFields } from "../content/extractor";
import type { FormField } from "../content/extractor";

import { observeFormChanges } from "../content/observer";

function App() {
  const [fields, setFields] = useState<FormField[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTabId, setActiveTabId] = useState<number | null>(null);

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

  // Analyze the current webpage
  const analyzePage = async () => {
    setLoading(true);
    setError("");
    setFields([]);

    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
      });

      if (!tab.id) {
        throw new Error("Unable to identify the active tab.");
      }

      setActiveTabId(tab.id);

      // Extract existing form fields
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: extractFields
      });

      const detectedFields = results[0]?.result ?? [];

      setFields(detectedFields);

      // Start observing future DOM changes
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: observeFormChanges
      });

      if (detectedFields.length === 0) {
        setError("No form fields found on this page.");
      }

    } catch (err) {
      console.error("ApplyMate analysis error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to analyze this page."
      );

    } finally {
      setLoading(false);
    }
  };

  // Listen for dynamic webpage changes
  useEffect(() => {
    if (activeTabId === null) return;

    const handleMessage = (
      message: { type: string },
      sender: chrome.runtime.MessageSender
    ) => {
      if (message.type !== "APPLYMATE_DOM_CHANGED") {
        return;
      }

      // Ignore messages from other tabs
      if (sender.tab?.id !== activeTabId) {
        return;
      }

      const refreshFields = async () => {
        try {
          const [tab] = await chrome.tabs.query({
            active: true,
            currentWindow: true
          });

          if (tab?.id !== activeTabId) {
            return;
          }

          // Extract updated fields
          const results = await chrome.scripting.executeScript({
            target: { tabId: activeTabId },
            func: extractFields
          });

          const updatedFields = results[0]?.result ?? [];

          setFields(updatedFields);

          if (updatedFields.length > 0) {
            setError("");
          }

        } catch (err) {
          console.error(
            "Failed to refresh form fields:",
            err
          );
        }
      };

      void refreshFields();
    };

    chrome.runtime.onMessage.addListener(handleMessage);

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };

  }, [activeTabId]);

  return (
    <div className="app">

      {/* Header */}
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

        <div className="status">
          <span />
          Ready
        </div>
      </header>

      <main>

        {/* Welcome Section */}
        <section className="welcome">
          <div className="eyebrow">
            <Sparkles size={14} />
            YOUR CAREER ASSISTANT
          </div>

          <h2>Make every application easier.</h2>

          <p>
            Let ApplyMate understand application forms
            and help you fill them using your profile.
          </p>
        </section>

        {/* Profile Card */}
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
          >
            Manage
            <ExternalLink size={14} />
          </button>
        </section>

        {/* Analyze Section */}
        <section className="analyze-card">

          <div className="section-heading">
            <div>
              <h3>Current webpage</h3>
              <p>Analyze the application form</p>
            </div>

            <Globe size={20} />
          </div>

          <button
            className="analyze-button"
            onClick={analyzePage}
            disabled={loading}
          >
            {loading ? (
              <LoaderCircle className="spin" size={18} />
            ) : (
              <ScanSearch size={18} />
            )}

            {loading ? "Analyzing..." : "Analyze Page"}
          </button>

          {/* Error Message */}
          {error && (
            <p className="error">{error}</p>
          )}

          {/* Detection Results */}
          {fields.length > 0 && (
            <div className="results">

              <div className="result-heading">
                <CheckCircle2 size={17} />
                {fields.length} fields detected
              </div>

              {fields.map((field) => (
                <div
                  className="field"
                  key={field.fieldId}
                >
                  <div className="field-content">

                    <div className="field-header">
                      <div>
                        <strong>
                          {field.label || field.fieldId}
                        </strong>

                        <span>
                          {field.tagName} · {field.type}
                        </span>
                      </div>

                      <div className="field-meta">

                        {field.required && (
                          <span className="required">
                            Required
                          </span>
                        )}

                        {field.kind === "choice-group" && (
                          <span className="field-type">
                            Group
                          </span>
                        )}

                      </div>
                    </div>

                    {/* Field Options */}
                    {field.options &&
                      field.options.length > 0 && (
                        <div className="field-options">

                          {field.options.map((option, index) => (
                            <span
                              key={`${option.value}-${index}`}
                            >
                              {option.label}
                            </span>
                          ))}

                        </div>
                      )}

                  </div>
                </div>
              ))}

            </div>
          )}

          {/* Empty State */}
          {fields.length === 0 && !loading && !error && (
            <div className="empty-state">
              <FileText size={25} />

              <span>
                No fields analyzed yet. Open an application
                form and click Analyze Page.
              </span>
            </div>
          )}

        </section>
      </main>

      {/* Footer */}
      <footer>
        <span>ApplyMate v0.1.0</span>
        <span>Built for smarter applications</span>
      </footer>

    </div>
  );
}

export default App;
