from typing import List, Optional, Tuple

def update_zone_predictions(
    history: List[int],
    current_occupancy: int,
    capacity: int,
    step_interval_sec: float = 2.0
) -> Tuple[List[int], float, float, str, Optional[float]]:
    """
    Updates the rolling window of occupancy history and calculates predictions.
    
    Returns:
        updated_history: List[int]
        trend_per_min: float
        predicted_pct_in_5min: float
        status: str ("normal", "watch", "critical")
        breach_countdown_min: Optional[float]
    """
    # 1. Update history (rolling window of max 5 elements)
    updated_history = list(history)
    updated_history.append(current_occupancy)
    if len(updated_history) > 5:
        updated_history.pop(0)
        
    # 2. Calculate current occupancy percentage
    capacity = max(1, capacity)  # Avoid division by zero
    current_pct = (current_occupancy / capacity) * 100.0
    
    # 3. Calculate trend per minute
    # readings are every step_interval_sec (default 2 seconds)
    # 1 min = 60 seconds = (60 / step_interval_sec) steps
    steps_per_minute = 60.0 / step_interval_sec
    
    trend_per_min = 0.0
    if len(updated_history) > 1:
        # Calculate percentage occupancy for historical data
        pct_history = [(h / capacity) * 100.0 for h in updated_history]
        
        # Calculate average step difference
        # Use slope between first and last element of the window for stability
        total_steps = len(pct_history) - 1
        pct_diff = pct_history[-1] - pct_history[0]
        change_per_step = pct_diff / total_steps
        trend_per_min = change_per_step * steps_per_minute

    # 4. Predict occupancy in 5 minutes
    predicted_pct_in_5min = current_pct + (trend_per_min * 5.0)
    predicted_pct_in_5min = max(0.0, predicted_pct_in_5min)  # Can't go below 0%
    
    # 5. Determine breach countdown in minutes
    if current_pct >= 100.0:
        breach_countdown_min = 0.0
    elif trend_per_min > 0.0:
        breach_countdown_min = (100.0 - current_pct) / trend_per_min
        breach_countdown_min = max(0.0, breach_countdown_min)
    else:
        breach_countdown_min = None
        
    # 6. Safety status determination
    # - critical: >= 90%
    # - watch: >= 75% or high positive trend (>= 2% increase per min)
    # - normal: otherwise
    if current_pct >= 90.0:
        status = "critical"
    elif current_pct >= 75.0 or trend_per_min >= 2.0:
        status = "watch"
    else:
        status = "normal"
        
    return updated_history, trend_per_min, predicted_pct_in_5min, status, breach_countdown_min
