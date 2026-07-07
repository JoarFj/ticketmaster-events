from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import httpx
import os
import asyncio
import logging
from dotenv import load_dotenv
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("event-finder")

app = FastAPI(
    title="Event Finder API",
    description="API for discovering events using Ticketmaster API",
    version="1.0.0"
)

# Per-client rate limiting. The public frontend bundle exposes this backend's
# URL, and CORS only restricts browsers (not scripts), so /events must be
# throttled to protect the shared Ticketmaster API quota from abuse.
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Configure CORS for development and production
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

if ENVIRONMENT == "production":
    # Production CORS - add your actual domains here
    allowed_origins = [
        "https://ticketmaster-events-flame.vercel.app",  # Your Vercel domain
        # Add any other production domains here
    ]
else:
    # Development CORS
    allowed_origins = [
        "http://localhost:3000", 
        "http://127.0.0.1:3000", 
        "http://localhost:5173", 
        "http://127.0.0.1:5173",
        "https://ticketmaster-events-flame.vercel.app"  # Temporary: also allow in dev mode
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,  # No cookies/auth are used; keep this off
    allow_methods=["*"],
    allow_headers=["*"],
)

TICKETMASTER_API_KEY = os.getenv("TICKETMASTER_API_KEY")
TICKETMASTER_BASE_URL = "https://app.ticketmaster.com/discovery/v2"

@app.get("/")
def read_root():
    return {"message": "Event Finder API is running"}

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "event-finder-api"}


def parse_event_data(event: Dict[Any, Any]) -> Dict[str, Any]:
    """Parse Ticketmaster event data into our format"""
    try:
        # Extract basic info
        name = event.get("name", "Unknown Event")
        
        # Parse date
        dates = event.get("dates", {})
        start_date = dates.get("start", {})
        date_str = start_date.get("localDate", "")
        time_str = start_date.get("localTime", "")
        
        # Format date and time
        formatted_date = date_str
        if time_str:
            formatted_date += f" at {time_str}"
        
        # Extract venue info
        venues = event.get("_embedded", {}).get("venues", [])
        venue_name = venues[0].get("name", "Unknown Venue") if venues else "Unknown Venue"
        
        # Extract location
        location = "Unknown Location"
        if venues:
            venue = venues[0]
            city = venue.get("city", {}).get("name", "")
            state = venue.get("state", {}).get("name", "")
            if city and state:
                location = f"{city}, {state}"
            elif city:
                location = city
        
        # Extract coordinates
        coordinates = None
        if venues:
            venue = venues[0]
            if venue.get("location"):
                lat = venue["location"].get("latitude")
                lng = venue["location"].get("longitude")
                if lat and lng:
                    coordinates = {"lat": float(lat), "lng": float(lng)}
        
        # Extract URL
        url = event.get("url", "")
        
        # Extract image
        images = event.get("images", [])
        image_url = images[0].get("url", "") if images else ""
        
        return {
            "id": event.get("id", ""),
            "name": name,
            "date": formatted_date,
            "venue": venue_name,
            "location": location,
            "url": url,
            "coordinates": coordinates,
            "image": image_url
        }
    except Exception as e:
        # Return basic event structure if parsing fails
        return {
            "id": event.get("id", ""),
            "name": event.get("name", "Unknown Event"),
            "date": "Unknown Date",
            "venue": "Unknown Venue",
            "location": "Unknown Location",
            "url": event.get("url", ""),
            "coordinates": None,
            "image": "",
            "weather": None
        }

