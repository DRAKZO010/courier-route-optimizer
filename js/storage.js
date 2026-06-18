const Storage = {
    getPackages: function() {
        const data = localStorage.getItem(CONFIG.STORAGE_KEYS.PACKAGES);
        return data ? JSON.parse(data) : [];
    },

    addPackage: function(packageData) {
        const packages = this.getPackages();
        packageData.id = Date.now().toString();
        packageData.createdAt = new Date().toISOString();
        packageData.status = 'pending';
        packages.push(packageData);
        localStorage.setItem(CONFIG.STORAGE_KEYS.PACKAGES, JSON.stringify(packages));
        return packageData;
    },

    updatePackage: function(packageId, updates) {
        const packages = this.getPackages();
        const index = packages.findIndex(p => p.id === packageId);
        if (index !== -1) {
            packages[index] = { ...packages[index], ...updates };
            localStorage.setItem(CONFIG.STORAGE_KEYS.PACKAGES, JSON.stringify(packages));
            return packages[index];
        }
        return null;
    },

    deletePackage: function(packageId) {
        let packages = this.getPackages();
        packages = packages.filter(p => p.id !== packageId);
        localStorage.setItem(CONFIG.STORAGE_KEYS.PACKAGES, JSON.stringify(packages));
    },

    getRoutes: function() {
        const data = localStorage.getItem(CONFIG.STORAGE_KEYS.ROUTES);
        return data ? JSON.parse(data) : [];
    },

    saveRoutes: function(routes) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.ROUTES, JSON.stringify(routes));
    },

    getHistory: function() {
        const data = localStorage.getItem(CONFIG.STORAGE_KEYS.HISTORY);
        return data ? JSON.parse(data) : [];
    },

    addToHistory: function(historyEntry) {
        const history = this.getHistory();
        historyEntry.timestamp = new Date().toISOString();
        history.unshift(historyEntry);
        localStorage.setItem(CONFIG.STORAGE_KEYS.HISTORY, JSON.stringify(history));
    },

    clearHistory: function() {
        localStorage.removeItem(CONFIG.STORAGE_KEYS.HISTORY);
    },

    clearAll: function() {
        localStorage.removeItem(CONFIG.STORAGE_KEYS.PACKAGES);
        localStorage.removeItem(CONFIG.STORAGE_KEYS.ROUTES);
        localStorage.removeItem(CONFIG.STORAGE_KEYS.HISTORY);
    },

    exportData: function() {
        const data = {
            packages: this.getPackages(),
            routes: this.getRoutes(),
            history: this.getHistory(),
            exportDate: new Date().toISOString()
        };
        return JSON.stringify(data, null, 2);
    },

    importData: function(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            if (data.packages) localStorage.setItem(CONFIG.STORAGE_KEYS.PACKAGES, JSON.stringify(data.packages));
            if (data.routes) localStorage.setItem(CONFIG.STORAGE_KEYS.ROUTES, JSON.stringify(data.routes));
            if (data.history) localStorage.setItem(CONFIG.STORAGE_KEYS.HISTORY, JSON.stringify(data.history));
            return true;
        } catch (e) {
            console.error('Import error:', e);
            return false;
        }
    }
};
