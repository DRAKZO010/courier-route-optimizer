let currentLocation = null;
let routeMap = null;

window.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
    updateDashboard();
});

function initializeApp() {
    try {
        if (typeof google !== 'undefined' && google.maps) {
            Maps.init('map');
        }
    } catch (e) {
        console.error('Map initialization error:', e);
    }

    getCurrentLocation();
    loadSettings();
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

    document.getElementById('start-ocr-scan').addEventListener('click', () => {
        Scanner.captureAndRecognize();
    });

    document.getElementById('stop-ocr-scan').addEventListener('click', () => {
        Scanner.stopOCRScanner();
        document.getElementById('start-ocr-scan').style.display = 'inline-block';
        document.getElementById('stop-ocr-scan').style.display = 'none';
    });

    document.getElementById('upload-image-btn').addEventListener('click', () => {
        document.getElementById('ocr-file-input').click();
    });

    document.getElementById('ocr-file-input').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            Scanner.uploadAndRecognize(file);
        }
        e.target.value = '';
    });

    document.getElementById('manual-entry-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = {
            packageId: document.getElementById('package-id').value,
            recipientName: document.getElementById('recipient-name').value,
            deliveryAddress: document.getElementById('delivery-address').value,
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
        document.getElementById('ocr-extracted-text').style.display = 'none';
        document.getElementById('ocr-text-output').value = '';
        document.getElementById('ocr-upload-preview').style.display = 'none';
        document.getElementById('ocr-upload-preview').src = '';
        document.getElementById('ocr-video').style.display = '';
        document.getElementById('manual-entry-form').reset();
        navigateToSection('scanner');
    });

    document.getElementById('ocr-confirm-text').addEventListener('click', () => {
        const text = document.getElementById('ocr-text-output').value;
        if (text) {
            const parsed = Scanner.parseOCRText(text);
            if (parsed) {
                Scanner.processScannedData(parsed);
            } else {
                showNotification('Could not parse package info from text', 'warning');
            }
        }
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

    if (mode !== 'ocr') {
        Scanner.stopOCRScanner();
    }
    if (mode === 'ocr') {
        Scanner.initOCRScanner();
    }
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
                updateDashboard();
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
    } else {
        document.getElementById('stat-distance').textContent = '0 km';
        document.getElementById('stat-time').textContent = '0 min';
    }

    displayPackages();
    displayHistory();
    displayDeliveryOrder();
}

function displayPackages() {
    const packages = Storage.getPackages();
    const container = document.getElementById('packages-container');

    if (packages.length === 0) {
        container.innerHTML = '<p class="empty-state">No packages scanned yet. Start by scanning a package with OCR!</p>';
        return;
    }

    const pending = packages.filter(p => p.status === 'pending');
    const delivered = packages.filter(p => p.status === 'delivered');

    let html = '';

    pending.forEach(pkg => {
        const hasCoords = pkg.latitude != null && pkg.longitude != null;
        const distance = (currentLocation && hasCoords) ?
            Maps.calculateDistance(currentLocation, { lat: pkg.latitude, lng: pkg.longitude }).toFixed(2) : 'N/A';

        html += `
            <div class="package-item">
                <div class="package-info">
                    <div class="package-name">⏳ ${pkg.name}</div>
                    <div class="package-address">${pkg.address}</div>
                    <div class="package-distance">📍 ${distance} km away</div>
                </div>
                <span class="package-status pending">PENDING</span>
            </div>
        `;
    });

    delivered.forEach(pkg => {
        html += `
            <div class="package-item">
                <div class="package-info">
                    <div class="package-name">✅ ${pkg.name}</div>
                    <div class="package-address">${pkg.address}</div>
                </div>
                <span class="package-status delivered">DELIVERED</span>
            </div>
        `;
    });

    container.innerHTML = html;
}

