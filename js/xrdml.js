/**
 * Dijital Laboratuvar - XRDML difraktogram analizörü ve Excel dışa aktarımı
 */

let xrdmlFiles = [];
let xrdmlChartInitialized = false;

function initXRDMLModule() {
    setupXRDMLDropZone();
    initXRDMLPlotly();
    updateXRDMLUI();
}

function setupXRDMLDropZone() {
    const dropZone = document.getElementById('xrdml-drop-zone');
    const fileInput = document.getElementById('xrdml-file-input');
    if (!dropZone || !fileInput) return;

    dropZone.addEventListener('click', () => fileInput.click());
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, event => {
            event.preventDefault();
            dropZone.classList.add('drag-over');
        });
    });
    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, event => {
            event.preventDefault();
            dropZone.classList.remove('drag-over');
        });
    });
    dropZone.addEventListener('drop', event => {
        const files = event.dataTransfer.files;
        if (files.length > 0) handleXRDMLFiles(files);
    });
    fileInput.addEventListener('change', event => {
        if (event.target.files.length > 0) handleXRDMLFiles(event.target.files);
        event.target.value = '';
    });
}

function xrdmlLocalName(element) {
    return (element.localName || element.nodeName || '').split(':').pop().toLowerCase();
}

function xrdmlDescendants(element, name) {
    return Array.from(element.getElementsByTagName('*'))
        .filter(child => xrdmlLocalName(child) === name.toLowerCase());
}

function xrdmlDirectChild(element, name) {
    return Array.from(element.children || [])
        .find(child => xrdmlLocalName(child) === name.toLowerCase()) || null;
}

function xrdmlNumber(text) {
    const value = Number(String(text).trim());
    return Number.isFinite(value) ? value : null;
}

function xrdmlText(element, name) {
    const child = xrdmlDescendants(element, name)[0];
    return child ? child.textContent.trim() : '';
}

function parseXRDML(xmlText, fileName) {
    if (/<!DOCTYPE|<!ENTITY/i.test(xmlText)) {
        throw new Error('Güvenlik nedeniyle DOCTYPE veya ENTITY tanımı içeren XML dosyaları kabul edilmiyor.');
    }

    const documentNode = new DOMParser().parseFromString(xmlText, 'application/xml');
    const elements = [documentNode.documentElement, ...documentNode.getElementsByTagName('*')];
    if (elements.some(element => xrdmlLocalName(element) === 'parsererror')) {
        throw new Error('XML yapısı okunamadı veya hatalı biçimlendirilmiş.');
    }

    const rootName = xrdmlLocalName(documentNode.documentElement);
    if (rootName !== 'xrdmeasurements' && rootName !== 'xrdmeasurement') {
        throw new Error('Dosya kökünde geçerli bir XRDML ölçümü bulunamadı.');
    }

    const measurements = elements.filter(element => xrdmlLocalName(element) === 'xrdmeasurement');
    const scans = [];
    const warnings = [];
    let scanNumber = 0;

    measurements.forEach((measurement, measurementIndex) => {
        const sample = xrdmlDescendants(measurement, 'sample')[0];
        const sampleName = sample ? xrdmlText(sample, 'name') : '';
        xrdmlDescendants(measurement, 'scan').forEach(scan => {
            scanNumber++;
            try {
                const dataPoints = xrdmlDescendants(scan, 'datapoints')[0];
                if (!dataPoints) throw new Error('veri noktaları bölümü bulunamadı');

                const intensitiesNode = xrdmlDirectChild(dataPoints, 'intensities');
                if (!intensitiesNode) throw new Error('yoğunluk verisi bulunamadı');

                const intensityText = intensitiesNode.textContent.trim();
                const intensities = intensityText ? intensityText.split(/[\s,;]+/).map(xrdmlNumber) : [];
                if (intensities.length < 2 || intensities.some(value => value === null)) {
                    throw new Error('en az iki geçerli sayısal yoğunluk değeri gerekli');
                }

                const positionsNode = xrdmlDirectChild(dataPoints, 'positions');
                let positions = [];
                if (positionsNode) {
                    positions = xrdmlDescendants(positionsNode, 'position')
                        .map(position => xrdmlNumber(position.textContent));
                }

                if (positions.length !== intensities.length || positions.some(value => value === null)) {
                    const positionSource = positionsNode || scan;
                    const start = xrdmlNumber(xrdmlText(positionSource, 'startposition') || xrdmlText(scan, 'startposition'));
                    const end = xrdmlNumber(xrdmlText(positionSource, 'endposition') || xrdmlText(scan, 'endposition'));
                    if (start === null || end === null) {
                        throw new Error('yoğunluklarla eşleşen konumlar veya başlangıç/bitiş konumları bulunamadı');
                    }
                    positions = intensities.map((value, index) => (
                        start + ((end - start) * index) / (intensities.length - 1)
                    ));
                }

                const axis = positionsNode?.getAttribute('axis') || '2Theta';
                const unit = positionsNode?.getAttribute('unit') || (/2theta/i.test(axis) ? '°' : '');
                const axisLabel = unit ? `${axis} (${unit})` : axis;
                const scanLabel = `${fileName.replace(/\.[^/.]+$/, '')} • Tarama ${scanNumber}`;

                scans.push({
                    label: scanLabel,
                    measurementIndex,
                    scanNumber,
                    sampleName,
                    axisLabel,
                    x: positions,
                    y: intensities,
                    visible: true
                });
            } catch (error) {
                warnings.push(`Tarama ${scanNumber}: ${error.message}`);
            }
        });
    });

    if (scans.length === 0) {
        const detail = warnings.length ? ` ${warnings[0]}.` : '';
        throw new Error(`Dosyada çizilebilir XRDML taraması bulunamadı.${detail}`);
    }

    return { scans, warnings };
}

