'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface WeatherData {
  name: string;
  temperature: number;
  humidity: number;
  wind: number;
  rain: number;
}

interface CitySuggestion {
  display_name: string;
  lat: number;
  lon: number;
}

export default function Map() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const popupRef = useRef<L.Popup | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const handleSearch = async (query: string) => {
    if (query.length < 1) {
      setSuggestions([]);
      return;
    }

    try {
      // Modified search query to be more flexible
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ', California')}&limit=10&addressdetails=1&featuretype=city,town,village&countrycodes=us`
      );
      const data = await response.json();
      
      // Filter for cities in California and sort by relevance
      const californiaCities = data
        .filter((city: CitySuggestion) => {
          // Check if the city is within California's bounds
          return city.lat >= 32.5121 && city.lat <= 42.0095 && 
                 city.lon >= -124.4096 && city.lon <= -114.1369;
        })
        .sort((a: CitySuggestion, b: CitySuggestion) => {
          // Sort by how well the city name matches the search query
          const aMatch = a.display_name.toLowerCase().startsWith(query.toLowerCase());
          const bMatch = b.display_name.toLowerCase().startsWith(query.toLowerCase());
          if (aMatch && !bMatch) return -1;
          if (!aMatch && bMatch) return 1;
          return 0;
        });

      setSuggestions(californiaCities);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Error fetching city suggestions:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for debouncing (reduced to 100ms for faster response)
    searchTimeoutRef.current = setTimeout(() => {
      handleSearch(query);
    }, 100);
  };

  const handleSuggestionClick = (city: CitySuggestion) => {
    setSearchQuery(city.display_name.split(',')[0]);
    setSuggestions([]);
    setShowSuggestions(false);

    // Center map on the selected city
    if (mapInstance.current) {
      mapInstance.current.setView([city.lat, city.lon], 10);
      
      // Simulate a click at the city's location to show weather and fire score
      const clickEvent = {
        latlng: L.latLng(city.lat, city.lon)
      };
      mapInstance.current.fire('click', clickEvent);
    }
  };

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    // Fix for default marker icons
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });

    // Initialize map if container exists
    if (mapRef.current && !mapInstance.current) {
      // California boundaries
      const californiaPolygon = L.polygon([
        [42.0095, -124.4096], // Northwest corner
        [42.0095, -114.0000], // Northeast corner
        [43.5000, -114.0000], // Northeast border
        [43.5000, -114.0000], // Northeast border
        [43.0000, -114.0000], // Northern border
        [42.5000, -114.0000], // Northern border
        [42.0000, -114.0000], // Northern border
        [41.0000, -114.0000], // Northern border
        [40.0000, -114.0000], // Northern border
        [39.0000, -114.0000], // Northern border
        [38.0000, -114.0000], // Northern border
        [37.0000, -114.0000], // Northern border
        [36.0000, -114.0000], // Northern border
        [35.0000, -114.0000], // Northern border
        [34.0000, -114.0000], // Northern border
        [33.0000, -114.0000], // Northern border
        [30.5121, -114.0000], // Northern border
        [30.5121, -117.0000], // Southwest corner
        [30.5121, -124.4096], // Northwest corner
      ]);

      // Real California border for click validation
      const realBorder = L.polygon([
        [40.43137288339332, -124.38914179917593],
        [41.97582726102573, -124.27734375000001],
        [41.99451583602981, -119.99993527777261],
        [39.000509457512635, -120.00091552734376],
        [35.003003395276714, -114.63134765625001],
        [34.27083595165, -114.13696289062501],
        [32.74108223150125, -114.55444335937501],
        [32.54681317351517, -117.13623046875001],
        [33.14675022877648, -119.66308593750001],
        [38.91668153637508, -123.77197265625001],
        [40.43137288339332, -124.38914179917593], // Northwest corner
      ]);

      mapInstance.current = L.map(mapRef.current, {
        center: [36.7783, -119.4179], // California coordinates
        zoom: 7.5,
        zoomControl: true,
        maxBounds: californiaPolygon.getBounds(),
        maxBoundsViscosity: .3,
        minZoom: 7,
        maxZoom: 12,
        zoomSnap: 0.5,
        zoomDelta: 0.5,
      });

      // Move zoom control to bottom right
      mapInstance.current.zoomControl.setPosition('bottomright');

      // Add zoom handler to adjust bounds viscosity
      mapInstance.current.on('zoom', () => {
        const currentZoom = mapInstance.current?.getZoom() || 7.5;
        if (mapInstance.current) {
          if (currentZoom >= 9) {
            mapInstance.current.options.maxBoundsViscosity = 0.05;
          } else {
            mapInstance.current.options.maxBoundsViscosity = 0.3;
          }
        }
      });

      // Add the tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapInstance.current);

      // Add click handler
      mapInstance.current.on('click', async (e) => {
        const { lat, lng } = e.latlng;
        
        //alert(lat + ' ' + lng);
        //39.000509457512635 -119.99885559082033

        // Check if the clicked location is within real California border
        if (!realBorder.getBounds().contains(e.latlng)) {
          // Remove existing popup if it exists
          if (popupRef.current) {
            mapInstance.current?.removeLayer(popupRef.current);
          }
          return;
        }
        
        try {
          // First, get the city name using reverse geocoding
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
          );
          const data = await response.json();
          const cityName = data.address.city || data.address.town || data.address.village || 'Unknown Location';

          // Get weather data from OpenMeteo
          const weatherResponse = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation&timezone=auto`
          );
          
          if (!weatherResponse.ok) {
            throw new Error('Failed to fetch weather data');
          }

          const weatherData = await weatherResponse.json();

          // Check if we have valid weather data
          if (!weatherData.current) {
            throw new Error('Invalid weather data received');
          }

          const weatherInfo: WeatherData = {
            name: cityName,
            temperature: Math.round(weatherData.current.temperature_2m),
            humidity: Math.round(weatherData.current.relative_humidity_2m),
            wind: Math.round(weatherData.current.wind_speed_10m),
            rain: Math.round(weatherData.current.precipitation)
          };

          setWeatherData(weatherInfo);

          // Show initial popup with weather data
          if (popupRef.current) {
            mapInstance.current?.removeLayer(popupRef.current);
          }

          // Create initial popup with loading state for fire score
          popupRef.current = L.popup({
            maxWidth: 200,
            className: 'custom-popup',
            offset: [0, 10]
          })
            .setLatLng(e.latlng)
            .setContent(`
              <div class="p-2">
                <h3 class="font-bold text-lg">${weatherInfo.name}</h3>
                <p>Temperature: ${weatherInfo.temperature}°C (${Math.round(weatherInfo.temperature * 1.8 + 32)}°F)</p>
                <p>Humidity: ${weatherInfo.humidity}%</p>
                <p>Wind: ${weatherInfo.wind} km/h (${Math.round(weatherInfo.wind / 1.60934)} mph)</p>
                <p>Precipitation: ${weatherInfo.rain} mm (${(weatherInfo.rain / 25.4).toFixed(2)} inches)</p>
                <div class="mt-2">
                  <p class="font-semibold">Calculating Fire Risk Score...</p>
                  <div class="animate-pulse bg-gray-200 h-4 w-24 rounded mt-1"></div>
                </div>
              </div>
            `)
            .addTo(mapInstance.current!);

          // Get fire risk score
          try {
            const fireScoreResponse = await fetch('http://localhost:8000/fire-score', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                location: weatherInfo.name,
                temperature: weatherInfo.temperature * 1.8 + 32, // Convert °C to °F
                humidity: weatherInfo.humidity,
                rain: weatherInfo.rain / 25.4, // Convert mm to inches
                wind: weatherInfo.wind / 1.60934 // Convert km/h to mph
              })
            });

            if (!fireScoreResponse.ok) {
              throw new Error('Failed to fetch fire score');
            }

            const fireScoreData = await fireScoreResponse.json();
            // Extract just the number from the response
            const scoreMatch = fireScoreData.score.match(/FIRE_SCORE_NUMBER\s*=\s*(\d+)/);
            const fireScore = scoreMatch ? parseInt(scoreMatch[1]) : 0;

            // Update popup with fire score
            if (popupRef.current && mapInstance.current) {
              popupRef.current.setContent(`
                <div class="p-2">
                  <h3 class="font-bold text-lg">${weatherInfo.name}</h3>
                  <p>Temperature: ${weatherInfo.temperature}°C (${Math.round(weatherInfo.temperature * 1.8 + 32)}°F)</p>
                  <p>Humidity: ${weatherInfo.humidity}%</p>
                  <p>Wind: ${weatherInfo.wind} km/h (${Math.round(weatherInfo.wind / 1.60934)} mph)</p>
                  <p>Precipitation: ${weatherInfo.rain} mm (${(weatherInfo.rain / 25.4).toFixed(2)} inches)</p>
                  <div class="mt-2">
                    <p class="font-semibold">Fire Risk Score: 
                      <span class="${
                        fireScore > 70 ? 'text-red-600' : 
                        fireScore > 40 ? 'text-yellow-600' : 
                        'text-green-600'
                      }">${fireScore}</span>
                    </p>
                    <p class="text-sm mt-1 ${
                      fireScore > 70 ? 'text-red-600' : 
                      fireScore > 40 ? 'text-yellow-600' : 
                      'text-green-600'
                    }">
                      ${
                        fireScore > 70 ? 'High Risk - Take Precautions!' : 
                        fireScore > 40 ? 'Moderate Risk - Stay Alert' : 
                        'Low Risk - Safe Conditions'
                      }
                    </p>
                  </div>
                </div>
              `);
            }
          } catch (error) {
            console.error('Error fetching fire score:', error);
            // Update popup to show error for fire score
            if (popupRef.current && mapInstance.current) {
              popupRef.current.setContent(`
                <div class="p-2">
                  <h3 class="font-bold text-lg">${weatherInfo.name}</h3>
                  <p>Temperature: ${weatherInfo.temperature}°C (${Math.round(weatherInfo.temperature * 1.8 + 32)}°F)</p>
                  <p>Humidity: ${weatherInfo.humidity}%</p>
                  <p>Wind: ${weatherInfo.wind} km/h (${Math.round(weatherInfo.wind / 1.60934)} mph)</p>
                  <p>Precipitation: ${weatherInfo.rain} mm (${(weatherInfo.rain / 25.4).toFixed(2)} inches)</p>
                  <div class="mt-2">
                    <p class="font-semibold text-red-600">Failed to load fire risk score</p>
                  </div>
                </div>
              `);
            }
          }

        } catch (error) {
          console.error('Error:', error);
          // Remove existing popup if it exists
          if (popupRef.current) {
            mapInstance.current?.removeLayer(popupRef.current);
          }

          // Create new error popup
          popupRef.current = L.popup({
            maxWidth: 200,
            className: 'custom-popup',
            offset: [0, 10]
          })
            .setLatLng(e.latlng)
            .setContent(`
              <div class="p-2">
                <h3 class="font-bold text-lg text-red-600">Error</h3>
                <p>Failed to load data. Please try again later.</p>
              </div>
            `)
            .addTo(mapInstance.current!);
        }
      });

      // Force a resize after initialization
      setTimeout(() => {
        mapInstance.current?.invalidateSize();
      }, 100);
    }

    // Cleanup
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []); // Remove suggestions and showSuggestions from dependencies

  return (
    <div className="relative w-full h-full" style={{ minHeight: '500px' }}>
      <div 
        ref={mapRef} 
        className="w-full h-full"
      />
      <div className="absolute top-4 left-4 z-[1000] bg-white rounded-lg shadow-lg p-2">
        <input
          type="text"
          placeholder="Search for a city..."
          value={searchQuery}
          onChange={handleInputChange}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && suggestions.length > 0) {
              handleSuggestionClick(suggestions[0]);
            }
          }}
          className="w-[200px] p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
        />
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-[200px] overflow-y-auto">
            {suggestions.map((city, index) => (
              <div
                key={index}
                className="p-2 hover:bg-gray-100 cursor-pointer text-black"
                onClick={() => handleSuggestionClick(city)}
              >
                {city.display_name.split(',')[0]}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 