const RouteOptimizer = {
    optimizeRoutes: function(packages, currentLocation) {
        if (packages.length === 0) return [];

        const routes = [];
        let currentRoute = [currentLocation];
        let routeDistance = 0;
        let remainingPackages = [...packages];

        while (remainingPackages.length > 0) {
            let nearestPackage = null;
            let nearestDistance = Infinity;
            let nearestIndex = -1;

            for (let i = 0; i < remainingPackages.length; i++) {
                const pkg = remainingPackages[i];
                const distance = Maps.calculateDistance(
                    currentRoute[currentRoute.length - 1],
                    { lat: pkg.latitude || 0, lng: pkg.longitude || 0 }
                );

                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestPackage = pkg;
                    nearestIndex = i;
                }
            }

            if (!nearestPackage) break;

            if (routeDistance + nearestDistance > CONFIG.MAX_PACKAGE_DISTANCE && currentRoute.length > 1) {
                routes.push(this.createRoute(currentRoute));
                currentRoute = [currentLocation];
                routeDistance = 0;
            } else {
                currentRoute.push({ lat: nearestPackage.latitude || 0, lng: nearestPackage.longitude || 0 });
                currentRoute.push(nearestPackage);
                routeDistance += nearestDistance;
                remainingPackages.splice(nearestIndex, 1);
            }
        }

        if (currentRoute.length > 1) {
            routes.push(this.createRoute(currentRoute));
        }

        return routes;
    },

    createRoute: function(waypoints) {
        let totalDistance = 0;
        let packages = [];

        for (let i = 0; i < waypoints.length - 1; i++) {
            const current = waypoints[i];
            const next = waypoints[i + 1];

            if (next.address) {
                packages.push(next);
            }

            if (current && next && current.lat && current.lng && next.lat && next.lng) {
                totalDistance += Maps.calculateDistance(current, next);
            }
        }

        const estimatedTime = Math.round((totalDistance / CONFIG.AVERAGE_SPEED) * 60);

        return {
            id: Date.now().toString(),
            waypoints: waypoints,
            distance: totalDistance.toFixed(2),
            estimatedTime: estimatedTime,
            packages: packages,
            status: 'pending',
            createdAt: new Date().toISOString()
        };
    },

    sortByDistance: function(packages, currentLocation) {
        return packages.sort((a, b) => {
            const distanceA = Maps.calculateDistance(
                currentLocation,
                { lat: a.latitude || 0, lng: a.longitude || 0 }
            );
            const distanceB = Maps.calculateDistance(
                currentLocation,
                { lat: b.latitude || 0, lng: b.longitude || 0 }
            );
            return distanceA - distanceB;
        });
    },

    calculateTotalDistance: function(packages, currentLocation) {
        let total = 0;
        let lastLocation = currentLocation;

        packages.forEach(pkg => {
            const distance = Maps.calculateDistance(
                lastLocation,
                { lat: pkg.latitude || 0, lng: pkg.longitude || 0 }
            );
            total += distance;
            lastLocation = { lat: pkg.latitude || 0, lng: pkg.longitude || 0 };
        });

        return total.toFixed(2);
    },

    calculateEstimatedTime: function(distance) {
        return Math.round((distance / CONFIG.AVERAGE_SPEED) * 60);
    }
};
