import pytest
from prediction import update_zone_predictions

def test_rolling_window_limit():
    history = [10, 20, 30, 40, 50]
    updated_hist, _, _, _, _ = update_zone_predictions(history, 60, 100)
    assert len(updated_hist) == 5
    assert updated_hist == [20, 30, 40, 50, 60]

def test_trend_calculation():
    # Occupancy starts at 50, goes to 60 over 2 steps (4 seconds total, 2s per step)
    # 50% capacity 100 -> 50%
    # 60% capacity 100 -> 60%
    # change = 10% / 1 step = 10% per step.
    # trend per min = 10 * 30 = 300% per min
    history = [50]
    updated_hist, trend, pred_5m, status, breach = update_zone_predictions(history, 60, 100)
    assert trend == 300.0
    assert pred_5m == 60 + (300.0 * 5)
    assert status == "watch"  # trend >= 2.0
    # breach countdown: (100 - 60) / 300 = 40/300 = 0.1333 min
    assert breach is not None
    assert abs(breach - 0.1333) < 0.01

def test_status_determination():
    # Normal status
    _, _, _, status_normal, _ = update_zone_predictions([], 50, 100)
    assert status_normal == "normal"
    
    # Watch status due to occupancy >= 75%
    _, _, _, status_watch1, _ = update_zone_predictions([], 80, 100)
    assert status_watch1 == "watch"
    
    # Watch status due to trend >= 2.0% per min
    # step increase: from 50 to 51 -> 1% change per step -> 30% per min
    _, _, _, status_watch2, _ = update_zone_predictions([50], 51, 100)
    assert status_watch2 == "watch"
    
    # Critical status due to occupancy >= 90%
    _, _, _, status_critical, _ = update_zone_predictions([], 92, 100)
    assert status_critical == "critical"
