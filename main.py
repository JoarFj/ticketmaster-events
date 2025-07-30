from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import httpx
import os
from dotenv import load_dotenv
from typing import Optional, List, Dict, Any
from datetime import datetime

load_dotenv()

app = FastAPI(
    title="Event Finder API",
    description="API for discovering events using Ticketmaster API",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5173", "http://127.0.0.1:5173"],  # React dev server (Vite uses 5173)
    allow_credentials=True,
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
        print(f"Error parsing event: {e}")
        return {
            "id": event.get("id", ""),
            "name": event.get("name", "Unknown Event"),
            "date": "Unknown Date",
            "venue": "Unknown Venue",
            "location": "Unknown Location",
            "url": event.get("url", ""),
            "coordinates": None,
            "image": ""
        }

@app.get("/events")
async def get_events(
    keyword: str = Query(..., description="Event keyword or interest"),
    city: Optional[str] = Query(None, description="City to search for events"),
    country: Optional[str] = Query(None, description="Country code (e.g., US, CA, GB)")
):
    """Get events from Ticketmaster API based on city and keyword"""
    
    if not TICKETMASTER_API_KEY or TICKETMASTER_API_KEY == "your_api_key_here":
        raise HTTPException(
            status_code=500, 
            detail="Ticketmaster API key not configured. Please add your API key to the .env file."
        )
    
    try:
        params = {
            "apikey": TICKETMASTER_API_KEY,
            "keyword": keyword,
            "size": 200,  # Number of events to return (max allowed by Ticketmaster)
            "sort": "date,asc"  # Sort by date ascending
        }
        
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
                raise HTTPException(status_code=401, detail="Invalid Ticketmaster API key")
            elif response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Ticketmaster API error: {response.text}"
                )
            
            data = response.json()
            
            # Extract events from response
            embedded = data.get("_embedded", {})
            events = embedded.get("events", [])
            
            if not events:
                location_str = ""
                if city and country:
                    location_str = f" in {city}, {country}"
                elif city:
                    location_str = f" in {city}"
                elif country:
                    location_str = f" in {country}"
                
                return {
                    "events": [],
                    "total": 0,
                    "message": f"No events found for '{keyword}'{location_str}"
                }
            
            # Parse events
            parsed_events = [parse_event_data(event) for event in events]
            
            return {
                "events": parsed_events,
                "total": len(parsed_events),
                "city": city,
                "country": country,
                "keyword": keyword
            }
            
    except httpx.TimeoutException:
        raise HTTPException(status_code=408, detail="Request timeout - Ticketmaster API is slow")
    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail=f"Network error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)