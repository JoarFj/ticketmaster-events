# 🎟️ Event Finder

A modern event discovery app built with FastAPI + React that searches Ticketmaster's API.

## Features
- Search events by city, country, and/or keyword
- City autocomplete with OpenStreetMap
- Interactive help with clickable keyword suggestions  
- Sort by date, name, or venue
- Pagination with customizable results per page
- Responsive glassmorphism design

## Setup
1. Install Python dependencies: `pip install -r requirements.txt`
2. Install frontend dependencies: `cd frontend && npm install`
3. Add your Ticketmaster API key to `.env`:
   ```
   TICKETMASTER_API_KEY=your_api_key_here
   ```
4. Run backend: `python main.py`
5. Run frontend: `cd frontend && npm run dev`

## Usage
Visit `http://localhost:5173` and search for events by entering at least one search parameter (city, country, or keyword).
