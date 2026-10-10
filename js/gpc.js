/**
 * Dijital Laboratuvar - GPC (Gel Permeation Chromatography) Analizörü
 */

let gpcState = { fileName: '', points: [], processedPoints: [], peaks: [], analysis: null };

function initGPCModule() {
    const dropZone = document.getElementById('gpc-drop-zone');
    const input = document.getElementById('gpc-file-input');
    if (!dropZone || !input) return;
    dropZone.addEventListener('click', () => input.click());
    ['dragenter', 'dragover'].forEach(name => dropZone.addEventListener(name, event => {
        event.preventDefault();
        dropZone.classList.add('drag-over');
    }));
    ['dragleave', 'drop'].forEach(name => dropZone.addEventListener(name, event => {
        event.preventDefault();
        dropZone.classList.remove('drag-over');
    }));
    dropZone.addEventListener('drop', event => {
        if (event.dataTransfer.files.length) handleGPCFile(event.dataTransfer.files[0]);
    });
    input.addEventListener('change', event => {
        if (event.target.files.length) handleGPCFile(event.target.files[0]);
    });
}

function handleGPCFile(file) {
    if (!/\.txt$/i.test(file.name)) {
        showToast('GPC için cihazın .txt çıktı dosyasını seçin.', 'error');
        return;
    }
    const reader = new FileReader();
    reader.onload = event => {
        try {
            const points = extractGPCPoints(String(event.target.result || ''));
            if (points.length < 2) throw new Error('TXT içinde iki sayısal veri sütunu bulunamadı.');
            gpcState = { fileName: file.name, points, processedPoints: [], peaks: [], analysis: null };
            renderGPC();
            showToast(`"${file.name}" GPC analizine yüklendi.`, 'success');
        } catch (error) {
            showToast(`GPC dosyası okunamadı: ${error.message}`, 'error');
        }
    };
    reader.onerror = () => showToast('GPC dosyası okunurken hata oluştu.', 'error');
    reader.readAsText(file);
}

function extractGPCPoints(text) {
    return text.split(/\r?\n/).map(line => {
        const tokens = line.trim().split(/[;\t,| ]+/).filter(Boolean);
        const values = tokens.map(parseGPCNumber).filter(Number.isFinite);
        return values.length >= 2 ? { x: values[0], y: values[1] } : null;
    }).filter(Boolean).sort((a, b) => a.x - b.x);
}

function parseGPCNumber(value) {
    const text = String(value).replace(/\s/g, '').replace(',', '.');
    return /^[-+]?\d*\.?\d+(e[-+]?\d+)?$/i.test(text) ? Number(text) : NaN;
}

function applyGPCSmoothing(points, windowSize) {
    if (points.length < 3) return points.map(point => ({ ...point }));
    const size = Number.isFinite(windowSize) ? Math.max(3, Math.floor(windowSize)) : 7;
    const normalized = size % 2 === 0 ? size + 1 : size;
    if (normalized < 3) return points.map(point => ({ ...point }));
    const half = Math.floor(normalized / 2);
    return points.map((point, index) => {
        let weightedSum = 0;
        let weightTotal = 0;
        for (let offset = -half; offset <= half; offset++) {
            const sampleIndex = index + offset;
            if (sampleIndex < 0 || sampleIndex >= points.length) continue;
            const weight = half + 1 - Math.abs(offset);
            weightedSum += points[sampleIndex].y * weight;
            weightTotal += weight;
        }
        return { x: point.x, y: weightTotal ? weightedSum / weightTotal : point.y };
    });
}

function findGPCPeaks(points) {
    if (points.length < 5) return [];
    const yValues = points.map(point => point.y);
    const min = Math.min(...yValues);
    const max = Math.max(...yValues);
    const threshold = Math.max((max - min) * 0.03, Number.EPSILON);
    const peaks = [];
    for (let i = 1; i < points.length - 1; i++) {
        const current = points[i];
        if (current.y > points[i - 1].y && current.y >= points[i + 1].y) {
            const prominence = current.y - Math.max(points[i - 1].y, points[i + 1].y);
            if (prominence >= threshold) peaks.push({ ...current, prominence });
        }
    }
    return peaks.slice(0, 20);
}

