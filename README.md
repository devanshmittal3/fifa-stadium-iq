# StadiumIQ: FIFA World Cup 2026 Control Room Copilot

StadiumIQ is an AI-powered Control Room Copilot built to manage spectator flow and prevent crowd crush incidents during the FIFA World Cup 2026. 

By combining a **deterministic prediction engine** with **Generative AI reasoning (Anthropic/Gemini)** and a **real-time React dashboard**, StadiumIQ enables stadium commanders to visualize crowd flow, anticipate bottleneck breaches, and execute safety diversion tactics before accidents occur.

---

## 🌟 Core Features & Approach

1. **Deterministic Risk Classifications:** Occupancy status is calculated mathematically using sliding windows, predicting crowd density 5 minutes ahead.
2. **Dual-SDK LLM Integration:** Uses the official `anthropic` and `google-generativeai` SDKs with intelligent routing:
   - **Primary Engine:** Claude (`claude-sonnet-4-6`)
   - **Secondary Engine:** Gemini (`gemini-2.5-flash`)
3. **Explicit Local Fallback (High-Availability):** If no API keys are configured, or if API limits/outages occur, the copilot falls back to a local, rules-based engine.
4. **Fallback Visibility & Transparency:** The UI features a permanent **Engine Status Badge** on both the Recommendation and Chat panels. The backend logs fallback activation details.
5. **Real-time Synchronization:** WebSocket connection streams stadium zone state updates every 2 seconds.
6. **Accessible & Premium UI:** Clean dark-mode glassmorphic interface built using responsive SVG lines and fully compatible with screen readers (using dynamic `aria-live` regions and descriptive status announcements).

---

## 🏗️ System Architecture

Refer to [docs/architecture.md](docs/architecture.md) for the detailed 4-layer system diagram and data flow specifications.

---

## ⚙️ Installation & Setup

### Prerequisites
- Python 3.10+
- Node.js 18+

### 1. Clone & Configure Workspace
Navigate to the root directory `stadiumiq/` and set up environment variables.

Copy the environment example file:
```bash
cp backend/.env.example backend/.env
```
Open `backend/.env` and insert your API keys:
```env
ANTHROPIC_API_KEY=your-anthropic-api-key-here
GEMINI_API_KEY=your-gemini-api-key-here
```
> [!NOTE]
> If both keys are absent, the application will run in **Local Fallback** mode. If `ANTHROPIC_API_KEY` is present, the primary engine (Claude) is preferred.

### 2. Backend Setup
Set up the Python virtual environment and install the required dependencies:
```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 3. Frontend Setup
Install npm packages for the React application:
```bash
cd ../frontend
npm install
```

---

## 🚀 Running the Application

To run the application, start both the backend server and frontend development server.

### Start Backend Server (Port 8000)
From the `backend` directory (with virtual environment activated):
```bash
uvicorn main:app --host 127.0.0.1 --port 8000
```

### Start Frontend Server (Port 5173)
From the `frontend` directory:
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🧪 Running Unit & Integration Tests

A comprehensive suite of tests validates the prediction logic, fallback capabilities, engine tags, and API routes.

From the `stadiumiq` root directory, execute:
```powershell
$env:PYTHONPATH="backend"; backend/.venv/Scripts/python -m pytest
```

---

## 📖 Evaluation & Demo Script

Follow this step-by-step walkthrough to evaluate the system in real time.

### Step 1: Baseline Monitoring
1. Start both servers and open [http://localhost:5173](http://localhost:5173).
2. You will see the **Zone Network Map** with all 9 zones displaying Green/NORMAL status.
3. The **Zone Detail Table** displays live occupancies updating every 2 seconds via WebSockets.
4. The **AI Recommendations** panel displays "No active safety alerts. All zones normal." with a status badge reading `Engine: Claude`, `Engine: Gemini`, or `Engine: Local Fallback` depending on your `.env` configuration.

### Step 2: Triggering a Safety Incident (Spike)
1. In the **Demo Controls** panel (bottom-left), click **Trigger Gate C Spike**.
2. This simulates an influx of spectators arriving at Gate C (+25% occupancy increase).
3. In the **Zone Network Map**, notice **Gate C (Ingress)** immediately turns amber (**WATCH** status).
4. Notice the **AI Recommendations** panel automatically queries the copilot, displaying a card with:
   - **Action:** A recommendation to deploy marshals or redirect traffic.
   - **Reasoning:** Analytical justification referencing the occupancy percentage.
   - **Breach Countdown:** An estimated countdown until the zone breaches capacity.
   - **Alternative Routes:** Alternate navigation pathways (e.g., Gate B).
5. Look at the **Engine Badge** on the recommendation card to verify which engine generated the plan.

### Step 3: Escalate to Critical Status
1. Click **Trigger Gate C Spike** once more.
2. Gate C occupancy increases further, crossing the 90% threshold, and the node turns red (**CRITICAL** status).
3. The **AI Recommendations** panel refreshes, warning of an immediate crowd crush risk and issuing instructions to stop ingress at Gate C and divert spectators immediately.

### Step 4: Interactive Chat Copilot
1. In the **Chat Copilot** panel (right-hand side), type:
   *`"Why is Gate C under WATCH/CRITICAL status?"`*
2. Press **Send**.
3. The Copilot replies with a concise, safety-first summary of Gate C's occupancy metrics and the trend.
4. Verify that the reply card displays the correct **Engine Badge** corresponding to the active AI engine.

### Step 5: Resetting the Simulation
1. In the **Demo Controls** panel, click **Reset Simulation**.
2. The entire stadium layout returns to its green baseline state, and all logs/notifications reset.

---

## 📝 Design Assumptions
- **Ingress Rate:** Natural crowd ingress drift is simulated with a positive bias (averaging +0.3% of capacity per tick) to represent spectators entering the stadium before kickoff.
- **Tick Interval:** State updates are computed and pushed over WebSockets every 2.0 seconds.
- **Breach Calculation:** If trend is positive, the countdown is calculated linearly: `(capacity - current_occupancy) / (trend_per_sec * 60)`.
