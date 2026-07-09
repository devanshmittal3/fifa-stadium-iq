import os
import json
import logging
from typing import List, Dict, Any, Optional, Tuple
import anthropic
import google.generativeai as genai
from models import ZoneState, Recommendation, RecommendationResponse, ChatResponse

# Setup logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("stadiumiq.reasoning")

class ReasoningEngine:
    def __init__(self):
        self.anthropic_key = os.environ.get("ANTHROPIC_API_KEY")
        self.gemini_key = os.environ.get("GEMINI_API_KEY")
        
        # Configure Gemini if key is present
        if self.gemini_key:
            genai.configure(api_key=self.gemini_key)

    def _get_active_engine(self) -> str:
        """Determines the active LLM engine based on API key availability."""
        if self.anthropic_key:
            return "Claude"
        elif self.gemini_key:
            return "Gemini"
        else:
            return "Local Fallback"

    def generate_recommendations(self, zones: List[ZoneState]) -> RecommendationResponse:
        """
        Generates stadium crowd-control recommendations.
        Tries Claude, then Gemini, and falls back to a rule-based engine.
        """
        engine = self._get_active_engine()
        zones_data = [z.model_dump() for z in zones]
        
        if engine == "Claude":
            try:
                client = anthropic.Anthropic(api_key=self.anthropic_key)
                response = client.messages.create(
                    model="claude-sonnet-4-6",
                    max_tokens=1000,
                    system="You are an expert FIFA stadium crowd control AI. Analyze the zone states and return safety recommendations in structured JSON matching this schema: {\"recommendations\": [{\"zone_id\": str, \"status\": str, \"occupancy_pct\": float, \"action\": str, \"reasoning\": str, \"predicted_breach_min\": float|null, \"alternative_routes\": [str]}]}. Return ONLY raw JSON. No markdown formatting.",
                    messages=[
                        {"role": "user", "content": f"Zone States: {json.dumps(zones_data)}"}
                    ]
                )
                raw_text = response.content[0].text.strip()
                # Remove markdown wrapping if present
                if raw_text.startswith("```"):
                    raw_text = raw_text.split("```")[1]
                    if raw_text.startswith("json"):
                        raw_text = raw_text[4:]
                raw_text = raw_text.strip()
                
                parsed = json.loads(raw_text)
                recs = [Recommendation(**r) for r in parsed["recommendations"]]
                return RecommendationResponse(recommendations=recs, engine="Claude")
                
            except Exception as e:
                logger.warning(f"Claude API failed, trying Gemini. Error: {str(e)}")
                # Try falling back to Gemini if key is present
                if self.gemini_key:
                    return self._generate_recommendations_gemini(zones_data, f"Claude API failure: {str(e)}")
                else:
                    return self._generate_recommendations_fallback(zones, f"Claude API failure and Gemini key missing: {str(e)}")
                    
        elif engine == "Gemini":
            return self._generate_recommendations_gemini(zones_data)
            
        else:
            return self._generate_recommendations_fallback(zones, "No API keys configured in environment")

    def _generate_recommendations_gemini(self, zones_data: List[Dict[str, Any]], error_context: str = "") -> RecommendationResponse:
        """Internal Gemini call for recommendations."""
        try:
            model = genai.GenerativeModel(
                model_name="gemini-2.5-flash",
                system_instruction="You are an expert FIFA stadium crowd control AI. Analyze the zone states and return safety recommendations in structured JSON matching this schema: {\"recommendations\": [{\"zone_id\": str, \"status\": str, \"occupancy_pct\": float, \"action\": str, \"reasoning\": str, \"predicted_breach_min\": float|null, \"alternative_routes\": [str]}]}. Return ONLY raw JSON. No markdown formatting."
            )
            response = model.generate_content(f"Zone States: {json.dumps(zones_data)}")
            raw_text = response.text.strip()
            
            if raw_text.startswith("```"):
                raw_text = raw_text.split("```")[1]
                if raw_text.startswith("json"):
                    raw_text = raw_text[4:]
            raw_text = raw_text.strip()
            
            parsed = json.loads(raw_text)
            recs = [Recommendation(**r) for r in parsed["recommendations"]]
            return RecommendationResponse(recommendations=recs, engine="Gemini")
        except Exception as e:
            reason = f"Gemini API failure: {str(e)}"
            if error_context:
                reason = f"{error_context} -> {reason}"
            return self._generate_recommendations_fallback([ZoneState(**z) for z in zones_data], reason)

    def _generate_recommendations_fallback(self, zones: List[ZoneState], reason: str) -> RecommendationResponse:
        """Deterministic local rule-based fallback for recommendations."""
        logger.warning(f"FALLBACK TRIGGERED: recommendations generation falling back to Local Fallback. Reason: {reason}")
        
        recs = []
        # Mapping of alternative routes for diversion
        alternatives = {
            "gate_a": ["gate_b"],
            "gate_b": ["gate_a"],
            "gate_c": ["gate_b"],
            "concourse_north": ["concourse_south"],
            "concourse_south": ["concourse_north"],
            "seating_east": ["seating_west"],
            "seating_west": ["seating_east"],
            "stairwell_north": ["stairwell_south"],
            "stairwell_south": ["stairwell_north"],
        }
        
        for zone in zones:
            if zone.status in ["watch", "critical"]:
                # Generate a rule-based recommendation
                alt_list = alternatives.get(zone.id, [])
                alt_names = [self._get_zone_name(aid, zones) for aid in alt_list]
                
                if zone.status == "critical":
                    action = f"IMMEDIATE DIVERSION: Restrict ingress at {zone.name} and route spectators to {', '.join(alt_names)}."
                    reasoning = f"{zone.name} is severely overcrowded at {zone.occupancy_pct}%. Immediate safety protocols are active to prevent crowd crush."
                else:
                    action = f"MONITOR & REALLOCATE: Deploy marshals to regulate traffic at {zone.name}; advise alternate path via {', '.join(alt_names)}."
                    reasoning = f"{zone.name} is in WATCH status at {zone.occupancy_pct}% with elevated ingress trend. Pre-emptive diversion is advised."
                
                recs.append(Recommendation(
                    zone_id=zone.id,
                    status=zone.status,
                    occupancy_pct=zone.occupancy_pct,
                    action=action,
                    reasoning=reasoning,
                    predicted_breach_min=zone.breach_countdown_min,
                    alternative_routes=alt_list
                ))
                
        return RecommendationResponse(recommendations=recs, engine="Local Fallback")

    def _get_zone_name(self, zone_id: str, zones: List[ZoneState]) -> str:
        for z in zones:
            if z.id == zone_id:
                return z.name
        return zone_id.replace("_", " ").title()

    def generate_chat_reply(self, message: str, zones: List[ZoneState], history: Optional[List[Dict[str, str]]] = None) -> ChatResponse:
        """
        Generates conversational replies for control room operators.
        Tries Claude, then Gemini, and falls back to a rule-based responder.
        """
        engine = self._get_active_engine()
        zones_data = [z.model_dump() for z in zones]
        
        if engine == "Claude":
            try:
                client = anthropic.Anthropic(api_key=self.anthropic_key)
                # Format history for Claude
                claude_messages = []
                if history:
                    for h in history[-6:]:  # limit context to last 6 messages
                        claude_messages.append({"role": h["role"], "content": h["content"]})
                claude_messages.append({"role": "user", "content": f"Active Stadium Zones: {json.dumps(zones_data)}\n\nOperator message: {message}"})
                
                response = client.messages.create(
                    model="claude-sonnet-4-6",
                    max_tokens=500,
                    system="You are the StadiumIQ Control Room Co-pilot. Answer operator queries based on the provided zone states. Be concise, direct, and safety-focused. Format your reply as a simple JSON object: {\"reply\": \"<your response>\"}. Do not use markdown backticks.",
                    messages=claude_messages
                )
                raw_text = response.content[0].text.strip()
                if raw_text.startswith("```"):
                    raw_text = raw_text.split("```")[1]
                    if raw_text.startswith("json"):
                        raw_text = raw_text[4:]
                raw_text = raw_text.strip()
                
                parsed = json.loads(raw_text)
                return ChatResponse(reply=parsed["reply"], engine="Claude")
                
            except Exception as e:
                logger.warning(f"Claude Chat API failed, trying Gemini. Error: {str(e)}")
                if self.gemini_key:
                    return self._generate_chat_gemini(message, zones_data, history, f"Claude Chat failure: {str(e)}")
                else:
                    return self._generate_chat_fallback(message, zones, f"Claude Chat failure and Gemini key missing: {str(e)}")
                    
        elif engine == "Gemini":
            return self._generate_chat_gemini(message, zones_data, history)
            
        else:
            return self._generate_chat_fallback(message, zones, "No API keys configured in environment")

    def _generate_chat_gemini(self, message: str, zones_data: List[Dict[str, Any]], history: Optional[List[Dict[str, str]]] = None, error_context: str = "") -> ChatResponse:
        """Internal Gemini call for chat."""
        try:
            model = genai.GenerativeModel(
                model_name="gemini-2.5-flash",
                system_instruction="You are the StadiumIQ Control Room Co-pilot. Answer operator queries based on the provided zone states. Be concise, direct, and safety-focused. Format your reply as a simple JSON object: {\"reply\": \"<your response>\"}. Do not use markdown backticks."
            )
            # Compile conversation content
            prompt_content = f"Active Stadium Zones: {json.dumps(zones_data)}\n\nOperator message: {message}"
            response = model.generate_content(prompt_content)
            raw_text = response.text.strip()
            
            if raw_text.startswith("```"):
                raw_text = raw_text.split("```")[1]
                if raw_text.startswith("json"):
                    raw_text = raw_text[4:]
            raw_text = raw_text.strip()
            
            parsed = json.loads(raw_text)
            return ChatResponse(reply=parsed["reply"], engine="Gemini")
        except Exception as e:
            reason = f"Gemini Chat failure: {str(e)}"
            if error_context:
                reason = f"{error_context} -> {reason}"
            return self._generate_chat_fallback(message, [ZoneState(**z) for z in zones_data], reason)

    def _generate_chat_fallback(self, message: str, zones: List[ZoneState], reason: str) -> ChatResponse:
        """Deterministic local rule-based fallback for chat responses."""
        logger.warning(f"FALLBACK TRIGGERED: chat reply generation falling back to Local Fallback. Reason: {reason}")
        
        msg_lower = message.lower()
        
        # Analyze critical and watch zones
        critical_zones = [z for z in zones if z.status == "critical"]
        watch_zones = [z for z in zones if z.status == "watch"]
        
        # 1. Specific queries about Gate C
        if "gate c" in msg_lower:
            gate_c = next((z for z in zones if z.id == "gate_c"), None)
            if gate_c:
                if gate_c.status == "critical":
                    reply = f"Gate C is currently CRITICAL at {gate_c.occupancy_pct}% occupancy (capacity: {gate_c.capacity}). Heavy overcrowding is active. Instructing operators to divert spectator flow to Gate B immediately."
                elif gate_c.status == "watch":
                    reply = f"Gate C is in WATCH status at {gate_c.occupancy_pct}% occupancy (trend: +{gate_c.trend_per_min}%/min). Recommend monitoring and redirecting incoming flow to Gate B to prevent a breach."
                else:
                    reply = f"Gate C is currently NORMAL at {gate_c.occupancy_pct}% occupancy (capacity: {gate_c.capacity}). Crowd flow is smooth."
            else:
                reply = "Gate C status information is currently unavailable."
                
        # 2. General status queries
        elif any(keyword in msg_lower for keyword in ["status", "report", "overview", "situation", "summary", "how is"]):
            if not critical_zones and not watch_zones:
                reply = "All stadium zones are operating normally. Continuous monitoring is in progress. No immediate actions required."
            else:
                crit_desc = ", ".join([f"{z.name} ({z.occupancy_pct}%)" for z in critical_zones])
                watch_desc = ", ".join([f"{z.name} ({z.occupancy_pct}%)" for z in watch_zones])
                
                parts = []
                if critical_zones:
                    parts.append(f"CRITICAL alerts active in: {crit_desc}. Action required: divert crowd paths.")
                if watch_zones:
                    parts.append(f"WATCH alerts active in: {watch_desc}. Action required: stand by for diversion.")
                reply = " | ".join(parts)
                
        # 3. Queries about alternative routes
        elif "alternative" in msg_lower or "redirect" in msg_lower or "divert" in msg_lower:
            reply = "Standard backup routing templates are: Divert Gate C to Gate B; divert Gate A to Gate B; divert Concourse North to Concourse South. Consult the Zone Map to confirm adjacent lane capacities before executing diversion instructions."
            
        # 4. Default fallback answer
        else:
            active_alerts = len(critical_zones) + len(watch_zones)
            reply = (
                f"Stadium IQ Copilot (Local Fallback mode). System is monitoring {len(zones)} zones. "
                f"Currently detecting {active_alerts} safety warnings. Please check the recommendations panel for specific crowd-control tasks."
            )
            
        return ChatResponse(reply=reply, engine="Local Fallback")
