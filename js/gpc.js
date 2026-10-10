/**
 * Dijital Laboratuvar - GPC (Gel Permeation Chromatography) Analizörü
 */

let gpcState = { fileName: '', points: [] };

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
            gpcState = { fileName: file.name, points };
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

function renderGPC() {
    const points = gpcState.points;
    const peak = points.reduce((best, point) => point.y > best.y ? point : best, points[0]);
    let area = 0;
    for (let index = 1; index < points.length; index++) area += (points[index].x - points[index - 1].x) * (points[index].y + points[index - 1].y) / 2;
    document.getElementById('gpc-file-info').textContent = `${gpcState.fileName} • ${points.length} veri noktası`;
    document.getElementById('gpc-point-count').textContent = points.length;
    document.getElementById('gpc-peak-value').textContent = peak.y.toFixed(4);
    document.getElementById('gpc-area-summary').textContent = `Alan: ${area.toPrecision(5)}`;
    document.getElementById('gpc-chart-caption').textContent = `${points[0].x} – ${points[points.length - 1].x} X aralığı`;
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
    if (!gpcState.points.length) return;
    const rows = [['X', 'Dedektör sinyali'], ...gpcState.points.map(point => [point.x, point.y])];
    const csv = rows.map(row => row.join(',')).join('\r\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    link.download = `GPC_Analizi_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    showToast('GPC analiz CSV dosyası indirildi.', 'success');
}
