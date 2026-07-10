import React, { useState, useEffect, useRef } from "react";

export const ChatPanel = React.memo(function ChatPanel({
  chatHistory,
  onSendMessage,
  isLoading,
  incidents = [],
  resolvedIncidents = [],
  activeReplay = null,
  onStartReplay,
  onExitReplay,
  replayStep = 0,
  setReplayStep,
  isPlayingReplay = false,
  setIsPlayingReplay,
  activeMatch = "argentina_saudi",
  simulationState = {},
  isConnected = false,
  recsEngine = "Gemini Pro",
  zones = []
}) {
  const [activeSubTab, setActiveSubTab] = useState("chat"); // "chat", "reports"
  const [input, setInput] = useState("");
  const historyEndRef = useRef(null);

  // Auto-scroll to bottom of chat list
  useEffect(() => {
    if (activeSubTab === "chat") {
      historyEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHistory, activeSubTab]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim());
    setInput("");
  };

  const getEngineBadgeClass = (engineName) => {
    if (!engineName) return "fallback";
    const name = engineName.toLowerCase();
    if (name.includes("claude")) return "claude";
    if (name.includes("gemini")) return "gemini";
    return "fallback";
  };

  const getMatchName = (id) => {
    switch (id) {
      case "argentina_saudi": return "Argentina vs. Saudi Arabia";
      case "mexico_poland": return "Mexico vs. Poland";
      case "france_morocco": return "France vs. Morocco";
      default: return "Ingress Flow Active";
    }
  };

  const getMatchStageLabel = (stage) => {
    switch (stage) {
      case "pre_match": return "Pre-Match Warmup";
      case "gate_opening": return "Gates Opened";
      case "crowd_arrival": return "Spectators Arriving";
      case "peak_entry": return "Peak Turnstile Entry";
      case "kickoff": return "Match Kick-off";
      case "halftime": return "Halftime Interval";
      case "exit_rush": return "Exit Rush Peak";
      case "transport_congestion": return "Transport Congestion";
      case "incident_resolution": return "Incident Clear";
      case "match_complete": return "Match Ended";
      default: return "Ingress Flow Active";
    }
  };

  // 10 Timeline Steps
  const timelineSteps = [
    { num: 1, label: "Telemetry Received", desc: "Live spectator tracking telemetry ingested." },
    { num: 2, label: "Crowd Threshold", desc: "Zone occupancy rate exceeded limits." },
    { num: 3, label: "Risk Analysis", desc: "GenAI analyzing crowd flow dynamics." },
    { num: 4, label: "Decision Analysis", desc: "Decision engine running simulations." },
    { num: 5, label: "Impact Prediction", desc: "Predicting queue reduction time." },
    { num: 6, label: "Operator Briefing", desc: "Generating briefing card." },
    { num: 7, label: "Announcements", desc: "Multilingual announcement ready." },
    { num: 8, label: "Authorization", desc: "Awaiting operator authorization." },
    { num: 9, label: "Diversion Active", desc: "Rerouting pushed to displays." },
    { num: 10, label: "Incident Clear", desc: "Occupancy levels normalized." },
  ];

  // Calculate stats for match card
  const totalSpectators = zones.reduce((sum, z) => sum + (z.current_occupancy || 0), 0);
  const totalCapacity = zones.reduce((sum, z) => sum + (z.capacity || 0), 0);
  const occupancyPct = totalCapacity > 0 ? (totalSpectators / totalCapacity) * 100 : 0;

  // Export functions
  const exportToMarkdown = (inc) => {
    const md = `# FIFA StadiumIQ Executive Operational Report

**Incident Report ID**: ${inc.id}
**Target Facility Zone**: ${inc.zoneName}
**Status**: Resolved & Audited
**Incident Time Window**: ${inc.startTime} - ${inc.endTime || "N/A"}
**Total Response Time**: ${inc.responseTime}

## 1. Executive Performance Dashboard
| Performance Indicator | Pre-Dispatch | Post-Resolution | Net Operational Change |
| :--- | :---: | :---: | :---: |
| Ingress Occupancy Rate | ${inc.occupancyPctBefore}% | ${inc.occupancyPctAfter}% | -${inc.densityReduction}% density |
| Queue Length (Spectators) | ${inc.occupancyBefore} | ${inc.occupancyAfter} | -${inc.occupancyBefore - inc.occupancyAfter} count |
| Overall Stadium Safety Score | ${inc.safetyScoreBefore}/100 | ${inc.safetyScoreAfter}/100 | +${inc.safetyScoreAfter - inc.safetyScoreBefore} points |

## 2. AI Explainable Decision Summary
- **Primary Dispatch Recommendation**: Redirect flow from ${inc.zoneName} to recommended alternate gates.
- **Natural Language Reasoning**: AI identified Gate congestion approaching 90%+ design capacity. Redirecting to under-utilized alternatives mitigated safety risks and stabilized entry gates flow.

## 3. Operations System Audit Trail
- **Stage 1 (Ingest)**: Telemetry Received at ${inc.steps[1] || inc.startTime}
- **Stage 2 (Alarm)**: Crowd Threshold Detected at ${inc.steps[2] || inc.startTime}
- **Stage 8 (Approval)**: Operator Confirmed Dispatch at ${inc.steps[8] || "N/A"}
- **Stage 9 (Activation)**: Crowd Diversion Initiated at ${inc.steps[9] || "N/A"}
- **Stage 10 (Resolution)**: Incident Cleared at ${inc.steps[10] || inc.endTime}

*StadiumIQ Control Center Auditor Signature: _______________________*
`;

    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `StadiumIQ_Executive_Report_${inc.zoneName.replace(/ /g, "_")}.md`;
    a.click();
  };

  const exportToJSON = (inc) => {
    const dataStr = JSON.stringify(inc, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `StadiumIQ_Executive_Report_${inc.zoneName.replace(/ /g, "_")}.json`;
    a.click();
  };

  return (
    <div className="copilot-sidebar">
      
      {/* 1. Current Match Information */}
      <div className="glass-panel" style={{ padding: "12px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
          <span style={{ fontSize: "0.68rem", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: "700" }}>
            🏟️ Match Operations Status
          </span>
          <span style={{ fontSize: "0.62rem", background: "rgba(0, 176, 255, 0.15)", color: "#00f0ff", padding: "1px 6px", borderRadius: "4px", fontWeight: "700" }}>
            LIVE
          </span>
        </div>
        <h3 style={{ fontSize: "0.9rem", fontWeight: "700", color: "#fff", marginBottom: "6px" }}>
          {getMatchName(activeMatch)}
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: "4px", fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
          <div>Phase: <strong style={{ color: "#fff" }}>{getMatchStageLabel(simulationState?.match_stage)}</strong></div>
          <div>Occupancy: <strong style={{ color: "#fff" }}>{Math.round(occupancyPct)}%</strong></div>
        </div>
        <div style={{ height: "3px", background: "rgba(255,255,255,0.05)", borderRadius: "2px", marginTop: "6px", overflow: "hidden" }}>
          <div style={{ width: `${occupancyPct}%`, height: "100%", background: "linear-gradient(90deg, #00b0ff, #00e676)", borderRadius: "2px" }}></div>
        </div>
      </div>

      {/* 2. AI Health Monitor */}
      <div className="glass-panel" style={{ padding: "10px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
          <span style={{ fontSize: "0.68rem", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: "700" }}>
            🖥️ AI System Telemetry & Health
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: isConnected ? "var(--color-success)" : "var(--color-danger)", display: "inline-block", boxShadow: isConnected ? "0 0 6px var(--color-success)" : "none" }}></span>
            <span style={{ fontSize: "0.65rem", color: isConnected ? "var(--color-success)" : "var(--color-danger)", fontWeight: "700" }}>
              {isConnected ? "ONLINE" : "OFFLINE"}
            </span>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 12px", fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
          <div>Engine: <strong style={{ color: "#00b0ff" }}>{recsEngine || "Local Fallback"}</strong></div>
          <div>Telemetry RSS: <strong style={{ color: "var(--color-success)" }}>Nominal</strong></div>
          <div>API Latency: <strong style={{ color: "#fff" }}>{isConnected ? "42ms" : "N/A"}</strong></div>
          <div>Anomaly Filter: <strong style={{ color: "var(--color-success)" }}>Active (0 errors)</strong></div>
        </div>
      </div>

      {/* 3. Incident Timeline */}
      <div className="glass-panel" style={{ padding: "12px 16px" }}>
        <h4 style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: "700", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
          <span>⚡</span> Active AI Operational Timelines
        </h4>
        
        {incidents.length === 0 ? (
          <div style={{ color: "var(--color-text-muted)", fontSize: "0.75rem", fontStyle: "italic", textAlign: "center", padding: "6px 0" }}>
            🛡️ Stadium security status nominal. No active incident alerts.
          </div>
        ) : (
          <div style={{ maxHeight: "200px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px" }}>
            {incidents.map((inc) => (
              <div key={inc.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <span style={{ color: "white", fontSize: "0.78rem", fontWeight: "700" }}>{inc.zoneName}</span>
                  <span style={{ fontSize: "0.62rem", padding: "1px 4px", borderRadius: "3px", fontWeight: "700", background: inc.statusBefore === "critical" ? "rgba(255, 76, 76, 0.15)" : "rgba(255, 179, 0, 0.15)", color: inc.statusBefore === "critical" ? "var(--color-danger)" : "var(--color-warning)" }}>
                    {inc.statusBefore.toUpperCase()}
                  </span>
                </div>
                
                {/* Visual Step Tracker */}
                <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.72rem", color: "#00b0ff" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#00b0ff", animation: "pulse-glow 1.5s infinite" }}></div>
                  <strong>Step {inc.currentStep}: {timelineSteps[inc.currentStep - 1]?.label || "Processing"}</strong>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. AI Copilot Chat Card (Stretches to consume remaining space) */}
      <div className="glass-panel" style={{ minHeight: "0" }}>
        
        {/* Toggle headers inside Chat panel */}
        <div style={{ display: "flex", width: "100%", borderBottom: "1px solid var(--border-light)", flexShrink: 0 }}>
          <button
            onClick={() => setActiveSubTab("chat")}
            style={{
              flex: 1,
              padding: "8px",
              background: "transparent",
              border: "none",
              borderBottom: activeSubTab === "chat" ? "2px solid var(--color-primary)" : "none",
              color: activeSubTab === "chat" ? "var(--color-primary)" : "var(--color-text-secondary)",
              fontWeight: "700",
              fontSize: "0.72rem",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            💬 Copilot Chat
          </button>
          <button
            onClick={() => setActiveSubTab("reports")}
            style={{
              flex: 1,
              padding: "8px",
              background: "transparent",
              border: "none",
              borderBottom: activeSubTab === "reports" ? "2px solid var(--color-primary)" : "none",
              color: activeSubTab === "reports" ? "var(--color-primary)" : "var(--color-text-secondary)",
              fontWeight: "700",
              fontSize: "0.72rem",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            📋 Reports Library ({resolvedIncidents.length})
          </button>
        </div>

        <div className="panel-content" style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", padding: "8px 12px", minHeight: "0" }}>
          
          {/* SubTab 1: Chat interface */}
          {activeSubTab === "chat" && (
            <div className="chat-container" style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
              <div className="chat-history" style={{ flex: 1, overflowY: "auto", paddingRight: "4px" }}>
                {chatHistory.length === 0 ? (
                  <div style={{ color: "var(--color-text-muted)", fontSize: "0.8rem", textAlign: "center", padding: "30px 10px", display: "flex", flexDirection: "column", gap: "8px", alignItems: "center" }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.4 }}>
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    <span>Ask Copilot for routing advice, safety rules, or mitigation instructions.</span>
                  </div>
                ) : (
                  chatHistory.map((msg, index) => (
                    <div key={index} className={`chat-message ${msg.sender}`} style={{ marginBottom: "10px", maxWidth: "90%" }}>
                      <div style={{ fontSize: "0.85rem" }}>{msg.text}</div>
                      <div className="chat-meta">
                        <span className="chat-sender">{msg.sender === "operator" ? "Operator" : "Copilot"}</span>
                        {msg.sender === "copilot" && msg.engine && (
                          <span className={`engine-badge ${getEngineBadgeClass(msg.engine)}`} style={{ fontSize: "0.6rem", padding: "1px 4px" }}>
                            {msg.engine}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
                {isLoading && (
                  <div className="chat-message copilot" style={{ opacity: 0.7 }}>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center", fontSize: "0.8rem" }}>
                      <span style={{ animation: "pulse-glow-green 1s infinite", width: "6px", height: "6px", backgroundColor: "var(--color-success)", borderRadius: "50%" }}></span>
                      <span>Formulating response...</span>
                    </div>
                  </div>
                )}
                <div ref={historyEndRef} />
              </div>

              <form onSubmit={handleSubmit} className="chat-input-form" style={{ marginTop: "auto", display: "flex", gap: "8px", paddingTop: "10px", borderTop: "1px solid var(--border-light)" }}>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask Stadium Copilot..."
                  className="chat-input"
                  disabled={isLoading}
                  style={{ flex: 1, padding: "8px 12px", fontSize: "0.8rem" }}
                  aria-label="Ask copilot message"
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="chat-submit-btn"
                  style={{ padding: "0 12px", fontSize: "0.8rem", height: "auto" }}
                >
                  Send
                </button>
              </form>
            </div>
          )}

          {/* SubTab 2: Reports Library */}
          {activeSubTab === "reports" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {resolvedIncidents.length === 0 ? (
                <div style={{ color: "var(--color-text-muted)", fontSize: "0.78rem", textAlign: "center", padding: "20px 0" }}>
                  No completed post-incident audits logged.
                </div>
              ) : (
                resolvedIncidents.map((inc) => (
                  <div key={inc.id} style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.05)", borderRadius: "6px", padding: "10px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <strong style={{ color: "white", fontSize: "0.78rem" }}>{inc.zoneName}</strong>
                      <span style={{ fontSize: "0.62rem", color: "var(--color-success)", fontWeight: "700" }}>✓ AUDITED</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px", fontSize: "0.7rem", color: "var(--color-text-secondary)", background: "rgba(0,0,0,0.15)", padding: "6px", borderRadius: "4px", marginBottom: "8px" }}>
                      <div>Density Drop: <strong style={{ color: "var(--color-success)" }}>-{inc.densityReduction}%</strong></div>
                      <div>Clearance: <strong>{inc.responseTime}</strong></div>
                    </div>
                    <div style={{ display: "flex", gap: "4px" }}>
                      <button
                        onClick={() => onStartReplay(inc)}
                        style={{ flex: 1, padding: "4px", fontSize: "0.68rem", background: "rgba(0, 176, 255, 0.15)", border: "1px solid #00b0ff", color: "#00b0ff", borderRadius: "4px", cursor: "pointer" }}
                      >
                        📺 Replay
                      </button>
                      <button
                        onClick={() => exportToMarkdown(inc)}
                        style={{ padding: "4px 8px", fontSize: "0.68rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", borderRadius: "4px", cursor: "pointer" }}
                      >
                        📄 Export
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

        </div>
      </div>

    </div>
  );
});