async def fetch_weather_data(lat: float, lon: float, event_date: str) -> Optional[Dict[str, Any]]:
    """Fetch weather data from OpenMeteo API for given coordinates and date"""
    try:
        # Parse the event date to check if it's within 7 days
        if not event_date or event_date == "Unknown Date":
            return None
            
        # Parse date - handle various formats from Ticketmaster
        event_datetime = None
        if " at " in event_date:
            date_part = event_date.split(" at ")[0]
        else:
            date_part = event_date
            
        try:
            event_datetime = datetime.strptime(date_part, "%Y-%m-%d")
        except ValueError:
            # Try alternative format
            try:
                event_datetime = datetime.strptime(date_part, "%m/%d/%Y")
            except ValueError:
                return None
        
        # Check if event is within 7 days
        now = datetime.now().date()  # Get just the date part
        seven_days_from_now = now + timedelta(days=7)
        event_date = event_datetime.date()  # Get just the date part
        
        if event_date < now or event_date > seven_days_from_now:
            return None
        
        # Calculate days from now for the forecast
        days_diff = (event_date - now).days
        if days_diff < 0:
            days_diff = 0
        
        async with httpx.AsyncClient() as client:
            # OpenMeteo API call
            params = {
                "latitude": lat,
                "longitude": lon,
                "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode,windspeed_10m_max",
                "forecast_days": min(7, days_diff + 2),  # Get a few extra days to be safe
                "timezone": "auto"
            }
            
            response = await client.get(
                "https://api.open-meteo.com/v1/forecast",
                params=params,
                timeout=5.0
            )
            
            if response.status_code != 200:
                return None
                
            weather_data = response.json()
            daily = weather_data.get("daily", {})
            
            # Find the weather for the event date
            dates = daily.get("time", [])
            event_date_str = event_date.strftime("%Y-%m-%d")
            
            weather_index = None
            for i, date_str in enumerate(dates):
                if date_str == event_date_str:
                    weather_index = i
                    break
            
            if weather_index is None:
                return None
                
            # Get weather code description
            weather_code = daily.get("weathercode", [])[weather_index] if weather_index < len(daily.get("weathercode", [])) else None
            weather_description = get_weather_description(weather_code)
            
            return {
                "date": event_date_str,
                "temperature_max": daily.get("temperature_2m_max", [])[weather_index] if weather_index < len(daily.get("temperature_2m_max", [])) else None,
                "temperature_min": daily.get("temperature_2m_min", [])[weather_index] if weather_index < len(daily.get("temperature_2m_min", [])) else None,
                "precipitation": daily.get("precipitation_sum", [])[weather_index] if weather_index < len(daily.get("precipitation_sum", [])) else None,
                "wind_speed": daily.get("windspeed_10m_max", [])[weather_index] if weather_index < len(daily.get("windspeed_10m_max", [])) else None,
                "description": weather_description,
                "weather_code": weather_code
            }
            
    except Exception as e:
        # Return None if weather fetch fails
        return None

def get_weather_description(weather_code: Optional[int]) -> str:
    """Convert weather code to human-readable description"""
    if weather_code is None:
        return "Unknown"
    
    weather_codes = {
        0: "Clear sky",
        1: "Mainly clear",
        2: "Partly cloudy",
        3: "Overcast",
        45: "Fog",
        48: "Depositing rime fog",
        51: "Light drizzle",
        53: "Moderate drizzle",
        55: "Dense drizzle",
        56: "Light freezing drizzle",
        57: "Dense freezing drizzle",
        61: "Slight rain",
        63: "Moderate rain",
        65: "Heavy rain",
        66: "Light freezing rain",
        67: "Heavy freezing rain",
        71: "Slight snow fall",
        73: "Moderate snow fall",
        75: "Heavy snow fall",
        77: "Snow grains",
        80: "Slight rain showers",
        81: "Moderate rain showers",
        82: "Violent rain showers",
        85: "Slight snow showers",
        86: "Heavy snow showers",
        95: "Thunderstorm",
        96: "Thunderstorm with slight hail",
        99: "Thunderstorm with heavy hail"
    }
    
    return weather_codes.get(weather_code, f"Weather code {weather_code}")

