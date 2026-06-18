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
        Object.assign(CONFIG, parsedSettings);
    }
}

function saveConfigToStorage() {
    localStorage.setItem('courier_settings', JSON.stringify(CONFIG));
}

function setGoogleMapsApiKey(key) {
    CONFIG.GOOGLE_MAPS_API_KEY = key;
    localStorage.setItem('googleMapsApiKey', key);
}

updateConfigFromStorage();
