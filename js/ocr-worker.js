importScripts('https://cdn.jsdelivr.net/npm/tesseract.js@4/dist/tesseract.min.js');

let ocrReady = false;
let worker = null;

async function initializeTesseract() {
    if (!ocrReady) {
        try {
            worker = await Tesseract.createWorker('eng');
            ocrReady = true;
            console.log('OCR Worker initialized');
        } catch (error) {
            console.error('Failed to initialize OCR:', error);
        }
    }
}

self.onmessage = async (e) => {
    if (e.data.type === 'process-image') {
        if (!ocrReady) {
            await initializeTesseract();
        }

        try {
            const imageData = e.data.imageData;
            const canvas = new OffscreenCanvas(imageData.width, imageData.height);
            const ctx = canvas.getContext('2d');
            ctx.putImageData(imageData, 0, 0);
            const blob = await canvas.convertToBlob();

            const result = await worker.recognize(blob);
            const extractedText = result.data.text;

            self.postMessage({
                type: 'ocr-result',
                text: extractedText,
                confidence: result.data.confidence
            });
        } catch (error) {
            console.error('OCR error:', error);
            self.postMessage({
                type: 'ocr-error',
                error: error.message
            });
        }
    } else if (e.data.type === 'terminate') {
        if (worker) {
            worker.terminate();
        }
        self.close();
    }
};

initializeTesseract();
