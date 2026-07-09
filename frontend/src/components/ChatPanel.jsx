import React, { useState, useEffect, useRef } from "react";

export function ChatPanel({ chatHistory, onSendMessage, isLoading }) {
  const [input, setInput] = useState("");
  const [srAnnouncement, setSrAnnouncement] = useState("");
  const historyEndRef = useRef(null);

  // Auto-scroll to the bottom of the chat list
  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: "smooth" });
    
    // Announce the last copilot message to screen readers if it was just added
    if (chatHistory.length > 0) {
      const lastMsg = chatHistory[chatHistory.length - 1];
      if (lastMsg.sender === "copilot") {
        setSrAnnouncement(`Copilot response: ${lastMsg.text} (Engine used: ${lastMsg.engine || "Unknown"})`);
      }
    }
  }, [chatHistory]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    onSendMessage(input.trim());
    setInput("");
  };

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
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          Control Room Copilot
        </h2>
      </div>

      <div className="panel-content">
        <div className="chat-container">
          
          {/* Accessible announcement node for screen readers */}
          <div 
            className="sr-only" 
            aria-live="polite" 
            style={{ 
              position: "absolute", 
              width: "1px", 
              height: "1px", 
              padding: "0", 
              margin: "-1px", 
              overflow: "hidden", 
              clip: "rect(0, 0, 0, 0)", 
              border: "0" 
            }}
          >
            {srAnnouncement}
          </div>

          {/* Message List */}
          <div className="chat-history">
            {chatHistory.length === 0 ? (
              <div 
                style={{ 
                  color: "var(--color-text-muted)", 
                  fontSize: "0.85rem", 
                  textAlign: "center", 
                  padding: "40px 10px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  alignItems: "center"
                }}
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.4 }}>
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <span>Ask the GenAI Copilot for redirection routing advices, zone safety details, or mitigation plans.</span>
              </div>
            ) : (
              chatHistory.map((msg, index) => (
                <div 
                  key={index} 
                  className={`chat-message ${msg.sender}`}
                >
                  <div>{msg.text}</div>
                  
                  <div className="chat-meta">
                    <span className="chat-sender">
                      {msg.sender === "operator" ? "Operator" : "Copilot"}
                    </span>
                    {msg.sender === "copilot" && msg.engine && (
                      <span className={`engine-badge ${getEngineBadgeClass(msg.engine)}`} style={{ fontSize: "0.65rem", padding: "1px 4px" }}>
                        {msg.engine}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
            
            {isLoading && (
              <div className="chat-message copilot" style={{ opacity: 0.7 }}>
                <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                  <span style={{ animation: "pulse-glow-green 1s infinite", width: "6px", height: "6px", backgroundColor: "var(--color-success)", borderRadius: "50%" }}></span>
                  <span>Copilot is formulating safety plan...</span>
                </div>
              </div>
            )}
            
            <div ref={historyEndRef} />
          </div>

          {/* Message Input Form */}
          <form onSubmit={handleSubmit} className="chat-input-form">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask copilot about crowd mitigation..."
              className="chat-input"
              disabled={isLoading}
              aria-label="Ask copilot message"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="chat-submit-btn"
              aria-label="Send message"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
