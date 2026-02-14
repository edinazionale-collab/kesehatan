/* ============================================
   SERIAL MANAGER — Web Serial API
   Scanner & Scale connection
   ============================================ */
const Serial = (() => {
    let scannerPort = null;
    let scalePort = null;
    let scannerReader = null;
    let scaleReader = null;
    const statusListeners = [];

    function isSupported() {
        return 'serial' in navigator;
    }

    function emitStatus(type, connected) {
        statusListeners.forEach(cb => cb(type, connected));
    }

    function onStatusChange(callback) {
        statusListeners.push(callback);
    }

    // --- Scanner ---
    async function connectScanner() {
        try {
            scannerPort = await navigator.serial.requestPort();
            await scannerPort.open({ baudRate: 9600 });
            const decoder = new TextDecoderStream();
            scannerPort.readable.pipeTo(decoder.writable);
            scannerReader = decoder.readable.getReader();
            readScanner();
            Utils.showToast('Scanner terhubung', 'success');
            emitStatus('scanner', true);
            return true;
        } catch (err) {
            console.warn('Scanner connect error:', err);
            Utils.showToast('Gagal menghubungkan scanner', 'error');
            return false;
        }
    }

    async function readScanner() {
        try {
            let buffer = '';
            while (true) {
                const { value, done } = await scannerReader.read();
                if (done) break;
                buffer += value;
                const lines = buffer.split(/[\r\n]+/);
                buffer = lines.pop(); // Keep incomplete line
                for (const line of lines) {
                    const trimmed = line.trim();
                    if (trimmed.length > 0) {
                        window.dispatchEvent(new CustomEvent('scanner-data', { detail: trimmed }));
                    }
                }
            }
        } catch (err) {
            console.warn('Scanner read error:', err);
            emitStatus('scanner', false);
        }
    }

    async function disconnectScanner() {
        try {
            if (scannerReader) { await scannerReader.cancel(); scannerReader = null; }
            if (scannerPort) { await scannerPort.close(); scannerPort = null; }
            Utils.showToast('Scanner diputus', 'info');
            emitStatus('scanner', false);
        } catch (err) { console.warn('Scanner disconnect error:', err); }
    }

    // --- Scale ---
    async function connectScale() {
        try {
            scalePort = await navigator.serial.requestPort();
            await scalePort.open({ baudRate: 9600 });
            const decoder = new TextDecoderStream();
            scalePort.readable.pipeTo(decoder.writable);
            scaleReader = decoder.readable.getReader();
            readScale();
            Utils.showToast('Timbangan terhubung', 'success');
            emitStatus('scale', true);
            return true;
        } catch (err) {
            console.warn('Scale connect error:', err);
            Utils.showToast('Gagal menghubungkan timbangan', 'error');
            return false;
        }
    }

    async function readScale() {
        try {
            let buffer = '';
            while (true) {
                const { value, done } = await scaleReader.read();
                if (done) break;
                buffer += value;
                const lines = buffer.split(/[\r\n]+/);
                buffer = lines.pop();
                for (const line of lines) {
                    const match = line.match(/([\d.]+)/);
                    if (match) {
                        const weight = parseFloat(match[1]);
                        if (!isNaN(weight) && weight > 0) {
                            window.dispatchEvent(new CustomEvent('scale-data', { detail: weight }));
                        }
                    }
                }
            }
        } catch (err) {
            console.warn('Scale read error:', err);
            emitStatus('scale', false);
        }
    }

    async function disconnectScale() {
        try {
            if (scaleReader) { await scaleReader.cancel(); scaleReader = null; }
            if (scalePort) { await scalePort.close(); scalePort = null; }
            Utils.showToast('Timbangan diputus', 'info');
            emitStatus('scale', false);
        } catch (err) { console.warn('Scale disconnect error:', err); }
    }

    // --- Unified Interface for App.js ---
    async function connect(type) {
        if (type === 'scanner') return connectScanner();
        if (type === 'scale') return connectScale();
    }

    function onData(type, callback) {
        const eventName = type === 'scanner' ? 'scanner-data' : 'scale-data';
        window.addEventListener(eventName, (e) => callback(e.detail));
    }

    return {
        isSupported,
        connect,
        onData,
        onStatusChange
    };
})();