function displayDeliveryOrder() {
    const routes = Storage.getRoutes();
    const container = document.getElementById('delivery-order');
    const startBtn = document.getElementById('start-delivery');

    if (!routes || routes.length === 0 || !routes[0].stops || routes[0].stops.length === 0) {
        container.innerHTML = '<p class="empty-state">Scan packages first, then click "Optimize Route" to see the delivery order.</p>';
        startBtn.style.display = 'none';
        return;
    }

    const route = routes[0];
    startBtn.style.display = 'inline-flex';

    let html = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;">
            <div>
                <strong>${route.stops.length} stops</strong> &middot;
                ${route.totalDistance} km total &middot;
                ~${route.estimatedTime} min
            </div>
            <span class="route-badge">${route.status === 'in_progress' ? '🚚 IN PROGRESS' : '📋 READY'}</span>
        </div>
        <div class="delivery-stops">
    `;

    route.stops.forEach((stop, idx) => {
        const isDelivered = stop.status === 'delivered';
        const statusClass = isDelivered ? 'delivered' : 'pending';
        const statusEmoji = isDelivered ? '✅' : '📍';
        const prevLetter = idx > 0 ? route.stops[idx - 1].stopLetter : null;

        html += `
            <div class="delivery-stop-item ${statusClass}" data-stop="${stop.stopLetter}">
                <div class="stop-letter">${stop.stopLetter}</div>
                <div class="stop-info">
                    <div class="stop-name">${stop.name}</div>
                    <div class="stop-address">${stop.address}</div>
                    <div class="stop-distance">
                        ${idx === 0 ? stop.distanceFromStart + ' km from you' : stop.distanceFromPrev + ' km from Stop ' + prevLetter}
                    </div>
                </div>
                <div class="stop-actions">
                    <span class="stop-status ${statusClass}">${isDelivered ? 'DONE' : 'PENDING'}</span>
                    ${!isDelivered ? `<button class="btn btn-sm btn-success" onclick="markStopDelivered('${stop.packageId}', '${stop.stopLetter}')">Mark Done</button>` : ''}
                </div>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
}

function markStopDelivered(packageId, stopLetter) {
    const pkg = Storage.updatePackage(packageId, { status: 'delivered' });

    if (pkg) {
        Storage.addToHistory({
            packageId: pkg.packageId,
            packageName: pkg.name,
            address: pkg.address,
            stopLetter: stopLetter
        });
    }

    const routes = Storage.getRoutes();
    if (routes && routes[0] && routes[0].stops) {
        const stop = routes[0].stops.find(s => s.stopLetter === stopLetter);
        if (stop) stop.status = 'delivered';
        Storage.saveRoutes(routes);
    }

    updateDashboard();

    const pending = Storage.getPackages().filter(p => p.status === 'pending');
    if (pending.length === 0) {
        showNotification('All packages delivered! Great job!', 'success');
    } else {
        showNotification(`Stop ${stopLetter} marked as delivered`, 'success');
    }
}

function optimizeRoutes() {
    if (!currentLocation) {
        showNotification('Current location not available. Please allow location access.', 'error');
        return;
    }

    const packages = Storage.getPackages().filter(p => p.status === 'pending');
    if (packages.length === 0) {
        showNotification('No pending packages to optimize', 'warning');
        return;
    }

    const withCoords = packages.filter(p => p.latitude != null && p.longitude != null);
    if (withCoords.length === 0) {
        showNotification('No packages with valid coordinates. Geocoding may have failed for all.', 'warning');
        return;
    }
    if (withCoords.length < packages.length) {
        showNotification(`${withCoords.length} of ${packages.length} packages have coordinates. Optimizing those.`, 'info');
    }

    const routes = RouteOptimizer.optimizeRoutes(packages, currentLocation);
    Storage.saveRoutes(routes);

    initRouteMap();
    const route = routes[0];
    if (route && route.stops) {
        Maps.displayRouteOnMap(route.stops, currentLocation);
    }

    displayDeliveryOrder();
    showNotification(`Optimized! ${route.stops.length} stops in order`, 'success');
    navigateToSection('routes');
}

function initRouteMap() {
    if (routeMap) return;
    if (typeof google === 'undefined' || !google.maps) return;

    const mapEl = document.getElementById('route-map');
    if (!mapEl) return;

    routeMap = new google.maps.Map(mapEl, {
        zoom: 12,
        center: currentLocation || { lat: 20.5937, lng: 78.9629 },
        mapTypeId: google.maps.MapTypeId.ROADMAP
    });

    Maps.setRouteMap(routeMap);
}

function startDeliveryRoute() {
    const routes = Storage.getRoutes();
    if (!routes || routes.length === 0 || !routes[0].stops || routes[0].stops.length === 0) {
        showNotification('Please optimize routes first', 'warning');
        return;
    }

    routes[0].status = 'in_progress';
    Storage.saveRoutes(routes);

    displayDeliveryOrder();
    navigateToSection('routes');
    showNotification('Delivery started! Follow the A→B→C order.', 'info');
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

    if (settings.googleMapsApiKey) {
        setGoogleMapsApiKey(settings.googleMapsApiKey);
    }

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
    }, 3500);
}