@app.get("/events")
@limiter.limit("30/minute")
async def get_events(
    request: Request,
    keyword: Optional[str] = Query(None, description="Event keyword or interest"),
    city: Optional[str] = Query(None, description="City to search for events"),
    country: Optional[str] = Query(None, description="Country code (e.g., US, CA, GB)"),
    include_weather: Optional[str] = Query("false", description="Include weather forecast for events within 7 days")
):
    """Get events from Ticketmaster API based on city, country, and/or keyword"""
    
    # Convert string to boolean
    include_weather_bool = include_weather.lower() in ("true", "1", "yes", "on") if include_weather else False
    
    if not TICKETMASTER_API_KEY or TICKETMASTER_API_KEY == "your_api_key_here":
        raise HTTPException(
            status_code=500, 
            detail="Ticketmaster API key not configured. Please add your API key to the .env file."
        )
    
    # Validate that at least one search parameter is provided
    if not keyword and not city and not country:
        raise HTTPException(
            status_code=400,
            detail="Please provide at least one search parameter: keyword, city, or country."
        )
    
    try:
        params = {
            "apikey": TICKETMASTER_API_KEY,
            "size": 200,  # Number of events to return (max allowed by Ticketmaster)
            "sort": "date,asc"  # Sort by date ascending
        }
        
        # Only add keyword if provided
        if keyword and keyword.strip():
            params["keyword"] = keyword.strip()
        
        # Only add city if provided
        if city and city.strip():
            params["city"] = city.strip()
            
        # Only add country if provided
        if country and country.strip():
            params["countryCode"] = country.strip()
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{TICKETMASTER_BASE_URL}/events.json",
                params=params,
                timeout=10.0
            )
            
            if response.status_code == 401:
                logger.error("Ticketmaster rejected the API key (401)")
                raise HTTPException(status_code=502, detail="Events service is misconfigured")
            elif response.status_code != 200:
                logger.error("Ticketmaster API error %s: %s", response.status_code, response.text)
                raise HTTPException(
                    status_code=502,
                    detail="Events service returned an error, please try again later"
                )
            
            data = response.json()
            
            # Extract events from response
            embedded = data.get("_embedded", {})
            events = embedded.get("events", [])
            
            if not events:
                # Build search description
                search_parts = []
                if keyword:
                    search_parts.append(f"'{keyword}'")
                
                location_parts = []
                if city:
                    location_parts.append(city)
                if country:
                    location_parts.append(country)
                
                if location_parts:
                    location_str = f" in {', '.join(location_parts)}"
                else:
                    location_str = ""
                
                if search_parts:
                    search_str = ' '.join(search_parts)
                else:
                    search_str = "events"
                
                return {
                    "events": [],
                    "total": 0,
                    "message": f"No {search_str} found{location_str}"
                }
            
            # Parse events
            parsed_events = [parse_event_data(event) for event in events]
            
            # Add weather data if requested. Fetch all forecasts concurrently
            # rather than sequentially so a large result set isn't slowed by
            # one blocking request per event.
            if include_weather_bool:
                weather_events = [
                    e for e in parsed_events
                    if e.get("coordinates") and e.get("date")
                ]
                weather_results = await asyncio.gather(
                    *(
                        fetch_weather_data(
                            e["coordinates"]["lat"],
                            e["coordinates"]["lng"],
                            e["date"],
                        )
                        for e in weather_events
                    ),
                    return_exceptions=True,
                )
                for event, weather_data in zip(weather_events, weather_results):
                    if weather_data and not isinstance(weather_data, Exception):
                        event["weather"] = weather_data
            
            return {
                "events": parsed_events,
                "total": len(parsed_events),
                "city": city,
                "country": country,
                "keyword": keyword,
                "weather_included": include_weather_bool
            }
            
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="The events service timed out, please try again")
    except httpx.RequestError as e:
        logger.error("Network error contacting Ticketmaster: %s", e)
        raise HTTPException(status_code=503, detail="Could not reach the events service, please try again later")
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unexpected error handling /events")
        raise HTTPException(status_code=500, detail="Internal server error")

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    # proxy_headers/forwarded_allow_ips let uvicorn trust Render's proxy so the
    # rate limiter keys on the real client IP (X-Forwarded-For) instead of the
    # proxy's address.
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=port,
        proxy_headers=True,
        forwarded_allow_ips="*",
    )
