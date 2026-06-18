let barcodeStream = null;

const Scanner = {
    initBarcodeScanner: function() {
        const constraints = {
            video: {
                facingMode: 'environment',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        };

        navigator.mediaDevices.getUserMedia(constraints)
            .then(stream => {
                barcodeStream = stream;
                const video = document.getElementById('barcode-video');
                video.srcObject = stream;
                video.play();
                this.startBarcodeScan();
            })
            .catch(err => {
                console.error('Camera error:', err);
                showNotification('Camera access denied', 'error');
            });
    },

    startBarcodeScan: function() {
        const video = document.getElementById('barcode-video');
        const canvas = document.getElementById('barcode-canvas');
        const ctx = canvas.getContext('2d');

        const detectBarcode = () => {
            if (video.readyState === video.HAVE_ENOUGH_DATA) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                ctx.drawImage(video, 0, 0);

                Quagga.decodeSingle({
                    src: canvas.toDataURL(),
                    numOfWorkers: 2,
                    inputStream: {
                        type: 'ImageData',
                        size: 800
                    },
                    decoder: {
                        readers: ['code_128_reader', 'ean_reader', 'upc_reader', 'qr_reader']
                    }
                }, (result) => {
                    if (result && result.codeResult) {
                        this.handleBarcodeDetected(result.codeResult.code);
                    }
                });
            }
            requestAnimationFrame(detectBarcode);
        };
        detectBarcode();
    },

    handleBarcodeDetected: function(code) {
        console.log('Barcode detected:', code);
        this.processScannedCode(code);
        showNotification(`Barcode detected: ${code}`, 'success');
    },

    processScannedCode: function(code) {
        const packageData = {
            packageId: code,
            address: 'Address not available - please verify manually',
            scannedAt: new Date().toISOString()
        };
        console.log('Scanned package:', packageData);
    },

    stopBarcodeScanner: function() {
        if (barcodeStream) {
            barcodeStream.getTracks().forEach(track => track.stop());
            barcodeStream = null;
        }
    },

    handleManualEntry: function(formData) {
        if (formData.latitude && formData.longitude) {
            this.savePackage(formData);
        } else if (formData.address) {
            Maps.geocodeAddress(formData.address)
                .then(coords => {
                    formData.latitude = coords.lat;
                    formData.longitude = coords.lng;
                    this.savePackage(formData);
                })
                .catch(err => {
                    console.error('Geocoding error:', err);
                    showNotification('Could not geocode address', 'error');
                });
        }
    },

    savePackage: function(packageData) {
        const pkg = Storage.addPackage({
            packageId: packageData.packageId,
            name: packageData.recipientName,
            address: packageData.deliveryAddress,
            phone: packageData.phoneNumber,
            latitude: packageData.latitude,
            longitude: packageData.longitude
        });

        showNotification(`Package ${pkg.packageId} added successfully!`, 'success');
        this.showScanResult(pkg);
    },

    showScanResult: function(pkg) {
        document.getElementById('result-tracking').textContent = pkg.packageId;
        document.getElementById('result-address').textContent = pkg.address;
        document.getElementById('scan-result').style.display = 'block';
    }
};
