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

MATCH_CONFIG = {
    "mexico_poland": {
        "teams": "Mexico vs. Poland",
        "location": "Estadio Azteca, Mexico City",
        "languages": ["English", "Spanish", "Polish"],
        "demographics": "High density of local Mexican supporters and traveling Polish fans."
    },
    "argentina_saudi": {
        "teams": "Argentina vs. Saudi Arabia",
        "location": "Lusail Stadium, Lusail",
        "languages": ["English", "Spanish", "Arabic"],
        "demographics": "Large contingent of Argentinian fans and Gulf region local supporters."
    },
    "france_morocco": {
        "teams": "France vs. Morocco",
        "location": "Al Bayt Stadium, Al Khor",
        "languages": ["English", "French", "Arabic"],
        "demographics": "High French-speaking presence and extensive North African demographic."
    }
}

class ReasoningEngine:
    def __init__(self):
        # Load local .env manually if it exists and not in unit testing
        env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
        import sys
        if os.path.exists(env_path) and "pytest" not in sys.modules:
            try:
                with open(env_path, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#"):
                            parts = line.split("=", 1)
                            if len(parts) == 2:
                                os.environ[parts[0].strip()] = parts[1].strip()
            except Exception as e:
                logger.error(f"Error loading .env file: {e}")

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
        
        schema_format = (
            '{"recommendations": [{'
            '"zone_id": str, "status": str, "occupancy_pct": float, '
            '"capacity": int, "current_occupancy": int, "predicted_pct_in_5min": float, '
            '"congestion_growth_pct": float, "alternative_routes": [str], '
            '"expected_reduction_pct": float, "confidence_score": int (0-100), '
            '"confidence_rating": str, "action": str, "reasoning": str, '
            '"predicted_breach_min": float|null'
            '}]}'
        )
        
        system_instructions = (
            f"You are an expert FIFA stadium crowd control AI. Analyze the zone states and return "
            f"safety recommendations in structured JSON matching this schema: {schema_format}. "
            f"Ensure capacity and current_occupancy match the input data. confidence_score should be a value "
            f"between 0 and 100 reflecting recommendation certainty, and confidence_rating should be "
            f"'High Confidence' (80-100), 'Medium Confidence' (50-79), or 'Low Confidence' (<50). "
            f"reasoning must be a detailed explainable AI explanation referencing specific occupancy levels. "
            f"Return ONLY raw JSON. Do not use markdown backticks."
        )

        response_obj = None
        if engine == "Claude":
            try:
                client = anthropic.Anthropic(api_key=self.anthropic_key)
                response = client.messages.create(
                    model="claude-sonnet-4-6",
                    max_tokens=1500,
                    system=system_instructions,
                    messages=[
                        {"role": "user", "content": f"Zone States: {json.dumps(zones_data)}"}
                    ]
                )
                raw_text = response.content[0].text.strip()
                if raw_text.startswith("```"):
                    raw_text = raw_text.split("```")[1]
                    if raw_text.startswith("json"):
                        raw_text = raw_text[4:]
                raw_text = raw_text.strip()
                
                parsed = json.loads(raw_text)
                recs = [Recommendation(**r) for r in parsed["recommendations"]]
                response_obj = RecommendationResponse(recommendations=recs, engine="Claude")
                
            except Exception as e:
                logger.warning(f"Claude API failed, trying Gemini. Error: {str(e)}")
                if self.gemini_key:
                    response_obj = self._generate_recommendations_gemini(zones_data, f"Claude API failure: {str(e)}")
                else:
                    response_obj = self._generate_recommendations_fallback(zones, f"Claude API failure and Gemini key missing: {str(e)}")
                    
        elif engine == "Gemini":
            response_obj = self._generate_recommendations_gemini(zones_data)
            
        else:
            response_obj = self._generate_recommendations_fallback(zones, "No API keys configured in environment")

        # Enrich recommendations with data-driven values
        if response_obj and response_obj.recommendations:
            response_obj.recommendations = self._enrich_recommendations(response_obj.recommendations, zones)

        return response_obj

    def _generate_recommendations_gemini(self, zones_data: List[Dict[str, Any]], error_context: str = "") -> RecommendationResponse:
        """Internal Gemini call for recommendations."""
        try:
            schema_format = (
                '{"recommendations": [{'
                '"zone_id": str, "status": str, "occupancy_pct": float, '
                '"capacity": int, "current_occupancy": int, "predicted_pct_in_5min": float, '
                '"congestion_growth_pct": float, "alternative_routes": [str], '
                '"expected_reduction_pct": float, "confidence_score": int (0-100), '
                '"confidence_rating": str, "action": str, "reasoning": str, '
                '"predicted_breach_min": float|null'
                '}]}'
            )
            system_instructions = (
                f"You are an expert FIFA stadium crowd control AI. Analyze the zone states and return "
                f"safety recommendations in structured JSON matching this schema: {schema_format}. "
                f"Ensure capacity and current_occupancy match the input data. confidence_score should be a value "
                f"between 0 and 100 reflecting recommendation certainty, and confidence_rating should be "
                f"'High Confidence' (80-100), 'Medium Confidence' (50-79), or 'Low Confidence' (<50). "
                f"reasoning must be a detailed explainable AI explanation referencing specific occupancy levels. "
                f"Return ONLY raw JSON. Do not use markdown backticks."
            )
            model = genai.GenerativeModel(
                model_name="gemini-2.5-flash",
                system_instruction=system_instructions
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
                alt_list = alternatives.get(zone.id, [])
                alt_names = [self._get_zone_name(aid, zones) for aid in alt_list]
                
                reduction_pct = 35.0 if zone.status == "critical" else 25.0
                confidence_score = 92 if zone.status == "critical" else 78
                confidence_rating = "High Confidence" if confidence_score >= 80 else "Medium Confidence"
                
                alt_occ_pct = 40.0
                if alt_list:
                    alt_zone = next((z for z in zones if z.id == alt_list[0]), None)
                    if alt_zone:
                        alt_occ_pct = alt_zone.occupancy_pct

                if zone.status == "critical":
                    action = f"IMMEDIATE DIVERSION: Restrict ingress at {zone.name} and route spectators to {', '.join(alt_names)}."
                    reasoning = (
                        f"{zone.name} occupancy has reached {zone.occupancy_pct}%. "
                        f"Current inflow of {zone.entry_rate} spectators/min predicts {zone.predicted_pct_in_5min}% capacity within 5 minutes. "
                        f"{', '.join(alt_names)} is currently operating at only {alt_occ_pct}% capacity. "
                        f"Redirecting spectators to {', '.join(alt_names)} is expected to reduce congestion by approximately {reduction_pct}% while maintaining safe emergency access."
                    )
                else:
                    action = f"MONITOR & REALLOCATE: Deploy marshals to regulate traffic at {zone.name}; advise alternate path via {', '.join(alt_names)}."
                    reasoning = (
                        f"{zone.name} is in WATCH status at {zone.occupancy_pct}%. "
                        f"Current inflow of {zone.entry_rate} spectators/min predicts {zone.predicted_pct_in_5min}% capacity within 5 minutes. "
                        f"{', '.join(alt_names)} is currently operating at only {alt_occ_pct}% capacity. "
                        f"Redirecting spectators to {', '.join(alt_names)} is expected to reduce congestion by approximately {reduction_pct}% while maintaining safe emergency access."
                    )
                
                recs.append(Recommendation(
                    zone_id=zone.id,
                    status=zone.status,
                    occupancy_pct=zone.occupancy_pct,
                    capacity=zone.capacity,
                    current_occupancy=zone.current_occupancy,
                    predicted_pct_in_5min=zone.predicted_pct_in_5min,
                    congestion_growth_pct=round(zone.trend_per_min, 2),
                    alternative_routes=alt_list,
                    expected_reduction_pct=reduction_pct,
                    confidence_score=confidence_score,
                    confidence_rating=confidence_rating,
                    action=action,
                    reasoning=reasoning,
                    predicted_breach_min=zone.breach_countdown_min,
                    entry_rate=zone.entry_rate,
                    exit_rate=zone.exit_rate,
                    predicted_pct_in_2min=zone.predicted_pct_in_2min,
                    predicted_pct_in_10min=zone.predicted_pct_in_10min,
                    risk_score=zone.risk_score,
                    what_if_analysis={}
                ))
                
        return RecommendationResponse(recommendations=recs, engine="Local Fallback")

    def _enrich_recommendations(self, recs: List[Recommendation], zones: List[ZoneState]) -> List[Recommendation]:
        enriched = []
        for rec in recs:
            zone = next((z for z in zones if z.id == rec.zone_id), None)
            if zone:
                rec.entry_rate = zone.entry_rate
                rec.exit_rate = zone.exit_rate
                rec.predicted_pct_in_2min = zone.predicted_pct_in_2min
                rec.predicted_pct_in_10min = zone.predicted_pct_in_10min
                rec.risk_score = zone.risk_score
            
            # Populate What-If analysis dictionary
            primary_route = rec.alternative_routes[0] if rec.alternative_routes else "gate_b"
            secondary_route = rec.alternative_routes[1] if len(rec.alternative_routes) > 1 else ("gate_d" if primary_route != "gate_d" else "gate_a")
            
            primary_label = f"Redirect to {primary_route.replace('_', ' ').title()}"
            secondary_label = f"Redirect to {secondary_route.replace('_', ' ').title()} (Alternate)"
            
            rec.what_if_analysis = {
                "primary": {
                    "label": primary_label,
                    "expected_reduction": rec.expected_reduction_pct,
                    "expected_clearance_min": max(2, int((rec.predicted_breach_min or 5.0) * 0.7)),
                    "risk_improvement": int(rec.risk_score * 0.35)
                },
                "secondary": {
                    "label": secondary_label,
                    "expected_reduction": round(rec.expected_reduction_pct * 0.6, 1),
                    "expected_clearance_min": int((rec.predicted_breach_min or 5.0) * 1.4),
                    "risk_improvement": int(rec.risk_score * 0.18)
                }
            }
            enriched.append(rec)
        return enriched

    def _get_zone_name(self, zone_id: str, zones: List[ZoneState]) -> str:
        for z in zones:
            if z.id == zone_id:
                return z.name
        return zone_id.replace("_", " ").title()

    def generate_dispatch_preview(self, zone_id: str, action: str, alternative_routes: List[str], match_id: str, zones: Optional[List[ZoneState]] = None) -> Dict[str, Any]:
        """Generates operator briefing, impact prediction, and multilingual announcements."""
        engine = self._get_active_engine()
        config = MATCH_CONFIG.get(match_id, MATCH_CONFIG["mexico_poland"])
        teams = config["teams"]
        location = config["location"]
        demographics = config["demographics"]
        
        zone_name = zone_id.replace("_", " ").title()
        alt_names = ", ".join([r.replace("_", " ").title() for r in alternative_routes])

        prompt_str = (
            f"We are implementing a crowd redirection from the overloaded zone '{zone_name}' "
            f"to the alternative routes '{alt_names}' for the match '{teams}' taking place at '{location}'.\n"
            f"Expected spectator demographics: {demographics}.\n"
            f"Proposed control-room action: {action}.\n\n"
            f"Analyze the scenario and output a raw JSON object with the following fields:\n"
            f"1. 'briefing': A short (1-2 sentences) operator briefing summarizing the redirection and warning about secondary congestion.\n"
            f"2. 'impact': An object containing:\n"
            f"   - 'current_queue' (int): Estimated current spectator queue.\n"
            f"   - 'predicted_queue' (int): Estimated spectator queue after redirection is deployed.\n"
            f"   - 'reduction_pct' (float): Predicted crowd reduction percentage.\n"
            f"   - 'clearance_min' (int): Estimated minutes to queue clearance.\n"
            f"   - 'diverted_flow_rate_per_min' (int): Dynamic spectator flow rate diverted per minute (e.g. 350).\n"
            f"3. 'languages': List of strings of languages dynamically selected for the stadium announcements, determined based on match participants, stadium location, and demographics. You must always include English, the languages of both teams, and the host country language if relevant.\n"
            f"4. 'announcements': A dictionary mapping each selected language (from the 'languages' list) to the translated safety announcement text instructing spectators to use alternative routes.\n\n"
            f"Return ONLY valid, raw JSON matching this schema:\n"
            f'{{"briefing": str, "impact": {{"current_queue": int, "predicted_queue": int, "reduction_pct": float, "clearance_min": int, "diverted_flow_rate_per_min": int}}, "languages": [str], "announcements": {{"LanguageName": str}}}}'
        )

        if engine == "Claude":
            try:
                client = anthropic.Anthropic(api_key=self.anthropic_key)
                response = client.messages.create(
                    model="claude-sonnet-4-6",
                    max_tokens=1200,
                    system="You are a FIFA Stadium Operations Dispatch AI. Generate operator briefs, impact models, and natural translations in raw JSON.",
                    messages=[{"role": "user", "content": prompt_str}]
                )
                raw_text = response.content[0].text.strip()
                if raw_text.startswith("```"):
                    raw_text = raw_text.split("```")[1]
                    if raw_text.startswith("json"):
                        raw_text = raw_text[4:]
                raw_text = raw_text.strip()
                
                data = json.loads(raw_text)
                data["engine"] = "Claude"
                return data
            except Exception as e:
                logger.warning(f"Claude dispatch preview failed, trying Gemini. Error: {str(e)}")
                if self.gemini_key:
                    return self._generate_dispatch_preview_gemini(prompt_str, zone_id, alternative_routes, match_id, zones, f"Claude failure: {str(e)}")
                else:
                    return self._generate_dispatch_preview_fallback(zone_id, action, alternative_routes, match_id, zones, f"Claude failure and Gemini missing: {str(e)}")
                    
        elif engine == "Gemini":
            return self._generate_dispatch_preview_gemini(prompt_str, zone_id, alternative_routes, match_id, zones)
        else:
            return self._generate_dispatch_preview_fallback(zone_id, action, alternative_routes, match_id, zones, "No API keys configured")

    def _generate_dispatch_preview_gemini(self, prompt_str: str, zone_id: str, alternative_routes: List[str], match_id: str, zones: Optional[List[ZoneState]] = None, error_context: str = "") -> Dict[str, Any]:
        try:
            model = genai.GenerativeModel(
                model_name="gemini-2.5-flash",
                system_instruction="You are a FIFA Stadium Operations Dispatch AI. Generate operator briefs, impact models, and natural translations in raw JSON."
            )
            response = model.generate_content(prompt_str)
            raw_text = response.text.strip()
            if raw_text.startswith("```"):
                raw_text = raw_text.split("```")[1]
                if raw_text.startswith("json"):
                    raw_text = raw_text[4:]
            raw_text = raw_text.strip()
            
            data = json.loads(raw_text)
            data["engine"] = "Gemini"
            return data
        except Exception as e:
            reason = f"Gemini dispatch preview failure: {str(e)}"
            if error_context:
                reason = f"{error_context} -> {reason}"
            return self._generate_dispatch_preview_fallback(zone_id, "", alternative_routes, match_id, zones, reason)

    def _generate_dispatch_preview_fallback(self, zone_id: str, action: str, alternative_routes: List[str], match_id: str, zones: Optional[List[ZoneState]] = None, reason: str = "") -> Dict[str, Any]:
        logger.warning(f"FALLBACK TRIGGERED: dispatch preview generation falling back to Local Fallback. Reason: {reason}")
        
        config = MATCH_CONFIG.get(match_id, MATCH_CONFIG["mexico_poland"])
        languages = config["languages"]
        
        zone_name = zone_id.replace("_", " ").title()
        alt_names = ", ".join([r.replace("_", " ").title() for r in alternative_routes])
        
        zone_state = None
        if zones:
            zone_state = next((z for z in zones if z.id == zone_id), None)
            
        if zone_state:
            current_occ = zone_state.current_occupancy
            cap = zone_state.capacity
            status = zone_state.status
        else:
            current_occ = 1650
            cap = 2000
            status = "critical"
            
        # Dynamic telemetry-based predictions
        current_queue = int(current_occ * 1.5)
        reduction_pct = 44.0 if status == "critical" else 30.0
        predicted_queue = int(current_queue * (1 - reduction_pct/100))
        clearance_min = max(3, int(predicted_queue / 450))
        diverted_flow_rate_per_min = int((current_queue - predicted_queue) / clearance_min)
        
        briefing = (
            f"{zone_name} is approaching unsafe density. "
            f"Recommend deploying crowd response to redirect approximately 35–40% of incoming spectators to {alt_names}. "
            f"Emergency services are not currently required. Monitor {alt_names} for secondary congestion. "
            f"Estimated normalization: {clearance_min} minutes."
        )
        
        templates = {
            "English": f"Attention spectators near {zone_name}: To ensure a safe and smooth entry, please follow directional signs and divert to {alt_names}. Thank you for your cooperation.",
            "Spanish": f"Atención espectadores cerca de {zone_name}: Para garantizar una entrada segura y fluida, por favor siga las indicaciones y diríjase a {alt_names}. Agradecemos su cooperación.",
            "Polish": f"Uwaga kibice w pobliżu {zone_name}: Aby zapewnić bezpieczne i sprawne wejście, prosimy o kierowanie się do {alt_names}. Dziękujemy za współpracę.",
            "Arabic": f"انتباه للجماهير بالقرب من {zone_name}: لضمان دخول آمن وسلس، يرجى اتباع اللافتات التوجيهية والتحول إلى {alt_names}. نشكركم على تعاونكم.",
            "French": f"Attention aux spectateurs près de {zone_name}: Pour garantir une entrée sûre et fluide, veuillez suivre les panneaux de signalisation et vous diriger vers {alt_names}. Merci de votre coopération."
        }
        
        announcements = {lang: templates.get(lang, templates["English"]) for lang in languages}
        
        return {
            "briefing": briefing,
            "impact": {
                "current_queue": current_queue,
                "predicted_queue": predicted_queue,
                "reduction_pct": reduction_pct,
                "clearance_min": clearance_min,
                "diverted_flow_rate_per_min": diverted_flow_rate_per_min
            },
            "languages": languages,
            "announcements": announcements,
            "engine": "Local Fallback"
        }

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
