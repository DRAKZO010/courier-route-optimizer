let currentLocation = null;

window.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
    updateDashboard();
});

function initializeApp() {
    try {
        Maps.init('map');
    } catch (e) {
        console.error('Map initialization error:', e);
    }

    getCurrentLocation();
    loadSettings();
    setInterval(updateDashboard, CONFIG.REFRESH_INTERVAL);
}

function setupEventListeners() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            navigateToSection(e.target.dataset.section);
        });
    });

    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            switchScannerMode(e.target.dataset.mode);
        });
    });

    document.getElementById('start-barcode-scan').addEventListener('click', () => {
        Scanner.initBarcodeScanner();
        document.getElementById('start-barcode-scan').style.display = 'none';
        document.getElementById('stop-barcode-scan').style.display = 'inline-block';
    });

    document.getElementById('stop-barcode-scan').addEventListener('click', () => {
        Scanner.stopBarcodeScanner();
        document.getElementById('start-barcode-scan').style.display = 'inline-block';
        document.getElementById('stop-barcode-scan').style.display = 'none';
    });

    document.getElementById('manual-entry-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = {
            packageId: document.getElementById('package-id').value,
            recipientName: document.getElementById('recipient-name').value,
            deliveryAddress: document.getElementById('delivery-address').value,
            latitude: parseFloat(document.getElementById('latitude').value) || null,
            longitude: parseFloat(document.getElementById('longitude').value) || null,
            phoneNumber: document.getElementById('phone-number').value
        };
        Scanner.handleManualEntry(formData);
        e.target.reset();
    });

    document.getElementById('optimize-routes').addEventListener('click', optimizeRoutes);
    document.getElementById('start-delivery').addEventListener('click', startDeliveryRoute);

    document.getElementById('clear-history').addEventListener('click', () => {
        if (confirm('Clear all delivery history?')) {
            Storage.clearHistory();
            displayHistory();
            showNotification('History cleared', 'success');
        }
    });

    document.getElementById('save-settings').addEventListener('click', saveSettings);
    document.getElementById('export-data').addEventListener('click', exportData);
    document.getElementById('reset-app').addEventListener('click', () => {
        if (confirm('Reset all data? This cannot be undone.')) {
            Storage.clearAll();
            showNotification('All data cleared', 'success');
            location.reload();
        }
    });

    document.getElementById('scan-another').addEventListener('click', () => {
        document.getElementById('scan-result').style.display = 'none';
        document.getElementById('manual-entry-form').reset();
        navigateToSection('scanner');
    });
}

function navigateToSection(section) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

    document.getElementById(section).classList.add('active');
    document.querySelector(`[data-section="${section}"]`).classList.add('active');
}

function switchScannerMode(mode) {
    document.querySelectorAll('.mode-content').forEach(m => m.classList.remove('active'));
    document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));

    document.getElementById(`${mode}-mode`).classList.add('active');
    document.querySelector(`[data-mode="${mode}"]`).classList.add('active');
}

function getCurrentLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                currentLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                updateLocationBadge(currentLocation);
            },
            (error) => {
                console.error('Geolocation error:', error);
                showNotification('Unable to access location', 'error');
            }
        );
    }
}

function updateLocationBadge(location) {
    if (location) {
        document.getElementById('current-location').textContent = 
            `📍 ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`;
    }
}

function updateDashboard() {
    const packages = Storage.getPackages();
    const pendingPackages = packages.filter(p => p.status === 'pending');
    const deliveredCount = packages.filter(p => p.status === 'delivered').length;

    document.getElementById('stat-total').textContent = packages.length;
    document.getElementById('stat-delivered').textContent = deliveredCount;
    document.getElementById('package-count').textContent = `📦 ${packages.length} packages`;

    if (currentLocation && pendingPackages.length > 0) {
        const totalDistance = RouteOptimizer.calculateTotalDistance(pendingPackages, currentLocation);
        const estimatedTime = RouteOptimizer.calculateEstimatedTime(totalDistance);
        document.getElementById('stat-distance').textContent = `${totalDistance} km`;
        document.getElementById('stat-time').textContent = `${estimatedTime} min`;
    }

    displayPackages();
    displayRoutes();
    displayHistory();
}

