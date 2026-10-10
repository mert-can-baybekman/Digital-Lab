/**
 * Dijital Laboratuvar - DSC (Differential Scanning Calorimetry) Analizörü
 */

let dscState = { fileName: '', rows: [], points: [], processedPoints: [], peaks: [], analysis: null };

function initDSCModule() {
    const dropZone = document.getElementById('dsc-drop-zone');
    const input = document.getElementById('dsc-file-input');
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
        if (event.dataTransfer.files.length) handleDSCFile(event.dataTransfer.files[0]);
    });
    input.addEventListener('change', event => {
        if (event.target.files.length) handleDSCFile(event.target.files[0]);
    });
}

function handleDSCFile(file) {
    if (!/\.(xls|xlsx)$/i.test(file.name)) {
        showToast('DSC için .xls veya .xlsx dosyası seçin.', 'error');
        return;
    }
    if (typeof XLSX === 'undefined') {
        showToast('SheetJS Excel motoru yüklenemedi.', 'error');
        return;
    }
    const reader = new FileReader();
    reader.onload = event => {
        try {
            const workbook = XLSX.read(event.target.result, { type: 'array', cellDates: false });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
            const points = extractDSCPoints(rows);
            if (points.length < 2) throw new Error('İlk sayfada iki sayısal DSC sütunu bulunamadı.');
            dscState = { fileName: file.name, rows, points, processedPoints: [], peaks: [], analysis: null };
            renderDSC();
            showToast(`"${file.name}" DSC analizine yüklendi.`, 'success');
        } catch (error) {
            showToast(`DSC dosyası okunamadı: ${error.message}`, 'error');
        }
    };
    reader.onerror = () => showToast('DSC dosyası okunurken hata oluştu.', 'error');
    reader.readAsArrayBuffer(file);
}

function extractDSCPoints(rows) {
    const normalized = rows.map(row => row.map(value => String(value ?? '').trim().toLowerCase()));
    const headerIndex = normalized.findIndex(row => row.some(value => /temp|temperature|sıcak|°c|heat|flow|ısı/.test(value)));
    const start = headerIndex >= 0 ? headerIndex + 1 : 0;
    const header = headerIndex >= 0 ? normalized[headerIndex] : [];
    let xIndex = header.findIndex(value => /temp|temperature|sıcak|°c/.test(value));
    let yIndex = header.findIndex(value => /heat|flow|ısı|dsc|mw|w\/g/.test(value));
    const numericRows = rows.slice(start).map(row => row.map(parseNumericValue));
    if (xIndex < 0 || yIndex < 0) {
        const candidates = [];
        numericRows.forEach(row => row.forEach((value, index) => {
            if (Number.isFinite(value)) candidates[index] = (candidates[index] || 0) + 1;
        }));
        const indexes = Object.entries(candidates).sort((a, b) => b[1] - a[1]).map(entry => Number(entry[0]));
        xIndex = indexes[0];
        yIndex = indexes.find(index => index !== xIndex);
    }
    return numericRows
        .map(row => ({ x: row[xIndex], y: row[yIndex] }))
        .filter(point => Number.isFinite(point.x) && Number.isFinite(point.y))
        .sort((a, b) => a.x - b.x);
}

function parseNumericValue(value) {
    if (typeof value === 'number') return value;
    const text = String(value).replace(/\s/g, '').replace(',', '.');
    return text && /^[-+]?\d*\.?\d+(e[-+]?\d+)?$/i.test(text) ? Number(text) : NaN;
}

