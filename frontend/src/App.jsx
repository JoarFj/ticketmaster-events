import { useState } from 'react'
import './App.css'

function App() {
  const [city, setCity] = useState('')
  const [keyword, setKeyword] = useState('')
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    // TODO: Implement API call to backend
    console.log('Searching for events:', { city, keyword })
    setLoading(false)
  }

  return (
    <div className="app">
      <header className="header">
        <h1>🎟️ Event Finder</h1>
        <p>Discover upcoming events in your city</p>
      </header>

      <main className="main">
        <form onSubmit={handleSubmit} className="search-form">
          <div className="form-group">
            <label htmlFor="city">City</label>
            <input
              type="text"
              id="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Enter city name"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="keyword">Interest/Keyword</label>
            <input
              type="text"
              id="keyword"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="e.g., music, sports, theater"
              required
            />
          </div>

          <button type="submit" disabled={loading} className="search-button">
            {loading ? 'Searching...' : 'Find Events'}
          </button>
        </form>

        <div className="results">
          {events.length === 0 && !loading && (
            <p className="no-results">No events to display. Try searching!</p>
          )}
          
          {events.map(event => (
            <div key={event.id} className="event-card">
              <h3>{event.name}</h3>
              <p>{event.date} - {event.venue}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

export default App
