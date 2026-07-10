import React from "react";

// Coordinates for mapping nodes on the SVG (600x480 canvas)
const NODE_LAYOUT = {
  gate_a: { x: 80, y: 110, label: "Gate A (Ingress)" },
  gate_b: { x: 80, y: 240, label: "Gate B (Ingress)" },
  gate_c: { x: 80, y: 370, label: "Gate C (Ingress)" },
  concourse_north: { x: 250, y: 150, label: "Concourse North" },
  concourse_south: { x: 250, y: 300, label: "Concourse South" },
  stairwell_north: { x: 420, y: 90, label: "Stairwell North" },
  stairwell_south: { x: 420, y: 360, label: "Stairwell South" },
  seating_east: { x: 520, y: 150, label: "East Seating Entry" },
  seating_west: { x: 520, y: 300, label: "West Seating Entry" },
};

// Physical connections/edges between zones representing spectator pathways
const CONNECTIONS = [
  { from: "gate_a", to: "concourse_north" },
  { from: "gate_b", to: "concourse_north" },
  { from: "gate_b", to: "concourse_south" },
  { from: "gate_c", to: "concourse_south" },
  { from: "concourse_north", to: "stairwell_north" },
  { from: "concourse_north", to: "seating_east" },
  { from: "concourse_south", to: "stairwell_south" },
  { from: "concourse_south", to: "seating_west" },
  { from: "stairwell_north", to: "seating_east" },
  { from: "stairwell_south", to: "seating_west" },
];

