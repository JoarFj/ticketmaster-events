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
  const [showHelp, setShowHelp] = useState(false)
  const [sortBy, setSortBy] = useState('date-asc') // Default: oldest first (Ticketmaster default)
  const [currentPage, setCurrentPage] = useState(1)
  const [resultsPerPage, setResultsPerPage] = useState(30)
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

  // Function to parse Ticketmaster date format
  const parseEventDate = (dateString) => {
    if (!dateString) return new Date(0) // Default early date for invalid dates
    
    // Ticketmaster format is typically "2024-03-15 at 19:30" or just "2024-03-15"
    // Remove the " at HH:MM" part and just use the date
    const dateOnly = dateString.split(' at ')[0]
    
    // Try to parse the date
    const parsedDate = new Date(dateOnly)
    
    // If invalid, return a very early date so it sorts to the beginning
    return isNaN(parsedDate.getTime()) ? new Date(0) : parsedDate
  }

  // Function to sort events
  const sortEvents = (events, sortType) => {
    const sortedEvents = [...events]
    
    // Debug: log first few dates to see format
    if (events.length > 0) {
      console.log('Sample event dates:', events.slice(0, 3).map(e => ({ name: e.name, date: e.date, parsed: parseEventDate(e.date) })))
    }
    
    switch (sortType) {
      case 'date-asc':
        // Oldest first (default from API)
        return sortedEvents.sort((a, b) => parseEventDate(a.date) - parseEventDate(b.date))
      
      case 'date-desc':
        // Newest first
        return sortedEvents.sort((a, b) => parseEventDate(b.date) - parseEventDate(a.date))
      
      case 'name-asc':
        // A-Z by event name
        return sortedEvents.sort((a, b) => a.name.localeCompare(b.name))
      
      case 'name-desc':
        // Z-A by event name
        return sortedEvents.sort((a, b) => b.name.localeCompare(a.name))
      
      case 'venue-asc':
        // A-Z by venue name
        return sortedEvents.sort((a, b) => a.venue.localeCompare(b.venue))
      
      default:
        return sortedEvents
    }
  }

  // Get sorted events for display
  const sortedEvents = sortEvents(events, sortBy)
  
  // Pagination logic
  const totalPages = resultsPerPage === 'all' ? 1 : Math.ceil(sortedEvents.length / resultsPerPage)
  const startIndex = resultsPerPage === 'all' ? 0 : (currentPage - 1) * resultsPerPage
  const endIndex = resultsPerPage === 'all' ? sortedEvents.length : startIndex + resultsPerPage
  const currentEvents = sortedEvents.slice(startIndex, endIndex)
  
  // Reset to page 1 when search results change
  useEffect(() => {
    setCurrentPage(1)
  }, [events])
  
  // Reset to page 1 when results per page changes
  useEffect(() => {
    setCurrentPage(1)
  }, [resultsPerPage])

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
            <div className="keyword-header">
              <label htmlFor="keyword">Interest/Keyword (Optional)</label>
              <button
                type="button"
                className="help-button"
                onClick={() => setShowHelp(!showHelp)}
                title="Show search examples"
              >
                ?
              </button>
            </div>
            <input
              type="text"
              id="keyword"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="e.g., music, sports, theater (leave blank for all events)"
            />
            
            {showHelp && (
              <div className="help-panel">
                <h4>🎯 Search Examples</h4>
                
                <div className="help-section">
                  <h5>🎵 Music</h5>
                  <div className="keyword-tags">
                    <span className="keyword-tag" onClick={() => setKeyword('rock')}>rock</span>
                    <span className="keyword-tag" onClick={() => setKeyword('pop')}>pop</span>
                    <span className="keyword-tag" onClick={() => setKeyword('classical')}>classical</span>
                    <span className="keyword-tag" onClick={() => setKeyword('jazz')}>jazz</span>
                    <span className="keyword-tag" onClick={() => setKeyword('hip hop')}>hip hop</span>
                    <span className="keyword-tag" onClick={() => setKeyword('country')}>country</span>
                    <span className="keyword-tag" onClick={() => setKeyword('electronic')}>electronic</span>
                    <span className="keyword-tag" onClick={() => setKeyword('indie')}>indie</span>
                  </div>
                </div>

                <div className="help-section">
                  <h5>⚽ Sports</h5>
                  <div className="keyword-tags">
                    <span className="keyword-tag" onClick={() => setKeyword('football')}>football</span>
                    <span className="keyword-tag" onClick={() => setKeyword('basketball')}>basketball</span>
                    <span className="keyword-tag" onClick={() => setKeyword('baseball')}>baseball</span>
                    <span className="keyword-tag" onClick={() => setKeyword('hockey')}>hockey</span>
                    <span className="keyword-tag" onClick={() => setKeyword('soccer')}>soccer</span>
                    <span className="keyword-tag" onClick={() => setKeyword('tennis')}>tennis</span>
                    <span className="keyword-tag" onClick={() => setKeyword('golf')}>golf</span>
                  </div>
                </div>

                <div className="help-section">
                  <h5>🎭 Arts & Theater</h5>
                  <div className="keyword-tags">
                    <span className="keyword-tag" onClick={() => setKeyword('theater')}>theater</span>
                    <span className="keyword-tag" onClick={() => setKeyword('comedy')}>comedy</span>
                    <span className="keyword-tag" onClick={() => setKeyword('ballet')}>ballet</span>
                    <span className="keyword-tag" onClick={() => setKeyword('opera')}>opera</span>
                    <span className="keyword-tag" onClick={() => setKeyword('musical')}>musical</span>
                    <span className="keyword-tag" onClick={() => setKeyword('dance')}>dance</span>
                  </div>
                </div>

                <div className="help-section">
                  <h5>🎪 Other Events</h5>
                  <div className="keyword-tags">
                    <span className="keyword-tag" onClick={() => setKeyword('family')}>family</span>
                    <span className="keyword-tag" onClick={() => setKeyword('festival')}>festival</span>
                    <span className="keyword-tag" onClick={() => setKeyword('conference')}>conference</span>
                    <span className="keyword-tag" onClick={() => setKeyword('exhibition')}>exhibition</span>
                    <span className="keyword-tag" onClick={() => setKeyword('circus')}>circus</span>
                  </div>
                </div>

                <div className="help-tip">
                  <strong>💡 Pro tip:</strong> You can also search for specific artist names, band names, or team names!
                </div>
              </div>
            )}
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

          {events.length > 0 && (
            <div className="results-header">
              <div className="results-info">
                <div className="results-count">
                  Found {events.length} events
                  {resultsPerPage !== 'all' && (
                    <span className="page-info">
                      (showing {startIndex + 1}-{Math.min(endIndex, sortedEvents.length)})
                    </span>
                  )}
                </div>
                <div className="pagination-controls">
                  <label htmlFor="results-per-page">Show:</label>
                  <select
                    id="results-per-page"
                    value={resultsPerPage}
                    onChange={(e) => setResultsPerPage(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                    className="results-select"
                  >
                    <option value={15}>15 per page</option>
                    <option value={30}>30 per page</option>
                    <option value={60}>60 per page</option>
                    <option value={100}>100 per page</option>
                    <option value="all">Show all</option>
                  </select>
                </div>
              </div>
              <div className="sort-controls">
                <label htmlFor="sort-select">Sort by:</label>
                <select
                  id="sort-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="sort-select"
                >
                  <option value="date-asc">📅 Date (Soonest First)</option>
                  <option value="date-desc">📅 Date (Latest First)</option>
                  <option value="name-asc">🔤 Name (A-Z)</option>
                  <option value="name-desc">🔤 Name (Z-A)</option>
                  <option value="venue-asc">🏛️ Venue (A-Z)</option>
                </select>
              </div>
            </div>
          )}
          
          {events.length > 0 && (
            <div className="results-grid">
              {currentEvents.map(event => (
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
          )}

          {/* Pagination Controls */}
          {events.length > 0 && resultsPerPage !== 'all' && totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="pagination-btn"
              >
                ← Previous
              </button>
              
              <div className="page-numbers">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = currentPage <= 3 
                    ? i + 1 
                    : currentPage >= totalPages - 2 
                    ? totalPages - 4 + i 
                    : currentPage - 2 + i
                  
                  if (pageNum < 1 || pageNum > totalPages) return null
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`page-btn ${currentPage === pageNum ? 'active' : ''}`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
              </div>
              
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="pagination-btn"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default App
