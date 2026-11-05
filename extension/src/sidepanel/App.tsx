
import { useState, useEffect } from "react";

import {
  BriefcaseBusiness,
  UserRound,
  FileText,
  Sparkles,
  LoaderCircle,
  ExternalLink
} from "lucide-react";

import { extractFields } from "../content/extractor";
import type { FormField } from "../content/extractor";

import { observeFormChanges } from "../content/observer";

import { getProfile } from "../storage/profileStorage";

import { analyzeFieldsWithAI } from "../services/aiClient";

import { autofillFields } from "../content/autofill";

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

interface AnalysisResult {
  tabId: number;
  detectedFields: FormField[];
  reviewMatches: ReviewMatch[];
}

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

  const [matches, setMatches] = useState<ReviewMatch[]>([]);

  const [analysisReady, setAnalysisReady] = useState(false);

  const [autofillMode, setAutofillMode] = useState<
    "review" | "quick"
  >("review");

  // Open profile dashboard
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
  const analyzePage = async (): Promise<AnalysisResult | null> => {
    setLoading(true);
    setError("");

    setFields([]);
    setMatches([]);
    setAnalysisReady(false);

    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
      });

      if (!tab.id) {
        throw new Error("Unable to identify the active tab.");
      }

      setActiveTabId(tab.id);

      // Extract form fields
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: extractFields
      });

      const detectedFields = results[0]?.result ?? [];

      if (detectedFields.length === 0) {
        throw new Error("No form fields found on this page.");
      }

      setFields(detectedFields);

      // Load saved profile
      const profile = await getProfile();

      // Analyze all fields using AI
      const aiMatches = await analyzeFieldsWithAI(
        detectedFields,
        profile
      );

      // Prepare review matches
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
          confidence: match.confidence >= 0.8
            ? "high"
            : "medium",
          action: match.action,
          reason: match.reason,
          selected:
            match.action === "profile_match" ||
            match.action === "generate_answer",
          editedValue: value
        }];
      });

      setMatches(reviewMatches);
      setAnalysisReady(true);

      // Start observing future DOM changes
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: observeFormChanges
      });

      return {
        tabId: tab.id,
        detectedFields,
        reviewMatches
      };

    } catch (err) {
      console.error("ApplyMate analysis error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to analyze this page."
      );

      return null;

    } finally {
      setLoading(false);
    }
  };

  // Fill selected fields
  const fillMatches = async (
    tabId: number,
    detectedFields: FormField[],
    currentMatches: ReviewMatch[],
    mode: "quick" | "review"
  ) => {
    const selectedMatches = currentMatches.filter(match => {
      if (mode === "quick") {
        return (
          match.confidence === "high" &&
          ["profile_match", "generate_answer"].includes(match.action) &&
          match.editedValue.trim() !== ""
        );
      }

      return (
        match.selected &&
        ["profile_match", "generate_answer", "manual_input"].includes(
          match.action
        ) &&
        match.editedValue.trim() !== ""
      );
    });

    if (selectedMatches.length === 0) {
      setError("No eligible fields selected for filling.");
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
        target: { tabId },
        func: autofillFields,
        args: [
          items,
          detectedFields.map(field => ({
            fieldId: field.fieldId,
            id: field.id,
            name: field.name,
            type: field.type,
            kind: field.kind
          }))
        ]
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

  // Main action button
  const handlePrimaryAction = async () => {
    // Analyze first if there are no current results
    if (!analysisReady) {
      const analysis = await analyzePage();

      if (!analysis) return;

      // QuickFill analyzes and fills in one click
      if (autofillMode === "quick") {
        await fillMatches(
          analysis.tabId,
          analysis.detectedFields,
          analysis.reviewMatches,
          "quick"
        );
      }

      // Review mode waits for user approval
      return;
    }

    // Fill using existing analysis
    if (activeTabId !== null) {
      await fillMatches(
        activeTabId,
        fields,
        matches,
        autofillMode
      );
    }
  };

  // Update selected state of review matches
  const toggleMatch = (
    fieldId: string,
    selected: boolean
  ) => {
    setMatches(previous =>
      previous.map(match =>
        match.fieldId === fieldId
          ? { ...match, selected }
          : match
      )
    );
  };

  // Update edited field value
  const updateMatchValue = (
    fieldId: string,
    value: string
  ) => {
    setMatches(previous =>
      previous.map(match =>
        match.fieldId === fieldId
          ? {
              ...match,
              editedValue: value,
              selected: value.trim()
                ? match.selected
                : false
            }
          : match
      )
    );
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

          const results = await chrome.scripting.executeScript({
            target: { tabId: activeTabId },
            func: extractFields
          });

          const updatedFields = results[0]?.result ?? [];

          setFields(updatedFields);

          // New fields require fresh AI analysis
          setAnalysisReady(false);
          setMatches([]);

          if (updatedFields.length > 0) {
            setError("The form changed. Analyze it again to update suggestions.");
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

        {/* Main Application Section */}
        <section className="analyze-card">

          <div className="section-heading">
            <div>
              <h3>Fill your application</h3>
              <p>
                Choose how ApplyMate should complete the form.
              </p>
            </div>
          </div>

          {/* Mode Selector */}
          <div className="mode-selector">

            <button
              className={autofillMode === "review" ? "active" : ""}
              onClick={() => {
                setAutofillMode("review");
                setError("");
              }}
              disabled={loading}
            >
              Review & Fill
            </button>

            <button
              className={autofillMode === "quick" ? "active" : ""}
              onClick={() => {
                setAutofillMode("quick");
                setError("");
              }}
              disabled={loading}
            >
              QuickFill
            </button>

          </div>

          {/* Review Section */}
          {analysisReady && matches.length > 0 &&
            autofillMode === "review" && (
              <div className="review-section">

                <div className="review-heading">
                  <div>
                    <h3>AI Analysis Results</h3>
                    <p>
                      Review and edit your suggested answers.
                    </p>
                  </div>

                  <span className="match-count">
                    {matches.filter(match =>
                      match.action === "profile_match" ||
                      match.action === "generate_answer"
                    ).length} ready
                  </span>
                </div>

                {matches.map(match => {
                  const isIgnored = match.action === "ignore";
                  const needsInput = match.action === "manual_input";

                  const statusLabel = {
                    profile_match: "From profile",
                    generate_answer: "AI generated",
                    manual_input: "Needs your input",
                    ignore: "Ignored"
                  }[match.action];

                  return (
                    <div
                      className="review-field"
                      key={match.fieldId}
                    >

                      <div className="review-field-header">

                        <label>
                          <input
                            type="checkbox"
                            checked={match.selected}
                            disabled={isIgnored}
                            onChange={event =>
                              toggleMatch(
                                match.fieldId,
                                event.target.checked
                              )
                            }
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
                          onChange={event =>
                            updateMatchValue(
                              match.fieldId,
                              event.target.value
                            )
                          }
                        />
                      )}

                      <span className="matched-source">
                        {match.reason}
                      </span>

                    </div>
                  );
                })}

              </div>
            )}

          {/* No Matches */}
          {analysisReady && matches.length === 0 && (
            <div className="empty-state">
              <FileText size={25} />

              <span>
                No matching fields were identified.
              </span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <p className="error">{error}</p>
          )}

          {/* Single Primary Action */}
          <button
            className="analyze-button"
            onClick={handlePrimaryAction}
            disabled={loading}
          >
            {loading ? (
              <LoaderCircle
                className="spin"
                size={18}
              />
            ) : (
              <Sparkles size={18} />
            )}

            {loading
              ? "Working..."
              : !analysisReady
                ? autofillMode === "quick"
                  ? "Analyze & QuickFill"
                  : "Analyze Application"
                : autofillMode === "quick"
                  ? "QuickFill"
                  : "Fill Application"
            }
          </button>

          {!analysisReady && (
            <p className="action-hint">
              {autofillMode === "quick"
                ? "Analyze and fill eligible fields automatically."
                : "Analyze first, review your answers, then fill the form."
              }
            </p>
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
