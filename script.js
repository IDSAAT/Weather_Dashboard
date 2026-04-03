// ========== NO API KEY REQUIRED! ==========
// Open-Meteo is completely free and works immediately

// ========== DOM Elements ==========
const cityInput = document.getElementById('cityInput');
const searchBtn = document.getElementById('searchBtn');
const locationBtn = document.getElementById('locationBtn');
const messageDiv = document.getElementById('message');

// Weather display elements
const weatherIcon = document.getElementById('weatherIcon');
const cityNameEl = document.getElementById('cityName');
const temperatureEl = document.getElementById('temperature');
const descriptionEl = document.getElementById('description');
const humidityEl = document.getElementById('humidity');
const windSpeedEl = document.getElementById('windSpeed');
const feelsLikeEl = document.getElementById('feelsLike');

// ========== Helper: Show Message ==========
function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    setTimeout(() => {
        if (messageDiv.textContent === text) {
            messageDiv.textContent = '';
            messageDiv.className = 'message';
        }
    }, 3000);
}

// ========== Helper: Clear Weather Display ==========
function clearWeatherDisplay() {
    weatherIcon.textContent = '🌍';
    cityNameEl.textContent = '--';
    temperatureEl.textContent = '--°C';
    descriptionEl.textContent = 'Enter a city to see weather';
    humidityEl.textContent = '--%';
    windSpeedEl.textContent = '-- km/h';
    feelsLikeEl.textContent = '--°C';
}

// ========== Get Weather Emoji ==========
function getWeatherEmoji(weatherCode) {
    // WMO Weather interpretation codes (WW)
    // https://open-meteo.com/en/docs
    if (weatherCode === 0) return '☀️';      // Clear sky
    if (weatherCode === 1) return '🌤️';     // Mainly clear
    if (weatherCode === 2) return '⛅';      // Partly cloudy
    if (weatherCode === 3) return '☁️';      // Overcast
    if (weatherCode >= 45 && weatherCode <= 48) return '🌫️';  // Fog
    if (weatherCode >= 51 && weatherCode <= 55) return '🌧️';  // Drizzle
    if (weatherCode >= 61 && weatherCode <= 65) return '🌧️';  // Rain
    if (weatherCode >= 71 && weatherCode <= 75) return '❄️';  // Snow
    if (weatherCode === 95) return '⛈️';     // Thunderstorm
    if (weatherCode >= 96 && weatherCode <= 99) return '⛈️';  // Thunderstorm with hail
    return '🌡️';
}

// ========== Get Weather Description ==========
function getWeatherDescription(weatherCode) {
    const descriptions = {
        0: 'Clear sky',
        1: 'Mainly clear',
        2: 'Partly cloudy',
        3: 'Overcast',
        45: 'Foggy',
        48: 'Depositing rime fog',
        51: 'Light drizzle',
        53: 'Moderate drizzle',
        55: 'Dense drizzle',
        61: 'Light rain',
        63: 'Moderate rain',
        65: 'Heavy rain',
        71: 'Light snow',
        73: 'Moderate snow',
        75: 'Heavy snow',
        95: 'Thunderstorm',
        96: 'Thunderstorm with hail',
        99: 'Thunderstorm with heavy hail'
    };
    return descriptions[weatherCode] || 'Unknown';
}

// ========== Convert Coordinates to City Name (Reverse Geocoding) ==========
async function getCityName(lat, lon) {
    try {
        // Using free Nominatim API (OpenStreetMap)
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
        const data = await response.json();
        return data.address?.city || data.address?.town || data.address?.village || `${lat}, ${lon}`;
    } catch (error) {
        console.error('Reverse geocoding error:', error);
        return `${lat}, ${lon}`;
    }
}

// ========== Main Function: Fetch Weather from Open-Meteo ==========
async function fetchWeather(lat, lon, locationName = null) {
    showMessage('Fetching weather data...', 'loading');
    clearWeatherDisplay();

    // Open-Meteo API URL (NO API KEY NEEDED!)
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,relative_humidity_2m,windspeed_10m&timezone=auto`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (!data.current_weather) {
            showMessage('Unable to fetch weather data. Please try again.', 'error');
            return;
        }

        // Get city name if not provided
        let displayName = locationName;
        if (!displayName) {
            displayName = await getCityName(lat, lon);
        }

        // Extract weather data
        const temperature = Math.round(data.current_weather.temperature);
        const windSpeed = Math.round(data.current_weather.windspeed);
        const weatherCode = data.current_weather.weathercode;
        const description = getWeatherDescription(weatherCode);

        // Get additional data from hourly (current hour)
        const currentHour = new Date().getHours();
        const humidity = data.hourly?.relative_humidity_2m?.[currentHour] || '--';

        // Update DOM
        cityNameEl.textContent = displayName;
        temperatureEl.textContent = `${temperature}°C`;
        descriptionEl.textContent = description;
        humidityEl.textContent = `${humidity}%`;
        windSpeedEl.textContent = `${windSpeed} km/h`;
        feelsLikeEl.textContent = `${temperature}°C`; // Open-Meteo doesn't provide feels-like directly
        weatherIcon.textContent = getWeatherEmoji(weatherCode);

        showMessage('', '');

    } catch (error) {
        console.error('Fetch error:', error);
        showMessage('Network error. Please check your connection.', 'error');
    }
}

// ========== Search by City Name (using Geocoding) ==========
async function searchByCity() {
    const city = cityInput.value.trim();

    if (city === '') {
        showMessage('Please enter a city name', 'error');
        return;
    }

    showMessage('Searching for city...', 'loading');

    // Using free Open-Meteo Geocoding API (no API key needed)
    const geocodeUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;

    try {
        const response = await fetch(geocodeUrl);
        const data = await response.json();

        if (!data.results || data.results.length === 0) {
            showMessage(`City "${city}" not found. Please try again.`, 'error');
            return;
        }

        const result = data.results[0];
        const lat = result.latitude;
        const lon = result.longitude;
        const cityName = result.name;
        const country = result.country;

        fetchWeather(lat, lon, `${cityName}, ${country}`);

    } catch (error) {
        console.error('Geocoding error:', error);
        showMessage('Error finding city. Please try again.', 'error');
    }
}

// ========== Get User's Current Location ==========
function getLocationWeather() {
    if (!navigator.geolocation) {
        showMessage('Geolocation is not supported by your browser', 'error');
        return;
    }

    showMessage('Getting your location...', 'loading');

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            fetchWeather(lat, lon);
        },
        (error) => {
            let errorMessage = 'Unable to get your location. ';
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage += 'Please allow location access.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage += 'Location information is unavailable.';
                    break;
                case error.TIMEOUT:
                    errorMessage += 'Location request timed out.';
                    break;
                default:
                    errorMessage += 'Please try searching by city instead.';
            }
            showMessage(errorMessage, 'error');
        },
        { enableHighAccuracy: true, timeout: 10000 }
    );
}

// ========== Event Listeners ==========
searchBtn.addEventListener('click', searchByCity);
locationBtn.addEventListener('click', getLocationWeather);

cityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        searchByCity();
    }
});

// ========== Initial Load ==========
clearWeatherDisplay();

// Optional: Load default city on startup (London)
// setTimeout(() => {
//     cityInput.value = 'London';
//     searchByCity();
// }, 100);