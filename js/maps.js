let map;
let markers = [];
let currentLocationMarker;
let directionsService;
let directionsRenderer;

const Maps = {
    init: function(elementId = 'map') {
        const center = { lat: 40.7128, lng: -74.0060 };

        map = new google.maps.Map(document.getElementById(elementId), {
            zoom: 12,
            center: center,
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            fullscreenControl: true,
            zoomControl: true,
            streetViewControl: true
        });

        directionsService = new google.maps.DirectionsService();
        directionsRenderer = new google.maps.DirectionsRenderer({
            map: map,
            preserveViewport: true
        });

        this.getCurrentLocation();
    },

    getCurrentLocation: function() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const pos = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    map.setCenter(pos);
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

    addCurrentLocationMarker: function(position) {
        if (currentLocationMarker) {
            currentLocationMarker.setMap(null);
        }
        currentLocationMarker = new google.maps.Marker({
            position: position,
            map: map,
            title: 'Current Location',
            icon: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'
        });
    },

    addMarker: function(position, title, packageId) {
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

    showMarkerInfo: function(marker, title, packageId) {
        const infoWindow = new google.maps.InfoWindow({
            content: `<div><strong>${title}</strong><br><button onclick="Storage.updatePackage('${packageId}', {status: 'delivered'})">Mark as Delivered</button></div>`
        });
        infoWindow.open(map, marker);
    },

    clearMarkers: function() {
        markers.forEach(marker => marker.setMap(null));
        markers = [];
    },

    calculateDistance: function(point1, point2) {
        const R = 6371;
        const dLat = (point2.lat - point1.lat) * Math.PI / 180;
        const dLng = (point2.lng - point1.lng) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
                  Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    },

    drawRoute: function(waypoints) {
        if (waypoints.length < 2) return;

        const request = {
            origin: waypoints[0],
            destination: waypoints[waypoints.length - 1],
            waypoints: waypoints.slice(1, -1).map(wp => ({ location: wp })),
            optimizeWaypoints: true,
            travelMode: 'DRIVING'
        };

        directionsService.route(request, (result, status) => {
            if (status === 'OK') {
                directionsRenderer.setDirections(result);
            } else {
                console.error('Directions error:', status);
            }
        });
    },

    geocodeAddress: function(address) {
        return new Promise((resolve, reject) => {
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
    }
};