async function handleXRDMLFiles(fileList) {
    for (const file of Array.from(fileList)) {
        if (!/\.xrdml$/i.test(file.name)) {
            showToast(`${file.name}: yalnızca .xrdml dosyaları desteklenir.`, 'error');
            continue;
        }

        try {
            const result = parseXRDML(await file.text(), file.name);
            const fileRecord = {
                id: `xrdml_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                name: file.name,
                size: file.size,
                sampleName: result.scans.find(scan => scan.sampleName)?.sampleName || '',
                scans: result.scans
            };
            xrdmlFiles.push(fileRecord);
            result.scans.forEach(() => incrementStat('spectraAnalyzed'));
            updateXRDMLUI();

            if (result.warnings.length) {
                showToast(`${file.name}: ${result.scans.length} tarama yüklendi; ${result.warnings.length} tarama atlandı (${result.warnings[0]}).`, 'warning');
            } else {
                showToast(`${file.name}: ${result.scans.length} XRDML taraması yüklendi.`, 'success');
            }
        } catch (error) {
            showToast(`${file.name} okunamadı: ${error.message}`, 'error');
        }
    }
}

function initXRDMLPlotly() {
    const chart = document.getElementById('xrdml-plotly-chart');
    if (!chart) return;
    if (typeof Plotly === 'undefined') {
        showToast('Plotly grafik motoru yüklenemedi.', 'error');
        return;
    }

    Plotly.newPlot(chart, [], getXRDMLLayout('2Theta (°)'), {
        responsive: true,
        displaylogo: false,
        modeBarButtonsToRemove: ['lasso2d', 'select2d'],
        toImageButtonOptions: {
            format: 'png',
            filename: 'xrd_difraktogrami',
            height: 900,
            width: 1600,
            scale: 2
        }
    }).then(() => {
        xrdmlChartInitialized = true;
        updateXRDMLPlot();
    }).catch(error => {
        showToast(`XRD grafiği başlatılamadı: ${error.message}`, 'error');
    });
}

function getXRDMLLayout(xAxisTitle) {
    return {
        autosize: true,
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(15, 23, 42, 0.35)',
        font: { color: '#cbd5e1', family: 'Inter, sans-serif', size: 11 },
        margin: { l: 64, r: 24, t: 28, b: 58 },
        xaxis: {
            title: { text: xAxisTitle, font: { color: '#94a3b8', size: 12 } },
            gridcolor: 'rgba(148, 163, 184, 0.12)',
            zerolinecolor: 'rgba(148, 163, 184, 0.2)'
        },
        yaxis: {
            title: { text: 'Yoğunluk (counts)', font: { color: '#94a3b8', size: 12 } },
            gridcolor: 'rgba(148, 163, 184, 0.12)',
            zerolinecolor: 'rgba(148, 163, 184, 0.2)'
        },
        legend: { orientation: 'h', y: -0.22, font: { color: '#cbd5e1', size: 10 } },
        hovermode: 'x unified'
    };
}

function updateXRDMLUI() {
    const list = document.getElementById('xrdml-files-list');
    const fileCount = document.getElementById('xrdml-file-count');
    const scanCount = document.getElementById('xrdml-scan-count');
    const exportButton = document.getElementById('xrdml-export-button');
    if (!list) return;

    const totalScans = xrdmlFiles.reduce((total, file) => total + file.scans.length, 0);
    if (fileCount) fileCount.textContent = String(xrdmlFiles.length);
    if (scanCount) scanCount.textContent = `${totalScans} tarama`;
    if (exportButton) exportButton.disabled = totalScans === 0;

    list.replaceChildren();
    if (xrdmlFiles.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'py-6 text-center text-xs text-slate-500 italic';
        empty.textContent = 'Henüz XRDML dosyası yüklenmedi.';
        list.appendChild(empty);
    } else {
        xrdmlFiles.forEach(file => {
            const card = document.createElement('div');
            card.className = 'glass-card rounded-xl p-3 border border-slate-700/70 space-y-2';

            const heading = document.createElement('div');
            heading.className = 'flex items-start justify-between gap-2';
            const title = document.createElement('div');
            title.className = 'min-w-0';
            const fileName = document.createElement('p');
            fileName.className = 'text-xs font-semibold text-white truncate';
            fileName.textContent = file.name;
            fileName.title = file.name;
            const metadata = document.createElement('p');
            metadata.className = 'text-[10px] text-slate-400 mt-1';
            metadata.textContent = `${file.scans.length} tarama${file.sampleName ? ` • ${file.sampleName}` : ''}`;
            title.append(fileName, metadata);

            const remove = document.createElement('button');
            remove.type = 'button';
            remove.className = 'text-slate-500 hover:text-red-400 transition p-1';
            remove.title = 'Dosyayı kaldır';
            remove.setAttribute('aria-label', `${file.name} dosyasını kaldır`);
            remove.innerHTML = '<i data-lucide="x" class="w-4 h-4"></i>';
            remove.addEventListener('click', () => removeXRDMLFile(file.id));
            heading.append(title, remove);
            card.appendChild(heading);

            file.scans.forEach((scan, scanIndex) => {
                const row = document.createElement('label');
                row.className = 'flex items-center gap-2 text-[10px] text-slate-300 cursor-pointer';
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = scan.visible;
                checkbox.className = 'accent-orange-500 rounded';
                checkbox.addEventListener('change', () => toggleXRDMLScan(file.id, scanIndex, checkbox.checked));
                const scanTitle = document.createElement('span');
                scanTitle.className = 'truncate';
                scanTitle.textContent = scan.label;
                row.append(checkbox, scanTitle);
                card.appendChild(row);
            });
            list.appendChild(card);
        });
        lucide.createIcons();
    }

    updateXRDMLPlot();
}

function updateXRDMLPlot() {
    const chart = document.getElementById('xrdml-plotly-chart');
    if (!chart || !xrdmlChartInitialized || typeof Plotly === 'undefined') return;

    const colors = ['#f97316', '#38bdf8', '#34d399', '#f472b6', '#a78bfa', '#facc15', '#2dd4bf', '#fb7185'];
    const visibleScans = xrdmlFiles.flatMap(file => file.scans).filter(scan => scan.visible);
    const traces = visibleScans.map((scan, index) => ({
        x: scan.x,
        y: scan.y,
        type: 'scatter',
        mode: 'lines',
        name: scan.label,
        line: { color: colors[index % colors.length], width: 1.6 },
        hovertemplate: '%{x:.4f}<br>%{y:.4f} counts<extra>%{fullData.name}</extra>'
    }));

    const axes = Array.from(new Set(visibleScans.map(scan => scan.axisLabel)));
    const xAxisTitle = axes.length === 1 ? axes[0] : 'Konum';
    const caption = document.getElementById('xrdml-chart-caption');
    if (caption) caption.textContent = axes.length > 1
        ? 'Farklı eksen türleri aynı grafikte gösteriliyor.'
        : 'Yüklenen taramalar aynı grafikte gösterilir.';

    Plotly.react(chart, traces, getXRDMLLayout(xAxisTitle))
        .catch(error => showToast(`XRD grafiği güncellenemedi: ${error.message}`, 'error'));
}

function toggleXRDMLScan(fileId, scanIndex, visible) {
    const file = xrdmlFiles.find(item => item.id === fileId);
    if (!file || !file.scans[scanIndex]) return;
    file.scans[scanIndex].visible = visible;
    updateXRDMLPlot();
}

function removeXRDMLFile(fileId) {
    xrdmlFiles = xrdmlFiles.filter(file => file.id !== fileId);
    updateXRDMLUI();
    showToast('XRDML dosyası listeden kaldırıldı.');
}

function clearXRDMLFiles() {
    xrdmlFiles = [];
    updateXRDMLUI();
    showToast('XRDML dosya listesi temizlendi.');
}

function uniqueXRDMLSheetName(name, usedNames) {
    const baseName = (name.replace(/[:\\/?*\[\]]/g, '').replace(/^'+|'+$/g, '').trim() || 'Tarama').slice(0, 31);
    let candidate = baseName;
    let suffix = 1;
    while (usedNames.has(candidate.toLowerCase())) {
        const suffixText = `_${suffix++}`;
        candidate = `${baseName.slice(0, 31 - suffixText.length)}${suffixText}`;
    }
    usedNames.add(candidate.toLowerCase());
    return candidate;
}

function downloadXRDMLWorkbook() {
    if (typeof XLSX === 'undefined') {
        showToast('SheetJS Excel motoru yüklenemedi.', 'error');
        return;
    }

    const workbook = XLSX.utils.book_new();
    const usedNames = new Set();
    xrdmlFiles.forEach(file => {
        file.scans.forEach(scan => {
            const sheetName = uniqueXRDMLSheetName(`${file.name.replace(/\.[^/.]+$/, '')}_${scan.scanNumber}`, usedNames);
            const rows = [
                ['XRDML dosyası', file.name],
                ['Numune', scan.sampleName || ''],
                ['Tarama', scan.label],
                [scan.axisLabel, 'Yoğunluk (counts)'],
                ...scan.x.map((position, index) => [position, scan.y[index]])
            ];
            XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), sheetName);
        });
    });

    if (usedNames.size === 0) {
        showToast('Excel’e aktarılacak XRDML taraması bulunamadı.', 'warning');
        return;
    }

    try {
        const date = new Date().toISOString().slice(0, 10);
        XLSX.writeFile(workbook, `XRDML_Taramalari_${date}.xlsx`);
        showToast(`${usedNames.size} tarama Excel çalışma kitabına aktarıldı.`, 'success');
    } catch (error) {
        showToast(`Excel dosyası oluşturulamadı: ${error.message}`, 'error');
    }
}
