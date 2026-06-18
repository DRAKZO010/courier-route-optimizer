const CONFIG = {
    GOOGLE_MAPS_API_KEY: localStorage.getItem('googleMapsApiKey') || 'AIzaSyDemoKey',
    MAX_PACKAGE_DISTANCE: 50,
    AVERAGE_SPEED: 30,
    REFRESH_INTERVAL: 5000,
    APP_NAME: 'Courier Route Optimizer',
    APP_VERSION: '1.0.0',
    ENABLE_NOTIFICATIONS: true,
    AUTO_OPTIMIZE_ROUTES: true,
    ENABLE_GPS_TRACKING: true,
    GEOLOCATION_OPTIONS: {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
    },
    ROUTE_OPTIMIZATION: {
        method: 'nearest-neighbor',
        maxStopsPerRoute: 20,
        minStopsPerRoute: 1
    },
    OCR: {
        language: 'eng',
        confidenceThreshold: 60,
        maxRetries: 2
    },
    STORAGE_KEYS: {
        PACKAGES: 'courier_packages',
        ROUTES: 'courier_routes',
        HISTORY: 'courier_history',
        SETTINGS: 'courier_settings',
        CURRENT_LOCATION: 'courier_current_location'
    }
};

function updateConfigFromStorage() {
    const settings = localStorage.getItem('courier_settings');
    if (settings) {
        const parsedSettings = JSON.parse(settings);
        const allowedKeys = ['MAX_PACKAGE_DISTANCE', 'AVERAGE_SPEED', 'REFRESH_INTERVAL',
            'ENABLE_NOTIFICATIONS', 'AUTO_OPTIMIZE_ROUTES', 'ENABLE_GPS_TRACKING'];
        for (const key of Object.keys(parsedSettings)) {
            if (allowedKeys.includes(key) && parsedSettings[key] !== undefined && parsedSettings[key] !== null) {
                CONFIG[key] = parsedSettings[key];
            }
        }
    }
}

function saveConfigToStorage() {
    localStorage.setItem('courier_settings', JSON.stringify(CONFIG));
}

function setGoogleMapsApiKey(key) {
    CONFIG.GOOGLE_MAPS_API_KEY = key;
    localStorage.setItem('googleMapsApiKey', key);
    loadGoogleMapsApi(key);
}

function loadGoogleMapsApi(key) {
    if (!key || key === 'AIzaSyDemoKey') {
        console.warn('No valid Google Maps API key. Maps features disabled.');
        return;
    }
    const existing = document.querySelector(`script[src*="maps.googleapis.com"]`);
    if (existing) return;

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places,geometry&callback=onGoogleMapsLoaded`;
    script.async = true;
    script.defer = true;
    script.onerror = () => console.error('Failed to load Google Maps API');
    document.head.appendChild(script);
}

function onGoogleMapsLoaded() {
    console.log('Google Maps API loaded');
    if (typeof Maps !== 'undefined' && typeof Maps.init === 'function') {
        Maps.init('map');
    }
}

const savedKey = localStorage.getItem('googleMapsApiKey');
if (savedKey) {
    loadGoogleMapsApi(savedKey);
}

updateConfigFromStorage();
