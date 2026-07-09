import React, { useState, useEffect, useRef } from "react";

export function ChatPanel({ 
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
  setIsPlayingReplay
}) {
  const [activeTab, setActiveTab] = useState("copilot"); // "copilot", "timelines", "reports"
  const [input, setInput] = useState("");
  const [srAnnouncement, setSrAnnouncement] = useState("");
  const [selectedReport, setSelectedReport] = useState(null);
  const historyEndRef = useRef(null);
  
  // Auto-scroll to bottom of chat list
  useEffect(() => {
    if (activeTab === "copilot") {
      historyEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHistory, activeTab]);

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

  // 10 Timeline Steps
  const timelineSteps = [
    { num: 1, label: "Telemetry Received", desc: "Live spectator tracking telemetry ingested by StadiumIQ." },
    { num: 2, label: "Crowd Threshold Detected", desc: "Zone occupancy rate exceeded safe design limits." },
    { num: 3, label: "AI Risk Analysis", desc: "Generative AI analyzing crowd flow dynamics & entry/exit rates." },
    { num: 4, label: "Explainable Decision Analysis", desc: "Decision engine running what-if routes simulations." },
    { num: 5, label: "Impact Prediction", desc: "Predicting queue reduction and clearance times." },
    { num: 6, label: "Operator Briefing", desc: "Generating briefing card and action advisory." },
    { num: 7, label: "Multilingual Announcement Generated", desc: "Creating targeted PA audio announcements." },
    { num: 8, label: "Operator Approval", desc: "Awaiting final operator authorization & confirmation." },
    { num: 9, label: "Crowd Diversion Activated", desc: "Rerouting instructions pushed to digital signage." },
    { num: 10, label: "Incident Resolved", desc: "Congestion alleviated and occupancy levels normalized." },
  ];

  // Replay playback effect
  useEffect(() => {
    let timer = null;
    if (isPlayingReplay && activeReplay) {
      timer = setInterval(() => {
        setReplayStep(prev => {
          if (prev >= 4) {
            setIsPlayingReplay(false);
            return 4;
          }
          return prev + 1;
        });
      }, 3000);
    }
    return () => clearInterval(timer);
  }, [isPlayingReplay, activeReplay]);

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
    <div className="glass-panel" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Tab Selectors */}
      <div className="panel-header" style={{ paddingBottom: "0", borderBottom: "none" }}>
        <div style={{ display: "flex", width: "100%", borderBottom: "1px solid var(--border-light)" }}>
          <button
            onClick={() => { setActiveTab("copilot"); setSelectedReport(null); }}
            style={{
              flex: 1,
              padding: "10px",
              background: "transparent",
              border: "none",
              borderBottom: activeTab === "copilot" ? "2px solid var(--color-primary)" : "none",
              color: activeTab === "copilot" ? "var(--color-primary)" : "var(--color-text-secondary)",
              fontWeight: "700",
              fontSize: "0.75rem",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            💬 Copilot
          </button>
          <button
            onClick={() => { setActiveTab("timelines"); setSelectedReport(null); }}
            style={{
              flex: 1,
              padding: "10px",
              background: "transparent",
              border: "none",
              borderBottom: activeTab === "timelines" ? "2px solid var(--color-primary)" : "none",
              color: activeTab === "timelines" ? "var(--color-primary)" : "var(--color-text-secondary)",
              fontWeight: "700",
              fontSize: "0.75rem",
              cursor: "pointer",
              transition: "all 0.2s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "4px"
            }}
          >
            ⚡ Timelines
            {incidents.length > 0 && (
              <span style={{
                background: "var(--color-danger)",
                color: "#fff",
                fontSize: "0.6rem",
                padding: "1px 5px",
                borderRadius: "10px",
                animation: "pulse-glow 1.5s infinite"
              }}>
                {incidents.length}
              </span>
            )}
          </button>
          <button
            onClick={() => { setActiveTab("reports"); setSelectedReport(null); }}
            style={{
              flex: 1,
              padding: "10px",
              background: "transparent",
              border: "none",
              borderBottom: activeTab === "reports" ? "2px solid var(--color-primary)" : "none",
              color: activeTab === "reports" ? "var(--color-primary)" : "var(--color-text-secondary)",
              fontWeight: "700",
              fontSize: "0.75rem",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            📋 Reports & Replay
          </button>
        </div>
      </div>

      <div className="panel-content" style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
        
        {/* Tab 1: AI Copilot Chat */}
        {activeTab === "copilot" && (
          <div className="chat-container" style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%" }}>
            <div className="chat-history" style={{ flex: 1, overflowY: "auto" }}>
              {chatHistory.length === 0 ? (
                <div 
                  style={{ 
                    color: "var(--color-text-muted)", 
                    fontSize: "0.82rem", 
                    textAlign: "center", 
                    padding: "40px 10px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    alignItems: "center"
                  }}
                >
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.4 }}>
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  <span>Ask Copilot for routing advice, safety rules, or mitigation instructions.</span>
                </div>
              ) : (
                chatHistory.map((msg, index) => (
                  <div key={index} className={`chat-message ${msg.sender}`}>
                    <div>{msg.text}</div>
                    <div className="chat-meta">
                      <span className="chat-sender">
                        {msg.sender === "operator" ? "Operator" : "Copilot"}
                      </span>
                      {msg.sender === "copilot" && msg.engine && (
                        <span className={`engine-badge ${getEngineBadgeClass(msg.engine)}`} style={{ fontSize: "0.65rem", padding: "1px 4px" }}>
                          {msg.engine}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
              {isLoading && (
                <div className="chat-message copilot" style={{ opacity: 0.7 }}>
                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    <span style={{ animation: "pulse-glow-green 1s infinite", width: "6px", height: "6px", backgroundColor: "var(--color-success)", borderRadius: "50%" }}></span>
                    <span>Copilot is formulating safety plan...</span>
                  </div>
                </div>
              )}
              <div ref={historyEndRef} />
            </div>

            <form onSubmit={handleSubmit} className="chat-input-form" style={{ marginTop: "auto" }}>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type query to Stadium Copilot..."
                className="chat-input"
                disabled={isLoading}
                aria-label="Ask copilot message"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="chat-submit-btn"
                aria-label="Send message"
              >
                Send
              </button>
            </form>
          </div>
        )}

        {/* Tab 2: Incident Timelines */}
        {activeTab === "timelines" && (
          <div style={{ flex: 1, padding: "12px" }}>
            <h3 style={{ fontSize: "0.85rem", color: "#fff", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
              <span>⚡</span> Active AI Operational Timelines
            </h3>
            
            {incidents.length === 0 ? (
              <div style={{ color: "var(--color-text-muted)", fontSize: "0.8rem", textAlign: "center", padding: "30px 10px" }}>
                No active crowd alerts or zone incidents. Stadium flow is safe.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {incidents.map((inc) => (
                  <div key={inc.id} style={{
                    background: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                    borderRadius: "8px",
                    padding: "12px"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                      <strong style={{ color: "white", fontSize: "0.85rem" }}>{inc.zoneName}</strong>
                      <span style={{
                        fontSize: "0.68rem",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        fontWeight: "700",
                        background: inc.statusBefore === "critical" ? "rgba(255, 76, 76, 0.15)" : "rgba(255, 179, 0, 0.15)",
                        color: inc.statusBefore === "critical" ? "var(--color-danger)" : "var(--color-warning)"
                      }}>
                        {inc.statusBefore.toUpperCase()}
                      </span>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", paddingLeft: "6px", borderLeft: "2px solid rgba(255,255,255,0.06)" }}>
                      {timelineSteps.map((step) => {
                        const isCompleted = step.num < inc.currentStep;
                        const isActive = step.num === inc.currentStep;
                        const stepTime = inc.steps[step.num];

                        return (
                          <div key={step.num} style={{
                            display: "flex",
                            gap: "10px",
                            fontSize: "0.72rem",
                            color: isCompleted ? "var(--color-text-primary)" : isActive ? "#00b0ff" : "var(--color-text-muted)",
                            alignItems: "flex-start",
                            transition: "all 0.3s"
                          }}>
                            {/* Step Indicator Dot */}
                            <div style={{
                              width: "14px",
                              height: "14px",
                              borderRadius: "50%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "0.55rem",
                              fontWeight: "900",
                              background: isCompleted ? "var(--color-success)" : isActive ? "#00b0ff" : "rgba(255,255,255,0.08)",
                              color: isCompleted || isActive ? "#000" : "var(--color-text-muted)",
                              boxShadow: isActive ? "0 0 8px #00b0ff" : "none",
                              marginTop: "2px"
                            }}>
                              {isCompleted ? "✓" : step.num}
                            </div>
                            
                            {/* Step Content */}
                            <div style={{ flex: 1 }}>
                              <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ fontWeight: "700" }}>{step.label}</span>
                                {stepTime && <span style={{ color: "var(--color-text-muted)", fontSize: "0.65rem" }}>{stepTime}</span>}
                              </div>
                              <div style={{ fontSize: "0.68rem", color: "var(--color-text-muted)", marginTop: "2px" }}>
                                {step.desc}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Replay & Executive Reports */}
        {activeTab === "reports" && (
          <div style={{ flex: 1, padding: "12px" }}>
            
            {/* Report Viewer Overlay */}
            {selectedReport ? (
              <div style={{
                background: "rgba(0,0,0,0.4)",
                border: "1px solid var(--border-light)",
                borderRadius: "8px",
                padding: "16px",
                position: "relative"
              }}>
                <button
                  onClick={() => setSelectedReport(null)}
                  style={{
                    position: "absolute",
                    top: "10px",
                    right: "10px",
                    background: "transparent",
                    border: "none",
                    color: "var(--color-text-muted)",
                    cursor: "pointer",
                    fontSize: "0.85rem"
                  }}
                >
                  ✕ Close
                </button>
                
                <h3 style={{ fontSize: "0.9rem", color: "white", marginBottom: "4px" }}>📄 Executive Operational Report</h3>
                <span style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>ID: {selectedReport.id}</span>
                
                <hr style={{ border: "none", borderTop: "1px solid var(--border-light)", margin: "10px 0" }} />
                
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
                  <div>Target Zone: <strong style={{ color: "white" }}>{selectedReport.zoneName}</strong></div>
                  <div>Duration: <strong style={{ color: "white" }}>{selectedReport.startTime} - {selectedReport.endTime}</strong></div>
                  <div>Response Clearance Time: <strong style={{ color: "var(--color-success)" }}>{selectedReport.responseTime}</strong></div>
                </div>

                <h4 style={{ fontSize: "0.8rem", color: "white", marginTop: "12px", marginBottom: "6px" }}>Operational Improvement Metrics</h4>
                <table style={{ width: "100%", fontSize: "0.7rem", borderCollapse: "collapse", color: "white", background: "rgba(0,0,0,0.2)" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border-light)" }}>
                      <th style={{ textAlign: "left", padding: "6px" }}>Metric</th>
                      <th style={{ textAlign: "center", padding: "6px" }}>Before</th>
                      <th style={{ textAlign: "center", padding: "6px" }}>After</th>
                      <th style={{ textAlign: "center", padding: "6px" }}>Net change</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                      <td style={{ padding: "6px" }}>Density</td>
                      <td style={{ textAlign: "center", padding: "6px" }}>{selectedReport.occupancyPctBefore}%</td>
                      <td style={{ textAlign: "center", padding: "6px" }}>{selectedReport.occupancyPctAfter}%</td>
                      <td style={{ textAlign: "center", padding: "6px", color: "var(--color-success)" }}>-{selectedReport.densityReduction}%</td>
                    </tr>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                      <td style={{ padding: "6px" }}>Queue</td>
                      <td style={{ textAlign: "center", padding: "6px" }}>{selectedReport.occupancyBefore}</td>
                      <td style={{ textAlign: "center", padding: "6px" }}>{selectedReport.occupancyAfter}</td>
                      <td style={{ textAlign: "center", padding: "6px", color: "var(--color-success)" }}>-{selectedReport.occupancyBefore - selectedReport.occupancyAfter}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: "6px" }}>Safety Score</td>
                      <td style={{ textAlign: "center", padding: "6px" }}>{selectedReport.safetyScoreBefore}/100</td>
                      <td style={{ textAlign: "center", padding: "6px" }}>{selectedReport.safetyScoreAfter}/100</td>
                      <td style={{ textAlign: "center", padding: "6px", color: "var(--color-success)" }}>+{selectedReport.safetyScoreAfter - selectedReport.safetyScoreBefore} pts</td>
                    </tr>
                  </tbody>
                </table>

                <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
                  <button onClick={() => exportToMarkdown(selectedReport)} className="chat-submit-btn" style={{ flex: 1, padding: "6px", fontSize: "0.72rem", height: "auto" }}>
                    Export MD
                  </button>
                  <button onClick={() => exportToJSON(selectedReport)} className="chat-submit-btn" style={{ flex: 1, padding: "6px", fontSize: "0.72rem", height: "auto" }}>
                    Export JSON
                  </button>
                  <button onClick={() => window.print()} className="chat-submit-btn" style={{ flex: 1, padding: "6px", fontSize: "0.72rem", height: "auto", background: "rgba(0, 176, 255, 0.2)", borderColor: "#00b0ff" }}>
                    Print PDF
                  </button>
                </div>
              </div>
            ) : activeReplay ? (
              /* Replay mode interactive controls */
              <div style={{
                background: "rgba(0, 176, 255, 0.05)",
                border: "1px solid rgba(0, 176, 255, 0.25)",
                borderRadius: "8px",
                padding: "14px",
                boxShadow: "0 0 15px rgba(0, 176, 255, 0.1)"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <strong style={{ color: "#00b0ff", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "4px" }}>
                    <span style={{ animation: "pulse-glow 1.5s infinite", width: "8px", height: "8px", backgroundColor: "#00b0ff", borderRadius: "50%" }}></span>
                    REPLAYING INCIDENT FLOW
                  </strong>
                  <button onClick={onExitReplay} className="btn btn-secondary" style={{ padding: "2px 8px", fontSize: "0.7rem", background: "rgba(255,76,76,0.15)", border: "1px solid var(--color-danger)", color: "var(--color-danger)" }}>
                    Exit Replay
                  </button>
                </div>

                <div style={{ fontSize: "0.75rem", color: "#fff", marginBottom: "8px" }}>
                  Incident Target: <strong>{activeReplay.zoneName}</strong>
                </div>

                {/* Slider */}
                <div style={{ margin: "14px 0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.65rem", color: "var(--color-text-muted)", marginBottom: "4px" }}>
                    <span>Inception</span>
                    <span>Peak Congestion</span>
                    <span>AI Advisory</span>
                    <span>Mitigation</span>
                    <span>Resolved</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="4"
                    value={replayStep}
                    onChange={(e) => setReplayStep(parseInt(e.target.value))}
                    style={{ width: "100%", accentColor: "#00b0ff", cursor: "pointer" }}
                  />
                </div>

                {/* Replay state controls */}
                <div style={{ display: "flex", gap: "8px", justifyContent: "center", marginBottom: "12px" }}>
                  <button
                    onClick={() => setIsPlayingReplay(!isPlayingReplay)}
                    className="chat-submit-btn"
                    style={{ padding: "4px 12px", fontSize: "0.7rem", height: "auto", background: isPlayingReplay ? "rgba(255,179,0,0.15)" : "rgba(0,230,118,0.15)" }}
                  >
                    {isPlayingReplay ? "⏸ Pause" : "▶ Play Auto"}
                  </button>
                  <button
                    onClick={() => { setReplayStep(0); setIsPlayingReplay(true); }}
                    className="chat-submit-btn"
                    style={{ padding: "4px 12px", fontSize: "0.7rem", height: "auto" }}
                  >
                    🔄 Restart
                  </button>
                </div>

                {/* Step snapshot description */}
                <div style={{ fontSize: "0.7rem", color: "var(--color-text-secondary)", background: "rgba(0,0,0,0.2)", padding: "8px", borderRadius: "4px" }}>
                  {replayStep === 0 && "Step 1: Telemetry shows initial density surge. Risk is rising."}
                  {replayStep === 1 && "Step 2: Occupancy crosses threshold. Red alert triggered."}
                  {replayStep === 2 && "Step 3: AI recommends routing traffic to alternates. Dispatch requested."}
                  {replayStep === 3 && "Step 4: Diversion active. Heatmap shows flow shifting. Occupancy drops."}
                  {replayStep === 4 && "Step 5: Congestion cleared. Incident resolved."}
                </div>
              </div>
            ) : (
              /* List of audited resolved incidents */
              <div>
                <h3 style={{ fontSize: "0.85rem", color: "#fff", marginBottom: "10px" }}>
                  📋 Completed Post-Incident Audits
                </h3>
                
                {resolvedIncidents.length === 0 ? (
                  <div style={{ color: "var(--color-text-muted)", fontSize: "0.8rem", textAlign: "center", padding: "30px 10px" }}>
                    No post-incident audits available. Complete a crowd diversion to log metrics.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {resolvedIncidents.map((inc) => (
                      <div key={inc.id} style={{
                        background: "rgba(255, 255, 255, 0.02)",
                        border: "1px solid rgba(255, 255, 255, 0.06)",
                        borderRadius: "8px",
                        padding: "12px"
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                          <strong style={{ color: "white", fontSize: "0.78rem" }}>{inc.zoneName}</strong>
                          <span style={{ fontSize: "0.65rem", color: "var(--color-success)", fontWeight: "600" }}>✓ Resolved</span>
                        </div>

                        {/* Before vs After Summary */}
                        <div style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: "6px",
                          fontSize: "0.7rem",
                          color: "var(--color-text-secondary)",
                          marginBottom: "10px",
                          background: "rgba(0,0,0,0.15)",
                          padding: "6px",
                          borderRadius: "4px"
                        }}>
                          <div>Density Drop: <strong style={{ color: "var(--color-success)" }}>-{inc.densityReduction}%</strong></div>
                          <div>Response Time: <strong>{inc.responseTime}</strong></div>
                          <div>Safety Score: <strong>{inc.safetyScoreBefore} ➔ {inc.safetyScoreAfter}</strong></div>
                          <div>Queue Cleared: <strong>-{inc.occupancyBefore - inc.occupancyAfter} spectators</strong></div>
                        </div>

                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            onClick={() => onStartReplay(inc)}
                            className="chat-submit-btn"
                            style={{ flex: 1, padding: "4px", fontSize: "0.68rem", height: "auto" }}
                          >
                            📺 Replay Flow
                          </button>
                          <button
                            onClick={() => setSelectedReport(inc)}
                            className="chat-submit-btn"
                            style={{ flex: 1, padding: "4px", fontSize: "0.68rem", height: "auto", background: "rgba(255,255,255,0.05)" }}
                          >
                            📄 View Executive Report
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
