import React, { useState, useEffect } from "react";

export function OperationsControlCenter({
  zones = [],
  onTriggerSpike,
  onReset,
  isActionLoading,
  simulationState,
  onToggleDemoMode,
  onSetSimulationStage,
  dispatchHistory = [],
  onDeactivateRedirection,
  activeReplay = null,
  onExitReplay,
  replayStep = 0,
  setReplayStep,
  isPlayingReplay = false,
  setIsPlayingReplay
}) {
  const [activeTab, setActiveTab] = useState("simulation"); // "simulation", "audit", "replay"

  // Automatically switch to replay tab when an incident replay starts
  useEffect(() => {
    if (activeReplay) {
      setActiveTab("replay");
    }
  }, [activeReplay]);

  const matchStages = [
    { name: "pre_match", label: "🔒 Pre-Match (Gates Closed)" },
    { name: "gate_opening", label: "🔓 Gates Open (Ingress Inception)" },
    { name: "crowd_arrival", label: "🚶 Spectator Arrival Flow" },
    { name: "peak_entry", label: "🚨 Ingress peak (High Flow)" },
    { name: "kickoff", label: "⚽ Match Kickoff (Seats Packed)" },
    { name: "halftime", label: "🌭 Halftime Concourse Rush" },
    { name: "exit_rush", label: "🏃 Post-Match Exit Rush" },
    { name: "transport_congestion", label: "🚌 Transit Hub Congestion" },
    { name: "incident_resolution", label: "🛡️ Incident Resolution" },
    { name: "match_complete", label: "🏁 Match Concluded" }
  ];

  const demoMode = simulationState?.demo_mode || false;
  const currentStage = simulationState?.match_stage || "gate_opening";

  return (
    <div className="glass-panel" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Tab Selectors */}
      <div className="panel-header" style={{ paddingBottom: "0", borderBottom: "none" }}>
        <div style={{ display: "flex", width: "100%", borderBottom: "1px solid var(--border-light)" }}>
          <button
            onClick={() => setActiveTab("simulation")}
            style={{
              flex: 1,
              padding: "12px 8px",
              background: "transparent",
              border: "none",
              borderBottom: activeTab === "simulation" ? "2px solid var(--color-primary)" : "none",
              color: activeTab === "simulation" ? "var(--color-primary)" : "var(--color-text-secondary)",
              fontWeight: "700",
              fontSize: "0.75rem",
              cursor: "pointer",
              transition: "all 0.2s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px"
            }}
          >
            🎮 Controls
          </button>
          <button
            onClick={() => setActiveTab("audit")}
            style={{
              flex: 1,
              padding: "12px 8px",
              background: "transparent",
              border: "none",
              borderBottom: activeTab === "audit" ? "2px solid var(--color-primary)" : "none",
              color: activeTab === "audit" ? "var(--color-primary)" : "var(--color-text-secondary)",
              fontWeight: "700",
              fontSize: "0.75rem",
              cursor: "pointer",
              transition: "all 0.2s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px"
            }}
          >
            📋 Audit Log
            {dispatchHistory.length > 0 && (
              <span style={{
                background: "rgba(0, 230, 118, 0.15)",
                color: "var(--color-success)",
                fontSize: "0.65rem",
                padding: "1px 6px",
                borderRadius: "10px",
                fontWeight: "700"
              }}>
                {dispatchHistory.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("replay")}
            style={{
              flex: 1,
              padding: "12px 8px",
              background: "transparent",
              border: "none",
              borderBottom: activeTab === "replay" ? "2px solid var(--color-primary)" : "none",
              color: activeTab === "replay" ? "var(--color-primary)" : "var(--color-text-secondary)",
              fontWeight: "700",
              fontSize: "0.75rem",
              cursor: "pointer",
              transition: "all 0.2s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px"
            }}
          >
            📺 Replay Player
            {activeReplay && (
              <span style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "#00b0ff",
                boxShadow: "0 0 6px #00b0ff",
                display: "inline-block"
              }}></span>
            )}
          </button>
        </div>
      </div>

      <div className="panel-content" style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
        
        {/* Tab 1: Simulation Controls */}
        {activeTab === "simulation" && (
          <div className="demo-controls-panel" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", fontWeight: "600" }}>Stage Progression Loop:</span>
              <button
                onClick={() => onToggleDemoMode(!demoMode)}
                style={{
                  padding: "4px 12px",
                  fontSize: "0.7rem",
                  background: demoMode ? "var(--color-success)" : "rgba(255,255,255,0.08)",
                  color: demoMode ? "#000" : "var(--color-text-secondary)",
                  border: "none",
                  borderRadius: "4px",
                  fontWeight: "700",
                  cursor: "pointer",
                  transition: "background 0.2s"
                }}
              >
                {demoMode ? "🟢 ON (AUTO)" : "⚪ OFF (MANUAL)"}
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", fontWeight: "600" }}>Set Match Operational Phase:</label>
              <select
                value={currentStage}
                onChange={(e) => onSetSimulationStage(e.target.value)}
                style={{
                  background: "rgba(0,0,0,0.3)",
                  border: "1px solid var(--border-light)",
                  color: "white",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  fontSize: "0.8rem",
                  cursor: "pointer",
                  outline: "none"
                }}
              >
                {matchStages.map((stage) => (
                  <option key={stage.name} value={stage.name} style={{ background: "#161b30" }}>
                    {stage.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginTop: "6px" }}>
              <label style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", fontWeight: "600", display: "block", marginBottom: "8px" }}>
                Trigger Crowd Bottleneck Spikes (Telemetry Alarm Test):
              </label>
              <div className="demo-btn-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <button
                  onClick={onReset}
                  disabled={isActionLoading}
                  className="demo-action-btn demo-reset-btn"
                  style={{ gridColumn: "span 2", padding: "10px", fontSize: "0.8rem" }}
                >
                  🔄 Reset System (Nominal Flow)
                </button>

                <button
                  onClick={() => onTriggerSpike("gate_c")}
                  disabled={isActionLoading}
                  className="demo-action-btn spike-btn"
                  style={{ borderLeft: "3px solid var(--color-danger)", padding: "8px", fontSize: "0.75rem" }}
                >
                  🚨 Spike Gate C
                </button>

                <button
                  onClick={() => onTriggerSpike("concourse_north")}
                  disabled={isActionLoading}
                  className="demo-action-btn spike-btn"
                  style={{ borderLeft: "3px solid var(--color-danger)", padding: "8px", fontSize: "0.75rem" }}
                >
                  🚨 Spike North Conc.
                </button>

                <button
                  onClick={() => onTriggerSpike("seating_east")}
                  disabled={isActionLoading}
                  className="demo-action-btn spike-btn"
                  style={{ borderLeft: "3px solid var(--color-danger)", padding: "8px", fontSize: "0.75rem" }}
                >
                  🚨 Spike East Seat.
                </button>

                <button
                  onClick={() => onTriggerSpike("stairwell_north")}
                  disabled={isActionLoading}
                  className="demo-action-btn spike-btn"
                  style={{ borderLeft: "3px solid var(--color-danger)", padding: "8px", fontSize: "0.75rem" }}
                >
                  🚨 Spike North Stair.
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Operational Audit Log */}
        {activeTab === "audit" && (
          <div>
            {dispatchHistory.length === 0 ? (
              <div style={{ color: "var(--color-text-muted)", fontSize: "0.8rem", textAlign: "center", paddingTop: "24px" }}>
                No operations dispatch actions logged.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {dispatchHistory.map((item, idx) => {
                  const isActive = item.status === "Active";
                  return (
                    <div
                      key={idx}
                      className="history-card"
                      style={{
                        background: "rgba(255, 255, 255, 0.02)",
                        borderLeft: isActive ? "3px solid var(--color-success)" : "3px solid rgba(255, 255, 255, 0.2)",
                        borderTop: "1px solid rgba(255, 255, 255, 0.04)",
                        borderRight: "1px solid rgba(255, 255, 255, 0.04)",
                        borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                        borderRadius: "6px",
                        padding: "10px",
                        fontSize: "0.8rem"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ fontWeight: "700", color: "#fff" }}>{item.zoneName}</span>
                          <span style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>({item.timestamp})</span>
                        </div>
                        <span style={{ fontSize: "0.7rem", color: isActive ? "var(--color-success)" : "var(--color-text-muted)", fontWeight: "700", textTransform: "uppercase" }}>
                          {isActive ? "● ACTIVE" : "DISCHARGED"}
                        </span>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 8px", fontSize: "0.72rem", color: "var(--color-text-secondary)", marginBottom: "4px" }}>
                        <div><span style={{ color: "var(--color-text-muted)" }}>Density:</span> <strong style={{ color: "#fff" }}>{item.density || "N/A"}</strong></div>
                        <div><span style={{ color: "var(--color-text-muted)" }}>Flow Rate:</span> <strong style={{ color: "var(--color-success)" }}>{item.flowRate || 350}/min</strong></div>
                        <div style={{ gridColumn: "span 2" }}><span style={{ color: "var(--color-text-muted)" }}>Routes:</span> <strong style={{ color: "#00f0ff" }}>{item.recommendation.replace("Redirected flow to ", "")}</strong></div>
                      </div>

                      {isActive && (
                        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "6px" }}>
                          <button
                            onClick={() => onDeactivateRedirection(item.zoneId)}
                            style={{
                              padding: "2px 8px",
                              fontSize: "0.7rem",
                              background: "rgba(255, 74, 107, 0.15)",
                              border: "1px solid var(--color-danger)",
                              color: "var(--color-danger)",
                              borderRadius: "4px",
                              cursor: "pointer"
                            }}
                          >
                            Deactivate Directives
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Replay Controls */}
        {activeTab === "replay" && (
          <div>
            {!activeReplay ? (
              <div style={{ color: "var(--color-text-muted)", fontSize: "0.8rem", textAlign: "center", paddingTop: "24px" }}>
                No active incident replay simulation. Select a report in the copilot panel to review.
              </div>
            ) : (
              <div style={{
                background: "rgba(0, 176, 255, 0.03)",
                border: "1px solid rgba(0, 176, 255, 0.15)",
                borderRadius: "8px",
                padding: "12px",
                boxShadow: "0 0 15px rgba(0, 176, 255, 0.05)"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <strong style={{ color: "#00b0ff", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "4px" }}>
                    <span style={{ animation: "pulse-glow 1.5s infinite", width: "8px", height: "8px", backgroundColor: "#00b0ff", borderRadius: "50%" }}></span>
                    REPLAYING INCIDENT FLOW
                  </strong>
                  <button onClick={onExitReplay} style={{ padding: "2px 8px", fontSize: "0.7rem", background: "rgba(255,76,76,0.15)", border: "1px solid var(--color-danger)", color: "var(--color-danger)", borderRadius: "4px", cursor: "pointer" }}>
                    Exit Replay
                  </button>
                </div>

                <div style={{ fontSize: "0.75rem", color: "#fff", marginBottom: "8px" }}>
                  Incident Target: <strong>{activeReplay.zoneName}</strong>
                </div>

                {/* Slider */}
                <div style={{ margin: "14px 0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.62rem", color: "var(--color-text-muted)", marginBottom: "4px" }}>
                    <span>Inception</span>
                    <span>Peak</span>
                    <span>AI Advise</span>
                    <span>Mitigate</span>
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
                    style={{
                      padding: "4px 12px",
                      fontSize: "0.72rem",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      background: isPlayingReplay ? "rgba(255,179,0,0.15)" : "rgba(0,230,118,0.15)",
                      color: isPlayingReplay ? "var(--color-warning)" : "var(--color-success)"
                    }}
                  >
                    {isPlayingReplay ? "⏸ Pause" : "▶ Play Auto"}
                  </button>
                  <button
                    onClick={() => { setReplayStep(0); setIsPlayingReplay(true); }}
                    style={{
                      padding: "4px 12px",
                      fontSize: "0.72rem",
                      background: "rgba(255,255,255,0.08)",
                      border: "none",
                      borderRadius: "4px",
                      color: "#fff",
                      cursor: "pointer"
                    }}
                  >
                    🔄 Restart
                  </button>
                </div>

                {/* Step snapshot description */}
                <div style={{ fontSize: "0.72rem", color: "var(--color-text-secondary)", background: "rgba(0,0,0,0.2)", padding: "8px", borderRadius: "4px", fontStyle: "italic", borderLeft: "2px solid #00b0ff" }}>
                  {replayStep === 0 && "Step 1: Telemetry shows initial density surge. Risk is rising."}
                  {replayStep === 1 && "Step 2: Occupancy crosses threshold. Red alert triggered."}
                  {replayStep === 2 && "Step 3: AI recommends routing traffic to alternates. Dispatch requested."}
                  {replayStep === 3 && "Step 4: Diversion active. Heatmap shows flow shifting. Occupancy drops."}
                  {replayStep === 4 && "Step 5: Congestion cleared. Incident resolved."}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
