from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status

from dependencies import get_external_insights_service
from schemas import LocationInsightResponse
from services.external_insights_service import ExternalInsightsService, ExternalServiceError

router = APIRouter()


@router.get("/external/location-insights", response_model=LocationInsightResponse)
def get_location_insights(
    location: str = Query(..., min_length=2, max_length=120),
    service: ExternalInsightsService = Depends(get_external_insights_service),
):
    try:
        return service.get_location_insights(location)
    except ExternalServiceError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
