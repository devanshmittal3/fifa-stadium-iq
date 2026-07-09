# StadiumIQ System Architecture

StadiumIQ is a GenAI-powered Control Room Copilot designed for FIFA World Cup 2026 stadium operations. It provides real-time crowd dynamics tracking, predictive analytics, and automated decision-support recommendations using advanced language models (LLMs) with high-availability local fallbacks.

This document details the 4-layer system design, communication protocols, and safety integration strategies.

---

## System Overview

```mermaid
graph TD
    %% Presentation Layer
    subgraph Presentation ["Presentation Layer (Vite + React)"]
        UI[App Dashboard]
        Map[Interactive SVG Zone Map]
        RecPanel[AI Recommendation Panel]
        Chat[Operator Q&A Chat Panel]
        Controls[Demo Controls]
    end

    %% API Gateway / Controllers
    subgraph API ["FastAPI Gateways"]
        WS[/ws/zones WebSocket]
        API_Rec[/api/recommend POST]
        API_Chat[/api/chat POST]
        API_Demo[/api/demo/* POST]
    end

    %% Logic Layers
    subgraph Simulation ["Simulation & Prediction Layers"]
        Sim[StadiumSimulator]
        Pred[update_zone_predictions]
    end

    %% Reasoning Layer
    subgraph Reasoning ["Reasoning Layer (LLM Router)"]
        RE[ReasoningEngine]
        Claude[claude-sonnet-4-6]
        Gemini[gemini-2.5-flash]
        Fallback[Local Rule-Based Fallback]
    end

    %% Connections
    UI --> WS
    UI --> API_Rec
    UI --> API_Chat
    UI --> API_Demo
    
    WS --> Sim
    API_Rec --> RE
    API_Chat --> RE
    API_Demo --> Sim

    Sim --> Pred
    RE --> Claude
    RE --> Gemini
    RE --> Fallback
```

---

## Layer-by-Layer Breakdown

### 1. Simulation Layer (`simulation.py`)
- **Purpose:** Emulates real-time crowd occupancy drift across 9 critical stadium zones (Gates, Concourses, Seating Entrance areas, Stairwells).
- **Functionality:** 
  - Tracks live current occupancy, capacity, status, and occupancy history.
  - Ticks every 2 seconds to apply natural spectator ingress (random walk with positive ingress drift).
  - Exposes control hooks to manually inject immediate spectator surges (+25% occupancy spikes) and reset the stadium to a baseline state.

### 2. Prediction Layer (`prediction.py`)
- **Purpose:** Performs deterministic trend analysis and predicts crowd-crush risks.
- **Functionality:**
  - Maintains a sliding rolling window of the last 5 occupancy readings per zone.
  - Calculates `trend_per_min` (slope of occupancy change over time).
  - Predicts occupancy percentage 5 minutes into the future (`predicted_pct_in_5min`).
  - Classifies safety status:
    - **CRITICAL (Red):** Current occupancy $\ge$ 90%.
    - **WATCH (Amber):** Current occupancy $\ge$ 75% OR current occupancy $\ge$ 65% with a high positive trend ($\ge$ 1.5%/min).
    - **NORMAL (Green):** Safe parameters.
  - Computes `breach_countdown_min` (minutes remaining until the zone reaches 100% capacity if current trend continues).

### 3. Reasoning Layer (`reasoning.py`)
- **Purpose:** Interprets crowd safety anomalies and generates actionable crowd-diversion tactics.
- **Dual-SDK Routing & Priority:**
  1. **Anthropic Claude (Primary):** Utilizes `claude-sonnet-4-6`. Enabled if `ANTHROPIC_API_KEY` is present.
  2. **Google Gemini (Secondary):** Utilizes `gemini-2.5-flash`. Enabled if `ANTHROPIC_API_KEY` is absent but `GEMINI_API_KEY` is present.
  3. **Local Fallback:** Executed if neither API key is available or if remote API calls fail/timeout.
- **Robustness & Transparency:**
  - Explicitly tags the output payload with the active engine name (`Claude`, `Gemini`, or `Local Fallback`).
  - Generates detailed warning logs on fallback activation to ensure transparency for operators and system audits.

### 4. Presentation Layer (Vite + React Web App)
- **Purpose:** A high-contrast, premium, accessibility-compliant dark-theme control room dashboard.
- **Components:**
  - **Zone Map (`ZoneMap.jsx`):** SVG flow-network visualization displaying zones as interactive nodes. Nodes are color-coded dynamically (Green/Amber/Red) with explicit textual accessibility badges (e.g., `[CRITICAL]`) for screen readers.
  - **AI Recommendation Panel (`RecommendationPanel.jsx`):** Renders targeted crowd diversion instructions and breach countdown timers. Shows a persistent engine origin badge.
  - **Chat Panel (`ChatPanel.jsx`):** Enables conversational Q&A with the Copilot. Uses `aria-live="polite"` to read incoming assistant responses to screen readers. Displays a persistent engine badge next to every reply.
  - **Demo Controls (`DemoControls.jsx`):** Provides instant spike injection triggers to test the reactive prediction and reasoning systems.

---

## Data Flow & Integration

### Real-Time Telemetry
1. The backend simulator runs a continuous background task ticking every 2 seconds.
2. Ticks trigger prediction recalculations for all 9 zones.
3. Updated state arrays are serialized and broadcasted over a persistent WebSocket connection (`/ws/zones`) to all connected frontend clients.

### Decision Support Request
1. When a zone transitions into `WATCH` or `CRITICAL` status, the frontend requests new recommendations.
2. The FastAPI server queries the `ReasoningEngine`.
3. The engine parses current zone states, routes them to the priority model, constructs the JSON response containing actions and routing alternatives, and tags the engine source.
4. The client updates the Recommendation UI pane instantly.
