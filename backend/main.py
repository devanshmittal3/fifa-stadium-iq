import asyncio
import json
import logging
from contextlib import asynccontextmanager
from typing import List
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from models import (
    ZoneState, RecommendationResponse, ChatRequest, ChatResponse,
    DispatchPreviewRequest, DispatchPreviewResponse
)
from simulation import StadiumSimulator
from reasoning import ReasoningEngine

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("stadiumiq.api")

# Initialize simulator and reasoning engine
simulator = StadiumSimulator()
reasoning_engine = ReasoningEngine()

# Keep track of active websocket connections
active_websockets = set()

async def run_simulation_loop():
    """Periodically ticks the simulator every 2 seconds and broadcasts updates to WebSockets."""
    while True:
        try:
            await asyncio.sleep(2.0)
            zones = simulator.tick()
            
            # Broadcast state to all connected clients
            if active_websockets:
                payload = json.dumps([z.model_dump() for z in zones])
                # Gather broadcast tasks
                await asyncio.gather(
                    *[ws.send_text(payload) for ws in active_websockets],
                    return_exceptions=True
                )
        except asyncio.CancelledError:
            logger.info("Simulation loop cancelled.")
            break
        except Exception as e:
            logger.error(f"Error in simulation loop: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Start the background simulation loop
    sim_task = asyncio.create_task(run_simulation_loop())
    logger.info("StadiumIQ background simulator task started.")
    yield
    # Shutdown: Cancel the simulation loop
    sim_task.cancel()
    try:
        await sim_task
    except asyncio.CancelledError:
        pass
    logger.info("StadiumIQ background simulator task stopped.")

app = FastAPI(
    title="StadiumIQ API",
    description="Control Room Copilot API for FIFA World Cup 2026 Stadium Operations",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For demo purposes, allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------- WebSocket Endpoint -----------------

@app.websocket("/ws/zones")
async def websocket_zones(websocket: WebSocket):
    """Establishes real-time connection to stream zone occupancy state changes."""
    await websocket.accept()
    active_websockets.add(websocket)
    
    # Send the current state immediately upon connection
    try:
        initial_state = [z.model_dump() for z in simulator.get_all_zones()]
        await websocket.send_text(json.dumps(initial_state))
        
        # Keep connection open and listen for close
        while True:
            # We don't expect messages from client, but we must receive to detect disconnect
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        active_websockets.remove(websocket)

# ----------------- REST Endpoints -----------------

@app.get("/api/zones", response_model=List[ZoneState])
async def get_zones():
    """Retrieves current occupancy and safety status for all stadium zones."""
    return simulator.get_all_zones()

@app.post("/api/recommend", response_model=RecommendationResponse)
async def get_recommendations():
    """Generates AI-driven safety recommendations for active watch/critical zones."""
    zones = simulator.get_all_zones()
    return reasoning_engine.generate_recommendations(zones)

@app.post("/api/chat", response_model=ChatResponse)
async def post_chat(request: ChatRequest):
    """Handles operator Q&A query, providing safety analysis and recommendations."""
    zones = simulator.get_all_zones()
    return reasoning_engine.generate_chat_reply(
        message=request.message,
        zones=zones,
        history=request.history
    )

@app.post("/api/dispatch/preview", response_model=DispatchPreviewResponse)
async def post_dispatch_preview(request: DispatchPreviewRequest):
    """Generates preview details for deploying crowd redirection."""
    zones = simulator.get_all_zones()
    preview_data = reasoning_engine.generate_dispatch_preview(
        zone_id=request.zone_id,
        action=request.action,
        alternative_routes=request.alternative_routes,
        match_id=request.match_id,
        zones=zones
    )
    return DispatchPreviewResponse(**preview_data)

from pydantic import BaseModel

class RedirectionRequest(BaseModel):
    zone_id: str
    alternative_routes: List[str]

@app.post("/api/demo/spike/{zone_id}")
async def trigger_spike(zone_id: str):
    """Triggers an artificial crowd ingress spike of 30% capacity in a specific zone."""
    success = simulator.trigger_spike(zone_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Zone {zone_id} not found")
    
    # Broadcast updated state immediately to all websockets
    if active_websockets:
        payload = json.dumps([z.model_dump() for z in simulator.get_all_zones()])
        await asyncio.gather(
            *[ws.send_text(payload) for ws in active_websockets],
            return_exceptions=True
        )
        
    return {"status": "spiked", "zone_id": zone_id, "zone": simulator.zones[zone_id].model_dump()}

@app.post("/api/demo/reset")
async def reset_simulation():
    """Resets simulator to original baseline configurations."""
    simulator.reset()
    
    # Broadcast updated state immediately to all websockets
    if active_websockets:
        payload = json.dumps([z.model_dump() for z in simulator.get_all_zones()])
        await asyncio.gather(
            *[ws.send_text(payload) for ws in active_websockets],
            return_exceptions=True
        )
        
    return {"status": "reset"}

@app.get("/api/simulation/state")
async def get_simulation_state():
    """Retrieves current simulation metadata."""
    return {
        "match_stage": simulator.match_stage,
        "demo_mode": simulator.demo_mode,
        "active_redirections": simulator.active_redirections
    }

@app.post("/api/simulation/stage/{stage_name}")
async def set_simulation_stage(stage_name: str):
    """Updates the current active stage of the FIFA match lifecycle."""
    simulator.set_stage(stage_name)
    
    # Broadcast updated state immediately to all websockets
    if active_websockets:
        payload = json.dumps([z.model_dump() for z in simulator.get_all_zones()])
        await asyncio.gather(
            *[ws.send_text(payload) for ws in active_websockets],
            return_exceptions=True
        )
        
    return {"status": "stage_updated", "stage": simulator.match_stage}

@app.post("/api/simulation/demo/{enabled}")
async def set_demo_mode(enabled: bool):
    """Toggles automatic stage progression demo loop."""
    simulator.set_demo_mode(enabled)
    return {"status": "demo_mode_updated", "enabled": simulator.demo_mode}

@app.post("/api/simulation/redirection/activate")
async def activate_redirection(req: RedirectionRequest):
    """Registers an active redirection route in the simulator to mitigate congestion."""
    simulator.activate_redirection(req.zone_id, req.alternative_routes)
    return {"status": "redirection_activated", "zone_id": req.zone_id, "alternative_routes": req.alternative_routes}

@app.post("/api/simulation/redirection/deactivate/{zone_id}")
async def deactivate_redirection(zone_id: str):
    """Deactivates a redirection route in the simulator."""
    simulator.deactivate_redirection(zone_id)
    return {"status": "redirection_deactivated", "zone_id": zone_id}
