import { useState } from 'react'
import './App.css'

function App() {
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [keyword, setKeyword] = useState('')
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setEvents([])

    try {
      // Build query parameters
      const params = new URLSearchParams({
        keyword: keyword
      })
      
      if (city.trim()) {
        params.append('city', city)
      }
      
      if (country) {
        params.append('country', country)
      }
      
      console.log('Search parameters:', params.toString())
      const response = await fetch(`http://localhost:8000/events?${params.toString()}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to fetch events')
      }

      const data = await response.json()
      setEvents(data.events || [])
      
      if (data.events.length === 0) {
        setError(data.message || 'No events found')
      }
    } catch (err) {
      console.error('Error fetching events:', err)
      setError(err.message || 'Failed to fetch events. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app">
      <header className="header">
        <h1>🎟️ Event Finder</h1>
        <p>Discover upcoming events in your city</p>
      </header>

      <main className="main">
        <form onSubmit={handleSubmit} className="search-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="city">City (Optional)</label>
              <input
                type="text"
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Enter city name (optional)"
              />
            </div>

            <div className="form-group">
              <label htmlFor="country">Country</label>
              <select
                id="country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              >
                <option value="">Any Country</option>
                <option value="US">United States</option>
                <option value="CA">Canada</option>
                <option value="MX">Mexico</option>
                <option value="GB">United Kingdom</option>
                <option value="DE">Germany</option>
                <option value="FR">France</option>
                <option value="ES">Spain</option>
                <option value="IT">Italy</option>
                <option value="NL">Netherlands</option>
                <option value="BE">Belgium</option>
                <option value="AU">Australia</option>
                <option value="NZ">New Zealand</option>
                <option value="SE">Sweden</option>
                <option value="NO">Norway</option>
                <option value="DK">Denmark</option>
                <option value="FI">Finland</option>
              </select>
            </div>
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
            {loading ? (
              <div className="loading-content">
                <div className="spinner"></div>
                Searching...
              </div>
            ) : (
              'Find Events'
            )}
          </button>
        </form>

        <div className="results">
          {error && (
            <div className="error-message">
              <p>{error}</p>
            </div>
          )}
          
          {events.length === 0 && !loading && !error && (
            <p className="no-results">No events to display. Try searching!</p>
          )}
          
          {events.map(event => (
            <div key={event.id} className="event-card">
              {event.image && (
                <img src={event.image} alt={event.name} className="event-image" />
              )}
              <div className="event-content">
                <h3>{event.name}</h3>
                <p className="event-date">{event.date}</p>
                <p className="event-venue">{event.venue}</p>
                <p className="event-location">{event.location}</p>
                {event.url && (
                  <a href={event.url} target="_blank" rel="noopener noreferrer" className="event-link">
                    View Details
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

export default App