export function ZoneMap({ 
  zones, 
  selectedZoneId, 
  onSelectZone, 
  activeRedirections = {},
  predictionMode = "current",
  setPredictionMode
}) {
  const getZoneData = (zoneId) => {
    const zone = (zones || []).find((z) => z.id === zoneId);
    if (!zone) return {};
    
    let occupancy_pct = zone.occupancy_pct;
    if (predictionMode === "5min") {
      occupancy_pct = zone.predicted_pct_in_5min !== undefined ? zone.predicted_pct_in_5min : zone.predicted_pct_in_2min;
    } else if (predictionMode === "10min") {
      occupancy_pct = zone.predicted_pct_in_10min !== undefined ? zone.predicted_pct_in_10min : occupancy_pct;
    }
    
    let status = zone.status;
    if (predictionMode !== "current") {
      if (occupancy_pct >= 90) status = "critical";
      else if (occupancy_pct >= 75) status = "watch";
      else status = "normal";
    }
    
    return {
      ...zone,
      occupancy_pct,
      status
    };
  };

  const getZoneStatus = (zoneId) => {
    return getZoneData(zoneId).status || "normal";
  };

  return (
    <div className="glass-panel" style={{ height: "100%" }}>
      <div className="panel-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M9 3v18M15 3v18M3 9h18M3 15h18" />
          </svg>
          Stadium Ingress & Flow Topology
        </h2>
        
        {/* Prediction Layer Selection */}
        <div style={{ display: "flex", gap: "4px", background: "rgba(0, 0, 0, 0.4)", padding: "2px", borderRadius: "6px", border: "1px solid var(--border-light)" }}>
          {["current", "5min", "10min"].map((mode) => (
            <button
              key={mode}
              onClick={() => setPredictionMode(mode)}
              className="chat-submit-btn"
              style={{
                padding: "3px 8px",
                fontSize: "0.68rem",
                height: "auto",
                background: predictionMode === mode ? "var(--color-primary-light)" : "transparent",
                borderColor: predictionMode === mode ? "var(--color-primary)" : "transparent",
                color: predictionMode === mode ? "#fff" : "var(--color-text-secondary)",
                borderRadius: "4px",
                fontWeight: "700"
              }}
              aria-label={`Switch heatmap to ${mode === "current" ? "current occupancy" : mode === "5min" ? "5-minute prediction" : "10-minute prediction"}`}
            >
              {mode === "current" ? "Current" : mode === "5min" ? "+5 Min" : "+10 Min"}
            </button>
          ))}
        </div>
      </div>
      
      <div className="panel-content" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div className="map-canvas-container" role="application" aria-label="Stadium Connectivity Map">
          <svg viewBox="0 65 600 355" className="stadium-svg">
            <defs>
              {/* Glow filter definition */}
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              {/* Blue redirection arrow head marker */}
              <marker 
                id="arrow-blue" 
                viewBox="0 0 10 10" 
                refX="22" 
                refY="5" 
                markerWidth="5" 
                markerHeight="5" 
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#00f0ff" />
              </marker>
            </defs>

            {/* Connection Links (Spectator Flow Paths) */}
            {CONNECTIONS.map((conn, idx) => {
              const fromNode = NODE_LAYOUT[conn.from];
              const toNode = NODE_LAYOUT[conn.to];
              const fromStatus = getZoneStatus(conn.from);
              const toStatus = getZoneStatus(conn.to);
              
              // Edge is colored by its highest severity node
              let strokeClass = "rgba(255,255,255,0.15)";
              if (fromStatus === "critical" || toStatus === "critical") {
                strokeClass = "rgba(255, 74, 107, 0.4)";
              } else if (fromStatus === "watch" || toStatus === "watch") {
                strokeClass = "rgba(255, 183, 0, 0.4)";
              }
              
              return (
                <line
                  key={`link-${idx}`}
                  x1={fromNode.x}
                  y1={fromNode.y}
                  x2={toNode.x}
                  y2={toNode.y}
                  stroke={strokeClass}
                  strokeWidth={selectedZoneId === conn.from || selectedZoneId === conn.to ? "3" : "1.5"}
                  className="network-link"
                />
              );
            })}

            {/* Active Diversion Overlay Routes */}
            {Object.entries(activeRedirections || {}).map(([fromId, redirectionData]) => {
              if (!redirectionData) return null;
              const routes = redirectionData.routes || [];
              const flowRate = redirectionData.flowRate || 350;
              return routes.map((toId, lIdx) => {
                const fromNode = NODE_LAYOUT[fromId];
                const toNode = NODE_LAYOUT[toId];
                if (!fromNode || !toNode) return null;

                // For vertical paths (like A -> B, C -> B), curve left
                // For other paths, curve up/down based on relative positions
                let cx = (fromNode.x + toNode.x) / 2;
                let cy = (fromNode.y + toNode.y) / 2;
                if (fromNode.x === 80 && toNode.x === 80) {
                  cx = 15; // external perimeter arc to the left
                } else {
                  cx = cx + 25;
                  cy = cy - 35;
                }

                const pathD = `M ${fromNode.x} ${fromNode.y} Q ${cx} ${cy} ${toNode.x} ${toNode.y}`;
                
                const fromLabel = fromId.replace("gate_", "Gate ").replace("_", " ").toUpperCase();
                const toLabel = toId.replace("concourse_", "Concourse ").replace("seating_", "Seating ").replace("stairwell_", "Stairwell ").replace("_", " ").toUpperCase();
                const cardX = (fromNode.x === 80 && toNode.x === 80) ? 35 : cx - 85;
                const cardY = cy - 17;

                return (
                  <g key={`redirect-${fromId}-${toId}-${lIdx}`} style={{ pointerEvents: "none" }}>
                    {/* Underlying thick blue glow line */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke="#00f0ff"
                      strokeWidth="5"
                      opacity="0.2"
                    />
                    {/* Animated dashed path line */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke="#00f0ff"
                      strokeWidth="2.5"
                      strokeDasharray="6, 4"
                      markerEnd="url(#arrow-blue)"
                      className="redirect-path-animated"
                    />
                    
                    {/* Continuous moving flow particles (3 offset circles) */}
                    <circle r="4.5" fill="#00f0ff" filter="url(#glow)">
                      <animateMotion dur="2.5s" repeatCount="indefinite" path={pathD} begin="0s" />
                    </circle>
                    <circle r="4.5" fill="#00f0ff" filter="url(#glow)">
                      <animateMotion dur="2.5s" repeatCount="indefinite" path={pathD} begin="0.83s" />
                    </circle>
                    <circle r="4.5" fill="#00f0ff" filter="url(#glow)">
                      <animateMotion dur="2.5s" repeatCount="indefinite" path={pathD} begin="1.67s" />
                    </circle>

                    {/* Glowing active route status label card at midpoint */}
                    <g transform={`translate(${cardX}, ${cardY})`}>
                      <rect
                        width="170"
                        height="34"
                        rx="6"
                        fill="rgba(10, 14, 26, 0.95)"
                        stroke="#00f0ff"
                        strokeWidth="1.5"
                        style={{ filter: "drop-shadow(0px 0px 6px rgba(0, 240, 255, 0.5))" }}
                      />
                      <text
                        x="85"
                        y="13"
                        fill="#00f0ff"
                        fontSize="7.5"
                        fontWeight="800"
                        textAnchor="middle"
                        style={{ letterSpacing: "0.5px", fontFamily: "monospace" }}
                      >
                        {`DIVERSION: ${fromLabel} ➔ ${toLabel}`}
                      </text>
                      <text
                        x="85"
                        y="26"
                        fill="#00e676"
                        fontSize="7.5"
                        fontWeight="700"
                        textAnchor="middle"
                        style={{ letterSpacing: "0.3px", fontFamily: "monospace" }}
                      >
                        {`Flow: ~${flowRate} spectators/min`}
                      </text>
                    </g>
                  </g>
                );
              });
            })}

            {/* Stadium Zones (Interactive Nodes) */}
            {Object.entries(NODE_LAYOUT).map(([id, layout]) => {
              const z = getZoneData(id);
              let status = z.status || "normal";
              
              // Color nodes blue if they are active redirect sources or targets
              const isRedirectSrc = !!activeRedirections[id];
              const isRedirectTarget = Object.values(activeRedirections).some(data => data && data.routes && data.routes.includes(id));
              if (isRedirectSrc || isRedirectTarget) {
                status = "redirected";
              }
              
              const isSelected = selectedZoneId === id;
              
              return (
                <g
                  key={id}
                  className="node-group"
                  onClick={() => onSelectZone(id)}
                  tabIndex="0"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      onSelectZone(id);
                    }
                  }}
                  role="button"
                  aria-label={`${layout.label}, Status: ${status}, Occupancy: ${z.occupancy_pct || 0}%`}
                >
                  {/* Outer Glow ring when watch/critical or selected */}
                  {(status !== "normal" || isSelected) && (
                    <circle
                      cx={layout.x}
                      cy={layout.y}
                      r={isSelected ? "32" : "27"}
                      className={`node-glow status-${status}`}
                      filter="url(#glow)"
                    />
                  )}

                  {/* Primary Node Circle */}
                  <circle
                    cx={layout.x}
                    cy={layout.y}
                    r="23"
                    className={`node-circle status-${status}`}
                    strokeWidth={isSelected ? "3" : "1.5"}
                    stroke={isSelected ? "#ffffff" : "currentColor"}
                  />

                  {/* Occupancy Percentage Value */}
                  <text x={layout.x} y={layout.y} className="node-text">
                    {z.occupancy_pct !== undefined ? `${Math.round(z.occupancy_pct)}%` : "--"}
                  </text>

                  {/* Zone Name Label (Placed strategically above/below node) */}
                  <text
                    x={layout.x}
                    y={layout.y + 35}
                    className="node-label"
                    style={{ fontWeight: isSelected ? "700" : "500", fill: isSelected ? "#fff" : "var(--color-text-secondary)" }}
                  >
                    {z.name ? z.name.split(" ")[0] + " " + (z.name.split(" ")[1] || "") : layout.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Selected Zone Inspector Details Panel */}
        <div 
          style={{ 
            background: "rgba(0, 0, 0, 0.3)", 
            padding: "12px 16px", 
            borderRadius: "8px", 
            border: "1px solid var(--border-light)",
            minHeight: "84px"
          }}
        >
          {selectedZoneId ? (
            (() => {
              const zone = getZoneData(selectedZoneId);
              if (!zone || !zone.id) {
                return (
                  <div style={{ color: "var(--color-text-muted)", fontSize: "0.85rem", textAlign: "center", paddingTop: "16px" }}>
                    Select a node on the map to inspect live flow statistics.
                  </div>
                );
              }
              const trend = zone.trend_per_min !== undefined ? zone.trend_per_min : 0;
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: "600", fontSize: "0.95rem" }}>{zone.name || selectedZoneId}</span>
                    <span className={`status-badge-inline ${zone.status || "normal"}`}>
                      {zone.status || "normal"}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
                    <span>Occupancy: {zone.current_occupancy || 0} / {zone.capacity || 0}</span>
                    <span>Trend: <strong style={{ color: trend > 0 ? "var(--color-danger)" : trend < 0 ? "var(--color-success)" : "var(--color-text-muted)" }}>{trend > 0 ? "+" : ""}{trend.toFixed(1)}%/min</strong></span>
                  </div>
                  {zone.breach_countdown_min !== undefined && zone.breach_countdown_min !== null && (
                    <div style={{ fontSize: "0.8rem", color: "var(--color-danger)", fontWeight: "600", marginTop: "2px" }}>
                      ⚠️ Est. Safety Breach Countdown: {zone.breach_countdown_min} min
                    </div>
                  )}
                </div>
              );
            })()
          ) : (
            <div style={{ color: "var(--color-text-muted)", fontSize: "0.85rem", textAlign: "center", paddingTop: "16px" }}>
              Select a node on the map to inspect live flow statistics.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
