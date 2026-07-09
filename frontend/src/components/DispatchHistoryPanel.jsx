import React from "react";

export function DispatchHistoryPanel({ history, onDeactivate }) {
  return (
    <div className="glass-panel" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div className="panel-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Audit Dispatch History
        </h2>
        <span style={{ fontSize: "0.7rem", color: "var(--color-success)", background: "rgba(0, 230, 118, 0.1)", padding: "2px 8px", borderRadius: "10px", fontWeight: "700" }}>
          {history.length} Logs
        </span>
      </div>
      
      <div className="panel-content" style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
        {history.length === 0 ? (
          <div style={{ color: "var(--color-text-muted)", fontSize: "0.85rem", textAlign: "center", paddingTop: "24px" }}>
            No crowd responses deployed this session.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {history.map((item, idx) => {
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
                    borderRadius: "4px",
                    padding: "12px",
                    fontSize: "0.8rem",
                    transition: "all 0.3s ease"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontWeight: "700", color: "#fff", fontSize: "0.85rem" }}>
                        {item.zoneName}
                      </span>
                      <span style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>
                        ({item.timestamp})
                      </span>
                    </div>
                    
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span 
                        style={{ 
                          display: "inline-block", 
                          width: "6px", 
                          height: "6px", 
                          borderRadius: "50%", 
                          background: isActive ? "var(--color-success)" : "var(--color-text-muted)",
                          boxShadow: isActive ? "0 0 6px var(--color-success)" : "none"
                        }}
                      ></span>
                      <strong style={{ fontSize: "0.75rem", color: isActive ? "var(--color-success)" : "var(--color-text-muted)", textTransform: "uppercase" }}>
                        {item.status}
                      </strong>
                    </div>
                  </div>

                  {/* 7-field Grid Layout for Cleanliness */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 12px", fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
                    <div>
                      <span style={{ color: "var(--color-text-muted)" }}>Current Density:</span>{" "}
                      <strong style={{ color: "white" }}>{item.density || "N/A"}</strong>
                    </div>
                    <div>
                      <span style={{ color: "var(--color-text-muted)" }}>Diverted Flow Rate:</span>{" "}
                      <strong style={{ color: "var(--color-success)" }}>{item.flowRate || 350} /min</strong>
                    </div>
                    <div style={{ gridColumn: "span 2" }}>
                      <span style={{ color: "var(--color-text-muted)" }}>Alternative Routes:</span>{" "}
                      <strong style={{ color: "#00f0ff" }}>{item.recommendation.replace("Redirected flow to ", "")}</strong>
                    </div>
                    <div style={{ gridColumn: "span 2" }}>
                      <span style={{ color: "var(--color-text-muted)" }}>Languages Deployed:</span>{" "}
                      <span style={{ color: "white", fontWeight: "600" }}>
                        {item.languages ? item.languages.join(", ") : "English"}
                      </span>
                    </div>
                    <div style={{ gridColumn: "span 2" }}>
                      <span style={{ color: "var(--color-text-muted)" }}>Operator Trigger:</span>{" "}
                      <strong style={{ color: "#ffb300" }}>{item.operatorAction}</strong>
                    </div>
                  </div>

                  {item.impact && (
                    <div 
                      style={{ 
                        marginTop: "8px", 
                        paddingTop: "8px", 
                        borderTop: "1px dashed rgba(255,255,255,0.06)", 
                        color: "var(--color-success)",
                        fontSize: "0.75rem",
                        fontStyle: "italic"
                      }}
                    >
                      🚀 Impact: {item.impact}
                    </div>
                  )}

                  {isActive && (
                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
                      <button 
                        className="btn btn-secondary" 
                        onClick={() => onDeactivate(item.zoneId)}
                        style={{ padding: "3px 10px", fontSize: "0.75rem", background: "rgba(255, 74, 107, 0.15)", border: "1px solid var(--color-danger)", color: "var(--color-danger)" }}
                      >
                        Deactivate Response
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
