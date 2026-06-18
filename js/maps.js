let map;
let routeMapInstance = null;
let markers = [];
let currentLocationMarker;
let directionsService;
let directionsRenderer;
let activeRouteRenderer = null;

const Maps = {
    setRouteMap: function (m) {
        routeMapInstance = m;
    },
    init: function (elementId = 'map') {
        if (typeof google === 'undefined' || !google.maps) {
            console.warn('Google Maps API not loaded. Map features disabled.');
            return;
        }

        const center = { lat: 20.5937, lng: 78.9629 };

        map = new google.maps.Map(document.getElementById(elementId), {
            zoom: 5,
            center: center,
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            fullscreenControl: true,
            zoomControl: true,
            streetViewControl: true
        });

        directionsService = new google.maps.DirectionsService();
        directionsRenderer = new google.maps.DirectionsRenderer({
            map: map,
            preserveViewport: true,
            suppressMarkers: true
        });
    },

    getCurrentLocation: function () {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const pos = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    if (map) {
                        map.setCenter(pos);
                        map.setZoom(12);
                    }
                    this.addCurrentLocationMarker(pos);
                    updateLocationBadge(pos);
                },
                (error) => {
                    console.error('Geolocation error:', error);
                    showNotification('Unable to get current location', 'error');
                }
            );
        }
    },

    addCurrentLocationMarker: function (position, targetMap) {
        if (currentLocationMarker) {
            currentLocationMarker.setMap(null);
        }
        if (typeof google === 'undefined' || !google.maps) return;
        currentLocationMarker = new google.maps.Marker({
            position: position,
            map: targetMap || map,
            title: 'Your Location',
            icon: {
                url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
                scaledSize: new google.maps.Size(40, 40)
            },
            zIndex: 999
        });
    },

    addNumberedMarker: function (letter, position, title, address, targetMap) {
        if (typeof google === 'undefined' || !google.maps) return null;
        const m = targetMap || map;

        const marker = new google.maps.Marker({
            position: position,
            map: m,
            title: title,
            label: {
                text: letter,
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 'bold'
            },
            icon: {
                url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
                scaledSize: new google.maps.Size(32, 32),
                labelOrigin: new google.maps.Point(16, 16)
            },
            zIndex: 100
        });

        const infoContent = `
            <div style="padding: 8px; min-width: 150px;">
                <strong style="font-size: 14px;">Stop ${letter}</strong><br>
                <div style="margin: 4px 0; color: #555;">${title}</div>
                <div style="font-size: 12px; color: #777;">${address || ''}</div>
            </div>
        `;
        const infoWindow = new google.maps.InfoWindow({ content: infoContent });
        marker.addListener('click', () => infoWindow.open(m, marker));

        markers.push(marker);
        return marker;
    },

    addMarker: function (position, title, packageId) {
        if (typeof google === 'undefined' || !google.maps) return null;
        const marker = new google.maps.Marker({
            position: position,
            map: map,
            title: title,
            icon: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png'
        });

        marker.addListener('click', () => {
            this.showMarkerInfo(marker, title, packageId);
        });

        markers.push(marker);
        return marker;
    },

    showMarkerInfo: function (marker, title, packageId) {
        const infoWindow = new google.maps.InfoWindow({
            content: `<div><strong>${title}</strong><br><button onclick="Storage.updatePackage('${packageId}', {status: 'delivered'})">Mark as Delivered</button></div>`
        });
        infoWindow.open(map, marker);
    },

    clearMarkers: function (targetMap) {
        markers.forEach(marker => {
            if (marker && marker.setMap) marker.setMap(null);
        });
        markers = [];
    },

    displayRouteOnMap: function (stops, currentLocation) {
        const targetMap = routeMapInstance || map;
        if (!targetMap) return;

        this.clearMarkers(targetMap);
        if (activeRouteRenderer) {
            activeRouteRenderer.setDirections({ routes: [] });
            activeRouteRenderer = null;
        }

        if (!currentLocation || !stops || stops.length === 0) return;

        this.addCurrentLocationMarker(currentLocation, targetMap);

        const bounds = new google.maps.LatLngBounds();
        bounds.extend(new google.maps.LatLng(currentLocation.lat, currentLocation.lng));

        stops.forEach(stop => {
            this.addNumberedMarker(
                stop.stopLetter,
                { lat: stop.latitude, lng: stop.longitude },
                stop.name,
                stop.address,
                targetMap
            );
            bounds.extend(new google.maps.LatLng(stop.latitude, stop.longitude));
        });

        targetMap.fitBounds(bounds, 50);

        if (stops.length >= 1 && typeof google !== 'undefined' && google.maps) {
            activeRouteRenderer = new google.maps.DirectionsRenderer({
                map: targetMap,
                preserveViewport: true,
                suppressMarkers: true
            });

            const waypoints = stops.slice(0, -1).map(s => ({
                location: new google.maps.LatLng(s.latitude, s.longitude),
                stopover: true
            }));

            const request = {
                origin: new google.maps.LatLng(currentLocation.lat, currentLocation.lng),
                destination: new google.maps.LatLng(stops[stops.length - 1].latitude, stops[stops.length - 1].longitude),
                waypoints: waypoints,
                optimizeWaypoints: false,
                travelMode: google.maps.TravelMode.DRIVING
            };

            const ds = new google.maps.DirectionsService();
            ds.route(request, (result, status) => {
                if (status === 'OK') {
                    activeRouteRenderer.setDirections(result);
                } else {
                    console.warn('Directions request failed:', status);
                    this.drawStraightLines(currentLocation, stops, targetMap);
                }
            });
        }
    },

    drawStraightLines: function (currentLocation, stops, targetMap) {
        const m = targetMap || map;
        if (typeof google === 'undefined' || !google.maps || !m) return;

        const allPoints = [
            new google.maps.LatLng(currentLocation.lat, currentLocation.lng),
            ...stops.map(s => new google.maps.LatLng(s.latitude, s.longitude))
        ];

        const flightPath = new google.maps.Polyline({
            path: allPoints,
            geodesic: true,
            strokeColor: '#2563eb',
            strokeOpacity: 1.0,
            strokeWeight: 3,
            map: m
        });

        markers.push({ setMap: () => flightPath.setMap(null) });
    },

    calculateDistance: function (point1, point2) {
        if (!point1 || !point2 || point1.lat == null || point2.lat == null) return 0;
        const R = 6371;
        const dLat = (point2.lat - point1.lat) * Math.PI / 180;
        const dLng = (point2.lng - point1.lng) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    },

    geocodeAddress: function (address) {
        return new Promise((resolve, reject) => {
            if (typeof google === 'undefined' || !google.maps) {
                reject('Google Maps API not loaded');
                return;
            }
            const geocoder = new google.maps.Geocoder();
            geocoder.geocode({ address: address }, (results, status) => {
                if (status === 'OK') {
                    resolve({
                        lat: results[0].geometry.location.lat(),
                        lng: results[0].geometry.location.lng()
                    });
                } else {
                    reject('Geocoding failed: ' + status);
                }
            });
        });
    },

    geocodeByPincode: function (pincode) {
        return new Promise((resolve, reject) => {
            if (typeof google === 'undefined' || !google.maps) {
                reject('Google Maps API not loaded');
                return;
            }
            const geocoder = new google.maps.Geocoder();
            geocoder.geocode({ address: pincode }, (results, status) => {
                if (status === 'OK') {
                    resolve({
                        lat: results[0].geometry.location.lat(),
                        lng: results[0].geometry.location.lng()
                    });
                } else {
                    reject('Pincode geocoding failed: ' + status);
                }
            });
        });
    },

    geocodeWithNominatim: function (address) {
        return new Promise((resolve, reject) => {
            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
            fetch(url, { headers: { 'User-Agent': 'CourierRouteOptimizer/1.0' } })
                .then(res => res.json())
                .then(data => {
                    if (data && data.length > 0) {
                        resolve({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
                    } else {
                        reject('Nominatim: no results');
                    }
                })
                .catch(err => reject('Nominatim error: ' + err.message));
        });
    },

    geocodePincodeFallback: function (pincode) {
        return new Promise((resolve, reject) => {
            const url = `https://api.postalpincode.in/pincode/${pincode}`;
            fetch(url)
                .then(res => res.json())
                .then(data => {
                    if (data && data[0] && data[0].Status === 'Success' && data[0].PostOffice && data[0].PostOffice.length > 0) {
                        const po = data[0].PostOffice[0];
                        const query = `${po.Name}, ${po.District}, ${po.State}, India`;
                        return this.geocodeWithNominatim(query);
                    } else {
                        reject('Invalid pincode');
                    }
                })
                .then(resolve)
                .catch(reject);
        });
    }
};
