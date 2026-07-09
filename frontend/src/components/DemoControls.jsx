import React from "react";

export function DemoControls({ zones, onTriggerSpike, onReset, isActionLoading }) {
  return (
    <div className="glass-panel">
      <div className="panel-header">
        <h2>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
          </svg>
          Demo Simulation Controls
        </h2>
      </div>

      <div className="panel-content">
        <div className="demo-controls-panel">
          <p style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)", marginBottom: "8px", lineHeight: "1.4" }}>
            Use these controls to inject artificial crowd ingress spikes to evaluate StadiumIQ's predictive alarms and GenAI recommendations.
          </p>

          <div className="demo-btn-grid">
            {/* Reset Button */}
            <button
              onClick={onReset}
              disabled={isActionLoading}
              className="demo-action-btn demo-reset-btn"
              aria-label="Reset simulation to nominal flow"
            >
              🔄 Reset Simulation (Nominal Flow)
            </button>

            {/* Spike Gate C (Primary Demo Target) */}
            <button
              onClick={() => onTriggerSpike("gate_c")}
              disabled={isActionLoading}
              className="demo-action-btn spike-btn"
              style={{ borderLeft: "3px solid var(--color-danger)" }}
              aria-label="Trigger Gate C crowd spike"
            >
              🚨 Spike Gate C (Ingress)
            </button>

            {/* Spike Concourse North */}
            <button
              onClick={() => onTriggerSpike("concourse_north")}
              disabled={isActionLoading}
              className="demo-action-btn spike-btn"
              style={{ borderLeft: "3px solid var(--color-danger)" }}
              aria-label="Trigger Concourse North crowd spike"
            >
              🚨 Spike Concourse North
            </button>

            {/* Spike Seating East */}
            <button
              onClick={() => onTriggerSpike("seating_east")}
              disabled={isActionLoading}
              className="demo-action-btn spike-btn"
              style={{ borderLeft: "3px solid var(--color-danger)" }}
              aria-label="Trigger East Seating Entry crowd spike"
            >
              🚨 Spike East Seating
            </button>

            {/* Spike Stairwell North */}
            <button
              onClick={() => onTriggerSpike("stairwell_north")}
              disabled={isActionLoading}
              className="demo-action-btn spike-btn"
              style={{ borderLeft: "3px solid var(--color-danger)" }}
              aria-label="Trigger Stairwell North crowd spike"
            >
              🚨 Spike Stairwell North
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
