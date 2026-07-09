import random
from typing import Dict, List, Optional
from models import ZoneState
from prediction import update_zone_predictions

# Initial static configurations for the 9 stadium zones
INITIAL_ZONES = [
    {"id": "gate_a", "name": "Gate A (Ingress)", "capacity": 2000, "initial_occupancy": 500},
    {"id": "gate_b", "name": "Gate B (Ingress)", "capacity": 2500, "initial_occupancy": 600},
    {"id": "gate_c", "name": "Gate C (Ingress)", "capacity": 2000, "initial_occupancy": 600},
    {"id": "concourse_north", "name": "Concourse North", "capacity": 5000, "initial_occupancy": 1200},
    {"id": "concourse_south", "name": "Concourse South", "capacity": 4500, "initial_occupancy": 1100},
    {"id": "seating_east", "name": "East Seating Entry", "capacity": 8000, "initial_occupancy": 2000},
    {"id": "seating_west", "name": "West Seating Entry", "capacity": 7500, "initial_occupancy": 1800},
    {"id": "stairwell_north", "name": "Stairwell North", "capacity": 1000, "initial_occupancy": 300},
    {"id": "stairwell_south", "name": "Stairwell South", "capacity": 1200, "initial_occupancy": 350},
]

MATCH_STAGES = [
    {"stage": "pre_match", "label": "Pre-Match Prep", "desc": "Stadium preparing. Staff in position. Low activity."},
    {"stage": "gate_opening", "label": "Gates Open", "desc": "Gates A, B, and C open. Spectators begin filtering in."},
    {"stage": "crowd_arrival", "label": "Crowd Arrival", "desc": "Inflow increases. Outer gates and concourses filling up."},
    {"stage": "peak_entry", "label": "Peak Entry Surge", "desc": "Massive entry flow right before kickoff. High gate density."},
    {"stage": "kickoff", "label": "Kickoff", "desc": "Match begins. Gates clear as spectators move into seating."},
    {"stage": "halftime", "label": "Halftime Break", "desc": "Spectators flood concourses for food and facilities."},
    {"stage": "exit_rush", "label": "Full-Time Exit Rush", "desc": "Match ends. High egress volume towards exits."},
    {"stage": "transport_congestion", "label": "Transport Delay", "desc": "Train delay near Gate C causes egress queue backup."},
    {"stage": "incident_resolution", "label": "Incident Resolution", "desc": "Diverted pathways and backup shuttles clear congestion."},
    {"stage": "match_complete", "label": "Match Complete", "desc": "Stadium cleared. Operations completed."}
]

