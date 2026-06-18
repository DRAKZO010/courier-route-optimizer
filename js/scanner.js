let ocrStream = null;
let ocrWorker = null;
let ocrReady = false;

const Scanner = {
    initOCRScanner: function () {
        const constraints = {
            video: {
                facingMode: 'environment',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        };

        navigator.mediaDevices.getUserMedia(constraints)
            .then(stream => {
                ocrStream = stream;
                const video = document.getElementById('ocr-video');
                video.srcObject = stream;
                video.play();
                document.getElementById('start-ocr-scan').style.display = 'inline-block';
                document.getElementById('stop-ocr-scan').style.display = 'none';
                showNotification('Camera ready. Capture a frame to scan text.', 'info');
            })
            .catch(err => {
                console.error('Camera error:', err);
                showNotification('Camera access denied', 'error');
            });
    },

    initTesseractWorker: async function () {
        if (ocrReady && ocrWorker) return ocrWorker;

        try {
            document.getElementById('ocr-status').textContent = 'Loading OCR engine...';

            ocrWorker = await Tesseract.createWorker('eng', 1, {
                logger: (info) => {
                    if (info.status === 'recognizing text') {
                        const pct = Math.round(info.progress * 100);
                        this.updateProgress(pct, 'Recognizing text...');
                    } else if (info.status === 'loading language traineddata') {
                        const pct = Math.round(info.progress * 100);
                        this.updateProgress(pct, 'Loading language data...');
                    } else if (info.status === 'initializing api') {
                        this.updateProgress(50, 'Initializing OCR API...');
                    }
                }
            });

            ocrReady = true;
            console.log('Tesseract worker ready');
            return ocrWorker;
        } catch (err) {
            console.error('Tesseract init error:', err);
            ocrReady = false;
            ocrWorker = null;
            showNotification('Failed to initialize OCR engine: ' + err.message, 'error');
            return null;
        }
    },

    captureAndRecognize: async function () {
        const video = document.getElementById('ocr-video');
        const canvas = document.getElementById('ocr-canvas');
        const ctx = canvas.getContext('2d');

        if (video.readyState !== video.HAVE_ENOUGH_DATA) {
            showNotification('Camera not ready', 'error');
            return;
        }

        document.getElementById('ocr-progress').style.display = 'block';
        document.getElementById('ocr-upload-preview').style.display = 'none';
        this.updateProgress(0, 'Initializing OCR engine...');

        const worker = await this.initTesseractWorker();
        if (!worker) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);

        this.updateProgress(10, 'Capturing image...');

        try {
            this.updateProgress(20, 'Processing image...');
            const result = await worker.recognize(canvas);
            const text = result.data.text.trim();

            this.updateProgress(100, 'Scan complete!');

            if (text.length === 0) {
                showNotification('No text detected. Try better lighting or angle.', 'warning');
                document.getElementById('ocr-progress').style.display = 'none';
                return;
            }

            document.getElementById('ocr-text-output').value = text;
            document.getElementById('ocr-extracted-text').style.display = 'block';

            const parsed = this.parseOCRText(text);
            if (parsed) {
                this.processScannedData(parsed);
            } else {
                showNotification('Text detected but could not parse package info. Review below.', 'warning');
            }
        } catch (err) {
            console.error('OCR error:', err);
            showNotification('OCR processing failed: ' + err.message, 'error');
        }

        setTimeout(() => {
            document.getElementById('ocr-progress').style.display = 'none';
        }, 1500);
    },

    uploadAndRecognize: async function (file) {
        if (!file || !file.type.startsWith('image/')) {
            showNotification('Please select a valid image file', 'error');
            return;
        }

        const preview = document.getElementById('ocr-upload-preview');
        const canvas = document.getElementById('ocr-canvas');
        const ctx = canvas.getContext('2d');

        document.getElementById('ocr-progress').style.display = 'block';
        this.updateProgress(0, 'Initializing OCR engine...');

        const worker = await this.initTesseractWorker();
        if (!worker) return;

        this.updateProgress(10, 'Loading image...');

        try {
            const img = new Image();
            const objectUrl = URL.createObjectURL(file);
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = objectUrl;
            });

            preview.src = img.src;
            preview.style.display = 'block';
            document.getElementById('ocr-video').style.display = 'none';

            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            ctx.drawImage(img, 0, 0);
            URL.revokeObjectURL(objectUrl);

            this.updateProgress(30, 'Recognizing text...');

            const result = await worker.recognize(canvas);
            const text = result.data.text.trim();

            this.updateProgress(100, 'Scan complete!');

            if (text.length === 0) {
                showNotification('No text detected in image. Try a clearer image.', 'warning');
                document.getElementById('ocr-progress').style.display = 'none';
                return;
            }

            document.getElementById('ocr-text-output').value = text;
            document.getElementById('ocr-extracted-text').style.display = 'block';

            const parsed = this.parseOCRText(text);
            if (parsed) {
                this.processScannedData(parsed);
            } else {
                showNotification('Text detected but could not parse package info. Review below.', 'warning');
            }
        } catch (err) {
            console.error('OCR upload error:', err);
            showNotification('OCR processing failed: ' + err.message, 'error');
        }

        setTimeout(() => {
            document.getElementById('ocr-progress').style.display = 'none';
        }, 1500);
    },

    parseOCRText: function (text) {
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

        let trackingNumber = null;
        const trackingPatterns = [
            /\b(TRK[-\s]?\d{4,10})\b/i,
            /\b(PKG[-\s]?\d{4,10})\b/i,
            /\b(AWB[-\s]?\d{6,12})\b/i,
            /\b(DOC[-\s]?\d{4,10})\b/i,
            /\b([A-Z]{2,4}[-\s]?\d{6,12})\b/,
            /\b(\d{10,20})\b/
        ];
        for (const line of lines) {
            for (const pattern of trackingPatterns) {
                const match = line.match(pattern);
                if (match) {
                    trackingNumber = match[1].replace(/\s+/g, '-');
                    break;
                }
            }
            if (trackingNumber) break;
        }

        let recipientName = null;
        const namePatterns = [
            /(?:to|recipient|name|attn|consignee)[:\s]+(.+)/i,
            /(?:mr|mrs|ms|dr|shri|smt)[.\s]+(.+)/i
        ];
        for (const line of lines) {
            for (const pattern of namePatterns) {
                const match = line.match(pattern);
                if (match) {
                    recipientName = match[1].trim().substring(0, 50);
                    break;
                }
            }
            if (recipientName) break;
        }
        if (!recipientName) {
            for (const line of lines) {
                if (/^[A-Z][a-z]+(\s+[A-Z][a-z]+){1,3}$/.test(line) && line.length < 40) {
                    recipientName = line;
                    break;
                }
            }
        }

        let address = null;
        const addressKeywords = /(?:address|delivery|ship\s*to|dest|deliver\s*at|location|place|door|flat|house|apartment|floor|building|tower|block|sector|colony|nagar|road|street|avenue|lane|drive|way|blvd|park|extension|enclave|layout|scheme|mohali|phase|dist|district|state|pin|pincode|zip)/i;
        for (const line of lines) {
            if (addressKeywords.test(line) && line.length > 5) {
                address = line.replace(/^(?:address|delivery|ship\s*to|dest|deliver\s*at|location|place)[:\s]*/i, '').trim();
                break;
            }
        }

        if (!address) {
            const streetPattern = /\d{1,6}\s+[\w\s,.-]+(?:st|street|ave|avenue|blvd|boulevard|rd|road|dr|drive|ln|lane|way|ct|court|pl|place|nagar|road|lane|colony|extension|enclave|marg)\b/i;
            for (const line of lines) {
                const match = line.match(streetPattern);
                if (match) {
                    address = match[0].trim();
                    break;
                }
            }
        }

        if (!address) {
            const pincodePattern = /\b\d{5,6}\b/;
            for (let i = 0; i < lines.length; i++) {
                if (pincodePattern.test(lines[i])) {
                    let addr = lines[i];
                    if (i > 0) addr = lines[i - 1] + ', ' + addr;
                    if (i < lines.length - 1 && !addressKeywords.test(lines[i + 1])) {
                        addr = addr + ', ' + lines[i + 1];
                    }
                    address = addr;
                    break;
                }
            }
        }

        if (!address && lines.length > 0) {
            const skipPatterns = /^(?:tracking|order|invoice|bill|ship|from|date|time|ref|item|product|qty|weight|contents|fragile|urgent|express|cod|prepaid|paid)$/i;
            for (const line of lines) {
                if (line.length > 8 && !skipPatterns.test(line) && !trackingNumber?.includes(line)) {
                    address = line;
                    break;
                }
            }
        }

        if (!trackingNumber) {
            trackingNumber = 'PKG-' + Date.now();
        }

        if (!address) return null;

        return {
            packageId: trackingNumber,
            recipientName: recipientName || 'Unknown',
            address: address,
            rawText: text
        };
    },

    processScannedData: function (data) {
        this.processScannedCode(data);
        showNotification(`OCR scan complete: ${data.packageId}`, 'success');
    },

    updateProgress: function (pct, message) {
        const bar = document.getElementById('ocr-progress-bar');
        const status = document.getElementById('ocr-status');
        if (bar) {
            bar.style.width = pct + '%';
            if (pct === 0) bar.style.transition = 'none';
            else bar.style.transition = 'width 0.3s';
        }
        if (status) status.textContent = message;
    },

    stopOCRScanner: function () {
        if (ocrStream) {
            ocrStream.getTracks().forEach(track => track.stop());
            ocrStream = null;
        }
        if (ocrWorker) {
            ocrWorker.terminate();
            ocrWorker = null;
            ocrReady = false;
        }
    },

    processScannedCode: function (data) {
        const packageData = {
            packageId: data.packageId || 'OCR-' + Date.now(),
            recipientName: data.recipientName || 'Unknown',
            deliveryAddress: data.address || 'Address not available',
            phoneNumber: ''
        };
        console.log('Scanned package:', packageData);
        this.handleManualEntry(packageData);
    },

    handleManualEntry: function (formData) {
        const address = formData.deliveryAddress || formData.address;
        if (address) {
            const pincode = this.extractPincode(address);
            const geocodeFn = pincode
                ? () => Maps.geocodeByPincode(pincode).catch(() => Maps.geocodeAddress(address))
                : () => Maps.geocodeAddress(address);

            geocodeFn()
                .then(coords => {
                    formData.latitude = coords.lat;
                    formData.longitude = coords.lng;
                })
                .catch(err => {
                    console.error('Geocoding error:', err);
                    showNotification('Could not geocode address. Saved without coordinates.', 'warning');
                    formData.latitude = null;
                    formData.longitude = null;
                })
                .finally(() => {
                    this.savePackage(formData);
                });
        } else {
            formData.latitude = null;
            formData.longitude = null;
            this.savePackage(formData);
        }
    },

    extractPincode: function (address) {
        const pinPatterns = [
            /\b(\d{6})\b/,
            /\b(\d{5})\b/
        ];
        for (const pattern of pinPatterns) {
            const match = address.match(pattern);
            if (match) return match[1];
        }
        return null;
    },

    savePackage: function (packageData) {
        const pkg = Storage.addPackage({
            packageId: packageData.packageId,
            name: packageData.recipientName || packageData.name,
            address: packageData.deliveryAddress || packageData.address,
            phone: packageData.phoneNumber || packageData.phone,
            latitude: packageData.latitude,
            longitude: packageData.longitude
        });

        showNotification(`Package ${pkg.packageId} added successfully!`, 'success');
        this.showScanResult(pkg);
    },

    showScanResult: function (pkg) {
        document.getElementById('result-tracking').textContent = pkg.packageId;
        document.getElementById('result-address').textContent = pkg.address;
        document.getElementById('scan-result').style.display = 'block';
    }
};
