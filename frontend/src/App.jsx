import { useState, useRef, useEffect } from 'react'
import './App.css'

function App() {
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [keyword, setKeyword] = useState('')
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [citySuggestions, setCitySuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const debounceRef = useRef(null)
  const cityInputRef = useRef(null)

  // Function to fetch city suggestions from OpenStreetMap
  const fetchCitySuggestions = async (query) => {
    if (!query || query.length < 2) {
      setCitySuggestions([])
      return
    }

    try {
      console.log('Searching for:', query)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=10&type=city,town,village`
      )
      const data = await response.json()
      console.log('API response:', data)
      
      // Filter and format city suggestions
      const cities = data
        .filter(item => {
          // More flexible filtering for cities
          const isCity = item.type === 'city' || 
                         item.type === 'town' || 
                         item.type === 'village' ||
                         item.class === 'place' ||
                         (item.address && (item.address.city || item.address.town || item.address.village))
          return isCity
        })
        .map(item => {
          // Better name extraction
          const cityName = item.address?.city || 
                          item.address?.town || 
                          item.address?.village || 
                          item.display_name.split(',')[0]
          
          return {
            name: cityName,
            fullName: item.display_name,
            country: item.address?.country || '',
            countryCode: item.address?.country_code?.toUpperCase() || ''
          }
        })
        .filter(city => city.name && city.country) // Only include complete results
        .slice(0, 6) // Limit to 6 suggestions

      console.log('Processed cities:', cities)
      setCitySuggestions(cities)
    } catch (error) {
      console.error('Error fetching city suggestions:', error)
      setCitySuggestions([])
    }
  }

  // Handle city input changes with debouncing
  const handleCityChange = (e) => {
    const value = e.target.value
    setCity(value)
    
    // Clear previous timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    
    // Set new timeout for API call
    debounceRef.current = setTimeout(() => {
      fetchCitySuggestions(value)
    }, 150) // 150ms delay (faster response)
    
    setShowSuggestions(true)
  }

  // Handle selecting a city suggestion
  const handleCitySelect = (suggestion) => {
    setCity(suggestion.name)
    if (suggestion.countryCode) {
      setCountry(suggestion.countryCode)
    }
    setCitySuggestions([])
    setShowSuggestions(false)
  }

  // Hide suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (cityInputRef.current && !cityInputRef.current.contains(event.target)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setEvents([])

    try {
      // Build query parameters
      const params = new URLSearchParams()
      
      if (keyword.trim()) {
        params.append('keyword', keyword)
      }
      
      if (city.trim()) {
        params.append('city', city)
      }
      
      if (country) {
        params.append('country', country)
      }
      
      // Ensure we have at least one search parameter
      if (!keyword.trim() && !city.trim() && !country) {
        setError('Please enter at least a city, country, or keyword to search.')
        setLoading(false)
        return
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
            <div className="form-group autocomplete-container" ref={cityInputRef}>
              <label htmlFor="city">City (Optional)</label>
              <input
                type="text"
                id="city"
                value={city}
                onChange={handleCityChange}
                placeholder="Enter city name (optional)"
                autoComplete="off"
              />
              
              {showSuggestions && citySuggestions.length > 0 && (
                <div className="autocomplete-dropdown">
                  {citySuggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className="autocomplete-item"
                      onClick={() => handleCitySelect(suggestion)}
                    >
                      <div className="city-name">{suggestion.name}</div>
                      <div className="city-country">{suggestion.country}</div>
                    </div>
                  ))}
                </div>
              )}
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
            <label htmlFor="keyword">Interest/Keyword (Optional)</label>
            <input
              type="text"
              id="keyword"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="e.g., music, sports, theater (leave blank for all events)"
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