function displayPackages() {
    const packages = Storage.getPackages();
    const container = document.getElementById('packages-container');

    if (packages.length === 0) {
        container.innerHTML = '<p class="empty-state">No packages scanned yet. Start by scanning a package!</p>';
        return;
    }

    let html = '';
    packages.forEach(pkg => {
        const distance = currentLocation ? 
            Maps.calculateDistance(currentLocation, { lat: pkg.latitude, lng: pkg.longitude }).toFixed(2) : 'N/A';
        const statusClass = pkg.status === 'delivered' ? 'delivered' : 'pending';
        const statusEmoji = pkg.status === 'delivered' ? '✅' : '⏳';

        html += `
            <div class="package-item">
                <div class="package-info">
                    <div class="package-name">${statusEmoji} ${pkg.name}</div>
                    <div class="package-address">${pkg.address}</div>
                    <div class="package-distance">📍 ${distance} km away</div>
                </div>
                <span class="package-status ${statusClass}">${pkg.status.toUpperCase()}</span>
            </div>
        `;
    });

    container.innerHTML = html;
}

function displayRoutes() {
    const routes = Storage.getRoutes();
    const container = document.getElementById('routes-list');

    if (routes.length === 0) {
        container.innerHTML = '<p class="empty-state">No routes available. Optimize packages first.</p>';
        return;
    }

    let html = '';
    routes.forEach((route, index) => {
        html += `
            <div class="route-card">
                <div class="route-header">
                    <div class="route-title">Route ${index + 1}</div>
                    <div class="route-badge">${route.packages.length} packages</div>
                </div>
                <div class="route-stats">
                    <div class="route-stat">
                        <div class="route-stat-label">Distance</div>
                        <div class="route-stat-value">${route.distance} km</div>
                    </div>
                    <div class="route-stat">
                        <div class="route-stat-label">Est. Time</div>
                        <div class="route-stat-value">${route.estimatedTime} min</div>
                    </div>
                </div>
                <div class="route-packages">${route.packages.map(p => p.name).join(', ')}</div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function displayHistory() {
    const history = Storage.getHistory();
    const container = document.getElementById('history-list');

    if (history.length === 0) {
        container.innerHTML = '<p class="empty-state">No delivery history yet.</p>';
        return;
    }

    let html = '';
    history.forEach(entry => {
        const date = new Date(entry.timestamp).toLocaleDateString();
        html += `
            <div class="history-item">
                <div class="history-info">
                    <div class="history-title">${entry.packageName}</div>
                    <div class="history-date">${date}</div>
                </div>
                <span class="history-status delivered">✅ DELIVERED</span>
            </div>
        `;
    });

    container.innerHTML = html;
}

function optimizeRoutes() {
    if (!currentLocation) {
        showNotification('Current location not available', 'error');
        return;
    }

    const packages = Storage.getPackages().filter(p => p.status === 'pending');
    if (packages.length === 0) {
        showNotification('No pending packages to optimize', 'warning');
        return;
    }

    const routes = RouteOptimizer.optimizeRoutes(packages, currentLocation);
    Storage.saveRoutes(routes);
    displayRoutes();
    showNotification(`${routes.length} optimal route(s) created!`, 'success');
}

function startDeliveryRoute() {
    const routes = Storage.getRoutes();
    if (routes.length === 0) {
        showNotification('Please optimize routes first', 'warning');
        return;
    }

    showNotification('Starting delivery route...', 'info');
}

function loadSettings() {
    const settings = JSON.parse(localStorage.getItem('courier_settings') || '{}');
    if (settings.googleMapsApiKey) {
        document.getElementById('google-maps-key').value = settings.googleMapsApiKey;
    }
    if (settings.maxDistance) {
        document.getElementById('max-distance').value = settings.maxDistance;
    }
    if (settings.avgSpeed) {
        document.getElementById('avg-speed').value = settings.avgSpeed;
    }
}

function saveSettings() {
    const settings = {
        googleMapsApiKey: document.getElementById('google-maps-key').value,
        maxDistance: parseInt(document.getElementById('max-distance').value),
        avgSpeed: parseInt(document.getElementById('avg-speed').value),
        enableNotifications: document.getElementById('enable-notifications').checked,
        autoOptimize: document.getElementById('auto-optimize').checked
    };

    localStorage.setItem('courier_settings', JSON.stringify(settings));
    CONFIG.MAX_PACKAGE_DISTANCE = settings.maxDistance;
    CONFIG.AVERAGE_SPEED = settings.avgSpeed;
    
    showNotification('Settings saved successfully!', 'success');
}

function exportData() {
    const data = Storage.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `courier-data-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('Data exported successfully!', 'success');
}

function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.style.display = 'block';

    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}
