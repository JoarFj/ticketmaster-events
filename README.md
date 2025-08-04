# 🎟️ Event Finder

A modern event discovery app built with FastAPI + React that searches Ticketmaster's API with weather integration.

## Features
- Search events by city, country, and/or keyword
- City autocomplete with OpenStreetMap
- Weather forecasts for events within 7 days (OpenMeteo API)
- Interactive help with clickable keyword suggestions  
- Sort by date, name, or venue
- Pagination with customizable results per page

## Project Structure
```
├── backend/          # FastAPI backend
│   ├── main.py       # Main application
│   ├── requirements.txt
│   ├── render.yaml   # Render deployment config
│   └── .env.example
├── frontend/         # React frontend
│   ├── src/
│   ├── package.json
│   ├── vercel.json   # Vercel deployment config
│   └── .env.example
└── README.md
```

## Development Setup

### Backend
1. Navigate to backend: `cd backend`
2. Install dependencies: `pip install -r requirements.txt`
3. Copy `.env.example` to `.env` and add your Ticketmaster API key
4. Run server: `python main.py`

### Frontend  
1. Navigate to frontend: `cd frontend`
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` (optional for development)
4. Run dev server: `npm run dev`

Visit `http://localhost:5173` and search for events!

## Deployment

### Backend (Render)
1. Connect your GitHub repo to Render
2. Set build command: `pip install -r requirements.txt`
3. Set start command: `python main.py`
4. Add environment variables:
   - `TICKETMASTER_API_KEY`: Your API key
   - `ENVIRONMENT`: production

### Frontend (Vercel)
1. Connect your GitHub repo to Vercel
2. Set framework preset: Vite
3. Set root directory: `frontend`
4. Add environment variable:
   - `VITE_API_URL`: Your Render backend URL

## API Keys
- Get a Ticketmaster API key from [developer.ticketmaster.com](https://developer.ticketmaster.com/)
- Weather data is provided by OpenMeteo (no API key required)
