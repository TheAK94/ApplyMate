
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

import { getProfile } from "../storage/profileStorage";

// import { matchFields } from "../matching/fieldMatcher";
// import type { FieldMatch } from "../matching/fieldMatcher";

import { analyzeFieldsWithAI } from "../services/aiClient";

import { autofillFields } from "../content/autofill";

function getProfileValue(
  profile: Record<string, any>,
  key: string | null
): string {
  if (!key) return "";

  const value = key.split(".").reduce<any>(
    (current, part) => current?.[part],
    profile
  );

  if (typeof value === "string") return value;

  if (Array.isArray(value)) {
    return value.join(", ");
  }

  return "";
}

function App() {
  const [fields, setFields] = useState<FormField[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTabId, setActiveTabId] = useState<number | null>(null);
  
  interface ReviewMatch {
    fieldId: string;
    fieldLabel: string;
    profileKey: string;
    value: string;
    confidence: "high" | "medium";
    action:
      | "profile_match"
      | "generate_answer"
      | "manual_input"
      | "ignore";
    reason: string;
    selected: boolean;
    editedValue: string;
  }

  const [matches, setMatches] = useState<ReviewMatch[]>([]);
  const [autofillMode, setAutofillMode] = useState<
    "review" | "quick"
  >("review");

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

      // Load the saved profile.
      const profile = await getProfile();

      // Send all detected fields to the AI backend.
      const aiMatches = await analyzeFieldsWithAI(
        detectedFields,
        profile
      );

      // Convert AI results into the format used by the review UI.
      const reviewMatches: ReviewMatch[] = aiMatches.flatMap(match => {
      const field = detectedFields.find(
        item => item.fieldId === match.fieldId
      );

      if (!field) return [];

      let value = "";

      if (match.action === "profile_match") {
        value = getProfileValue(profile, match.profileKey);
      } else if (match.action === "generate_answer") {
        value = match.value ?? "";
      }

      return [{
        fieldId: match.fieldId,
        fieldLabel: field.label || field.fieldId,
        profileKey: match.profileKey ?? "",
        value,
        confidence: match.confidence >= 0.8 ? "high" : "medium",
        action: match.action,
        reason: match.reason,
        selected:
          match.action === "profile_match" ||
          match.action === "generate_answer",
        editedValue: value
      }];
    });

    setMatches(reviewMatches);

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

  const handleAutofill = async () => {
    if (activeTabId === null) {
      setError("Please analyze a webpage first.");
      return;
    }

    const selectedMatches = matches.filter(match => {
      if (autofillMode === "quick") {
        return (
          match.confidence === "high" &&
          ["profile_match", "generate_answer"].includes(match.action) &&
          match.editedValue.trim() !== ""
        );
      }

      return (
        match.selected &&
        match.action !== "ignore" &&
        match.editedValue.trim() !== ""
      );
    });

    if (selectedMatches.length === 0) {
      setError("Please select at least one field to fill.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const items = selectedMatches.map(match => ({
        fieldId: match.fieldId,
        value: match.editedValue
      }));

      const results = await chrome.scripting.executeScript({
        target: { tabId: activeTabId },
        func: autofillFields,
        args: [items, fields.map(field => ({
          fieldId: field.fieldId,
          id: field.id,
          name: field.name,
          type: field.type
        }))]
      });

      const autofillResult = results[0]?.result;

      if (!autofillResult) {
        throw new Error("Unable to fill the application form.");
      }

      setError(
        `Filled ${autofillResult.filled.length} fields. Skipped ${autofillResult.skipped.length}.`
      );

    } catch (err) {
      console.error("ApplyMate autofill error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to autofill this page."
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

          <div className="mode-selector">
            <button
              className={autofillMode === "review" ? "active" : ""}
              onClick={() => setAutofillMode("review")}
            >
              Review & Fill
            </button>

            <button
              className={autofillMode === "quick" ? "active" : ""}
              onClick={() => setAutofillMode("quick")}
            >
              Quick Autofill
            </button>
          </div>

          {/* AI Review Matches */}
          {matches.length > 0 && (
            <div className="review-section">

              <div className="review-heading">
                <div>
                  <h3>AI Analysis Results</h3>
                  <p>Review what ApplyMate understood about this form.</p>
                </div>

                <span className="match-count">
                  {matches.filter(m =>
                    m.action === "profile_match" ||
                    m.action === "generate_answer"
                  ).length} ready
                </span>
              </div>

              {autofillMode === "review" ? (
                matches.map(match => {
                  const isIgnored = match.action === "ignore";
                  const needsInput = match.action === "manual_input";

                  const statusLabel = {
                    profile_match: "From profile",
                    generate_answer: "AI generated",
                    manual_input: "Needs your input",
                    ignore: "Ignored"
                  }[match.action];

                  return (
                    <div className="review-field" key={match.fieldId}>
                      <div className="review-field-header">
                        <label>
                          <input
                            type="checkbox"
                            checked={match.selected}
                            disabled={isIgnored}
                            onChange={event => {
                              setMatches(previous =>
                                previous.map(item =>
                                  item.fieldId === match.fieldId
                                    ? { ...item, selected: event.target.checked }
                                    : item
                                )
                              );
                            }}
                          />

                          <strong>{match.fieldLabel}</strong>
                        </label>

                        <span className={`confidence ${match.confidence}`}>
                          {statusLabel}
                        </span>
                      </div>

                      {!isIgnored && (
                        <input
                          type="text"
                          className="review-input"
                          placeholder={
                            needsInput
                              ? "Enter this information..."
                              : "Review suggested value..."
                          }
                          value={match.editedValue}
                          onChange={event => {
                            setMatches(previous =>
                              previous.map(item =>
                                item.fieldId === match.fieldId
                                  ? {
                                      ...item,
                                      editedValue: event.target.value,
                                      selected: event.target.value.trim()
                                        ? item.selected
                                        : false
                                    }
                                  : item
                              )
                            );
                          }}
                        />
                      )}

                      <span className="matched-source">
                        {match.reason}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="quick-mode-summary">
                  <Sparkles size={24} />

                  <strong>Quick Autofill is ready</strong>

                  <p>
                    ApplyMate will fill high-confidence matches automatically.
                    You won't need to review each field individually.
                  </p>

                  <p>
                    {matches.filter(match =>
                      match.confidence === "high" &&
                      ["profile_match", "generate_answer"].includes(match.action) &&
                      match.editedValue.trim() !== ""
                    ).length} fields ready to fill
                  </p>
                </div>
              )}

              <button
                className="analyze-button"
                onClick={handleAutofill}
                disabled={
                  loading ||
                  !matches.some(match =>
                    match.selected &&
                    !["ignore"].includes(match.action) &&
                    match.editedValue.trim()
                  )
                }
              >
                {loading ? (
                  <>
                    <LoaderCircle size={16} className="spin" />
                    Filling...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    {autofillMode === "quick"
                      ? "Start Quick Autofill"
                      : "Fill Selected Fields"}
                  </>
                )}
              </button>

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
