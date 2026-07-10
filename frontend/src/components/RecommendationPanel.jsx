import React, { useState, useCallback } from "react";

export const RecommendationPanel = React.memo(function RecommendationPanel({ 
  recommendations, 
  engine, 
  isLoading, 
  onRefresh, 
  activeMatch, 
  activeRedirections, 
  onDispatch, 
  onDeactivate,
  backendUrl = "http://localhost:8000"
}) {
  const [selectedRec, setSelectedRec] = useState(null);
  const [expandedAlts, setExpandedAlts] = useState({});
  const [wizardStep, setWizardStep] = useState(1); // 1: Briefing & Impact, 2: Announcements, 3: Approval
  const [previewData, setPreviewData] = useState(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [deploymentStep, setDeploymentStep] = useState(0); // 0: not deploying, 7: approving, 8: dispatching, 9: map updating, 10: log writing

  const workflowSteps = [
    { num: 1, label: "Telemetry Feed", desc: "Live spectator tracking" },
    { num: 2, label: "Congestion Detection", desc: "Safety threshold breached" },
    { num: 3, label: "AI Reasoning", desc: "Divergent path search" },
    { num: 4, label: "Operator Briefing", desc: "Briefing summary compiled" },
    { num: 5, label: "Impact Prediction", desc: "Queue normalization model" },
    { num: 6, label: "Multilingual PA", desc: "Targeted localized safety script" },
    { num: 7, label: "Operator Approval", desc: "Awaiting dispatch execution" },
    { num: 8, label: "Dispatch Activated", desc: "Broadcasting redirection directives" },
    { num: 9, label: "SVG Map Injector", desc: "Updating flow topology lines" },
    { num: 10, label: "Audit Log Updated", desc: "Writing dispatch to history" }
  ];

  const getEngineBadgeClass = (engineName) => {
    if (!engineName) return "fallback";
    const name = engineName.toLowerCase();
    if (name.includes("claude")) return "claude";
    if (name.includes("gemini")) return "gemini";
    return "fallback";
  };

  // Open wizard and fetch AI Preview data
  const handleOpenWizard = useCallback(async (rec) => {
    setSelectedRec(rec);
    setWizardStep(1);
    setPreviewData(null);
    setIsPreviewLoading(true);
    setPreviewError("");
    setDeploymentStep(0);

    try {
      const response = await fetch(`${backendUrl}/api/dispatch/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          zone_id: rec.zone_id,
          alternative_routes: rec.alternative_routes,
          match_id: activeMatch,
          action: rec.action
        })
      });

      if (response.ok) {
        const data = await response.json();
        setPreviewData(data);
      } else {
        setPreviewError("Failed to fetch dispatch preview. Using local fallback.");
        // local preview construction in case of API failure
        setPreviewData({
          briefing: `${rec.zone_id.replace("_", " ").toUpperCase()} is congested. Divert 35-40% of spectator inflow to ${rec.alternative_routes.join(", ").replace("_", " ").toUpperCase()} to normalize flow.`,
          impact: {
            current_queue: 3850,
            predicted_queue: 2150,
            reduction_pct: 44.0,
            clearance_min: 5,
            diverted_flow_rate_per_min: 350
          },
          languages: ["English", "Spanish"],
          announcements: {
            English: `Attention spectators: Ingress routes to ${rec.zone_id.replace("_", " ").toUpperCase()} are busy. Divert to alternative paths.`,
            Spanish: `Atención espectadores: El acceso a la zona está saturado. Favor de usar las rutas de desvío.`
          },
          engine: "Local Fallback"
        });
      }
    } catch (err) {
      console.error(err);
      setPreviewError("Network error. Using local fallback.");
      setPreviewData({
        briefing: `${rec.zone_id.replace("_", " ").toUpperCase()} is congested. Divert 35-40% of spectator inflow to ${rec.alternative_routes.join(", ").replace("_", " ").toUpperCase()} to normalize flow.`,
        impact: {
          current_queue: 3850,
          predicted_queue: 2150,
          reduction_pct: 44.0,
          clearance_min: 5,
          diverted_flow_rate_per_min: 350
        },
        languages: ["English", "Spanish"],
        announcements: {
          English: `Attention spectators: Ingress routes to ${rec.zone_id.replace("_", " ").toUpperCase()} are busy. Divert to alternative paths.`,
          Spanish: `Atención espectadores: El acceso a la zona está saturado. Favor de usar las rutas de desvío.`
        },
        engine: "Local Fallback"
      });
    } finally {
      setIsPreviewLoading(false);
    }
  }, [activeMatch, backendUrl]);

  const handleExecuteDispatch = useCallback(() => {
    if (selectedRec && previewData) {
      setDeploymentStep(7); // Start step 7 -> 8 -> 9 -> 10 simulation
      
      setTimeout(() => {
        setDeploymentStep(8);
        setTimeout(() => {
          setDeploymentStep(9);
          setTimeout(() => {
            setDeploymentStep(10);
            setTimeout(() => {
              // Finalize dispatch
              const flowRate = previewData.impact.diverted_flow_rate_per_min || 350;
              const impactString = `Queue reduced by ${previewData.impact.reduction_pct}%. Est. clearance: ${previewData.impact.clearance_min}m. Flow: ~${flowRate} spectators/min`;
              const languages = Object.keys(previewData.announcements);
              const occupancyPct = selectedRec.occupancy_pct;

              onDispatch(
                selectedRec.zone_id,
                selectedRec.alternative_routes,
                impactString,
                "Deploy Crowd Response",
                flowRate,
                languages,
                occupancyPct
              );
              setDeploymentStep(0);
              handleCloseWizard();
            }, 600);
          }, 600);
        }, 600);
      }, 600);
    }
  }, [selectedRec, previewData, onDispatch]);

  const handleCloseWizard = useCallback(() => {
    if (deploymentStep > 0) return; // Prevent closing while dispatching
    setSelectedRec(null);
    setPreviewData(null);
    setWizardStep(1);
    setDeploymentStep(0);
  }, [deploymentStep]);

  return (
    <div className="glass-panel" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div className="panel-header">
        <h2>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
          AI Operations Advisor
        </h2>
        
        {engine && (
          <span className={`engine-badge ${getEngineBadgeClass(engine)}`}>
            Engine: {engine}
          </span>
        )}
      </div>

      <div className="panel-content" style={{ flex: 1, display: "flex", flexDirection: "column", padding: "12px 16px", minHeight: "0" }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "10px" }}>
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="chat-submit-btn"
            style={{ padding: "6px 12px", fontSize: "0.8rem", height: "auto" }}
          >
            {isLoading ? "Analyzing..." : "Analyze Flow"}
          </button>
        </div>

        <div className="recs-list" style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px" }}>
          {recommendations.length === 0 ? (
            <div className="no-recs" style={{ textAlign: "center", padding: "30px 10px" }}>
              <h3 style={{ color: "var(--color-success)" }}>Nominal Operations</h3>
              <p style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)", marginTop: "6px" }}>
                No congestion bottlenecks detected. Ingress pathways operating safely.
              </p>
            </div>
          ) : (
            recommendations.map((rec, index) => {
              const isAlreadyActive = !!activeRedirections[rec.zone_id];
              const confScore = rec.confidence_score || 80;
              const confRating = rec.confidence_rating || "High Confidence";
              
              // Color coding logic for meter
              let meterColor = "var(--color-success)";
              if (confScore < 60) meterColor = "var(--color-danger)";
              else if (confScore < 80) meterColor = "var(--color-warning)";

              return (
                <div key={`${rec.zone_id}-${index}`} className={`rec-card ${rec.status}`} style={{ position: "relative" }}>
                  <div className="rec-card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      <span className="rec-title" style={{ fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        {rec.zone_id.replace("_", " ")} Alert
                      </span>
                      {rec.predicted_breach_min !== null && (
                        <span className={`rec-countdown ${rec.predicted_breach_min <= 2 ? "critical" : "warning"}`} style={{ display: "inline-block", alignSelf: "flex-start", marginTop: "4px" }}>
                          Breach: {Math.round(rec.predicted_breach_min)}m
                        </span>
                      )}
                    </div>
                    
                    {/* Circular Confidence Meter */}
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(255,255,255,0.03)", padding: "4px 8px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)" }}>
                      <svg width="34" height="34" style={{ transform: "rotate(-90deg)" }}>
                        <circle
                          cx="17"
                          cy="17"
                          r="13"
                          fill="transparent"
                          stroke="rgba(255,255,255,0.08)"
                          strokeWidth="2.5"
                        />
                        <circle
                          cx="17"
                          cy="17"
                          r="13"
                          fill="transparent"
                          stroke={meterColor}
                          strokeWidth="2.5"
                          strokeDasharray={81.68}
                          strokeDashoffset={81.68 - (confScore / 100) * 81.68}
                          strokeLinecap="round"
                          style={{ transition: "stroke-dashoffset 0.5s ease" }}
                        />
                      </svg>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "#fff", lineHeight: "1.1" }}>{confScore}%</span>
                        <span style={{ fontSize: "0.58rem", color: meterColor, fontWeight: "600", whiteSpace: "nowrap" }}>{confRating.split(" ")[0]}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Action recommendation */}
                  <div className="rec-action" style={{ background: "rgba(0,0,0,0.25)", borderLeft: "3px solid var(--color-primary-light)", padding: "8px 10px", margin: "8px 0", borderRadius: "0 4px 4px 0", fontSize: "0.85rem", fontWeight: "600", minHeight: "56px", display: "flex", alignItems: "center" }}>
                    {rec.action}
                  </div>

                  {/* Explainable AI Panel */}
                  <div className="explainable-ai-panel" style={{
                    marginTop: "12px",
                    padding: "12px",
                    background: "rgba(0, 176, 255, 0.03)",
                    border: "1px solid rgba(0, 176, 255, 0.12)",
                    borderRadius: "8px",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px", fontSize: "0.8rem", fontWeight: "700", color: "#00b0ff" }}>
                      <span>🧠</span> EXPLAINABLE AI PANEL
                    </div>
                    
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 14px", fontSize: "0.75rem" }}>
                      <div style={{ whiteSpace: "nowrap" }}>
                        <span style={{ color: "var(--color-text-muted)", display: "block", marginBottom: "2px" }}>Current Occupancy:</span>
                        <strong style={{ color: "white" }}>{rec.current_occupancy?.toLocaleString()} spectators</strong>
                      </div>
                      <div style={{ whiteSpace: "nowrap" }}>
                        <span style={{ color: "var(--color-text-muted)", display: "block", marginBottom: "2px" }}>Safe Capacity:</span>
                        <strong style={{ color: "white" }}>{rec.capacity?.toLocaleString()} spectators</strong>
                      </div>
                      <div style={{ whiteSpace: "nowrap" }}>
                        <span style={{ color: "var(--color-text-muted)", display: "block", marginBottom: "2px" }}>Predicted Occupancy (5m):</span>
                        <strong style={{ color: "var(--color-danger)" }}>{Math.round(rec.predicted_pct_in_5min)}% Density</strong>
                      </div>
                      <div style={{ whiteSpace: "nowrap" }}>
                        <span style={{ color: "var(--color-text-muted)", display: "block", marginBottom: "2px" }}>Congestion Growth:</span>
                        <strong style={{ color: rec.congestion_growth_pct > 0 ? "var(--color-danger)" : "var(--color-success)" }}>
                          {rec.congestion_growth_pct > 0 ? "+" : ""}{rec.congestion_growth_pct}%/min
                        </strong>
                      </div>
                      <div style={{ whiteSpace: "nowrap" }}>
                        <span style={{ color: "var(--color-text-muted)", display: "block", marginBottom: "2px" }}>Recommended Alternate:</span>
                        <strong style={{ color: "#00f0ff" }}>
                          {rec.alternative_routes?.map(r => r.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())).join(", ") || "N/A"}
                        </strong>
                      </div>
                      <div style={{ whiteSpace: "nowrap" }}>
                        <span style={{ color: "var(--color-text-muted)", display: "block", marginBottom: "2px" }}>Expected Reduction:</span>
                        <strong style={{ color: "var(--color-success)" }}>{rec.expected_reduction_pct}% load</strong>
                      </div>
                      <div style={{ gridColumn: "span 2" }}>
                        <span style={{ color: "var(--color-text-muted)", display: "block", marginBottom: "2px" }}>Natural-Language Reasoning:</span>
                        <div style={{ color: "var(--color-text-secondary)", lineHeight: "1.4", fontStyle: "italic", background: "rgba(0,0,0,0.2)", padding: "6px 8px", borderRadius: "4px", borderLeft: "2px solid #00b0ff", minHeight: "56px" }}>
                          "{rec.reasoning}"
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Collapsible Alternative Decision Analysis */}
                  {rec.what_if_analysis && Object.keys(rec.what_if_analysis).length > 0 && (
                    <div style={{ marginTop: "8px" }}>
                      <button
                        onClick={() => setExpandedAlts(prev => ({ ...prev, [rec.zone_id]: !prev[rec.zone_id] }))}
                        className="chat-submit-btn"
                        style={{
                          width: "100%",
                          background: "rgba(255, 255, 255, 0.03)",
                          border: "1px solid rgba(255, 255, 255, 0.05)",
                          color: "#00f0ff",
                          fontSize: "0.72rem",
                          fontWeight: "600",
                          padding: "6px 10px",
                          borderRadius: "4px",
                          cursor: "pointer",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          height: "auto"
                        }}
                      >
                        <span>📊 Alternative Decision Analysis</span>
                        <span>{expandedAlts[rec.zone_id] ? "▲" : "▼"}</span>
                      </button>
                      
                      {expandedAlts[rec.zone_id] && (
                        <div style={{
                          marginTop: "6px",
                          padding: "10px",
                          background: "rgba(0,0,0,0.35)",
                          border: "1px solid rgba(255,255,255,0.05)",
                          borderRadius: "6px",
                          fontSize: "0.72rem",
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px"
                        }}>
                          {/* Recommended Option (Primary) */}
                          {rec.what_if_analysis.primary && (
                            <div style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", paddingBottom: "8px" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                <span style={{ fontWeight: "700", color: "var(--color-success)" }}>✅ RECOMMENDED: {rec.what_if_analysis.primary.label}</span>
                                <span style={{ color: "var(--color-success)", fontWeight: "600" }}>Safety Impact: +{rec.what_if_analysis.primary.risk_improvement || 15} pts</span>
                              </div>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px", color: "var(--color-text-secondary)" }}>
                                <div>Queue Reduction: <strong>{rec.what_if_analysis.primary.expected_reduction}%</strong></div>
                                <div>Est. Wait Clearance: <strong>{rec.what_if_analysis.primary.expected_clearance_min} min</strong></div>
                              </div>
                              <div style={{ fontStyle: "italic", color: "var(--color-text-muted)", marginTop: "4px", fontSize: "0.68rem" }}>
                                Reason: Yields shortest wait time & highest flow capacity.
                              </div>
                            </div>
                          )}
                          
                          {/* Alternative Option (Secondary) */}
                          {rec.what_if_analysis.secondary && (
                            <div>
                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                <span style={{ fontWeight: "700", color: "var(--color-warning)" }}>❌ ALTERNATE: {rec.what_if_analysis.secondary.label}</span>
                                <span style={{ color: "var(--color-text-muted)" }}>Safety Impact: +{rec.what_if_analysis.secondary.risk_improvement || 8} pts</span>
                              </div>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px", color: "var(--color-text-secondary)" }}>
                                <div>Queue Reduction: <strong>{rec.what_if_analysis.secondary.expected_reduction}%</strong></div>
                                <div>Est. Wait Clearance: <strong>{rec.what_if_analysis.secondary.expected_clearance_min} min</strong></div>
                              </div>
                              <div style={{ fontStyle: "italic", color: "var(--color-text-muted)", marginTop: "4px", fontSize: "0.68rem" }}>
                                Reason: Rejected as primary due to lower risk reduction and downstream egress delay risk.
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Dispatch triggers */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px" }}>
                    {rec.alternative_routes && rec.alternative_routes.length > 0 && (
                      <div style={{ display: "flex", gap: "4px" }}>
                        {rec.alternative_routes.map((route) => (
                          <span key={route} className="alt-route-tag" style={{ fontSize: "0.7rem", padding: "2px 6px" }}>
                            ➔ {route.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    {isAlreadyActive ? (
                      <button 
                        className="btn btn-secondary" 
                        onClick={() => onDeactivate(rec.zone_id)}
                        style={{ padding: "4px 10px", fontSize: "0.75rem", color: "var(--color-danger)", border: "1px solid var(--color-danger)" }}
                      >
                        Deactivate Response
                      </button>
                    ) : (
                      <button 
                        className="chat-submit-btn" 
                        onClick={() => handleOpenWizard(rec)}
                        style={{ padding: "4px 10px", fontSize: "0.75rem", height: "auto", background: "var(--color-primary-light)", border: "1px solid var(--color-primary)" }}
                      >
                        Deploy Crowd Response
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Dispatch Workflow Wizard Modal */}
      {selectedRec && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <h3 style={{ margin: 0, fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "8px" }}>
                <span>🚨</span> Deploy Crowd Response: {selectedRec.zone_id.replace("_", " ").toUpperCase()}
              </h3>
              <button onClick={handleCloseWizard} style={{ background: "none", border: "none", color: "white", cursor: "pointer", fontSize: "1.2rem" }}>&times;</button>
            </div>

            {/* 10-Step Workflow Progress Map */}
            <div style={{ padding: "12px 16px", background: "rgba(0,0,0,0.25)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "6px", fontSize: "0.68rem" }}>
                {workflowSteps.map((step) => {
                  let status = "pending";
                  if (deploymentStep === 0) {
                    if (step.num <= 6) status = "completed";
                    else if (step.num === 7) status = "active";
                  } else {
                    if (step.num < deploymentStep) status = "completed";
                    else if (step.num === deploymentStep) status = "active";
                  }

                  let statusColor = "var(--color-text-muted)";
                  let statusBg = "rgba(255,255,255,0.02)";
                  let statusBorder = "rgba(255,255,255,0.05)";
                  let icon = "○";

                  if (status === "completed") {
                    statusColor = "var(--color-success)";
                    statusBg = "rgba(0, 230, 118, 0.05)";
                    statusBorder = "rgba(0, 230, 118, 0.2)";
                    icon = "✓";
                  } else if (status === "active") {
                    statusColor = "#00f0ff";
                    statusBg = "rgba(0, 240, 255, 0.08)";
                    statusBorder = "rgba(0, 240, 255, 0.4)";
                    icon = "●";
                  }

                  return (
                    <div 
                      key={step.num} 
                      style={{ 
                        padding: "6px", 
                        background: statusBg, 
                        border: `1px solid ${statusBorder}`, 
                        borderRadius: "6px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "2px",
                        color: statusColor,
                        transition: "all 0.3s ease",
                        textAlign: "center"
                      }}
                    >
                      <div style={{ fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center", gap: "3px" }}>
                        <span>{icon}</span> Step {step.num}
                      </div>
                      <div style={{ fontSize: "0.58rem", color: "var(--color-text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {step.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Loading / Error overlay during fetch */}
            {deploymentStep > 0 ? (
              <div style={{ flex: 1, padding: "40px", textAlign: "center", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: "16px" }}>
                <div style={{ position: "relative", width: "80px", height: "80px" }}>
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, border: "4px dashed rgba(0, 240, 255, 0.2)", borderRadius: "50%" }}></div>
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, border: "4px solid transparent", borderTopColor: "#00f0ff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }}></div>
                  <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", fontSize: "1.2rem" }}>🚨</div>
                </div>
                <h4 style={{ margin: 0, fontSize: "1.1rem", color: "#00f0ff" }}>Executing Crowd Response Plan</h4>
                <div style={{ maxWidth: "400px", fontSize: "0.85rem", color: "var(--color-text-secondary)", lineHeight: "1.5" }}>
                  {deploymentStep === 7 && "Obtaining operator validation signature..."}
                  {deploymentStep === 8 && "Activating wireless dispatch transceivers..."}
                  {deploymentStep === 9 && "Injecting blue redirection vectors into SVG stream..."}
                  {deploymentStep === 10 && "Writing cryptographically signed audit log to database..."}
                </div>
                <div style={{ display: "flex", gap: "4px", marginTop: "8px" }}>
                  {[7, 8, 9, 10].map(sNum => (
                    <div 
                      key={sNum} 
                      style={{ 
                        width: "32px", 
                        height: "4px", 
                        borderRadius: "2px", 
                        background: sNum < deploymentStep ? "var(--color-success)" : sNum === deploymentStep ? "#00f0ff" : "rgba(255,255,255,0.1)",
                        transition: "background 0.3s ease"
                      }}
                    ></div>
                  ))}
                </div>
              </div>
            ) : isPreviewLoading ? (
              <div style={{ padding: "40px", textAlign: "center", flex: 1 }}>
                <div style={{ border: "4px solid rgba(0,240,255,0.1)", borderTop: "4px solid #00f0ff", borderRadius: "50%", width: "40px", height: "40px", animation: "spin 1s linear infinite", margin: "0 auto 16px auto" }}></div>
                <div style={{ fontSize: "0.9rem", color: "var(--color-text-secondary)" }}>AI generating operator briefing & translations...</div>
              </div>
            ) : previewError ? (
              <div style={{ padding: "20px", color: "var(--color-danger)", fontSize: "0.85rem" }}>
                {previewError}
              </div>
            ) : previewData ? (
              <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
                {/* STEP 1: Briefing & Impact */}
                {wizardStep === 1 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div>
                      <h4 style={{ margin: "0 0 6px 0", color: "var(--color-primary-light)", fontSize: "0.85rem", textTransform: "uppercase" }}>
                        Operator Briefing
                      </h4>
                      <p style={{ margin: 0, fontSize: "0.85rem", lineHeight: "1.4", background: "rgba(255,255,255,0.03)", padding: "10px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.05)" }}>
                        {previewData.briefing}
                      </p>
                    </div>

                    <div>
                      <h4 style={{ margin: "0 0 6px 0", color: "var(--color-primary-light)", fontSize: "0.85rem", textTransform: "uppercase" }}>
                        Crowd Flow Impact Prediction
                      </h4>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                        <div style={{ padding: "10px", background: "rgba(255, 74, 107, 0.05)", border: "1px solid rgba(255, 74, 107, 0.15)", borderRadius: "6px", textAlign: "center" }}>
                          <span style={{ fontSize: "0.7rem", color: "var(--color-text-secondary)" }}>Current Queue</span>
                          <div style={{ fontSize: "1.2rem", fontWeight: "700", color: "var(--color-danger)", marginTop: "4px" }}>
                            {previewData.impact.current_queue.toLocaleString()} spectators
                          </div>
                        </div>
                        <div style={{ padding: "10px", background: "rgba(0, 240, 255, 0.05)", border: "1px solid rgba(0, 240, 255, 0.15)", borderRadius: "6px", textAlign: "center" }}>
                          <span style={{ fontSize: "0.7rem", color: "var(--color-text-secondary)" }}>Predicted Post-Redirect</span>
                          <div style={{ fontSize: "1.2rem", fontWeight: "700", color: "#00f0ff", marginTop: "4px" }}>
                            {previewData.impact.predicted_queue.toLocaleString()} spectators
                          </div>
                        </div>
                        <div style={{ padding: "10px", background: "rgba(0, 226, 154, 0.05)", border: "1px solid rgba(0, 226, 154, 0.15)", borderRadius: "6px", textAlign: "center" }}>
                          <span style={{ fontSize: "0.7rem", color: "var(--color-text-secondary)" }}>Expected Flow Reduction</span>
                          <div style={{ fontSize: "1.2rem", fontWeight: "700", color: "var(--color-success)", marginTop: "4px" }}>
                            -{previewData.impact.reduction_pct}% Density
                          </div>
                        </div>
                        <div style={{ padding: "10px", background: "rgba(255, 183, 0, 0.05)", border: "1px solid rgba(255, 183, 0, 0.15)", borderRadius: "6px", textAlign: "center" }}>
                          <span style={{ fontSize: "0.7rem", color: "var(--color-text-secondary)" }}>Estimated Clearance Time</span>
                          <div style={{ fontSize: "1.2rem", fontWeight: "700", color: "var(--color-warning)", marginTop: "4px" }}>
                            {previewData.impact.clearance_min} minutes
                          </div>
                        </div>
                        <div style={{ padding: "10px", background: "rgba(0, 230, 118, 0.05)", border: "1px solid rgba(0, 230, 118, 0.15)", borderRadius: "6px", textAlign: "center", gridColumn: "span 2" }}>
                          <span style={{ fontSize: "0.7rem", color: "var(--color-text-secondary)" }}>Diverted Ingress Flow Rate</span>
                          <div style={{ fontSize: "1.2rem", fontWeight: "700", color: "var(--color-success)", marginTop: "4px" }}>
                            ~{previewData.impact.diverted_flow_rate_per_min || 350} spectators / min
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 2: Multilingual PA Announcements */}
                {wizardStep === 2 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div style={{ padding: "10px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "6px", marginBottom: "8px" }}>
                      <strong style={{ display: "block", fontSize: "0.75rem", color: "var(--color-primary-light)", textTransform: "uppercase", marginBottom: "4px" }}>AI Operator Briefing Summary:</strong>
                      <div style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)", lineHeight: "1.4" }}>
                        {previewData.briefing}
                      </div>
                    </div>

                    <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "6px" }}>
                      📢 AI resolved required announcement languages based on match participants & stadium demographics.
                    </div>
                    {Object.entries(previewData.announcements).map(([lang, text]) => (
                      <div key={lang} style={{ padding: "12px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "6px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", alignItems: "center" }}>
                          <strong style={{ fontSize: "0.85rem", color: "var(--color-primary-light)" }}>{lang} Announcement</strong>
                          <span style={{ fontSize: "0.65rem", padding: "1px 6px", background: "rgba(0, 240, 255, 0.15)", borderRadius: "10px", color: "#00f0ff", border: "1px solid rgba(0, 240, 255, 0.2)" }}>PA Broadcast Ready</span>
                        </div>
                        <div style={{ fontSize: "0.8rem", fontStyle: "italic", color: "var(--color-text-secondary)", lineHeight: "1.4" }}>
                          "{text}"
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* STEP 3: Operator Approval */}
                {wizardStep === 3 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px", textAlign: "center", padding: "10px 0" }}>
                    <div style={{ fontSize: "2rem" }}>🚨</div>
                    <h4 style={{ margin: 0, fontSize: "1rem" }}>Confirm Crowd Control Dispatch Order</h4>
                    <p style={{ margin: "0 auto", maxWidth: "450px", fontSize: "0.85rem", color: "var(--color-text-secondary)", lineHeight: "1.5" }}>
                      You are deploying an active ingress redirection directive from <strong style={{ color: "white" }}>{selectedRec.zone_id.replace("_", " ").toUpperCase()}</strong> to <strong style={{ color: "white" }}>{selectedRec.alternative_routes.join(", ").replace("_", " ").toUpperCase()}</strong>.
                    </p>
                    <div style={{ background: "rgba(255, 74, 107, 0.05)", border: "1px solid rgba(255, 74, 107, 0.15)", borderRadius: "8px", padding: "12px", fontSize: "0.8rem", color: "var(--color-text-secondary)", textAlign: "left", display: "inline-block", margin: "0 auto" }}>
                      <div>🔹 <strong>SVG Map:</strong> Displays active redirection paths & animated particles.</div>
                      <div style={{ marginTop: "4px" }}>🔹 <strong>Display Boards:</strong> Activates multilingual safety routing alerts.</div>
                      <div style={{ marginTop: "4px" }}>🔹 <strong>Broadcaster:</strong> Dispatches speech templates to field marshals.</div>
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {/* Modal Footer Controls */}
            {deploymentStep === 0 && !isPreviewLoading && previewData && (
              <div style={{ padding: "14px 20px", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "space-between" }}>
                {wizardStep > 1 ? (
                  <button className="btn btn-secondary" onClick={() => setWizardStep(prev => prev - 1)} style={{ padding: "6px 14px", fontSize: "0.8rem" }}>
                    Back
                  </button>
                ) : (
                  <button className="btn btn-secondary" onClick={handleCloseWizard} style={{ padding: "6px 14px", fontSize: "0.8rem" }}>
                    Cancel
                  </button>
                )}

                {wizardStep < 3 ? (
                  <button className="chat-submit-btn" onClick={() => setWizardStep(prev => prev + 1)} style={{ padding: "6px 14px", fontSize: "0.8rem", height: "auto" }}>
                    Next Step
                  </button>
                ) : (
                  <button className="chat-submit-btn" onClick={handleExecuteDispatch} style={{ padding: "6px 18px", fontSize: "0.8rem", height: "auto", background: "var(--color-success)", borderColor: "var(--color-success)" }}>
                    Approve & Deploy Response
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

// Modal and spinner animation inline definitions
const modalOverlayStyle = {
  position: "fixed",
  top: 0, left: 0, right: 0, bottom: 0,
  background: "rgba(0,0,0,0.7)",
  backdropFilter: "blur(8px)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 1000,
  padding: "20px"
};

const modalContentStyle = {
  background: "rgba(10, 15, 30, 0.95)",
  border: "1px solid rgba(0, 240, 255, 0.2)",
  borderRadius: "12px",
  width: "100%",
  maxWidth: "580px",
  display: "flex",
  flexDirection: "column",
  maxHeight: "90vh",
  boxShadow: "0 0 35px rgba(0, 240, 255, 0.15)",
  color: "white"
};

// Add standard spinning keyframe style to the document
if (typeof document !== "undefined") {
  const styleSheet = document.createElement("style");
  styleSheet.innerText = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(styleSheet);
}
