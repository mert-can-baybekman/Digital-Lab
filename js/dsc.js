/**
 * Dijital Laboratuvar - DSC (Differential Scanning Calorimetry) Analizörü
 */

let dscState = { fileName: '', rows: [], points: [], peaks: [] };

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
            dscState = { fileName: file.name, rows, points, peaks: findDSCPeaks(points) };
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
    const peaks = [];
    for (let index = 1; index < values.length - 1; index++) {
        const isMax = values[index] > values[index - 1] && values[index] >= values[index + 1];
        const isMin = values[index] < values[index - 1] && values[index] <= values[index + 1];
        if ((isMax || isMin) && Math.abs(values[index] - (values[index - 1] + values[index + 1]) / 2) >= threshold) {
            peaks.push({ type: isMax ? 'Ekzotermik / maksimum' : 'Endotermik / minimum', x: points[index].x, y: points[index].y });
        }
    }
    return peaks.filter((peak, index) => index === 0 || Math.abs(peak.x - peaks[index - 1].x) > (points[points.length - 1].x - points[0].x) * 0.01).slice(0, 30);
}

function renderDSC() {
    const points = dscState.points;
    const peaks = dscState.peaks;
    document.getElementById('dsc-file-info').textContent = `${dscState.fileName} • ${points.length} veri noktası`;
    document.getElementById('dsc-point-count').textContent = points.length;
    document.getElementById('dsc-peak-count').textContent = peaks.length;
    document.getElementById('dsc-export-button').disabled = false;
    document.getElementById('dsc-transition-summary').textContent = peaks.length ? `${peaks.length} geçiş adayı` : 'Belirgin geçiş bulunamadı';
    document.getElementById('dsc-chart-caption').textContent = `${points[0].x} – ${points[points.length - 1].x} aralığı`;
    document.getElementById('dsc-peaks-table-body').innerHTML = peaks.length ? peaks.map(peak => `
        <tr><td class="p-2">${peak.type}</td><td class="p-2 font-mono">${peak.x.toFixed(3)}</td><td class="p-2 font-mono">${peak.y.toFixed(5)}</td><td class="p-2 text-slate-400">Yerel ekstremum</td></tr>
    `).join('') : '<tr><td colspan="4" class="p-4 text-center text-slate-500 italic">Belirgin termal pik bulunamadı.</td></tr>';
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
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([['Sıcaklık', 'Isı akışı'], ...dscState.points.map(point => [point.x, point.y])]), 'DSC Verisi');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([['Tür', 'Sıcaklık', 'Isı akışı'], ...dscState.peaks.map(peak => [peak.type, peak.x, peak.y])]), 'Termal Pikler');
    XLSX.writeFile(workbook, `DSC_Analizi_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast('DSC analiz Excel dosyası indirildi.', 'success');
}
