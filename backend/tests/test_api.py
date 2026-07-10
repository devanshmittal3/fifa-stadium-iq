import os
# Mock API keys to ensure tests always run against the Local Fallback engine
os.environ["ANTHROPIC_API_KEY"] = ""
os.environ["GEMINI_API_KEY"] = ""

import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_get_zones():
    response = client.get("/api/zones")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 9
    assert data[0]["id"] == "gate_a"
    assert "occupancy_pct" in data[0]

def test_recommendation_endpoint():
    # First, spike Gate C so a recommendation is generated
    client.post("/api/demo/spike/gate_c")
    response = client.post("/api/recommend")
    assert response.status_code == 200
    data = response.json()
    assert "recommendations" in data
    assert "engine" in data
    assert data["engine"] == "Local Fallback"
    
    if len(data["recommendations"]) > 0:
        rec = data["recommendations"][0]
        assert "capacity" in rec
        assert "current_occupancy" in rec
        assert "predicted_pct_in_5min" in rec
        assert "congestion_growth_pct" in rec
        assert "expected_reduction_pct" in rec
        assert "confidence_score" in rec
        assert "confidence_rating" in rec
        assert "reasoning" in rec
        assert rec["confidence_score"] > 0
        assert len(rec["confidence_rating"]) > 0

def test_chat_endpoint():
    response = client.post("/api/chat", json={"message": "What is the status of Gate C?"})
    assert response.status_code == 200
    data = response.json()
    assert "reply" in data
    assert "engine" in data
    assert data["engine"] == "Local Fallback"

def test_demo_endpoints():
    # 1. Trigger Spike on Gate C
    response = client.post("/api/demo/spike/gate_c")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "spiked"
    assert data["zone_id"] == "gate_c"
    
    # Check that Gate C is now watch/critical
    zone_state = data["zone"]
    assert zone_state["status"] in ["watch", "critical"]
    
    # 2. Reset simulator
    reset_response = client.post("/api/demo/reset")
    assert reset_response.status_code == 200
    assert reset_response.json()["status"] == "reset"
    
    # Check that Gate C is back to normal occupancy
    get_response = client.get("/api/zones")
    zones = get_response.json()
    gate_c = next(z for z in zones if z["id"] == "gate_c")
    assert gate_c["current_occupancy"] == 600
    assert gate_c["status"] == "normal"

def test_websocket_stream():
    # Test that connecting to WS receives the initial state
    with client.websocket_connect("/ws/zones") as websocket:
        data = websocket.receive_json()
        assert len(data) == 9
        assert data[0]["id"] == "gate_a"

def test_dispatch_preview_endpoint():
    payload = {
        "zone_id": "gate_c",
        "alternative_routes": ["gate_b"],
        "match_id": "argentina_saudi",
        "action": "IMMEDIATE DIVERSION: Restrict ingress at Gate C."
    }
    response = client.post("/api/dispatch/preview", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "briefing" in data
    assert "impact" in data
    assert "languages" in data
    assert "announcements" in data
    assert "engine" in data
    
    assert "Spanish" in data["languages"]
    assert "Arabic" in data["languages"]
    assert "English" in data["languages"]
    
    assert data["impact"]["reduction_pct"] > 0
    assert "diverted_flow_rate_per_min" in data["impact"]
    assert data["impact"]["diverted_flow_rate_per_min"] > 0
    assert len(data["announcements"]["Spanish"]) > 0

def test_simulation_state():
    response = client.get("/api/simulation/state")
    assert response.status_code == 200
    data = response.json()
    assert "match_stage" in data
    assert "demo_mode" in data
    assert "active_redirections" in data

def test_set_simulation_stage():
    response = client.post("/api/simulation/stage/kickoff")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "stage_updated"
    assert data["stage"] == "kickoff"

def test_set_demo_mode():
    response = client.post("/api/simulation/demo/true")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "demo_mode_updated"
    assert data["enabled"] is True
    
    # revert
    client.post("/api/simulation/demo/false")

def test_redirection_endpoints():
    payload = {
        "zone_id": "gate_c",
        "alternative_routes": ["gate_b"]
    }
    response = client.post("/api/simulation/redirection/activate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "redirection_activated"
    assert data["zone_id"] == "gate_c"
    
    # check state
    state_response = client.get("/api/simulation/state")
    assert "gate_c" in state_response.json()["active_redirections"]
    
    deact_response = client.post("/api/simulation/redirection/deactivate/gate_c")
    assert deact_response.status_code == 200
    assert deact_response.json()["status"] == "redirection_deactivated"
