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

export function ZoneMap({ zones, selectedZoneId, onSelectZone }) {
  // Helper to get status class from zone state
  const getZoneStatus = (zoneId) => {
    const zone = zones.find((z) => z.id === zoneId);
    return zone ? zone.status : "normal";
  };

  const getZoneData = (zoneId) => {
    return zones.find((z) => z.id === zoneId) || {};
  };

  return (
    <div className="glass-panel" style={{ height: "100%" }}>
      <div className="panel-header">
        <h2>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M9 3v18M15 3v18M3 9h18M3 15h18" />
          </svg>
          Stadium Ingress & Flow Topology
        </h2>
      </div>
      
      <div className="panel-content" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div className="map-canvas-container" role="application" aria-label="Stadium Connectivity Map">
          <svg viewBox="0 0 600 480" className="stadium-svg">
            <defs>
              {/* Glow filter definition */}
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
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

            {/* Stadium Zones (Interactive Nodes) */}
            {Object.entries(NODE_LAYOUT).map(([id, layout]) => {
              const z = getZoneData(id);
              const status = z.status || "normal";
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
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: "600", fontSize: "0.95rem" }}>{zone.name}</span>
                    <span className={`status-badge-inline ${zone.status}`}>
                      {zone.status}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
                    <span>Occupancy: {zone.current_occupancy} / {zone.capacity}</span>
                    <span>Trend: <strong style={{ color: zone.trend_per_min > 0 ? "var(--color-danger)" : zone.trend_per_min < 0 ? "var(--color-success)" : "var(--color-text-muted)" }}>{zone.trend_per_min > 0 ? "+" : ""}{zone.trend_per_min}%/min</strong></span>
                  </div>
                  {zone.breach_countdown_min !== null && (
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
