import pytest
import logging
from models import ZoneState
from reasoning import ReasoningEngine

def test_fallback_engine_tag_and_logging(caplog):
    """
    Asserts that fallback responses are tagged with a distinct 'engine' field
    set to 'Local Fallback' and that warning logs are recorded when falling back.
    """
    # Create the engine in an environment where API keys are mocked to be empty
    engine = ReasoningEngine()
    engine.anthropic_key = None
    engine.gemini_key = None
    
    # Define some dummy zones, including one in watch state
    zones = [
        ZoneState(
            id="gate_c",
            name="Gate C (Ingress)",
            current_occupancy=1600,
            capacity=1800,
            occupancy_pct=88.9,
            history=[1600],
            trend_per_min=0.0,
            predicted_pct_in_5min=88.9,
            status="watch",
            breach_countdown_min=None
        ),
        ZoneState(
            id="gate_b",
            name="Gate B (Ingress)",
            current_occupancy=1000,
            capacity=2500,
            occupancy_pct=40.0,
            history=[1000],
            trend_per_min=0.0,
            predicted_pct_in_5min=40.0,
            status="normal",
            breach_countdown_min=None
        )
    ]
    
    # 1. Test recommendations fallback with log capture
    with caplog.at_level(logging.WARNING):
        response = engine.generate_recommendations(zones)
        
    assert response.engine == "Local Fallback"
    assert len(response.recommendations) > 0
    assert response.recommendations[0].zone_id == "gate_c"
    
    # Check that warning logs captured the fallback reason
    assert any("FALLBACK TRIGGERED" in record.message for record in caplog.records)
    assert any("No API keys configured" in record.message for record in caplog.records)
    
    # Clear log capture for next test
    caplog.clear()
    
    # 2. Test chat fallback with log capture
    with caplog.at_level(logging.WARNING):
        chat_response = engine.generate_chat_reply("What is the status of Gate C?", zones)
        
    assert chat_response.engine == "Local Fallback"
    assert "Gate C is in WATCH status" in chat_response.reply
    
    # Check that warning logs captured the fallback reason
    assert any("FALLBACK TRIGGERED" in record.message for record in caplog.records)