function analyzeGPCCurve(points, peaks) {
    const peak = peaks.length ? peaks.reduce((best, current) => current.y > best.y ? current : best, peaks[0]) : points[0];
    let area = 0;
    let weightedX = 0;
    for (let i = 1; i < points.length; i++) {
        const dx = points[i].x - points[i - 1].x;
        const avgY = (points[i].y + points[i - 1].y) / 2;
        area += dx * avgY;
        weightedX += dx * avgY * ((points[i].x + points[i - 1].x) / 2);
    }
    const centroid = area !== 0 ? weightedX / area : peak.x;
    return { peak, area, centroid };
}

function renderGPC() {
    if (!gpcState.points.length) {
        const summary = document.getElementById('gpc-analysis-summary');
        if (summary) summary.textContent = 'Grafik analizi bekleniyor';
        return;
    }

    const enableSmoothing = document.getElementById('gpc-enable-smoothing')?.checked || false;
    const smoothingLevel = parseInt(document.getElementById('gpc-smoothing-level')?.value || '7', 10);
    const points = enableSmoothing ? applyGPCSmoothing(gpcState.points, smoothingLevel) : gpcState.points.map(point => ({ ...point }));
    const peaks = findGPCPeaks(points);
    const analysis = analyzeGPCCurve(points, peaks);
    const peak = analysis.peak;
    gpcState.processedPoints = points;
    gpcState.peaks = peaks;
    gpcState.analysis = analysis;

    document.getElementById('gpc-file-info').textContent = `${gpcState.fileName} • ${points.length} veri noktası`;
    document.getElementById('gpc-point-count').textContent = points.length;
    document.getElementById('gpc-peak-value').textContent = peak.y.toFixed(4);
    document.getElementById('gpc-area-summary').textContent = `Alan: ${analysis.area.toPrecision(5)} • Pik: ${peaks.length}`;
    document.getElementById('gpc-chart-caption').textContent = `${points[0].x} – ${points[points.length - 1].x} X aralığı`;
    const summary = document.getElementById('gpc-analysis-summary');
    if (summary) summary.textContent = `Maksimum @ ${peak.x.toFixed(3)} | Ağırlıklı merkez @ ${analysis.centroid.toFixed(3)}`;
    document.getElementById('gpc-export-button').disabled = false;
    Plotly.react('gpc-plotly-chart', [{
        x: points.map(point => point.x), y: points.map(point => point.y), mode: 'lines', fill: 'tozeroy',
        name: 'GPC sinyali', line: { color: '#2dd4bf', width: 2 }, fillcolor: 'rgba(45, 212, 191, 0.12)'
    }, {
        x: [peak.x], y: [peak.y], mode: 'markers+text', text: [`Maks. ${peak.x.toFixed(3)}`], textposition: 'top center',
        name: 'Maksimum', marker: { color: '#fbbf24', size: 9 }
    }], {
        paper_bgcolor: 'transparent', plot_bgcolor: 'transparent', font: { color: '#cbd5e1', size: 11 },
        margin: { t: 20, r: 20, b: 50, l: 55 }, xaxis: { title: 'Tutunma zamanı / elüsyon hacmi' },
        yaxis: { title: 'Dedektör sinyali' }, legend: { orientation: 'h' }, hovermode: 'x unified'
    }, { responsive: true, displaylogo: false });
}

function downloadGPCCSV() {
    if (typeof XLSX === 'undefined') {
        showToast('SheetJS Excel motoru yüklenemedi.', 'error');
        return;
    }
    if (!gpcState.points.length) return;
    const processed = gpcState.processedPoints.length ? gpcState.processedPoints : gpcState.points;
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
        ['X', 'Orijinal dedektör sinyali', 'İşlenmiş dedektör sinyali'],
        ...gpcState.points.map((point, index) => [point.x, point.y, processed[index]?.y ?? ''])
    ]), 'GPC Verisi');
    if (gpcState.analysis) {
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
            ['Metrik', 'Değer'],
            ['Maksimum X', gpcState.analysis.peak.x],
            ['Maksimum Y', gpcState.analysis.peak.y],
            ['Alan', gpcState.analysis.area],
            ['Ağırlıklı merkez', gpcState.analysis.centroid]
        ]), 'Grafik Analizi');
    }
    XLSX.writeFile(workbook, `GPC_Islenmis_Veriler_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast('GPC işlenmiş verileri XLSX olarak indirildi.', 'success');
}
