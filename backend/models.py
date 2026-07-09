from pydantic import BaseModel, Field
from typing import List, Optional, Dict

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

class Recommendation(BaseModel):
    zone_id: str = Field(..., description="Zone identifier this recommendation applies to")
    status: str = Field(..., description="Current status of the zone")
    occupancy_pct: float = Field(..., description="Current occupancy percentage")
    action: str = Field(..., description="Recommended control-room action")
    reasoning: str = Field(..., description="Explanation of why this action is recommended")
    predicted_breach_min: Optional[float] = Field(None, description="Minutes to breach if relevant")
    alternative_routes: List[str] = Field(default_factory=list, description="List of recommended alternative zone IDs or names")

class RecommendationResponse(BaseModel):
    recommendations: List[Recommendation] = Field(..., description="Active safety recommendations")
    engine: str = Field(..., description="The reasoning engine used (Claude, Gemini, or Local Fallback)")

class ChatRequest(BaseModel):
    message: str = Field(..., description="User query or instruction")
    history: Optional[List[Dict[str, str]]] = Field(None, description="Chat conversation history")

class ChatResponse(BaseModel):
    reply: str = Field(..., description="Response text from the reasoning engine")
    engine: str = Field(..., description="The reasoning engine used (Claude, Gemini, or Local Fallback)")
