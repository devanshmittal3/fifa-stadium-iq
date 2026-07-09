import React from "react";

export function ZoneDetailTable({ zones, selectedZoneId, onSelectZone }) {
  return (
    <div className="glass-panel" style={{ height: "100%" }}>
      <div className="panel-header">
        <h2>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 3h18v18H3zM21 9H3M21 15H3M12 3v18" />
          </svg>
          Live Zone Operations Directory
        </h2>
      </div>

      <div className="panel-content" style={{ padding: "0" }}>
        <div className="detail-table-container" style={{ border: "none", borderRadius: "0", margin: "0" }}>
          <table className="detail-table">
            <thead>
              <tr>
                <th>Zone Name</th>
                <th style={{ width: "35%" }}>Occupancy Rate</th>
                <th>Trend</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {zones.map((zone) => {
                const isSelected = selectedZoneId === zone.id;
                
                return (
                  <tr 
                    key={zone.id}
                    style={{ 
                      background: isSelected ? "rgba(255, 255, 255, 0.05)" : "transparent",
                      cursor: "pointer"
                    }}
                    onClick={() => onSelectZone(zone.id)}
                  >
                    <td style={{ fontWeight: "500" }}>{zone.name}</td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem" }}>
                          <span>{zone.current_occupancy} / {zone.capacity}</span>
                          <span>{Math.round(zone.occupancy_pct)}%</span>
                        </div>
                        {/* Progress Bar */}
                        <div 
                          style={{ 
                            height: "6px", 
                            background: "rgba(255,255,255,0.1)", 
                            borderRadius: "3px", 
                            overflow: "hidden" 
                          }}
                        >
                          <div 
                            style={{ 
                              width: `${Math.min(100, zone.occupancy_pct)}%`, 
                              height: "100%", 
                              background: zone.status === "critical" 
                                ? "var(--color-danger)" 
                                : zone.status === "watch" 
                                  ? "var(--color-warning)" 
                                  : "var(--color-success)",
                              transition: "width 0.5s ease-out"
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`trend-tag ${zone.trend_per_min > 0 ? "positive" : zone.trend_per_min < 0 ? "negative" : "neutral"}`}>
                        {zone.trend_per_min > 0 ? "▲" : zone.trend_per_min < 0 ? "▼" : "•"}{" "}
                        {Math.abs(zone.trend_per_min).toFixed(1)}%/m
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge-inline ${zone.status}`}>
                        {zone.status}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectZone(zone.id);
                        }}
                        className="chat-submit-btn"
                        style={{ padding: "4px 8px", fontSize: "0.7rem", height: "auto" }}
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
