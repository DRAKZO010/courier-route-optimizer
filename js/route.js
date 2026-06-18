const RouteOptimizer = {
    optimizeRoutes: function (packages, currentLocation) {
        if (packages.length === 0 || !currentLocation) return [];

        const validPackages = packages.filter(p => p.latitude != null && p.longitude != null);
        if (validPackages.length === 0) return [];

        const sorted = [...validPackages].sort((a, b) => {
            const distA = Maps.calculateDistance(currentLocation, { lat: a.latitude, lng: a.longitude });
            const distB = Maps.calculateDistance(currentLocation, { lat: b.latitude, lng: b.longitude });
            return distA - distB;
        });

        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let totalDistance = 0;
        let lastLocation = currentLocation;

        const stops = sorted.map((pkg, index) => {
            const distFromPrev = Maps.calculateDistance(lastLocation, { lat: pkg.latitude, lng: pkg.longitude });
            totalDistance += distFromPrev;
            lastLocation = { lat: pkg.latitude, lng: pkg.longitude };

            return {
                stopLetter: letters[index] || (index + 1).toString(),
                stopNumber: index + 1,
                packageId: pkg.packageId || pkg.id,
                name: pkg.name || 'Unknown',
                address: pkg.address || 'No address',
                latitude: pkg.latitude,
                longitude: pkg.longitude,
                distanceFromPrev: distFromPrev.toFixed(2),
                distanceFromStart: Maps.calculateDistance(currentLocation, { lat: pkg.latitude, lng: pkg.longitude }).toFixed(2),
                status: 'pending'
            };
        });

        const estimatedTime = Math.round((totalDistance / CONFIG.AVERAGE_SPEED) * 60);

        return [{
            id: Date.now().toString(),
            stops: stops,
            totalDistance: totalDistance.toFixed(2),
            estimatedTime: estimatedTime,
            status: 'pending',
            createdAt: new Date().toISOString()
        }];
    },

    calculateTotalDistance: function (packages, currentLocation) {
        let total = 0;
        let lastLocation = currentLocation;

        const valid = packages.filter(p => p.latitude != null && p.longitude != null);
        valid.forEach(pkg => {
            const distance = Maps.calculateDistance(lastLocation, { lat: pkg.latitude, lng: pkg.longitude });
            total += distance;
            lastLocation = { lat: pkg.latitude, lng: pkg.longitude };
        });

        return total.toFixed(2);
    },

    calculateEstimatedTime: function (distance) {
        return Math.round((distance / CONFIG.AVERAGE_SPEED) * 60);
    }
};
