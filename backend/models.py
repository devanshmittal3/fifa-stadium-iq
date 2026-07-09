from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class ZoneState(BaseModel):
    id: str = Field(..., description="Unique identifier for the stadium zone")
    name: str = Field(..., description="Human-readable name of the zone")
    current_occupancy: int = Field(..., description="Current head count in the zone")
    capacity: int = Field(..., description="Maximum safety capacity of the zone")
    occupancy_pct: float = Field(..., description="Current occupancy percentage (0-100)")
    history: List[int] = Field(default_factory=list, description="Recent occupancy readings (rolling window)")
    trend_per_min: float = Field(0.0, description="Rate of occupancy percentage change per minute")
    predicted_pct_in_5min: float = Field(0.0, description="Predicted occupancy percentage in 5 minutes")
    status: str = Field("normal", description="Safety status: normal, watch, or critical")
    breach_countdown_min: Optional[float] = Field(None, description="Estimated minutes until capacity breach (100%)")
    
    # Extended telemetry, risk, and predictive fields
    entry_rate: float = Field(0.0, description="Spectators per minute entering the zone")
    exit_rate: float = Field(0.0, description="Spectators per minute exiting the zone")
    risk_score: int = Field(0, description="AI-generated operational risk score (0-100)")
    predicted_pct_in_2min: float = Field(0.0, description="Predicted occupancy percentage in 2 minutes")
    predicted_pct_in_10min: float = Field(0.0, description="Predicted occupancy percentage in 10 minutes")

class Recommendation(BaseModel):
    zone_id: str = Field(..., description="Zone identifier this recommendation applies to")
    status: str = Field(..., description="Current status of the zone")
    occupancy_pct: float = Field(..., description="Current occupancy percentage")
    capacity: int = Field(..., description="Safe capacity limit")
    current_occupancy: int = Field(..., description="Current headcount")
    predicted_pct_in_5min: float = Field(..., description="Predicted occupancy % in 5 minutes")
    congestion_growth_pct: float = Field(..., description="Estimated growth rate")
    alternative_routes: List[str] = Field(default_factory=list, description="List of recommended alternative zone IDs")
    expected_reduction_pct: float = Field(..., description="Expected congestion reduction %")
    confidence_score: int = Field(..., description="AI confidence score (0-100)")
    confidence_rating: str = Field(..., description="Rating label based on confidence score")
    action: str = Field(..., description="Recommended control-room action")
    reasoning: str = Field(..., description="Explanation of why this action is recommended")
    predicted_breach_min: Optional[float] = Field(None, description="Minutes to breach if relevant")
    entry_rate: float = Field(0.0, description="Spectator entry rate")
    exit_rate: float = Field(0.0, description="Spectator exit rate")
    predicted_pct_in_2min: float = Field(0.0, description="Predicted occupancy % in 2 minutes")
    predicted_pct_in_10min: float = Field(0.0, description="Predicted occupancy % in 10 minutes")
    risk_score: int = Field(0, description="AI risk score (0-100)")
    what_if_analysis: Dict[str, Any] = Field(default_factory=dict, description="What-if simulation comparing alternate options")

class RecommendationResponse(BaseModel):
    recommendations: List[Recommendation] = Field(..., description="Active safety recommendations")
    engine: str = Field(..., description="The reasoning engine used (Claude, Gemini, or Local Fallback)")

class ChatRequest(BaseModel):
    message: str = Field(..., description="User query or instruction")
    history: Optional[List[Dict[str, str]]] = Field(None, description="Chat conversation history")

class ChatResponse(BaseModel):
    reply: str = Field(..., description="Response text from the reasoning engine")
    engine: str = Field(..., description="The reasoning engine used (Claude, Gemini, or Local Fallback)")

class DispatchPreviewRequest(BaseModel):
    zone_id: str = Field(..., description="Zone identifier being diverted")
    alternative_routes: List[str] = Field(..., description="Alternative diversion route target zone IDs")
    match_id: str = Field(..., description="Current active match ID")
    action: str = Field(..., description="Recommended mitigation action description")

class ImpactPrediction(BaseModel):
    current_queue: int = Field(..., description="Estimated current spectator queue")
    predicted_queue: int = Field(..., description="Predicted queue after diversion")
    reduction_pct: float = Field(..., description="Percentage crowd reduction")
    clearance_min: int = Field(..., description="Estimated minutes to queue clearance")
    diverted_flow_rate_per_min: int = Field(..., description="Estimated spectator diversion flow rate per minute")

class DispatchPreviewResponse(BaseModel):
    briefing: str = Field(..., description="Short AI-generated operator briefing")
    impact: ImpactPrediction = Field(..., description="Predicted crowd flow impact metrics")
    languages: List[str] = Field(..., description="Intelligently resolved languages")
    announcements: Dict[str, str] = Field(..., description="Generated public safety announcements mapped by language")
    engine: str = Field(..., description="The reasoning engine used")