class StadiumSimulator:
    def __init__(self):
        self.zones: Dict[str, ZoneState] = {}
        self.active_redirections: Dict[str, List[str]] = {} # zone_id -> alternative_routes
        self.match_stage: str = "pre_match"
        self.demo_mode: bool = False
        self.ticks_in_stage: int = 0
        self.reset()

    def reset(self):
        """Resets the simulator state to the default starting conditions."""
        self.zones = {}
        self.active_redirections = {}
        self.match_stage = "pre_match"
        self.ticks_in_stage = 0
        
        for config in INITIAL_ZONES:
            zone_id = config["id"]
            capacity = config["capacity"]
            init_occ = config["initial_occupancy"]
            occ_pct = (init_occ / capacity) * 100.0
            
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
                breach_countdown_min=None,
                entry_rate=20.0,
                exit_rate=15.0,
                risk_score=int(occ_pct * 0.5),
                predicted_pct_in_2min=round(occ_pct, 1),
                predicted_pct_in_10min=round(occ_pct, 1)
            )

    def set_stage(self, stage_name: str):
        if any(s["stage"] == stage_name for s in MATCH_STAGES):
            self.match_stage = stage_name
            self.ticks_in_stage = 0
            # Force immediate adjustment on stage change
            self._apply_stage_flow_rates()

    def set_demo_mode(self, enabled: bool):
        self.demo_mode = enabled

    def activate_redirection(self, zone_id: str, alternative_routes: List[str]):
        self.active_redirections[zone_id] = alternative_routes

    def deactivate_redirection(self, zone_id: str):
        if zone_id in self.active_redirections:
            del self.active_redirections[zone_id]

    def _apply_stage_flow_rates(self):
        """Sets base entry and exit rates based on the active match stage."""
        stage = self.match_stage
        
        # Default base rates
        rates = {
            "gate_a": {"in": 30.0, "out": 20.0},
            "gate_b": {"in": 35.0, "out": 20.0},
            "gate_c": {"in": 25.0, "out": 15.0},
            "concourse_north": {"in": 50.0, "out": 45.0},
            "concourse_south": {"in": 45.0, "out": 40.0},
            "seating_east": {"in": 40.0, "out": 40.0},
            "seating_west": {"in": 35.0, "out": 35.0},
            "stairwell_north": {"in": 20.0, "out": 20.0},
            "stairwell_south": {"in": 22.0, "out": 22.0},
        }

        if stage == "pre_match":
            # Very low rates
            for zone in rates:
                rates[zone] = {"in": random.uniform(10.0, 30.0), "out": random.uniform(8.0, 25.0)}
                
        elif stage == "gate_opening":
            rates["gate_a"] = {"in": 120.0, "out": 15.0}
            rates["gate_b"] = {"in": 140.0, "out": 15.0}
            rates["gate_c"] = {"in": 110.0, "out": 10.0}
            rates["concourse_north"] = {"in": 180.0, "out": 100.0}
            rates["concourse_south"] = {"in": 160.0, "out": 90.0}
            
        elif stage == "crowd_arrival":
            rates["gate_a"] = {"in": 280.0, "out": 20.0}
            rates["gate_b"] = {"in": 310.0, "out": 20.0}
            rates["gate_c"] = {"in": 260.0, "out": 15.0}
            rates["concourse_north"] = {"in": 400.0, "out": 320.0}
            rates["concourse_south"] = {"in": 360.0, "out": 280.0}
            rates["seating_east"] = {"in": 200.0, "out": 30.0}
            rates["seating_west"] = {"in": 180.0, "out": 25.0}
            
        elif stage == "peak_entry":
            # High congestion stage at Gate A & Gate C
            rates["gate_a"] = {"in": 580.0, "out": 20.0}  # Ingress bottleneck
            rates["gate_b"] = {"in": 320.0, "out": 25.0}
            rates["gate_c"] = {"in": 540.0, "out": 15.0}  # Ingress bottleneck
            rates["concourse_north"] = {"in": 600.0, "out": 500.0}
            rates["concourse_south"] = {"in": 550.0, "out": 450.0}
            rates["seating_east"] = {"in": 380.0, "out": 30.0}
            rates["seating_west"] = {"in": 340.0, "out": 25.0}
            
        elif stage == "kickoff":
            # Ingress clears, spectators are seated
            rates["gate_a"] = {"in": 15.0, "out": 10.0}
            rates["gate_b"] = {"in": 20.0, "out": 10.0}
            rates["gate_c"] = {"in": 12.0, "out": 8.0}
            rates["concourse_north"] = {"in": 60.0, "out": 150.0}
            rates["concourse_south"] = {"in": 50.0, "out": 130.0}
            rates["seating_east"] = {"in": 250.0, "out": 15.0}
            rates["seating_west"] = {"in": 220.0, "out": 12.0}
            
        elif stage == "halftime":
            # Concourses flood
            rates["gate_a"] = {"in": 10.0, "out": 15.0}
            rates["gate_b"] = {"in": 12.0, "out": 15.0}
            rates["gate_c"] = {"in": 8.0, "out": 10.0}
            rates["seating_east"] = {"in": 40.0, "out": 420.0}  # exiting seats
            rates["seating_west"] = {"in": 35.0, "out": 380.0}
            rates["concourse_north"] = {"in": 440.0, "out": 120.0}  # flooding concourse
            rates["concourse_south"] = {"in": 410.0, "out": 110.0}
            
        elif stage == "exit_rush":
            # Heavy egress from seats towards gates
            rates["seating_east"] = {"in": 10.0, "out": 650.0}
            rates["seating_west"] = {"in": 10.0, "out": 600.0}
            rates["stairwell_north"] = {"in": 550.0, "out": 480.0}
            rates["stairwell_south"] = {"in": 500.0, "out": 440.0}
            rates["concourse_north"] = {"in": 680.0, "out": 580.0}
            rates["concourse_south"] = {"in": 620.0, "out": 520.0}
            rates["gate_a"] = {"in": 20.0, "out": 480.0}  # exit rush
            rates["gate_b"] = {"in": 20.0, "out": 520.0}
            rates["gate_c"] = {"in": 15.0, "out": 450.0}
            
        elif stage == "transport_congestion":
            # Train bottleneck at Gate C
            rates["seating_east"] = {"in": 5.0, "out": 200.0}
            rates["seating_west"] = {"in": 5.0, "out": 180.0}
            rates["gate_a"] = {"in": 5.0, "out": 350.0}
            rates["gate_b"] = {"in": 5.0, "out": 380.0}
            rates["gate_c"] = {"in": 5.0, "out": 60.0}  # Train delay bottlenecks egress at Gate C!
            rates["concourse_south"] = {"in": 220.0, "out": 120.0}
            
        elif stage == "incident_resolution":
            # Rapid clearing
            rates["gate_c"] = {"in": 5.0, "out": 550.0}  # Shuttles deployed, egress spikes to clear
            rates["gate_a"] = {"in": 5.0, "out": 250.0}
            rates["gate_b"] = {"in": 5.0, "out": 280.0}
            rates["concourse_north"] = {"in": 50.0, "out": 300.0}
            rates["concourse_south"] = {"in": 50.0, "out": 280.0}
            
        elif stage == "match_complete":
            # Back to low baseline
            for zone in rates:
                rates[zone] = {"in": random.uniform(5.0, 15.0), "out": random.uniform(10.0, 25.0)}

        # Update the entry and exit rates state
        for zone_id, zone in self.zones.items():
            if zone_id in rates:
                zone.entry_rate = rates[zone_id]["in"]
                zone.exit_rate = rates[zone_id]["out"]

    def tick(self) -> List[ZoneState]:
        """
        Advances the simulation by 1 step (2 seconds).
        Calculates flow rates, applies active redirection, updates occupancy,
        estimates multi-window prediction lines, and computes risk scores.
        """
        # 1. Handle Automatic Demo Stage Progression
        if self.demo_mode:
            self.ticks_in_stage += 1
            # Advance stage every 12 ticks (24 seconds)
            if self.ticks_in_stage >= 12:
                self.ticks_in_stage = 0
                stage_keys = [s["stage"] for s in MATCH_STAGES]
                current_idx = stage_keys.index(self.match_stage)
                next_idx = (current_idx + 1) % len(stage_keys)
                self.match_stage = stage_keys[next_idx]

        # 2. Determine base flow rates
        self._apply_stage_flow_rates()

        # 3. Apply active redirections
        # If Gate A is overloaded and redirected to Gate B, we reduce Gate A inflow
        # and re-route the traffic to Gate B.
        redirected_inflows = {}
        for zone_id, alt_routes in self.active_redirections.items():
            if zone_id in self.zones and alt_routes:
                zone = self.zones[zone_id]
                # Redirect 45% of incoming crowd
                divert_ratio = 0.45
                diverted_flow = zone.entry_rate * divert_ratio
                zone.entry_rate -= diverted_flow
                
                # Distribute the diverted flow to alternate routes
                flow_per_alt = diverted_flow / len(alt_routes)
                for alt in alt_routes:
                    redirected_inflows[alt] = redirected_inflows.get(alt, 0.0) + flow_per_alt

        # Add redirected flows to target zones
        for alt, flow in redirected_inflows.items():
            if alt in self.zones:
                self.zones[alt].entry_rate += flow

        # 4. Update zone state values
        step_interval = 2.0 # seconds
        for zone_id, zone in self.zones.items():
            # net rate of change per minute = entry_rate - exit_rate
            net_rate_per_min = zone.entry_rate - zone.exit_rate
            # occupancy change in 2 seconds
            net_change = int(net_rate_per_min * (step_interval / 60.0))
            
            # Add micro-variation / walking noise
            noise = random.randint(-12, 12)
            new_occupancy = zone.current_occupancy + net_change + noise
            
            # Enforce limits: occupancy cannot be negative, max is 1.5x capacity
            new_occupancy = max(0, min(new_occupancy, int(zone.capacity * 1.5)))
            
            # Update predictions & historical trends
            updated_hist, trend, pred_5m, status, breach = update_zone_predictions(
                history=zone.history,
                current_occupancy=new_occupancy,
                capacity=zone.capacity,
                step_interval_sec=step_interval
            )
            
            # Set values
            zone.current_occupancy = new_occupancy
            zone.occupancy_pct = round((new_occupancy / zone.capacity) * 100.0, 1)
            zone.history = updated_hist
            zone.trend_per_min = round(trend, 2)
            zone.status = status
            zone.breach_countdown_min = round(breach, 1) if breach is not None else None
            
            # Predict 2-minute and 10-minute density
            zone.predicted_pct_in_2min = round(max(0.0, zone.occupancy_pct + (zone.trend_per_min * 2.0)), 1)
            zone.predicted_pct_in_5min = round(pred_5m, 1)
            zone.predicted_pct_in_10min = round(max(0.0, zone.occupancy_pct + (zone.trend_per_min * 10.0)), 1)

            # 5. Dynamic AI Risk Score Calculation (0 to 100)
            # Calculated from occupancy, growth rate, historical peak, redirection status, and exits
            base_risk = zone.occupancy_pct
            
            # Growth rate penalty: positive trend adds risk
            trend_penalty = max(0.0, zone.trend_per_min * 2.2)
            
            # Historical congestion indicator
            max_past_pct = (max(zone.history) / zone.capacity) * 100.0 if zone.history else zone.occupancy_pct
            hist_penalty = (max_past_pct - zone.occupancy_pct) * 0.25
            
            # Exits/redirections relief: if operator deployed response, risk drops
            mitigation_bonus = 20.0 if zone_id in self.active_redirections else 0.0
            
            # Nearby incident penalty: check if neighboring concourse or stairwell is critical
            nearby_penalty = 0.0
            if zone_id.startswith("gate_"):
                # Gates connected to concourses
                if self.zones.get("concourse_north").status == "critical":
                    nearby_penalty += 8.0
                if self.zones.get("concourse_south").status == "critical":
                    nearby_penalty += 8.0
            
            calculated_risk = base_risk + trend_penalty + hist_penalty - mitigation_bonus + nearby_penalty
            zone.risk_score = int(max(0, min(100, calculated_risk)))
            
        return list(self.zones.values())

    def trigger_spike(self, zone_id: str) -> bool:
        """Manually triggers an immediate occupancy spike to evaluate alarm response."""
        if zone_id not in self.zones:
            return False
            
        zone = self.zones[zone_id]
        spike_amount = int(zone.capacity * 0.30)
        zone.current_occupancy = min(zone.current_occupancy + spike_amount, int(zone.capacity * 1.5))
        
        # Adjust entry rate temporarily to simulate ongoing flow surge
        zone.entry_rate += 250.0
        
        # Re-run a single update step to recalculate metrics
        updated_hist, trend, pred_5m, status, breach = update_zone_predictions(
            history=zone.history,
            current_occupancy=zone.current_occupancy,
            capacity=zone.capacity,
            step_interval_sec=2.0
        )
        zone.occupancy_pct = round((zone.current_occupancy / zone.capacity) * 100.0, 1)
        zone.history = updated_hist
        zone.trend_per_min = round(trend, 2)
        zone.status = status
        zone.breach_countdown_min = round(breach, 1) if breach is not None else None
        
        return True

    def get_all_zones(self) -> List[ZoneState]:
        return list(self.zones.values())
