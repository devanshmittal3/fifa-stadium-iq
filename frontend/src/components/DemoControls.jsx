import React from "react";

export function DemoControls({ 
  zones, 
  onTriggerSpike, 
  onReset, 
  isActionLoading,
  simulationState,
  onToggleDemoMode,
  onSetSimulationStage
}) {
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
    <div className="glass-panel">
      <div className="panel-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
          </svg>
          Simulation Controller
        </h2>

        {/* Demo Mode Toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "0.68rem", color: "var(--color-text-secondary)" }}>Auto Stage Loop:</span>
          <button
            onClick={() => onToggleDemoMode(!demoMode)}
            style={{
              padding: "2px 8px",
              fontSize: "0.65rem",
              background: demoMode ? "var(--color-success)" : "rgba(255,255,255,0.08)",
              color: demoMode ? "#000" : "var(--color-text-secondary)",
              border: "none",
              borderRadius: "4px",
              fontWeight: "700",
              cursor: "pointer"
            }}
          >
            {demoMode ? "ON" : "OFF"}
          </button>
        </div>
      </div>

      <div className="panel-content" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {/* Match Stage Selector */}
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <label style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>Match Operational Stage:</label>
          <select
            value={currentStage}
            onChange={(e) => onSetSimulationStage(e.target.value)}
            style={{
              background: "rgba(0,0,0,0.3)",
              border: "1px solid var(--border-light)",
              color: "white",
              padding: "5px",
              borderRadius: "4px",
              fontSize: "0.75rem",
              cursor: "pointer"
            }}
          >
            {matchStages.map((stage) => (
              <option key={stage.name} value={stage.name}>
                {stage.label}
              </option>
            ))}
          </select>
        </div>

        <div className="demo-controls-panel" style={{ marginTop: "4px" }}>
          <div className="demo-btn-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
            {/* Reset Button */}
            <button
              onClick={onReset}
              disabled={isActionLoading}
              className="demo-action-btn demo-reset-btn"
              style={{ gridColumn: "span 2", padding: "6px", fontSize: "0.75rem" }}
              aria-label="Reset simulation to nominal flow"
            >
              🔄 Reset (Nominal Flow)
            </button>

            {/* Spike Gate C */}
            <button
              onClick={() => onTriggerSpike("gate_c")}
              disabled={isActionLoading}
              className="demo-action-btn spike-btn"
              style={{ borderLeft: "3px solid var(--color-danger)", padding: "5px", fontSize: "0.72rem" }}
            >
              🚨 Spike Gate C
            </button>

            {/* Spike Concourse North */}
            <button
              onClick={() => onTriggerSpike("concourse_north")}
              disabled={isActionLoading}
              className="demo-action-btn spike-btn"
              style={{ borderLeft: "3px solid var(--color-danger)", padding: "5px", fontSize: "0.72rem" }}
            >
              🚨 Spike North Conc.
            </button>

            {/* Spike Seating East */}
            <button
              onClick={() => onTriggerSpike("seating_east")}
              disabled={isActionLoading}
              className="demo-action-btn spike-btn"
              style={{ borderLeft: "3px solid var(--color-danger)", padding: "5px", fontSize: "0.72rem" }}
            >
              🚨 Spike East Seat.
            </button>

            {/* Spike Stairwell North */}
            <button
              onClick={() => onTriggerSpike("stairwell_north")}
              disabled={isActionLoading}
              className="demo-action-btn spike-btn"
              style={{ borderLeft: "3px solid var(--color-danger)", padding: "5px", fontSize: "0.72rem" }}
            >
              🚨 Spike North Stair.
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
