from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI(
    title="Event Finder API",
    description="API for discovering events using Ticketmaster API",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Event Finder API is running"}

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "event-finder-api"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)