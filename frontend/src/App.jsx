import React, { useState, useEffect, useCallback } from "react";
import { useZoneSocket } from "./hooks/useZoneSocket";
import { ZoneMap } from "./components/ZoneMap";
import { RecommendationPanel } from "./components/RecommendationPanel";
import { ChatPanel } from "./components/ChatPanel";
import { DemoControls } from "./components/DemoControls";
import { ZoneDetailTable } from "./components/ZoneDetailTable";
import "./styles.css";

const BACKEND_URL = "http://localhost:8000";
const WS_URL = "ws://localhost:8000/ws/zones";

function App() {
  const { zones, isConnected } = useZoneSocket(WS_URL);
  const [recommendations, setRecommendations] = useState([]);
  const [recsEngine, setRecsEngine] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [selectedZoneId, setSelectedZoneId] = useState(null);
  
  const [isRecsLoading, setIsRecsLoading] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Fetch AI Recommendations
  const fetchRecommendations = useCallback(async () => {
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
  }, []);

  // Trigger Recommendations update whenever warning/critical zones count changes
  const alertZonesStr = JSON.stringify(
    zones.filter((z) => z.status !== "normal").map((z) => ({ id: z.id, status: z.status }))
  );
  
  useEffect(() => {
    if (isConnected && zones.length > 0) {
      fetchRecommendations();
    }
  }, [alertZonesStr, isConnected, fetchRecommendations]);

  // Handle Q&A send message
  const handleSendMessage = async (messageText) => {
    // Append operator message
    const newOperatorMsg = { sender: "operator", text: messageText };
    setChatHistory((prev) => [...prev, newOperatorMsg]);
    setIsChatLoading(true);

    try {
      // Format history for payload
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
        <div className="header-status">
          <div className={`ws-status-badge ${isConnected ? "connected" : "disconnected"}`}>
            <span className="ws-dot"></span>
            {isConnected ? "Live Connection" : "Connection Lost"}
          </div>
          <span style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
            FIFA World Cup 2026 Operations
          </span>
        </div>
      </header>

      {/* Main Grid Layout */}
      <main className="dashboard-grid">
        {/* Left Column: Interactive Map & Controls */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", minHeight: "0" }}>
          <div style={{ flex: 1.4, minHeight: "0" }}>
            <ZoneMap
              zones={zones}
              selectedZoneId={selectedZoneId}
              onSelectZone={setSelectedZoneId}
            />
          </div>
          <div style={{ flex: 0.6 }}>
            <DemoControls
              zones={zones}
              onTriggerSpike={handleTriggerSpike}
              onReset={handleReset}
              isActionLoading={isActionLoading}
            />
          </div>
        </div>

        {/* Middle Column: Recommendations & Directory Table */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", minHeight: "0" }}>
          <div style={{ flex: 1, minHeight: "0" }}>
            <RecommendationPanel
              recommendations={recommendations}
              engine={recsEngine}
              isLoading={isRecsLoading}
              onRefresh={fetchRecommendations}
            />
          </div>
          <div style={{ flex: 1, minHeight: "0" }}>
            <ZoneDetailTable
              zones={zones}
              selectedZoneId={selectedZoneId}
              onSelectZone={setSelectedZoneId}
            />
          </div>
        </div>

        {/* Right Column: Q&A Copilot Chat */}
        <div style={{ minHeight: "0" }}>
          <ChatPanel
            chatHistory={chatHistory}
            onSendMessage={handleSendMessage}
            isLoading={isChatLoading}
          />
        </div>
      </main>
    </div>
  );
}

export default App;