function findDSCPeaks(points) {
    if (points.length < 5) return [];
    const values = points.map(point => point.y);
    const range = Math.max(...values) - Math.min(...values);
    const threshold = Math.max(range * 0.03, Number.EPSILON);
    const maxAbs = Math.max(...values.map(value => Math.abs(value)), Number.EPSILON);
    const peaks = [];
    for (let index = 1; index < values.length - 1; index++) {
        const isMax = values[index] > values[index - 1] && values[index] >= values[index + 1];
        const isMin = values[index] < values[index - 1] && values[index] <= values[index + 1];
        const prominence = Math.abs(values[index] - (values[index - 1] + values[index + 1]) / 2);
        if ((isMax || isMin) && prominence >= threshold) {
            peaks.push({
                type: isMax ? 'Ekzotermik / maksimum' : 'Endotermik / minimum',
                x: points[index].x,
                y: points[index].y,
                prominence,
                relative: Math.abs(points[index].y) / maxAbs * 100
            });
        }
    }
    return peaks.filter((peak, index) => index === 0 || Math.abs(peak.x - peaks[index - 1].x) > (points[points.length - 1].x - points[0].x) * 0.01).slice(0, 30);
}

function applyDSCSmoothing(points, windowSize) {
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

function analyzeDSCCurve(points, peaks) {
    if (!points.length) return null;
    const ys = points.map(point => point.y);
    const maxPoint = points[ys.indexOf(Math.max(...ys))];
    const minPoint = points[ys.indexOf(Math.min(...ys))];
    const onset = peaks.length ? peaks.reduce((best, peak) => peak.x < best.x ? peak : best, peaks[0]) : null;
    const endset = peaks.length ? peaks.reduce((best, peak) => peak.x > best.x ? peak : best, peaks[0]) : null;
    const baseline = (points[0].y + points[points.length - 1].y) / 2;
    let area = 0;
    for (let i = 1; i < points.length; i++) {
        const left = points[i - 1];
        const right = points[i];
        area += (right.x - left.x) * (((left.y - baseline) + (right.y - baseline)) / 2);
    }
    return { maxPoint, minPoint, onset, endset, area };
}

function renderDSC() {
    if (!dscState.points.length) {
        const summaryEl = document.getElementById('dsc-analysis-summary');
        const extEl = document.getElementById('dsc-analysis-extrema');
        if (summaryEl) summaryEl.textContent = 'Grafik analizi bekleniyor';
        if (extEl) extEl.textContent = 'Yüklenen DSC eğrisinden otomatik metrikler hesaplanır.';
        return;
    }

    const enableSmoothing = document.getElementById('dsc-enable-smoothing')?.checked || false;
    const smoothingLevel = parseInt(document.getElementById('dsc-smoothing-level')?.value || '7', 10);
    const points = enableSmoothing ? applyDSCSmoothing(dscState.points, smoothingLevel) : dscState.points.map(point => ({ ...point }));
    const peaks = findDSCPeaks(points);
    const analysis = analyzeDSCCurve(points, peaks);
    dscState.processedPoints = points;
    dscState.peaks = peaks;
    dscState.analysis = analysis;

    document.getElementById('dsc-file-info').textContent = `${dscState.fileName} • ${points.length} veri noktası`;
    document.getElementById('dsc-point-count').textContent = points.length;
    document.getElementById('dsc-peak-count').textContent = peaks.length;
    const detectedPeakCount = document.getElementById('dsc-detected-peak-count');
    if (detectedPeakCount) detectedPeakCount.textContent = `${peaks.length} pik`;
    document.getElementById('dsc-export-button').disabled = false;
    document.getElementById('dsc-transition-summary').textContent = peaks.length ? `${peaks.length} geçiş adayı` : 'Belirgin geçiş bulunamadı';
    document.getElementById('dsc-chart-caption').textContent = `${points[0].x} – ${points[points.length - 1].x} aralığı`;
    document.getElementById('dsc-peaks-table-body').innerHTML = peaks.length ? peaks.map(peak => `
        <tr>
            <td class="p-2">${peak.type}</td>
            <td class="p-2 font-mono text-amber-300">${peak.x.toFixed(3)}</td>
            <td class="p-2 font-mono">${peak.y.toFixed(5)}</td>
            <td class="p-2 font-mono">${peak.relative.toFixed(2)}%</td>
            <td class="p-2 font-mono text-emerald-400">${peak.prominence.toExponential(3)}</td>
        </tr>
    `).join('') : '<tr><td colspan="5" class="p-4 text-center text-slate-500 italic">Belirgin termal pik bulunamadı.</td></tr>';
    if (analysis) {
        const summary = [
            `Alan≈ ${analysis.area.toFixed(3)}`,
            analysis.onset ? `Onset≈ ${analysis.onset.x.toFixed(2)}` : null,
            analysis.endset ? `Endset≈ ${analysis.endset.x.toFixed(2)}` : null
        ].filter(Boolean).join(' • ');
        const summaryEl = document.getElementById('dsc-analysis-summary');
        if (summaryEl) summaryEl.textContent = summary;
        const extEl = document.getElementById('dsc-analysis-extrema');
        if (extEl) extEl.textContent = `Max ${analysis.maxPoint.y.toFixed(3)} @ ${analysis.maxPoint.x.toFixed(2)} | Min ${analysis.minPoint.y.toFixed(3)} @ ${analysis.minPoint.x.toFixed(2)}`;
    }
    Plotly.react('dsc-plotly-chart', [{
        x: points.map(point => point.x), y: points.map(point => point.y), mode: 'lines', name: 'DSC', line: { color: '#f87171', width: 2 }
    }, {
        x: peaks.map(peak => peak.x), y: peaks.map(peak => peak.y), mode: 'markers+text', name: 'Pikler',
        text: peaks.map(peak => peak.x.toFixed(1)), textposition: 'top center',
        marker: { color: '#fbbf24', size: 8 }
    }], {
        paper_bgcolor: 'transparent', plot_bgcolor: 'transparent', font: { color: '#cbd5e1', size: 11 },
        margin: { t: 20, r: 20, b: 50, l: 55 }, xaxis: { title: 'Sıcaklık' }, yaxis: { title: 'Isı akışı' },
        legend: { orientation: 'h' }, hovermode: 'x unified'
    }, { responsive: true, displaylogo: false });
}

function downloadDSCWorkbook() {
    if (!dscState.points.length || typeof XLSX === 'undefined') return;
    const workbook = XLSX.utils.book_new();
    const processedPoints = dscState.processedPoints.length ? dscState.processedPoints : dscState.points;
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([['Sıcaklık', 'Orijinal Isı akışı', 'İşlenmiş Isı akışı'], ...dscState.points.map((point, index) => [point.x, point.y, processedPoints[index]?.y ?? ''])]), 'DSC Verisi');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([['Tür', 'Sıcaklık', 'Isı akışı', 'Bağıl (%)', 'Belirginlik'], ...dscState.peaks.map(peak => [peak.type, peak.x, peak.y, peak.relative, peak.prominence])]), 'Termal Pikler');
    if (dscState.analysis) {
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
            ['Metrik', 'Değer'],
            ['İntegral alan (yaklaşık)', dscState.analysis.area],
            ['Onset (yaklaşık)', dscState.analysis.onset ? dscState.analysis.onset.x : ''],
            ['Endset (yaklaşık)', dscState.analysis.endset ? dscState.analysis.endset.x : ''],
            ['Maksimum nokta', `${dscState.analysis.maxPoint.x} / ${dscState.analysis.maxPoint.y}`],
            ['Minimum nokta', `${dscState.analysis.minPoint.x} / ${dscState.analysis.minPoint.y}`]
        ]), 'Grafik Analizi');
    }
    XLSX.writeFile(workbook, `DSC_Analizi_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast('DSC analiz Excel dosyası indirildi.', 'success');
}

function exportDSCPeaksCSV() {
    if (!dscState.peaks.length) {
        showToast('Dışa aktarılacak DSC pik verisi bulunmuyor.', 'warning');
        return;
    }
    let csv = 'Tur,Sicaklik,Isi Akisi,Bagil (%),Belirginlik\n';
    dscState.peaks.forEach(peak => {
        csv += `"${peak.type}",${peak.x.toFixed(4)},${peak.y.toFixed(6)},${peak.relative.toFixed(3)},${peak.prominence.toExponential(6)}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `DSC_Pik_Tablosu_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('DSC pik tablosu CSV olarak indirildi.', 'success');
}
