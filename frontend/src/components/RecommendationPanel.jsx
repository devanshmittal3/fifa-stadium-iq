import React from "react";

export function RecommendationPanel({ recommendations, engine, isLoading, onRefresh }) {
  // Helper to determine engine badge class
  const getEngineBadgeClass = (engineName) => {
    if (!engineName) return "fallback";
    const name = engineName.toLowerCase();
    if (name.includes("claude")) return "claude";
    if (name.includes("gemini")) return "gemini";
    return "fallback";
  };

  return (
    <div className="glass-panel" style={{ height: "100%" }}>
      <div className="panel-header">
        <h2>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
          GenAI Action Recommendations
        </h2>
        
        {engine && (
          <span 
            className={`engine-badge ${getEngineBadgeClass(engine)}`}
            aria-label={`Reasoning Engine: ${engine}`}
          >
            Engine: {engine}
          </span>
        )}
      </div>

      <div className="panel-content">
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          {/* Refresh Action Trigger */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "12px" }}>
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="chat-submit-btn"
              style={{ padding: "6px 12px", fontSize: "0.8rem", height: "auto" }}
              aria-label="Refresh Recommendations"
            >
              {isLoading ? "Analyzing..." : "Analyze Flow"}
            </button>
          </div>

          <div className="recs-list" style={{ flex: 1, overflowY: "auto" }}>
            {recommendations.length === 0 ? (
              <div className="no-recs">
                <h3>All Clear</h3>
                <p style={{ fontSize: "0.8rem", marginTop: "6px" }}>
                  No spectator flow anomalies detected. Live stadium operations are nominal.
                </p>
              </div>
            ) : (
              recommendations.map((rec, index) => (
                <div 
                  key={`${rec.zone_id}-${index}`} 
                  className={`rec-card ${rec.status}`}
                  role="alert"
                >
                  <div className="rec-card-header">
                    <span className="rec-title">
                      {rec.zone_id.replace("_", " ").toUpperCase()} Status Alert
                    </span>
                    {rec.predicted_breach_min !== null && (
                      <span className={`rec-countdown ${rec.predicted_breach_min <= 2 ? "critical" : "warning"}`}>
                        Breach: {Math.round(rec.predicted_breach_min)}m
                      </span>
                    )}
                  </div>
                  
                  <div className="rec-action">
                    {rec.action}
                  </div>
                  
                  <div className="rec-reasoning">
                    {rec.reasoning}
                  </div>

                  {rec.alternative_routes && rec.alternative_routes.length > 0 && (
                    <div className="rec-alternatives">
                      <span>Divert Paths:</span>
                      {rec.alternative_routes.map((route) => (
                        <span key={route} className="alt-route-tag">
                          {route.replace("_", " ").title || route}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
