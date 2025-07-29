# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

# 🎟️ Event Finder App

A simple full-stack web app that helps users discover upcoming events based on **city** and **interest**, using the [Ticketmaster Discovery API](https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/). Built with **FastAPI** and **React**, and optionally includes an interactive map using **Google Maps** or **Mapbox**.

---

## 🛠️ Tech Stack

- **Backend**: [FastAPI](https://fastapi.tiangolo.com/)
- **Frontend**: [React](https://reactjs.org/) (with Tailwind CSS or basic styling)
- **External API**: [Ticketmaster Discovery API](https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/)
- **Optional Enhancements**:
  - Google Maps Embed API
  - Mapbox for venue maps

---

## ✅ Milestones & Tasks

### 1. 🏗️ Setup

#### Backend (FastAPI)
- [ ] Initialize FastAPI project structure (`main.py`, `requirements.txt`)
- [ ] Set up a basic `/health` endpoint
- [ ] Enable CORS so frontend can access backend

#### Frontend (React)
- [ ] Create React project (`create-react-app` or Vite)
- [ ] Build a basic UI layout: header, form, and results list

---

### 2. 🌐 Ticketmaster API Integration

#### Backend
- [ ] Create `.env` to store the Ticketmaster API key securely
- [ ] Create a FastAPI route:  
  `GET /events?city=...&keyword=...`
- [ ] In this route:
  - Fetch data from Ticketmaster API
  - Parse and return event details:
    - `name`, `date`, `venue`, `location`, `url`, `coordinates`
- [ ] Add basic error handling and fallbacks

---

### 3. 🧾 Frontend Form

#### React
- [ ] Create a search form with:
  - City input
  - Interest/keyword input
  - Submit button
- [ ] On submit:
  - Send query to FastAPI `/events` endpoint
  - Show loading spinner during request

---

### 4. 📋 Event Display

#### React
- [ ] Create an `EventCard` component showing:
  - Name, date, venue
  - "More Info" button
- [ ] On click, expand card to show:
  - Event description
  - Ticketmaster link
  - Embedded map (optional)

---

### 5. 🗺️ Map Integration (Optional)

- [ ] Use Google Maps Embed API or Mapbox
- [ ] Display a static map centered on the event venue using coordinates

---

### 6. 🎨 UI Polish

- [ ] Make layout responsive (mobile + desktop)
- [ ] Use Tailwind CSS or clean custom styles
- [ ] Add icons (e.g. Lucide, Font Awesome)
- [ ] Show user-friendly messages (e.g., "No events found.")

---

### 7. 🚀 Deployment (Optional)

- [ ] Deploy FastAPI backend on [Render](https://render.com/) or [Fly.io](https://fly.io/)
- [ ] Deploy React frontend on [Netlify](https://www.netlify.com/) or [Vercel](https://vercel.com/)
- [ ] Ensure CORS settings allow frontend-backend communication

---

## 📄 Deliverables

- [ ] Working full-stack application (frontend + backend)
- [ ] `.env.example` with placeholder for Ticketmaster API key
- [ ] Clean, commented, and modular codebase
- [ ] `README.md` with:
  - Setup instructions
  - How to get a Ticketmaster API key
  - Link to live demo (if deployed)

---

## 📬 Getting a Ticketmaster API Key

1. Go to the [Ticketmaster Developer Portal](https://developer.ticketmaster.com/)
2. Sign up and create an app
3. Copy your API key and place it in your `.env` file like this:


```

## 🚨 Code Guidelines

- **Commit Guidelines**:
  - dont tell you are author in the commits