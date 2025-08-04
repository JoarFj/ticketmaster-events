# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Event Finder is a full-stack web application that allows users to discover upcoming events using the Ticketmaster Discovery API. The app features city autocomplete, advanced search filters, sorting, pagination, and a modern glassmorphism UI design.

## Tech Stack

- **Backend**: FastAPI (Python 3.12+) with uvicorn server
- **Frontend**: React 19 with Vite build system
- **Styling**: Custom CSS with glassmorphism design
- **External APIs**: 
  - Ticketmaster Discovery API (events data)
  - OpenStreetMap Nominatim API (city autocomplete)
- **HTTP Client**: httpx (backend), fetch API (frontend)
- **Environment**: python-dotenv for configuration

## Development Commands

### Backend
```bash
# Install dependencies
pip install -r requirements.txt

# Run development server
python main.py
# Server runs on http://localhost:8000

# Check API health
curl http://localhost:8000/health
```

### Frontend
```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
# Server runs on http://localhost:5173

# Build for production
npm run build

# Lint code
npm run lint

# Preview production build
npm run preview
```

## Architecture

### Backend Structure (`main.py`)
- **FastAPI Application**: Single-file architecture with all routes and logic
- **CORS Configuration**: Supports React dev servers on ports 3000 and 5173
- **Environment Variables**: Loads Ticketmaster API key from `.env`
- **API Endpoints**:
  - `GET /` - Root endpoint with welcome message
  - `GET /health` - Health check endpoint
  - `GET /events` - Main search endpoint with city, country, keyword parameters
- **Error Handling**: Comprehensive HTTP exception handling for API failures
- **Data Parsing**: `parse_event_data()` function transforms Ticketmaster responses

### Frontend Structure (`frontend/src/App.jsx`)
- **Single Component Architecture**: All functionality in main App component
- **State Management**: React hooks for search form, results, pagination, sorting
- **City Autocomplete**: Debounced search with OpenStreetMap integration
- **Search Features**: 
  - Multi-parameter search (city, country, keyword)
  - Interactive help panel with clickable keyword suggestions
  - Sort by date, name, or venue
  - Pagination with customizable results per page (15/30/60/100/all)
- **UI Components**: Event cards with images, venue info, and external links

## Key Patterns

### API Integration
- Backend makes async HTTP requests to Ticketmaster API using httpx
- Error handling includes timeout, network errors, and API key validation
- Frontend makes requests to local backend API, not directly to Ticketmaster
- City autocomplete uses OpenStreetMap Nominatim API directly from frontend

### State Management
- React useState hooks for all component state
- useEffect hooks for side effects (pagination reset, click outside handling)
- useRef for DOM references and debouncing

### Data Flow
1. User enters search parameters in React frontend
2. Frontend sends request to FastAPI backend `/events` endpoint
3. Backend validates parameters and makes authenticated request to Ticketmaster
4. Backend parses and transforms Ticketmaster response
5. Frontend receives processed events and handles display/pagination/sorting

## Configuration

### Environment Variables
Create `.env` file in project root:
```
TICKETMASTER_API_KEY=your_api_key_here
```

### Development Setup
1. Backend runs on port 8000
2. Frontend dev server runs on port 5173 (Vite default)
3. CORS is configured to allow frontend-backend communication
4. Both servers should run simultaneously for full functionality

## Code Guidelines

- **Commit Messages**: Use conventional commit format without author attribution
- **Error Handling**: Always provide user-friendly error messages
- **API Keys**: Never commit actual API keys; use `.env` and `.env.example`
- **Code Style**: Follow existing patterns in each file
- **Dependencies**: Check existing imports before adding new libraries