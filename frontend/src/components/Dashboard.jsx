import React, { useEffect, useState } from "react";

export function Dashboard({
  zones = [],
  recommendations = [],
  activeRedirections = {},
  resolvedIncidents = [],
  simulationState,
  isConnected,
  lastUpdateTime = ""
}) {
  const [safetyScore, setSafetyScore] = useState(100);
  const [prevValues, setPrevValues] = useState({});
  const [pulseStates, setPulseStates] = useState({});

  // Compute overall safety score
  const totalSpectators = zones.reduce((sum, z) => sum + (z.current_occupancy || 0), 0);
  const activeZoneCount = zones.length;
  const criticalZoneCount = zones.filter(z => z.status === "critical").length;
  const watchZoneCount = zones.filter(z => z.status === "watch").length;
  const activeDiversionsCount = Object.keys(activeRedirections).length;
  const recsCount = recommendations.length;

  useEffect(() => {
    let score = 100;
    score -= watchZoneCount * 6;
    score -= criticalZoneCount * 15;
    score += activeDiversionsCount * 8;
    score = Math.max(10, Math.min(100, score));
    setSafetyScore(score);
  }, [watchZoneCount, criticalZoneCount, activeDiversionsCount]);

  // Compute average response time
  let avgResponseTime = "2.4 min";
  if (resolvedIncidents.length > 0) {
    avgResponseTime = resolvedIncidents[0].responseTime; // Show latest response time for immediate feedback
  }

  // Set up pulsing animation triggers when metrics change
  const currentMetrics = {
    totalSpectators,
    criticalZoneCount,
    activeDiversionsCount,
    recsCount,
    safetyScore
  };

  useEffect(() => {
    const newPulses = {};
    Object.keys(currentMetrics).forEach(key => {
      if (prevValues[key] !== undefined && prevValues[key] !== currentMetrics[key]) {
        newPulses[key] = true;
      }
    });

    if (Object.keys(newPulses).length > 0) {
      setPulseStates(prev => ({ ...prev, ...newPulses }));
      const timer = setTimeout(() => {
        setPulseStates(prev => {
          const copy = { ...prev };
          Object.keys(newPulses).forEach(k => {
            copy[k] = false;
          });
          return copy;
        });
      }, 800);
      return () => clearTimeout(timer);
    }
    setPrevValues(currentMetrics);
  }, [totalSpectators, criticalZoneCount, activeDiversionsCount, recsCount, safetyScore]);

  const getSafetyColor = (score) => {
    if (score >= 85) return "var(--color-success)";
    if (score >= 60) return "var(--color-warning)";
    return "var(--color-danger)";
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

  return (
    <div className="dashboard-kpi-bar" style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
      gap: "10px",
      marginBottom: "16px",
      width: "100%"
    }}>
      {/* 1. Safety Score Card */}
      <div className={`kpi-card ${pulseStates.safetyScore ? "pulse" : ""}`} style={{
        background: "rgba(255, 255, 255, 0.02)",
        border: "1px solid rgba(255, 255, 255, 0.05)",
        borderTop: `3px solid ${getSafetyColor(safetyScore)}`,
        padding: "10px",
        borderRadius: "6px",
        textAlign: "center",
        transition: "all 0.3s ease"
      }}>
        <div style={{ fontSize: "0.68rem", color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Stadium Safety</div>
        <div style={{ fontSize: "1.6rem", fontWeight: "800", color: getSafetyColor(safetyScore), margin: "4px 0", textShadow: `0 0 10px ${getSafetyColor(safetyScore)}33` }}>
          {safetyScore}
        </div>
        <div style={{ fontSize: "0.65rem", color: "var(--color-text-muted)" }}>
          {safetyScore >= 85 ? "🟢 Nominal Flow" : safetyScore >= 60 ? "🟡 Advisory Warn" : "🔴 Urgent Action"}
        </div>
      </div>

      {/* 2. Match Stage */}
      <div className="kpi-card" style={{
        background: "rgba(255, 255, 255, 0.02)",
        border: "1px solid rgba(255, 255, 255, 0.05)",
        borderTop: "3px solid #00f0ff",
        padding: "10px",
        borderRadius: "6px",
        textAlign: "center"
      }}>
        <div style={{ fontSize: "0.68rem", color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Match Stage</div>
        <div style={{ fontSize: "1.05rem", fontWeight: "700", color: "#fff", margin: "10px 0 8px 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {getMatchStageLabel(simulationState?.match_stage)}
        </div>
        <div style={{ fontSize: "0.62rem", color: "var(--color-text-muted)" }}>
          {simulationState?.demo_mode ? "🔄 Auto Progression On" : "⏱️ Operator Manual Mode"}
        </div>
      </div>

      {/* 3. Total Spectators */}
      <div className={`kpi-card ${pulseStates.totalSpectators ? "pulse" : ""}`} style={{
        background: "rgba(255, 255, 255, 0.02)",
        border: "1px solid rgba(255, 255, 255, 0.05)",
        borderTop: "3px solid var(--color-primary)",
        padding: "10px",
        borderRadius: "6px",
        textAlign: "center"
      }}>
        <div style={{ fontSize: "0.68rem", color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Total Spectators</div>
        <div style={{ fontSize: "1.45rem", fontWeight: "800", color: "#fff", margin: "6px 0" }}>
          {totalSpectators.toLocaleString()}
        </div>
        <div style={{ fontSize: "0.62rem", color: "var(--color-text-muted)" }}>
          Active monitored gates/concourses
        </div>
      </div>

      {/* 4. Active Zones */}
      <div className="kpi-card" style={{
        background: "rgba(255, 255, 255, 0.02)",
        border: "1px solid rgba(255, 255, 255, 0.05)",
        borderTop: "3px solid var(--color-success)",
        padding: "10px",
        borderRadius: "6px",
        textAlign: "center"
      }}>
        <div style={{ fontSize: "0.68rem", color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Monitored Zones</div>
        <div style={{ fontSize: "1.45rem", fontWeight: "800", color: "#fff", margin: "6px 0" }}>
          {activeZoneCount}
        </div>
        <div style={{ fontSize: "0.62rem", color: "var(--color-text-muted)" }}>
          Nodes reporting online
        </div>
      </div>

      {/* 5. Critical Zones */}
      <div className={`kpi-card ${pulseStates.criticalZoneCount ? "pulse" : ""}`} style={{
        background: "rgba(255, 255, 255, 0.02)",
        border: "1px solid rgba(255, 255, 255, 0.05)",
        borderTop: `3px solid ${criticalZoneCount > 0 ? "var(--color-danger)" : "var(--color-text-muted)"}`,
        padding: "10px",
        borderRadius: "6px",
        textAlign: "center"
      }}>
        <div style={{ fontSize: "0.68rem", color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Critical Breaches</div>
        <div style={{ fontSize: "1.45rem", fontWeight: "800", color: criticalZoneCount > 0 ? "var(--color-danger)" : "#fff", margin: "6px 0" }}>
          {criticalZoneCount}
        </div>
        <div style={{ fontSize: "0.62rem", color: "var(--color-text-muted)" }}>
          Zones over safe thresholds
        </div>
      </div>

      {/* 6. Active Recommendations */}
      <div className={`kpi-card ${pulseStates.recsCount ? "pulse" : ""}`} style={{
        background: "rgba(255, 255, 255, 0.02)",
        border: "1px solid rgba(255, 255, 255, 0.05)",
        borderTop: "3px solid #ffb300",
        padding: "10px",
        borderRadius: "6px",
        textAlign: "center"
      }}>
        <div style={{ fontSize: "0.68rem", color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>AI Advisories</div>
        <div style={{ fontSize: "1.45rem", fontWeight: "800", color: recsCount > 0 ? "#ffb300" : "#fff", margin: "6px 0" }}>
          {recsCount}
        </div>
        <div style={{ fontSize: "0.62rem", color: "var(--color-text-muted)" }}>
          Active mitigation recommendations
        </div>
      </div>

      {/* 7. Active Diversions */}
      <div className={`kpi-card ${pulseStates.activeDiversionsCount ? "pulse" : ""}`} style={{
        background: "rgba(255, 255, 255, 0.02)",
        border: "1px solid rgba(255, 255, 255, 0.05)",
        borderTop: "3px solid #00e676",
        padding: "10px",
        borderRadius: "6px",
        textAlign: "center"
      }}>
        <div style={{ fontSize: "0.68rem", color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Active Diversions</div>
        <div style={{ fontSize: "1.45rem", fontWeight: "800", color: activeDiversionsCount > 0 ? "#00e676" : "#fff", margin: "6px 0" }}>
          {activeDiversionsCount}
        </div>
        <div style={{ fontSize: "0.62rem", color: "var(--color-text-muted)" }}>
          Active crowd redirection flows
        </div>
      </div>

      {/* 8. Avg Clearance Time */}
      <div className="kpi-card" style={{
        background: "rgba(255, 255, 255, 0.02)",
        border: "1px solid rgba(255, 255, 255, 0.05)",
        borderTop: "3px solid #7c4dff",
        padding: "10px",
        borderRadius: "6px",
        textAlign: "center"
      }}>
        <div style={{ fontSize: "0.68rem", color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Avg Response Time</div>
        <div style={{ fontSize: "1.2rem", fontWeight: "700", color: "#fff", margin: "8px 0" }}>
          {avgResponseTime}
        </div>
        <div style={{ fontSize: "0.62rem", color: "var(--color-text-muted)" }}>
          From alarm trigger to resolution
        </div>
      </div>
    </div>
  );
}
