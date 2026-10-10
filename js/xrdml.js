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

function xrdmlWavelengthAngstrom(measurement) {
    const wavelengthNode = xrdmlDescendants(measurement, 'kalpha1')[0]
        || xrdmlDescendants(measurement, 'wavelength')[0];
    if (!wavelengthNode) return null;

    const value = xrdmlNumber(wavelengthNode.textContent);
    if (value === null || value <= 0) return null;
    const unit = (wavelengthNode.getAttribute('unit') || '').toLowerCase();
    return unit === 'nm' || unit === 'nanometer' || unit === 'nanometers' ? value * 10 : value;
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

    measurements.forEach(measurement => {
        const sample = xrdmlDescendants(measurement, 'sample')[0];
        const sampleName = sample ? xrdmlText(sample, 'name') : '';
        const wavelengthAngstrom = xrdmlWavelengthAngstrom(measurement);
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
                    scanNumber,
                    sampleName,
                    wavelengthAngstrom,
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
    const processedExportButton = document.getElementById('xrdml-processed-export-button');
    if (!list) return;

    const totalScans = xrdmlFiles.reduce((total, file) => total + file.scans.length, 0);
    if (fileCount) fileCount.textContent = String(xrdmlFiles.length);
    if (scanCount) scanCount.textContent = `${totalScans} tarama`;
    if (exportButton) exportButton.disabled = totalScans === 0;
    if (processedExportButton) processedExportButton.disabled = totalScans === 0;

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
    const showPeaks = document.getElementById('xrdml-show-peaks')?.checked !== false;
    const sensitivity = Number(document.getElementById('xrdml-peak-sensitivity')?.value || 5);
    const enableSmoothing = document.getElementById('xrdml-enable-smoothing')?.checked || false;
    const smoothingLevel = parseInt(document.getElementById('xrdml-smoothing-level')?.value || '7', 10);
    const traces = [];
    const annotations = [];
    const tablePeaks = [];

    visibleScans.forEach((scan, index) => {
        const chartY = enableSmoothing ? applyXRDMLSmoothing(scan.y, smoothingLevel) : scan.y;
        traces.push({
            x: scan.x,
            y: chartY,
            type: 'scatter',
            mode: 'lines',
            name: scan.label,
            line: { color: colors[index % colors.length], width: 1.6 },
            hovertemplate: '%{x:.4f}<br>%{y:.4f} counts<extra>%{fullData.name}</extra>'
        });

        if (!showPeaks) return;
        const peaks = findXRDMLPeaks(scan.x, chartY, sensitivity);
        const maxIntensity = getXRDMLMaxIntensity(chartY);
        const scanPeaks = peaks.map(peak => ({
            ...peak,
            scanName: scan.label,
            axisLabel: scan.axisLabel,
            relativeIntensity: maxIntensity > 0 ? Math.max(0, peak.y / maxIntensity * 100) : 0,
            dSpacing: calculateXRDMLDSpacing(scan, peak.x)
        }));
        tablePeaks.push(...scanPeaks);

        if (scanPeaks.length) {
            traces.push({
                x: scanPeaks.map(peak => peak.x),
                y: scanPeaks.map(peak => peak.y),
                customdata: scanPeaks.map(peak => [
                    peak.dSpacing === null ? '—' : `${peak.dSpacing.toFixed(4)} Å`,
                    peak.fwhm === null ? '—' : peak.fwhm.toFixed(4),
                    peak.prominence.toFixed(2)
                ]),
                type: 'scatter',
                mode: 'markers',
                name: `${scan.label} pikleri`,
                showlegend: false,
                marker: { color: '#facc15', size: 10, symbol: 'diamond', line: { color: '#0f172a', width: 1.5 } },
                hovertemplate: 'Konum: %{x:.4f}<br>Şiddet: %{y:.2f}<br>d-aralığı: %{customdata[0]}<br>FWHM: %{customdata[1]}<br>Belirginlik: %{customdata[2]}<extra>%{fullData.name}</extra>'
            });
        }
    });

    tablePeaks
        .slice()
        .sort((a, b) => b.prominence - a.prominence)
        .slice(0, 12)
        .forEach((peak, index) => annotations.push({
            x: peak.x,
            y: peak.y,
            xref: 'x',
            yref: 'y',
            text: peak.x.toFixed(2),
            showarrow: true,
            arrowhead: 2,
            ax: 0,
            ay: -28 - (index % 3) * 16,
            arrowcolor: '#facc15',
            font: { size: 10, color: '#fde68a', family: 'JetBrains Mono', weight: 'bold' },
            bgcolor: 'rgba(15, 23, 42, 0.85)',
            bordercolor: '#facc15',
            borderwidth: 1.5,
            borderpad: 2
        }));

    const axes = Array.from(new Set(visibleScans.map(scan => scan.axisLabel)));
    const xAxisTitle = axes.length === 1 ? axes[0] : 'Konum';
    const caption = document.getElementById('xrdml-chart-caption');
    if (caption) caption.textContent = axes.length > 1
        ? 'Farklı eksen türleri aynı grafikte gösteriliyor.'
        : 'Yüklenen taramalar aynı grafikte gösterilir.';

    const layout = getXRDMLLayout(xAxisTitle);
    layout.annotations = annotations;
    Plotly.react(chart, traces, layout)
        .catch(error => showToast(`XRD grafiği güncellenemedi: ${error.message}`, 'error'));
    updateXRDMLPeaksTable(tablePeaks, showPeaks);
    const peakCount = document.getElementById('xrdml-detected-peak-count');
    if (peakCount) peakCount.textContent = `${tablePeaks.length} pik`;
}

function applyXRDMLSmoothing(values, windowSize) {
    const size = Number.isFinite(windowSize) ? Math.max(3, Math.floor(windowSize)) : 7;
    const normalized = size % 2 === 0 ? size + 1 : size;
    if (normalized < 3 || values.length < 3) return [...values];
    const half = Math.floor(normalized / 2);
    return values.map((value, index) => {
        let weightedSum = 0;
        let weightTotal = 0;
        for (let offset = -half; offset <= half; offset++) {
            const sampleIndex = index + offset;
            if (sampleIndex < 0 || sampleIndex >= values.length) continue;
            const weight = half + 1 - Math.abs(offset);
            weightedSum += values[sampleIndex] * weight;
            weightTotal += weight;
        }
        return weightTotal ? weightedSum / weightTotal : value;
    });
}

function findXRDMLPeaks(xValues, yValues, sensitivity = 5) {
    const length = Math.min(xValues.length, yValues.length);
    if (length < 5) return [];

    const x = xValues.slice(0, length);
    const y = yValues.slice(0, length);
    if (x.some(value => !Number.isFinite(value)) || y.some(value => !Number.isFinite(value))) return [];

    const minY = y.reduce((minimum, value) => Math.min(minimum, value), Infinity);
    const maxY = y.reduce((maximum, value) => Math.max(maximum, value), -Infinity);
    const signalRange = maxY - minY;
    if (!(signalRange > 0)) return [];

    const smooth = y.map((value, index) => {
        let weightedSum = 0;
        let weightTotal = 0;
        for (let offset = -2; offset <= 2; offset++) {
            const sample = index + offset;
            if (sample < 0 || sample >= length) continue;
            const weight = 3 - Math.abs(offset);
            weightedSum += y[sample] * weight;
            weightTotal += weight;
        }
        return weightedSum / weightTotal;
    });

    const clampedSensitivity = Math.min(10, Math.max(1, Number(sensitivity) || 5));
    const residuals = y.map((value, index) => value - smooth[index]);
    const residualMedian = medianXRDMLValue(residuals);
    const noiseSigma = 1.4826 * medianXRDMLValue(residuals.map(value => Math.abs(value - residualMedian)));
    const relativeThreshold = signalRange * (0.12 - (clampedSensitivity - 1) * 0.011);
    const noiseMultiplier = 4.2 - ((clampedSensitivity - 1) / 9) * 1.2;
    const prominenceThreshold = Math.max(relativeThreshold, noiseSigma * noiseMultiplier);
    const candidates = [];
    for (let index = 1; index < length - 1; index++) {
        if (smooth[index] < smooth[index - 1] || smooth[index] <= smooth[index + 1]) continue;

        const height = smooth[index];
        let leftMinimum = height;
        for (let cursor = index - 1; cursor >= 0; cursor--) {
            if (smooth[cursor] > height) break;
            leftMinimum = Math.min(leftMinimum, smooth[cursor]);
        }
        let rightMinimum = height;
        for (let cursor = index + 1; cursor < length; cursor++) {
            if (smooth[cursor] > height) break;
            rightMinimum = Math.min(rightMinimum, smooth[cursor]);
        }

        const prominence = height - Math.max(leftMinimum, rightMinimum);
        if (prominence < prominenceThreshold) continue;
        const peakIndex = findXRDMLPeakIndex(smooth, index);
        candidates.push({
            x: x[peakIndex],
            y: y[peakIndex],
            prominence,
            fwhm: calculateXRDMLFWHM(x, smooth, peakIndex, height - prominence / 2),
            index: peakIndex
        });
    }

    const minSpacing = Math.max(1, Math.round((11 - clampedSensitivity) * 1.5));
    const ranked = candidates.sort((a, b) => b.prominence - a.prominence);
    const filtered = [];
    ranked.forEach(candidate => {
        if (!filtered.some(peak => Math.abs(peak.index - candidate.index) < minSpacing)) filtered.push(candidate);
    });
    return filtered.sort((a, b) => a.x - b.x);
}

function medianXRDMLValue(values) {
    if (!values.length) return 0;
    const sorted = values.slice().sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function findXRDMLPeakIndex(values, index) {
    let start = index;
    let end = index;
    while (start > 0 && values[start - 1] === values[index]) start--;
    while (end < values.length - 1 && values[end + 1] === values[index]) end++;
    return Math.round((start + end) / 2);
}

function calculateXRDMLFWHM(xValues, smoothValues, peakIndex, halfHeight) {
    const findCrossing = direction => {
        for (let index = peakIndex; index !== 0 && index !== smoothValues.length - 1; index += direction) {
            const next = index + direction;
            if ((smoothValues[index] - halfHeight) * (smoothValues[next] - halfHeight) > 0) continue;
            const yDifference = smoothValues[next] - smoothValues[index];
            if (yDifference === 0) return (xValues[index] + xValues[next]) / 2;
            const fraction = (halfHeight - smoothValues[index]) / yDifference;
            return xValues[index] + fraction * (xValues[next] - xValues[index]);
        }
        return null;
    };

    const left = findCrossing(-1);
    const right = findCrossing(1);
    return left === null || right === null ? null : Math.abs(right - left);
}

function calculateXRDMLDSpacing(scan, twoTheta) {
    if (!scan.wavelengthAngstrom || !/2\s*theta|twotheta/i.test(scan.axisLabel) || twoTheta <= 0 || twoTheta >= 180) {
        return null;
    }
    const sine = Math.sin(twoTheta * Math.PI / 360);
    return sine > 0 ? scan.wavelengthAngstrom / (2 * sine) : null;
}

function getXRDMLMaxIntensity(values) {
    return values.reduce((maximum, value) => Math.max(maximum, value), -Infinity);
}

function updateXRDMLPeaksTable(peaks, enabled) {
    const tableBody = document.getElementById('xrdml-peaks-table-body');
    const count = document.getElementById('xrdml-detected-peak-count');
    if (!tableBody || !count) return;

    count.textContent = `${peaks.length} pik algılandı`;
    tableBody.replaceChildren();
    if (!enabled || peaks.length === 0) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 7;
        cell.className = 'p-4 text-center text-slate-500 italic';
        cell.textContent = enabled
            ? 'Bu taramada seçilen hassasiyet düzeyinde belirgin pik bulunamadı.'
            : 'Pik analizi için grafikten "Pik etiketleri" seçeneğini etkinleştirin.';
        row.appendChild(cell);
        tableBody.appendChild(row);
        return;
    }

    peaks.forEach(peak => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-slate-700/30 transition border-b border-slate-700/30';
        const values = [
            [peak.scanName, 'p-2 text-slate-200 max-w-40 truncate'],
            [`${peak.x.toFixed(3)} ${peak.axisLabel}`, 'p-2 font-mono text-amber-300 whitespace-nowrap'],
            [peak.dSpacing === null ? '—' : peak.dSpacing.toFixed(4), 'p-2 font-mono text-cyan-300'],
            [peak.y.toFixed(2), 'p-2 font-mono text-slate-300'],
            [`${peak.relativeIntensity.toFixed(1)}%`, 'p-2 font-mono text-slate-300'],
            [peak.fwhm === null ? '—' : peak.fwhm.toFixed(4), 'p-2 font-mono text-slate-300'],
            [peak.prominence.toFixed(2), 'p-2 font-mono text-slate-300']
        ];
        values.forEach(([text, className]) => {
            const cell = document.createElement('td');
            cell.className = className;
            cell.textContent = text;
            cell.title = text;
            row.appendChild(cell);
        });
        tableBody.appendChild(row);
    });
}

function exportXRDMLPeaksCSV() {
    const visibleScans = xrdmlFiles.flatMap(file => file.scans).filter(scan => scan.visible);
    if (visibleScans.length === 0) {
        showToast('Pik dışa aktarmak için önce XRDML taraması yükleyin.', 'warning');
        return;
    }

    const sensitivity = Number(document.getElementById('xrdml-peak-sensitivity')?.value || 5);
    const rows = [['Tarama', 'Konum', 'Eksen', 'd-aralığı (Å)', 'Şiddet (counts)', 'Bağıl şiddet (%)', 'FWHM', 'Belirginlik']];
    visibleScans.forEach(scan => {
        const maxIntensity = getXRDMLMaxIntensity(scan.y);
        findXRDMLPeaks(scan.x, scan.y, sensitivity).forEach(peak => {
            const dSpacing = calculateXRDMLDSpacing(scan, peak.x);
            rows.push([
                scan.label,
                peak.x.toFixed(5),
                scan.axisLabel,
                dSpacing === null ? '' : dSpacing.toFixed(6),
                peak.y.toFixed(4),
                maxIntensity > 0 ? (peak.y / maxIntensity * 100).toFixed(3) : '0',
                peak.fwhm === null ? '' : peak.fwhm.toFixed(6),
                peak.prominence.toFixed(4)
            ]);
        });
    });

    if (rows.length === 1) {
        showToast('Seçilen taramalarda belirgin pik bulunamadı.', 'warning');
        return;
    }

    const csv = rows.map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `XRDML_Pik_Analizi_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('XRDML pik analizi CSV olarak indirildi.', 'success');
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

    function downloadXRDMLProcessedWorkbook() {
        if (typeof XLSX === 'undefined') {
            showToast('SheetJS Excel motoru yüklenemedi.', 'error');
            return;
        }
        const allScans = xrdmlFiles.flatMap(file => file.scans.map(scan => ({ file, scan })));
        if (allScans.length === 0) {
            showToast('İndirilecek XRDML verisi bulunamadı.', 'warning');
            return;
        }

        const enableSmoothing = document.getElementById('xrdml-enable-smoothing')?.checked || false;
        const smoothingLevel = parseInt(document.getElementById('xrdml-smoothing-level')?.value || '7', 10);
        const workbook = XLSX.utils.book_new();
        const usedNames = new Set();

        allScans.forEach(({ file, scan }) => {
            const processedY = enableSmoothing ? applyXRDMLSmoothing(scan.y, smoothingLevel) : [...scan.y];
            const rows = [
                ['Dosya', file.name],
                ['Tarama', scan.label],
                ['Gürültü azaltma', enableSmoothing ? 'Açık' : 'Kapalı'],
                ['Filtre gücü', smoothingLevel],
                [],
                [scan.axisLabel, 'Orijinal Yoğunluk (counts)', 'İşlenmiş Yoğunluk (counts)']
            ];
            scan.x.forEach((x, index) => rows.push([x, scan.y[index], processedY[index]]));
            const sheetName = uniqueXRDMLSheetName(`${file.name.replace(/\.[^/.]+$/, '')}_${scan.scanNumber}_islenmis`, usedNames);
            XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), sheetName);
        });

        XLSX.writeFile(workbook, `XRDML_Islenmis_Veriler_${new Date().toISOString().slice(0, 10)}.xlsx`);
        showToast('XRDML işlenmiş verileri XLSX olarak indirildi.', 'success');
    }

    const workbook = XLSX.utils.book_new();
    const usedNames = new Set();
    const peakRows = [[
        'Tarama',
        'Konum',
        'Eksen',
        'd-aralığı (Å)',
        'Şiddet (counts)',
        'Bağıl şiddet (%)',
        'FWHM',
        'Belirginlik'
    ]];
    let exportedScanCount = 0;
    const sensitivity = Number(document.getElementById('xrdml-peak-sensitivity')?.value || 5);
    xrdmlFiles.forEach(file => {
        file.scans.forEach(scan => {
            exportedScanCount++;
            const sheetName = uniqueXRDMLSheetName(`${file.name.replace(/\.[^/.]+$/, '')}_${scan.scanNumber}`, usedNames);
            const rows = [
                ['XRDML dosyası', file.name],
                ['Numune', scan.sampleName || ''],
                ['Tarama', scan.label],
                [scan.axisLabel, 'Yoğunluk (counts)'],
                ...scan.x.map((position, index) => [position, scan.y[index]])
            ];
            XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), sheetName);

            const maxIntensity = getXRDMLMaxIntensity(scan.y);
            findXRDMLPeaks(scan.x, scan.y, sensitivity).forEach(peak => {
                const dSpacing = calculateXRDMLDSpacing(scan, peak.x);
                peakRows.push([
                    scan.label,
                    peak.x,
                    scan.axisLabel,
                    dSpacing === null ? '' : dSpacing,
                    peak.y,
                    maxIntensity > 0 ? peak.y / maxIntensity * 100 : 0,
                    peak.fwhm === null ? '' : peak.fwhm,
                    peak.prominence
                ]);
            });
        });
    });

    if (usedNames.size === 0) {
        showToast('Excel’e aktarılacak XRDML taraması bulunamadı.', 'warning');
        return;
    }
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(peakRows), uniqueXRDMLSheetName('Pik Analizi', usedNames));

    try {
        const date = new Date().toISOString().slice(0, 10);
        XLSX.writeFile(workbook, `XRDML_Taramalari_${date}.xlsx`);
        showToast(`${exportedScanCount} tarama ve pik analizi Excel çalışma kitabına aktarıldı.`, 'success');
    } catch (error) {
        showToast(`Excel dosyası oluşturulamadı: ${error.message}`, 'error');
    }
}
