import React, { useState, useEffect, useCallback } from "react";
import { useZoneSocket } from "./hooks/useZoneSocket";
import { ZoneMap } from "./components/ZoneMap";
import { RecommendationPanel } from "./components/RecommendationPanel";
import { ChatPanel } from "./components/ChatPanel";
import { DemoControls } from "./components/DemoControls";
import { ZoneDetailTable } from "./components/ZoneDetailTable";
import { DispatchHistoryPanel } from "./components/DispatchHistoryPanel";
import { Dashboard } from "./components/Dashboard";
import { AccessibilityControlCenter } from "./components/AccessibilityControlCenter";
import "./styles.css";

const BACKEND_URL = "http://localhost:8000";
const WS_URL = "ws://localhost:8000/ws/zones";

const MATCHES = [
  { id: "argentina_saudi", label: "🇦🇷 Argentina vs. Saudi Arabia (Arabic/Spanish)" },
  { id: "mexico_poland", label: "🇲🇽 Mexico vs. Poland (Spanish/Polish)" },
  { id: "france_morocco", label: "🇫🇷 France vs. Morocco (French/Arabic)" }
];

function App() {
  const { zones: liveZones, isConnected } = useZoneSocket(WS_URL);
  const [recommendations, setRecommendations] = useState([]);
  const [recsEngine, setRecsEngine] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [selectedZoneId, setSelectedZoneId] = useState(null);
  
  const [activeMatch, setActiveMatch] = useState("argentina_saudi");
  const [activeRedirections, setActiveRedirections] = useState({});
  const [dispatchHistory, setDispatchHistory] = useState([]);
  
  const [isRecsLoading, setIsRecsLoading] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Advanced States
  const [predictionMode, setPredictionMode] = useState("current");
  const [simulationState, setSimulationState] = useState({
    match_stage: "gate_opening",
    demo_mode: false,
    active_redirections: {}
  });
  
  const [incidents, setIncidents] = useState([]);
  const [resolvedIncidents, setResolvedIncidents] = useState([]);
  const [lastUpdateTime, setLastUpdateTime] = useState("");
  
  // Replay State
  const [activeReplay, setActiveReplay] = useState(null);
  const [replayStep, setReplayStep] = useState(0);
  const [isPlayingReplay, setIsPlayingReplay] = useState(false);

  // Poll simulator state
  const fetchSimulationState = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/simulation/state`);
      if (res.ok) {
        const data = await res.json();
        setSimulationState(data);
      }
    } catch (err) {
      console.error("Error fetching simulation state:", err);
    }
  }, []);

  useEffect(() => {
    fetchSimulationState();
    const interval = setInterval(fetchSimulationState, 3000);
    return () => clearInterval(interval);
  }, [fetchSimulationState]);

  // Record telemetry update timestamps
  useEffect(() => {
    if (liveZones.length > 0) {
      setLastUpdateTime(new Date().toLocaleTimeString());
    }
  }, [liveZones]);

  // Demo Controls callbacks
  const handleToggleDemoMode = async (enabled) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/simulation/demo/${enabled}`, {
        method: "POST"
      });
      if (res.ok) {
        setSimulationState(prev => ({ ...prev, demo_mode: enabled }));
      }
    } catch (err) {
      console.error("Error setting demo mode:", err);
    }
  };

  const handleSetSimulationStage = async (stageName) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/simulation/stage/${stageName}`, {
        method: "POST"
      });
      if (res.ok) {
        setSimulationState(prev => ({ ...prev, match_stage: stageName }));
        
        // Output stage switch to chat history
        const stageLabel = stageName.replace(/_/g, " ").toUpperCase();
        setChatHistory(prev => [
          ...prev,
          { sender: "copilot", text: `🔄 STAGE TRANSITION: Stadium has progressed to ${stageLabel}. Telemetry is adjusting to stage inflow/outflow properties.`, engine: "System Orchestrator" }
        ]);
      }
    } catch (err) {
      console.error("Error setting simulation stage:", err);
    }
  };

  // Replay Mode snapshot logic
  const getReplayZones = () => {
    if (!activeReplay) return liveZones;
    
    return liveZones.map(z => {
      if (z.id === activeReplay.zoneId) {
        let occupancy_pct = z.occupancy_pct;
        let occupancy = z.current_occupancy;
        let status = "normal";
        
        switch (replayStep) {
          case 0: // Inception
            occupancy_pct = 76;
            occupancy = Math.round(z.capacity * 0.76);
            status = "watch";
            break;
          case 1: // Peak
            occupancy_pct = 94;
            occupancy = Math.round(z.capacity * 0.94);
            status = "critical";
            break;
          case 2: // Dispatch
            occupancy_pct = 96;
            occupancy = Math.round(z.capacity * 0.96);
            status = "critical";
            break;
          case 3: // Mitigation
            occupancy_pct = 78;
            occupancy = Math.round(z.capacity * 0.78);
            status = "watch";
            break;
          case 4: // Resolved
          default:
            occupancy_pct = 52;
            occupancy = Math.round(z.capacity * 0.52);
            status = "normal";
            break;
        }
        
        return {
          ...z,
          occupancy_pct,
          current_occupancy: occupancy,
          status,
          predicted_pct_in_2min: Math.min(100, occupancy_pct + 2),
          predicted_pct_in_5min: Math.min(100, occupancy_pct + 4),
          predicted_pct_in_10min: Math.min(100, occupancy_pct + 7)
        };
      }
      return z;
    });
  };

  const zones = activeReplay ? getReplayZones() : liveZones;

  const getReplayRecommendations = () => {
    if (replayStep >= 1 && replayStep <= 3 && activeReplay) {
      return [{
        zone_id: activeReplay.zoneId,
        status: "critical",
        occupancy_pct: 94,
        capacity: 2000,
        current_occupancy: 1880,
        predicted_pct_in_5min: 98,
        congestion_growth_pct: 3.5,
        alternative_routes: ["gate_b"],
        expected_reduction_pct: 31,
        confidence_score: 95,
        confidence_rating: "High Confidence",
        action: `IMMEDIATE DIVERSION: Restrict ingress at ${activeReplay.zoneName} and route spectators to Gate B.`,
        reasoning: `${activeReplay.zoneName} occupancy has reached 94%. Current inflow predicts 98% capacity within 5 minutes. Redirecting to Gate B will reduce bottleneck load by 31%.`,
        predicted_breach_min: 2,
        entry_rate: 140,
        exit_rate: 30,
        predicted_pct_in_2min: 96,
        predicted_pct_in_10min: 100,
        risk_score: 85,
        what_if_analysis: {
          primary: {
            label: "Redirect to Gate B",
            expected_reduction: 31,
            expected_clearance_min: 3,
            risk_improvement: 28
          },
          secondary: {
            label: "Redirect to Gate A (Alternate)",
            expected_reduction: 14,
            expected_clearance_min: 6,
            risk_improvement: 12
          }
        }
      }];
    }
    return [];
  };

  const finalRecommendations = activeReplay ? getReplayRecommendations() : recommendations;

  // Track active alarm incidents
  useEffect(() => {
    if (!liveZones || liveZones.length === 0 || activeReplay) return;

    let currentSafety = 100;
    const critCount = liveZones.filter(z => z.status === "critical").length;
    const watchCount = liveZones.filter(z => z.status === "watch").length;
    const divCount = Object.keys(activeRedirections).length;
    currentSafety = Math.max(10, Math.min(100, 100 - watchCount * 6 - critCount * 15 + divCount * 8));

    liveZones.forEach(zone => {
      if (zone.status === "watch" || zone.status === "critical") {
        setIncidents(prev => {
          const existing = prev.find(inc => inc.zoneId === zone.id && !inc.resolved);
          if (existing) return prev;
          
          const newIncident = {
            id: `INC-${zone.id}-${Date.now().toString().slice(-4)}`,
            zoneId: zone.id,
            zoneName: zone.name,
            statusBefore: zone.status,
            occupancyBefore: zone.current_occupancy,
            occupancyPctBefore: zone.occupancy_pct,
            safetyScoreBefore: currentSafety,
            startTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            startTimestamp: Date.now(),
            resolved: false,
            currentStep: 1,
            steps: {
              1: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              2: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            }
          };
          return [...prev, newIncident];
        });
      } else {
        setIncidents(prev => {
          const activeIdx = prev.findIndex(inc => inc.zoneId === zone.id && !inc.resolved);
          if (activeIdx !== -1) {
            const updated = [...prev];
            const inc = { ...updated[activeIdx] };
            inc.resolved = true;
            inc.endTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            inc.endTimestamp = Date.now();
            inc.currentStep = 10;
            inc.steps[10] = inc.endTime;

            const durationSec = Math.round((inc.endTimestamp - inc.startTimestamp) / 1000);
            const durationStr = durationSec > 60 
              ? `${Math.floor(durationSec / 60)}m ${durationSec % 60}s` 
              : `${durationSec}s`;

            const resolvedItem = {
              ...inc,
              occupancyAfter: zone.current_occupancy,
              occupancyPctAfter: zone.occupancy_pct,
              safetyScoreAfter: currentSafety,
              responseTime: durationStr,
              densityReduction: Math.max(0, Math.round(inc.occupancyPctBefore - zone.occupancy_pct))
            };

            setTimeout(() => {
              setResolvedIncidents(prevResolved => {
                if (prevResolved.find(r => r.id === inc.id)) return prevResolved;
                return [resolvedItem, ...prevResolved];
              });
            }, 0);

            updated.splice(activeIdx, 1);
            return updated;
          }
          return prev;
        });
      }
    });
  }, [liveZones, activeRedirections, activeReplay]);

  // Timed progression for active incidents (steps 3 to 7)
  useEffect(() => {
    const timer = setInterval(() => {
      setIncidents(prev => {
        return prev.map(inc => {
          if (!inc.resolved && inc.currentStep < 8) {
            const nextStep = inc.currentStep + 1;
            return {
              ...inc,
              currentStep: nextStep,
              steps: {
                ...inc.steps,
                [nextStep]: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
              }
            };
          }
          return inc;
        });
      });
    }, 2000);
    
    return () => clearInterval(timer);
  }, []);

  // Sync approval steps when redirections deployed
  useEffect(() => {
    setIncidents(prev => {
      return prev.map(inc => {
        if (!inc.resolved && activeRedirections[inc.zoneId] && inc.currentStep < 9) {
          const timestampStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          return {
            ...inc,
            currentStep: 9,
            steps: {
              ...inc.steps,
              8: timestampStr,
              9: timestampStr
            }
          };
        }
        return inc;
      });
    });
  }, [activeRedirections]);

  // Fetch AI Recommendations
  const fetchRecommendations = useCallback(async () => {
    if (activeReplay) return;
    setIsRecsLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/recommend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (response.ok) {
        const data = await response.json();
        setRecommendations(data.recommendations);
        setRecsEngine(data.engine);
      } else {
        console.error("Failed to fetch recommendations:", response.statusText);
      }
    } catch (err) {
      console.error("Error fetching recommendations:", err);
    } finally {
      setIsRecsLoading(false);
    }
  }, [activeReplay]);

  // Trigger Recommendations update when warning/critical zones count changes
  const alertZonesStr = JSON.stringify(
    liveZones.filter((z) => z.status !== "normal").map((z) => ({ id: z.id, status: z.status }))
  );
  
  useEffect(() => {
    if (isConnected && liveZones.length > 0 && !activeReplay) {
      fetchRecommendations();
    }
  }, [alertZonesStr, isConnected, fetchRecommendations, activeReplay]);

  // Handle Q&A send message
  const handleSendMessage = async (messageText) => {
    const newOperatorMsg = { sender: "operator", text: messageText };
    setChatHistory((prev) => [...prev, newOperatorMsg]);
    setIsChatLoading(true);

    try {
      const historyPayload = chatHistory.map((msg) => ({
        role: msg.sender === "operator" ? "user" : "assistant",
        content: msg.text,
      }));

      const response = await fetch(`${BACKEND_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageText,
          history: historyPayload,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setChatHistory((prev) => [
          ...prev,
          { sender: "copilot", text: data.reply, engine: data.engine },
        ]);
      } else {
        console.error("Failed to fetch chat response:", response.statusText);
        setChatHistory((prev) => [
          ...prev,
          { 
            sender: "copilot", 
            text: "Failed to reach copilot engine. Please check connection.", 
            engine: "Local Fallback" 
          },
        ]);
      }
    } catch (err) {
      console.error("Error sending chat message:", err);
      setChatHistory((prev) => [
        ...prev,
        { 
          sender: "copilot", 
          text: "Network error. Falling back to local rules.", 
          engine: "Local Fallback" 
        },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Dispatch redirection active control
  const handleDispatchRedirection = (zoneId, targetRouteIds, impactString, actionText, flowRate, languages, occupancyPct) => {
    setActiveRedirections((prev) => ({
      ...prev,
      [zoneId]: {
        routes: targetRouteIds,
        flowRate: flowRate || 350,
      },
    }));

    const zoneName = zones.find((z) => z.id === zoneId)?.name || zoneId.replace("_", " ").toUpperCase();
    const newDispatch = {
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      zoneId,
      zoneName,
      issue: "High Ingress Congestion Alert",
      recommendation: `Redirected flow to ${targetRouteIds.map((id) => id.replace("_", " ").toUpperCase()).join(", ")}`,
      operatorAction: actionText || "Deploy Crowd Response",
      status: "Active",
      impact: impactString,
      density: occupancyPct ? `${Math.round(occupancyPct)}%` : "N/A",
      flowRate: flowRate || 350,
      languages: languages || ["English"],
    };
    setDispatchHistory((prev) => [newDispatch, ...prev]);

    // Push notification to Copilot history
    setChatHistory((prev) => [
      ...prev,
      {
        sender: "copilot",
        text: `🚨 CROWD CONTROL ORDER DEPLOYED: Restricting ingress at ${zoneName} and redirecting flow to ${targetRouteIds.map((id) => id.replace("_", " ").toUpperCase()).join(", ")}. Multilingual announcements broadcasting now. (Flow: ${flowRate || 350} spectators/min)`,
        engine: "System Orchestrator",
      },
    ]);
  };

  // Deactivate active redirection
  const handleDeactivateRedirection = (zoneId) => {
    setActiveRedirections((prev) => {
      const copy = { ...prev };
      delete copy[zoneId];
      return copy;
    });

    setDispatchHistory((prev) =>
      prev.map((item) =>
        item.zoneId === zoneId && item.status === "Active"
          ? { ...item, status: "Completed", impact: "Directive lifted. Flow returned to baseline." }
          : item
      )
    );

    const zoneName = zones.find((z) => z.id === zoneId)?.name || zoneId.replace("_", " ").toUpperCase();
    setChatHistory((prev) => [
      ...prev,
      {
        sender: "copilot",
        text: `✅ CROWD CONTROL LIFTABLE: ${zoneName} has stabilized. Redirection route deactivated.`,
        engine: "System Orchestrator",
      },
    ]);
  };

  // Handle Demo Spike
  const handleTriggerSpike = async (zoneId) => {
    setIsActionLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/demo/spike/${zoneId}`, {
        method: "POST",
      });
      if (response.ok) {
        setSelectedZoneId(zoneId); // Auto inspect spiked zone
      } else {
        console.error("Failed to trigger spike:", response.statusText);
      }
    } catch (err) {
      console.error("Error triggering spike:", err);
    } finally {
      setIsActionLoading(false);
    }
  };

  // Handle Demo Reset
  const handleReset = async () => {
    setIsActionLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/demo/reset`, {
        method: "POST",
      });
      if (response.ok) {
        setChatHistory((prev) => [
          ...prev,
          { sender: "copilot", text: "Demo simulator has been reset to nominal parameters.", engine: "Local Fallback" }
        ]);
        setSelectedZoneId(null);
        setActiveRedirections({});
        setDispatchHistory([]);
        setIncidents([]);
        setResolvedIncidents([]);
      } else {
        console.error("Failed to reset simulator:", response.statusText);
      }
    } catch (err) {
      console.error("Error resetting simulator:", err);
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <div className="app-container">
      {/* Header Panel */}
      <header className="header">
        <h1>
          <span>🛡️</span> StadiumIQ Control Room Copilot
        </h1>
        <div className="header-status" style={{ gap: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>Match Context:</span>
            <select
              value={activeMatch}
              onChange={(e) => {
                setActiveMatch(e.target.value);
                const matchLabel = MATCHES.find(m => m.id === e.target.value)?.label;
                setChatHistory(prev => [
                  ...prev,
                  { sender: "copilot", text: `🔄 Context switched to ${matchLabel}. Crowd demographics and languages updated.`, engine: "System Orchestrator" }
                ]);
              }}
              className="match-selector-select"
            >
              {MATCHES.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div className={`ws-status-badge ${isConnected ? "connected" : "disconnected"}`}>
              <span className="ws-dot"></span>
              {isConnected ? "Live Connection" : "Connection Lost"}
            </div>
            <span style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
              FIFA World Cup 2026 Operations
            </span>
          </div>
        </div>
      </header>

      {/* KPI Dashboard */}
      <Dashboard
        zones={zones}
        recommendations={finalRecommendations}
        activeRedirections={activeRedirections}
        resolvedIncidents={resolvedIncidents}
        simulationState={simulationState}
        isConnected={isConnected}
        lastUpdateTime={lastUpdateTime}
      />

      {/* Replay Overlay Banner */}
      {activeReplay && (
        <div style={{
          background: "rgba(0, 176, 255, 0.15)",
          border: "1px solid #00b0ff",
          color: "#fff",
          padding: "8px 16px",
          borderRadius: "6px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px"
        }}>
          <span>
            📺 <strong>REPLAY MODE:</strong> Visualizing historical incident alert at <strong>{activeReplay.zoneName}</strong>. Step {replayStep + 1} of 5.
          </span>
          <button 
            onClick={() => { setActiveReplay(null); setIsPlayingReplay(false); }}
            className="btn btn-secondary" 
            style={{ padding: "3px 12px", fontSize: "0.75rem", background: "rgba(255,76,76,0.15)", border: "1px solid var(--color-danger)", color: "var(--color-danger)" }}
          >
            Exit Replay Mode
          </button>
        </div>
      )}

      {/* Global Active Redirection Announcement Banner */}
      {Object.keys(activeRedirections).length > 0 && !activeReplay && (
        <div className="active-banner" style={{ margin: "0 0 12px 0" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: "#00f0ff", boxShadow: "0 0 8px #00f0ff" }}></span>
            <strong>ACTIVE DISPATCH DIRECTIVES:</strong> Ingress traffic for <span style={{ color: "#00f0ff", fontWeight: "bold" }}>{Object.keys(activeRedirections).map(id => id.replace("_", " ").toUpperCase()).join(", ")}</span> is being actively diverted.
          </span>
          <span style={{ fontSize: "0.75rem", background: "rgba(0, 240, 255, 0.15)", border: "1px solid #00f0ff", padding: "2px 10px", borderRadius: "4px", color: "#00f0ff", fontWeight: "bold" }}>
            📢 Public Displays Broadcasting
          </span>
        </div>
      )}

      {/* Main Grid Layout */}
      <main className="dashboard-grid" style={{ gridTemplateRows: "1fr" }}>
        {/* Left Column: Interactive Map, Demo Controls & Dispatch History */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", minHeight: "0" }}>
          <div style={{ flex: 1.4, minHeight: "0" }}>
            <ZoneMap
              zones={zones}
              selectedZoneId={selectedZoneId}
              onSelectZone={setSelectedZoneId}
              activeRedirections={activeRedirections}
              predictionMode={predictionMode}
              setPredictionMode={setPredictionMode}
            />
          </div>
          <div style={{ flex: 0.8, display: "flex", gap: "16px" }}>
            <div style={{ flex: 1 }}>
              <DemoControls
                zones={zones}
                onTriggerSpike={handleTriggerSpike}
                onReset={handleReset}
                isActionLoading={isActionLoading}
                simulationState={simulationState}
                onToggleDemoMode={handleToggleDemoMode}
                onSetSimulationStage={handleSetSimulationStage}
              />
            </div>
            <div style={{ flex: 1.2 }}>
              <DispatchHistoryPanel
                history={dispatchHistory}
                onDeactivate={handleDeactivateRedirection}
              />
            </div>
          </div>
        </div>

        {/* Middle Column: Recommendations & Directory Table */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", minHeight: "0" }}>
          <div style={{ flex: 1, minHeight: "0" }}>
            <RecommendationPanel
              recommendations={finalRecommendations}
              engine={recsEngine}
              isLoading={isRecsLoading}
              onRefresh={fetchRecommendations}
              activeMatch={activeMatch}
              activeRedirections={activeRedirections}
              onDispatch={handleDispatchRedirection}
              onDeactivate={handleDeactivateRedirection}
            />
          </div>
          <div style={{ flex: 1, minHeight: "0" }}>
            <ZoneDetailTable
              zones={zones}
              selectedZoneId={selectedZoneId}
              onSelectZone={setSelectedZoneId}
              activeRedirections={activeRedirections}
            />
          </div>
        </div>

        {/* Right Column: Multi-Tab Panel */}
        <div style={{ minHeight: "0" }}>
          <ChatPanel
            chatHistory={chatHistory}
            onSendMessage={handleSendMessage}
            isLoading={isChatLoading}
            incidents={incidents}
            resolvedIncidents={resolvedIncidents}
            activeReplay={activeReplay}
            onStartReplay={(inc) => {
              setActiveReplay(inc);
              setReplayStep(0);
              setIsPlayingReplay(true);
            }}
            onExitReplay={() => {
              setActiveReplay(null);
              setIsPlayingReplay(false);
            }}
            replayStep={replayStep}
            setReplayStep={setReplayStep}
            isPlayingReplay={isPlayingReplay}
            setIsPlayingReplay={setIsPlayingReplay}
          />
        </div>
      </main>

      {/* Floating Accessibility Control Center */}
      <AccessibilityControlCenter />
    </div>
  );
}

export default App;
