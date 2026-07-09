import React, { useState, useEffect } from "react";

export function AccessibilityControlCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [highContrast, setHighContrast] = useState(() => localStorage.getItem("access-highcontrast") === "true");
  const [largeText, setLargeText] = useState(() => localStorage.getItem("access-largetext") === "true");
  const [colorBlind, setColorBlind] = useState(() => localStorage.getItem("access-colorblind") === "true");

  useEffect(() => {
    localStorage.setItem("access-highcontrast", highContrast);
    if (highContrast) {
      document.documentElement.classList.add("high-contrast");
    } else {
      document.documentElement.classList.remove("high-contrast");
    }
  }, [highContrast]);

  useEffect(() => {
    localStorage.setItem("access-largetext", largeText);
    if (largeText) {
      document.documentElement.classList.add("large-text");
    } else {
      document.documentElement.classList.remove("large-text");
    }
  }, [largeText]);

  useEffect(() => {
    localStorage.setItem("access-colorblind", colorBlind);
    if (colorBlind) {
      document.documentElement.classList.add("color-blind-friendly");
    } else {
      document.documentElement.classList.remove("color-blind-friendly");
    }
  }, [colorBlind]);

  return (
    <>
      <style>{`
        /* High Contrast Theme overrides */
        html.high-contrast {
          --color-bg-main: #000000 !important;
          --color-bg-panel: #111111 !important;
          --border-light: rgba(255, 255, 255, 0.4) !important;
          --color-text-primary: #ffffff !important;
          --color-text-secondary: #eeeeee !important;
          --color-text-muted: #cccccc !important;
        }
        html.high-contrast .glass-panel {
          background: #111111 !important;
          border: 2px solid #ffffff !important;
          box-shadow: none !important;
        }
        html.high-contrast button {
          border: 1px solid #ffffff !important;
          background: #222222 !important;
          color: #ffffff !important;
        }
        
        /* Large Font Theme overrides */
        html.large-text {
          font-size: 18px !important;
        }
        html.large-text h1 { font-size: 1.8rem !important; }
        html.large-text h2 { font-size: 1.3rem !important; }
        html.large-text .detail-table th, 
        html.large-text .detail-table td {
          font-size: 0.92rem !important;
        }
        html.large-text p, html.large-text span, html.large-text button {
          font-size: 0.9rem !important;
        }

        /* Color Blind Friendly Filters */
        html.color-blind-friendly {
          filter: saturate(1.5) contrast(1.1);
        }
        html.color-blind-friendly .node-glow.critical {
          fill: #ff00ff !important;
          stroke: #ff00ff !important;
          box-shadow: 0 0 16px #ff00ff !important;
        }
        html.color-blind-friendly .node-glow.watch {
          fill: #00ffff !important;
          stroke: #00ffff !important;
          box-shadow: 0 0 16px #00ffff !important;
        }
      `}</style>

      {/* Floating Widget Button */}
      <div 
        className="accessibility-widget" 
        style={{
          position: "fixed",
          bottom: "16px",
          right: "16px",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: "8px"
        }}
      >
        {isOpen && (
          <div 
            style={{
              background: "rgba(20, 20, 25, 0.95)",
              border: "1px solid var(--border-light)",
              borderRadius: "8px",
              padding: "12px",
              boxShadow: "0 10px 25px rgba(0, 0, 0, 0.5)",
              width: "220px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              backdropFilter: "blur(10px)"
            }}
            role="dialog"
            aria-label="Accessibility Settings"
          >
            <div style={{ fontSize: "0.8rem", fontWeight: "700", color: "#fff", borderBottom: "1px solid var(--border-light)", paddingBottom: "6px" }}>
              ♿ Accessibility Control Center
            </div>
            
            {/* Toggles */}
            <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.75rem", color: "#ccc", cursor: "pointer" }}>
              <span>High Contrast Theme</span>
              <input 
                type="checkbox" 
                checked={highContrast} 
                onChange={(e) => setHighContrast(e.target.checked)} 
                aria-label="Toggle High Contrast Theme"
              />
            </label>

            <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.75rem", color: "#ccc", cursor: "pointer" }}>
              <span>Large Sized Fonts</span>
              <input 
                type="checkbox" 
                checked={largeText} 
                onChange={(e) => setLargeText(e.target.checked)} 
                aria-label="Toggle Large Sized Fonts"
              />
            </label>

            <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.75rem", color: "#ccc", cursor: "pointer" }}>
              <span>Color-Blind Mode</span>
              <input 
                type="checkbox" 
                checked={colorBlind} 
                onChange={(e) => setColorBlind(e.target.checked)} 
                aria-label="Toggle Color Blind Mode"
              />
            </label>

            <div style={{ fontSize: "0.62rem", color: "var(--color-text-muted)", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "6px" }}>
              Keyboard navigation: Use <strong>Tab</strong> to navigate between all interactive buttons.
            </div>
          </div>
        )}

        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{
            width: "42px",
            height: "42px",
            borderRadius: "50%",
            background: "var(--color-primary-light)",
            border: "1px solid var(--color-primary)",
            color: "white",
            fontSize: "1.2rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 15px rgba(0, 176, 255, 0.3)",
            transition: "all 0.2s"
          }}
          aria-expanded={isOpen}
          aria-label="Accessibility settings panel"
        >
          ♿
        </button>
      </div>
    </>
  );
}
