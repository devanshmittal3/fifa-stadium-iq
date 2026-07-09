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
    response = client.post("/api/recommend")
    assert response.status_code == 200
    data = response.json()
    assert "recommendations" in data
    assert "engine" in data
    assert data["engine"] == "Local Fallback"  # since API keys are absent in tests

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
