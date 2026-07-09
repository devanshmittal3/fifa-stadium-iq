import random
from typing import Dict, List
from models import ZoneState
from prediction import update_zone_predictions

# Initial static configurations for the 9 stadium zones
INITIAL_ZONES = [
    {"id": "gate_a", "name": "Gate A (Ingress)", "capacity": 2000, "initial_occupancy": 800},
    {"id": "gate_b", "name": "Gate B (Ingress)", "capacity": 2500, "initial_occupancy": 900},
    {"id": "gate_c", "name": "Gate C (Ingress)", "capacity": 1800, "initial_occupancy": 600},
    {"id": "concourse_north", "name": "Concourse North", "capacity": 5000, "initial_occupancy": 2000},
    {"id": "concourse_south", "name": "Concourse South", "capacity": 4500, "initial_occupancy": 1800},
    {"id": "seating_east", "name": "East Seating Entry", "capacity": 8000, "initial_occupancy": 3500},
    {"id": "seating_west", "name": "West Seating Entry", "capacity": 7500, "initial_occupancy": 3000},
    {"id": "stairwell_north", "name": "Stairwell North", "capacity": 1000, "initial_occupancy": 400},
    {"id": "stairwell_south", "name": "Stairwell South", "capacity": 1200, "initial_occupancy": 500},
]

class StadiumSimulator:
    def __init__(self):
        self.zones: Dict[str, ZoneState] = {}
        self.reset()

    def reset(self):
        """Resets the simulator state to the default starting conditions."""
        self.zones = {}
        for config in INITIAL_ZONES:
            zone_id = config["id"]
            capacity = config["capacity"]
            init_occ = config["initial_occupancy"]
            occ_pct = (init_occ / capacity) * 100.0
            
            # Initialize ZoneState Pydantic model
            self.zones[zone_id] = ZoneState(
                id=zone_id,
                name=config["name"],
                current_occupancy=init_occ,
                capacity=capacity,
                occupancy_pct=round(occ_pct, 1),
                history=[init_occ],
                trend_per_min=0.0,
                predicted_pct_in_5min=round(occ_pct, 1),
                status="normal",
                breach_countdown_min=None
            )

    def tick(self) -> List[ZoneState]:
        """
        Advances the simulation by 1 step (2 seconds).
        Simulates natural crowd ingress drift.
        """
        for zone_id, zone in self.zones.items():
            # Calculate drift: small random variation with a slight positive bias (crowd ingress)
            # Drift between -0.2% and +0.8% of capacity
            drift_pct = random.uniform(-0.002, 0.008)
            drift_people = int(zone.capacity * drift_pct)
            
            # Apply drift, clamp between 0 and 1.5x capacity (to simulate extreme overcrowding)
            new_occupancy = zone.current_occupancy + drift_people
            new_occupancy = max(0, min(new_occupancy, int(zone.capacity * 1.5)))
            
            # Recalculate predictions
            updated_hist, trend, pred_5m, status, breach = update_zone_predictions(
                history=zone.history,
                current_occupancy=new_occupancy,
                capacity=zone.capacity,
                step_interval_sec=2.0
            )
            
            # Update zone in place
            zone.current_occupancy = new_occupancy
            zone.occupancy_pct = round((new_occupancy / zone.capacity) * 100.0, 1)
            zone.history = updated_hist
            zone.trend_per_min = round(trend, 2)
            zone.predicted_pct_in_5min = round(pred_5m, 1)
            zone.status = status
            zone.breach_countdown_min = round(breach, 1) if breach is not None else None
            
        return list(self.zones.values())

    def trigger_spike(self, zone_id: str) -> bool:
        """
        Triggers an immediate occupancy spike (adds 25% of capacity) to a specific zone.
        """
        if zone_id not in self.zones:
            return False
            
        zone = self.zones[zone_id]
        spike_amount = int(zone.capacity * 0.25)
        new_occupancy = zone.current_occupancy + spike_amount
        new_occupancy = min(new_occupancy, int(zone.capacity * 1.5))
        
        # Calculate new status immediately with updated history
        updated_hist, trend, pred_5m, status, breach = update_zone_predictions(
            history=zone.history,
            current_occupancy=new_occupancy,
            capacity=zone.capacity,
            step_interval_sec=2.0
        )
        
        zone.current_occupancy = new_occupancy
        zone.occupancy_pct = round((new_occupancy / zone.capacity) * 100.0, 1)
        zone.history = updated_hist
        zone.trend_per_min = round(trend, 2)
        zone.predicted_pct_in_5min = round(pred_5m, 1)
        zone.status = status
        zone.breach_countdown_min = round(breach, 1) if breach is not None else None
        
        return True

    def get_all_zones(self) -> List[ZoneState]:
        return list(self.zones.values())
