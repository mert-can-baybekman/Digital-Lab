/**
 * Dijital Laboratuvar - UV-Vis Spektrofotometre Spektrum Analizörü
 */

let uvvisSpectraList = [];
const uvvisDefaultColors = ['#a855f7', '#06b6d4', '#f59e0b', '#10b981', '#ec4899', '#3b82f6', '#f97316', '#e11d48'];

function initUVVisModule() {
    setupUVVisDropZone();
    initUVVisPlotly();
}

function setupUVVisDropZone() {
    const dropZone = document.getElementById('uvvis-drop-zone');
    const fileInput = document.getElementById('uvvis-file-input');

    if (!dropZone || !fileInput) return;

    dropZone.addEventListener('click', () => fileInput.click());

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
        });
    });

    dropZone.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        if (files.length > 0) handleUVVisFiles(files);
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) handleUVVisFiles(e.target.files);
    });
}

function handleUVVisFiles(files) {
    Array.from(files).forEach(file => {
        if (!file.name.match(/\.(csv|txt|dat)$/i)) {
            showToast(`${file.name} desteklenmeyen dosya formatı. (.csv, .txt, .dat kullanın)`, 'error');
            return;
        }

        Papa.parse(file, {
            skipEmptyLines: true,
            dynamicTyping: true,
            complete: (results) => {
                processUVVisParsedCSV(results.data, file.name);
            },
            error: (err) => {
                showToast(`Dosya okunurken hata: ${err.message}`, 'error');
            }
        });
    });
}

function processUVVisParsedCSV(rows, fileName) {
    if (!rows || rows.length === 0) {
        showToast(`${fileName} boş veya geçersiz dosya.`, 'error');
        return;
    }

    const cleanFileName = fileName.replace(/\.[^/.]+$/, "");
    let columnHeaders = [];
    let dataRows = [];

    // Başlık ve veri ayrıştırma
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length < 2) continue;

        const firstVal = parseFloat(row[0]);
        if (isNaN(firstVal)) {
            const headerCandidates = row.map(cell => cell !== null && cell !== undefined ? String(cell).trim() : '');
            if (headerCandidates.filter(h => h.length > 0).length >= 2) {
                columnHeaders = headerCandidates;
            }
        } else {
            const numRow = row.map(cell => {
                if (cell === null || cell === undefined || cell === '') return NaN;
                return parseFloat(cell);
            });
            if (!isNaN(numRow[0])) {
                dataRows.push(numRow);
            }
        }
    }

    if (dataRows.length === 0) {
        showToast(`${fileName} içinde geçerli UV-Vis sayısal verisi bulunamadı.`, 'error');
        return;
    }

    let maxCols = 0;
    dataRows.forEach(r => {
        if (r.length > maxCols) maxCols = r.length;
    });

    if (maxCols < 2) {
        showToast(`${fileName} içinde en az 2 sütun bulunmalıdır.`, 'error');
        return;
    }

    // İkili Çiftler mi (X1,Y1,X2,Y2...) yoksa Tekil X mi (X,Y1,Y2...)?
    let isPairwise = false;
    if (maxCols >= 4) {
        const col2Header = columnHeaders[2] ? columnHeaders[2].toLowerCase() : '';
        const isCol2HeaderWavelength = col2Header.includes('dalga') || col2Header.includes('wave') || col2Header.includes('nm') || col2Header.includes('x');

        let validCount = 0;
        let isMonotonic = true;
        let prevVal = null;

        for (let r = 0; r < Math.min(25, dataRows.length); r++) {
            const val = dataRows[r][2];
            if (!isNaN(val)) {
                validCount++;
                if (prevVal !== null && val === prevVal) isMonotonic = false;
                prevVal = val;
            }
        }

        if (isCol2HeaderWavelength || (validCount > 5 && isMonotonic)) {
            isPairwise = true;
        }
    }

    let addedCount = 0;

    if (isPairwise) {
        for (let xCol = 0; xCol < maxCols - 1; xCol += 2) {
            const yCol = xCol + 1;
            let rawX = [];
            let rawY = [];

            for (let r = 0; r < dataRows.length; r++) {
                const row = dataRows[r];
                const valX = row[xCol];
                const valY = row[yCol];

                if (!isNaN(valX) && valY !== undefined && !isNaN(valY) && valY !== null) {
                    rawX.push(valX);
                    rawY.push(valY);
                }
            }

            if (rawX.length === 0) continue;

            const combined = rawX.map((x, idx) => ({ x: x, y: rawY[idx] }));
            combined.sort((a, b) => a.x - b.x);

            const sortedX = combined.map(item => item.x);
            const sortedY = combined.map(item => item.y);

            let specName = '';
            const hYName = columnHeaders[yCol];
            const hXName = columnHeaders[xCol];

            if (hYName && hYName.length > 0) {
                specName = `${cleanFileName} - ${hYName}`;
            } else if (hXName && hXName.length > 0) {
                specName = `${cleanFileName} - ${hXName}`;
            } else {
                specName = `${cleanFileName} - Numune ${Math.floor(xCol / 2) + 1}`;
            }

            const color = uvvisDefaultColors[uvvisSpectraList.length % uvvisDefaultColors.length];

            uvvisSpectraList.push({
                id: 'uvvis_' + Date.now() + Math.random().toString(36).substring(2, 5) + '_' + xCol,
                name: specName,
                rawX: sortedX,
                rawY: sortedY,
                processedX: sortedX,
                processedY: sortedY,
                color: color,
                visible: true
            });

            addedCount++;
        }
    } else {
        for (let yCol = 1; yCol < maxCols; yCol++) {
            let rawX = [];
            let rawY = [];

            for (let r = 0; r < dataRows.length; r++) {
                const row = dataRows[r];
                const valX = row[0];
                const valY = row[yCol];

                if (!isNaN(valX) && valY !== undefined && !isNaN(valY) && valY !== null) {
                    rawX.push(valX);
                    rawY.push(valY);
                }
            }

            if (rawX.length === 0) continue;

            const combined = rawX.map((x, idx) => ({ x: x, y: rawY[idx] }));
            combined.sort((a, b) => a.x - b.x);

            const sortedX = combined.map(item => item.x);
            const sortedY = combined.map(item => item.y);

            let specName = '';
            const hName = columnHeaders[yCol];
            
            if (hName && hName.length > 0) {
                specName = (maxCols === 2) ? cleanFileName : `${cleanFileName} - ${hName}`;
            } else {
                specName = (maxCols === 2) ? cleanFileName : `${cleanFileName} - Spektrum ${yCol}`;
            }

            const color = uvvisDefaultColors[uvvisSpectraList.length % uvvisDefaultColors.length];

            uvvisSpectraList.push({
                id: 'uvvis_' + Date.now() + Math.random().toString(36).substring(2, 5) + '_' + yCol,
                name: specName,
                rawX: sortedX,
                rawY: sortedY,
                processedX: sortedX,
                processedY: sortedY,
                color: color,
                visible: true
            });

            addedCount++;
        }
    }

    if (addedCount > 0) {
        incrementStat('spectraAnalyzed');
        updateUVVisSpectraUIList();
        processAndPlotUVVisData();
        showToast(`${fileName} dosyasından ${addedCount} UV-Vis spektrumu eklendi!`, 'success');
    } else {
        showToast(`${fileName} dosyasından spektrum çıkarılamadı.`, 'error');
    }
}

// Ağırlıklı Spektral Yumuşatıcı
function applyUVVisSmoothing(yValues, windowSize) {
    if (windowSize < 3) return yValues;
    const half = Math.floor(windowSize / 2);
    const len = yValues.length;
    const smoothed = new Array(len);

    for (let i = 0; i < len; i++) {
        let sum = 0;
        let weightSum = 0;

        for (let j = -half; j <= half; j++) {
            const idx = i + j;
            if (idx >= 0 && idx < len) {
                const weight = half + 1 - Math.abs(j);
                sum += yValues[idx] * weight;
                weightSum += weight;
            }
        }
        smoothed[i] = sum / weightSum;
    }
    return smoothed;
}

function processAndPlotUVVisData() {
    const yMode = document.getElementById('uvvis-y-mode')?.value || 'raw';
    const normalize = document.getElementById('uvvis-normalize-y')?.checked || false;
    const enableSmoothing = document.getElementById('uvvis-enable-smoothing')?.checked || false;
    const smoothingLevel = parseInt(document.getElementById('uvvis-smoothing-level')?.value || '7');
    const stackOffset = parseFloat(document.getElementById('uvvis-stack-offset')?.value || '0');

    let visibleIndex = 0;

    uvvisSpectraList.forEach(spectrum => {
        let yValues = [...spectrum.rawY];

        if (yMode === 'transmittance_to_absorbance') {
            yValues = yValues.map(val => {
                let t = val;
                if (t <= 0) t = 0.0001;
                if (t > 100) t = 100;
                return 2 - Math.log10(t);
            });
        } else if (yMode === 'absorbance_to_transmittance') {
            yValues = yValues.map(a => Math.pow(10, 2 - a));
        }

        if (enableSmoothing) {
            yValues = applyUVVisSmoothing(yValues, smoothingLevel);
        }

        if (normalize && yValues.length > 0) {
            const min = Math.min(...yValues);
            const max = Math.max(...yValues);
            const range = max - min;
            if (range !== 0) {
                yValues = yValues.map(v => (v - min) / range);
            }
        }

        if (stackOffset > 0 && spectrum.visible) {
            const offsetVal = visibleIndex * stackOffset;
            yValues = yValues.map(v => v + offsetVal);
            visibleIndex++;
        }

        spectrum.processedX = spectrum.rawX;
        spectrum.processedY = yValues;
    });

    updateUVVisPlot();
}

function initUVVisPlotly() {
    const chartDiv = document.getElementById('uvvis-plotly-chart');
    if (!chartDiv) return;

    const layout = getUVVisPlotlyLayout();
    const config = {
        responsive: true,
        displaylogo: false,
        modeBarButtonsToRemove: ['lasso2d', 'select2d'],
        toImageButtonOptions: {
            format: 'png',
            filename: 'uv_vis_spektrumu',
            height: 900,
            width: 1600,
            scale: 2
        }
    };

    Plotly.newPlot('uvvis-plotly-chart', [], layout, config);
}

let uvvisChartTheme = 'dark'; // 'dark' | 'light'

function setUVVisTheme(theme) {
    uvvisChartTheme = theme;
    const darkBtn = document.getElementById('uvvis-theme-dark-btn');
    const lightBtn = document.getElementById('uvvis-theme-light-btn');
    const chartContainer = document.getElementById('uvvis-chart-container-box');

    if (theme === 'light') {
        if (darkBtn) {
            darkBtn.className = 'px-2.5 py-1 text-xs rounded-md font-medium transition flex items-center gap-1 text-slate-400 hover:text-slate-200';
        }
        if (lightBtn) {
            lightBtn.className = 'px-2.5 py-1 text-xs rounded-md font-medium transition flex items-center gap-1 bg-white text-slate-900 shadow-sm font-semibold';
        }
        if (chartContainer) {
            chartContainer.classList.add('bg-white', 'text-slate-900');
            chartContainer.classList.remove('bg-slate-900/60');
        }
    } else {
        if (darkBtn) {
            darkBtn.className = 'px-2.5 py-1 text-xs rounded-md font-medium transition flex items-center gap-1 bg-slate-800 text-white shadow-sm font-semibold';
        }
        if (lightBtn) {
            lightBtn.className = 'px-2.5 py-1 text-xs rounded-md font-medium transition flex items-center gap-1 text-slate-400 hover:text-slate-200';
        }
        if (chartContainer) {
            chartContainer.classList.remove('bg-white', 'text-slate-900');
            chartContainer.classList.add('bg-slate-900/60');
        }
    }
    updateUVVisPlot();
    if (typeof processAndPlotDegradation === 'function' && document.getElementById('uvvis-degradation-plotly-chart')) {
        processAndPlotDegradation();
    }
}

function getUVVisPlotlyLayout() {
    const invertX = document.getElementById('uvvis-invert-x')?.checked || false;
    const yMode = document.getElementById('uvvis-y-mode')?.value || 'raw';
    const isLight = (uvvisChartTheme === 'light');

    let yAxisTitle = 'Absorbans (A)';
    if (yMode === 'absorbance_to_transmittance') yAxisTitle = 'Transmitans (%T)';
    else if (yMode === 'raw') yAxisTitle = 'Sinyal / Absorbans';

    return {
        paper_bgcolor: isLight ? '#ffffff' : 'rgba(0,0,0,0)',
        plot_bgcolor: isLight ? '#ffffff' : 'rgba(15, 23, 42, 0.65)',
        margin: { l: 65, r: 35, t: 35, b: 65 },
        showlegend: true,
        legend: {
            x: 1,
            xanchor: 'right',
            y: 1,
            font: { color: isLight ? '#0f172a' : '#94a3b8', size: 11, family: 'Inter' },
            bgcolor: isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(30, 41, 59, 0.85)',
            bordercolor: isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.1)',
            borderwidth: 1
        },
        xaxis: {
            title: { text: 'Dalga Boyu (Wavelength) [nm]', font: { color: isLight ? '#0f172a' : '#cbd5e1', size: 13, family: 'Inter', weight: isLight ? 'bold' : 'normal' } },
            autorange: invertX ? 'reversed' : true,
            gridcolor: isLight ? '#f1f5f9' : 'rgba(51, 65, 85, 0.6)',
            zerolinecolor: isLight ? '#cbd5e1' : 'rgba(71, 85, 105, 0.8)',
            tickfont: { color: isLight ? '#1e293b' : '#94a3b8', family: 'Inter' },
            showline: isLight,
            linecolor: '#0f172a',
            linewidth: isLight ? 1.5 : 1,
            mirror: isLight
        },
        yaxis: {
            title: { text: yAxisTitle, font: { color: isLight ? '#0f172a' : '#cbd5e1', size: 13, family: 'Inter', weight: isLight ? 'bold' : 'normal' } },
            gridcolor: isLight ? '#f1f5f9' : 'rgba(51, 65, 85, 0.6)',
            zerolinecolor: isLight ? '#cbd5e1' : 'rgba(71, 85, 105, 0.8)',
            tickfont: { color: isLight ? '#1e293b' : '#94a3b8', family: 'Inter' },
            showline: isLight,
            linecolor: '#0f172a',
            linewidth: isLight ? 1.5 : 1,
            mirror: isLight
        },
        hovermode: 'x unified'
    };
}

function updateUVVisPlot() {
    const showPeaks = document.getElementById('uvvis-show-peaks')?.checked || false;
    const sensitivity = parseInt(document.getElementById('uvvis-peak-sensitivity')?.value || '5');
    const isLight = (uvvisChartTheme === 'light');
    
    const plotlyTraces = [];
    const annotations = [];
    const detectedPeaksList = [];

    uvvisSpectraList.forEach(spectrum => {
        if (!spectrum.visible) return;

        plotlyTraces.push({
            x: spectrum.processedX,
            y: spectrum.processedY,
            mode: 'lines',
            name: spectrum.name,
            line: { color: spectrum.color, width: 2 }
        });

        if (showPeaks && spectrum.processedX.length > 0) {
            const peaks = findUVVisPeaks(spectrum.processedX, spectrum.processedY, sensitivity);
            
            peaks.forEach(peak => {
                annotations.push({
                    x: peak.x,
                    y: peak.y,
                    xref: 'x',
                    yref: 'y',
                    text: `λmax ${peak.x.toFixed(0)} nm`,
                    showarrow: true,
                    arrowhead: 2,
                    ax: 0,
                    ay: -25,
                    arrowcolor: isLight ? '#b45309' : '#f59e0b',
                    font: { size: 10, color: isLight ? '#92400e' : '#fcd34d', family: 'JetBrains Mono', weight: 'bold' },
                    bgcolor: isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(15, 23, 42, 0.85)',
                    bordercolor: '#f59e0b',
                    borderwidth: 1,
                    borderpad: 2
                });

                detectedPeaksList.push({
                    spectrumName: spectrum.name,
                    wavenumber: peak.x,
                    intensity: peak.y,
                    group: getUVVisSpectralRegionHint(peak.x),
                    colorSwatch: getWavelengthColor(peak.x)
                });
            });
        }
    });

    const layout = getUVVisPlotlyLayout();

    // Eğer Fotokatalitik Bozunma Modu açıksa, takip edilen dalga boyuna (örn: 664 nm) dikey kılavuz çizgisi ve etiket ekle
    const isDegradationOn = document.getElementById('uvvis-toggle-degradation')?.checked || false;
    const targetWl = parseFloat(document.getElementById('degradation-target-wavelength')?.value || '664');

    if (isDegradationOn && !isNaN(targetWl)) {
        annotations.push({
            x: targetWl,
            y: 0.85,
            xref: 'x',
            yref: 'y',
            text: `⚡ Bozunma Piki: ${targetWl} nm`,
            showarrow: true,
            arrowhead: 2,
            ax: 0,
            ay: -35,
            arrowcolor: '#10b981',
            font: { size: 11, color: '#10b981', family: 'Inter', weight: 'bold' },
            bgcolor: isLight ? 'rgba(236, 253, 245, 0.95)' : 'rgba(6, 78, 59, 0.9)',
            bordercolor: '#10b981',
            borderwidth: 1.5,
            borderpad: 4
        });

        if (!layout.shapes) layout.shapes = [];
        layout.shapes.push({
            type: 'line',
            x0: targetWl,
            x1: targetWl,
            y0: 0,
            y1: 1,
            yref: 'paper',
            line: {
                color: 'rgba(16, 185, 129, 0.75)',
                width: 1.8,
                dash: 'dash'
            }
        });
    }

    layout.annotations = annotations;

    Plotly.react('uvvis-plotly-chart', plotlyTraces, layout);
    updateUVVisPeaksTable(detectedPeaksList);

    if (detectedPeaksList.length > 0) {
        incrementStat('peaksFound');
    }
}

function findUVVisPeaks(xVals, yVals, sensitivity) {
    const len = yVals.length;
    if (len < 5) return [];

    const minY = Math.min(...yVals);
    const maxY = Math.max(...yVals);
    const rangeY = maxY - minY;
    if (rangeY <= 1e-4) return [];

    // Gürültüyü hafifçe filtrelemek için 5 noktalı hareketli ortalama serisi
    const smooth = new Array(len);
    for (let i = 0; i < len; i++) {
        let sum = 0, count = 0;
        for (let j = -2; j <= 2; j++) {
            const idx = i + j;
            if (idx >= 0 && idx < len) {
                sum += yVals[idx];
                count++;
            }
        }
        smooth[i] = sum / count;
    }

    const step = Math.max(3, Math.floor((12 - sensitivity) * 1.5));
    const promThresh = rangeY * (0.14 - (sensitivity - 1) * 0.011);

    const candidates = [];
    for (let i = step; i < len - step; i++) {
        let isMax = true;
        for (let j = i - step; j <= i + step; j++) {
            if (j === i) continue;
            if (smooth[j] >= smooth[i]) { isMax = false; break; }
        }
        if (!isMax) continue;

        let leftBase = smooth[i], rightBase = smooth[i];
        for (let j = i - 1; j >= 0; j--) {
            if (smooth[j] < leftBase) leftBase = smooth[j];
            if (smooth[j] > smooth[j + 1] && smooth[i] - leftBase >= promThresh) break;
        }
        for (let j = i + 1; j < len; j++) {
            if (smooth[j] < rightBase) rightBase = smooth[j];
            if (smooth[j] > smooth[j - 1] && smooth[i] - rightBase >= promThresh) break;
        }

        const prominence = smooth[i] - Math.max(leftBase, rightBase);
        if (prominence < promThresh) continue;

        // Taban çizgisi gürültüsünü filtrele
        if ((smooth[i] - minY) < promThresh * 0.8) continue;

        candidates.push({ x: xVals[i], y: yVals[i], prominence, index: i });
    }

    const minSpacing = 15; // 15 nm
    const filtered = [];
    for (const c of candidates) {
        const existingIdx = filtered.findIndex(p => Math.abs(p.x - c.x) < minSpacing);
        if (existingIdx === -1) {
            filtered.push(c);
        } else {
            if (c.prominence > filtered[existingIdx].prominence) {
                filtered[existingIdx] = c;
            }
        }
    }

    return filtered.sort((a, b) => a.x - b.x);
}

function getUVVisSpectralRegionHint(nm) {
    if (nm < 200) return 'Vakum UV (Tekli bağlar, solvent kesilme bölgesi)';
    if (nm >= 200 && nm <= 280) return 'UV-C Bölgesi (Aromatik halkalar, Peptit bağları, Nükleik asitler)';
    if (nm > 280 && nm <= 315) return 'UV-B Bölgesi (Konjuge dienler, Protein Trp/Tyr)';
    if (nm > 315 && nm <= 400) return 'UV-A Bölgesi (Geniş konjugasyon, Flavonoidler, Karbonil n→π*)';
    if (nm > 400 && nm <= 450) return 'Görünür Mor/Mavi (Karotenoidler, Sarı/Turuncu boyarmaddeler)';
    if (nm > 450 && nm <= 500) return 'Görünür Mavi/Yeşil (Kırmızı/Turuncu metal kompleksleri)';
    if (nm > 500 && nm <= 580) return 'Görünür Yeşil/Sarı (Mor/Pembe kompleksler, Rhodamine)';
    if (nm > 580 && nm <= 700) return 'Görünür Kırmızı (Klorofil A/B, Ftalosiyanin, Mavi pigmentler)';
    if (nm > 700) return 'Yakın Kızılötesi (NIR Spektral Sınırı)';
    return 'UV-Vis Absorpsiyon Bandı';
}

function getWavelengthColor(nm) {
    if (nm < 380) return '#7c3aed'; // UV
    if (nm < 440) return '#6366f1'; // Mor
    if (nm < 490) return '#0284c7'; // Mavi
    if (nm < 510) return '#06b6d4'; // Camgöbeği
    if (nm < 560) return '#10b981'; // Yeşil
    if (nm < 590) return '#eab308'; // Sarı
    if (nm < 630) return '#f97316'; // Turuncu
    if (nm <= 750) return '#ef4444'; // Kırmızı
    return '#881337'; // NIR
}

function updateUVVisPeaksTable(peaks) {
    const tableBody = document.getElementById('uvvis-peaks-table-body');
    const peakCountEl = document.getElementById('uvvis-detected-peak-count');
    if (!tableBody || !peakCountEl) return;
    
    peakCountEl.innerText = `${peaks.length} pik algılandı`;

    if (peaks.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" class="p-4 text-center text-slate-500 italic">Pik tespiti yapmak için grafik ayarlarından "λmax Etiketleri" seçeneğini aktif edin.</td>
            </tr>`;
        return;
    }

    tableBody.innerHTML = peaks.map(p => `
        <tr class="hover:bg-slate-700/30 transition border-b border-slate-700/30">
            <td class="p-2 font-medium text-slate-200">${p.spectrumName}</td>
            <td class="p-2 font-mono text-amber-300 flex items-center gap-1.5">
                <span class="w-2.5 h-2.5 rounded-full inline-block" style="background-color: ${p.colorSwatch || '#f59e0b'};"></span>
                <span>λmax = ${p.wavenumber.toFixed(1)} nm</span>
            </td>
            <td class="p-2 font-mono text-slate-300">${p.intensity.toFixed(3)}</td>
            <td class="p-2 text-slate-400">${p.group}</td>
        </tr>
    `).join('');
}

function exportUVVisPeaksCSV() {
    const showPeaks = document.getElementById('uvvis-show-peaks')?.checked;
    if (!showPeaks || uvvisSpectraList.length === 0) {
        showToast('Dışa aktarmak için önce spektrum yükleyin ve λmax etiketlerini açın.', 'warning');
        return;
    }

    const sensitivity = parseInt(document.getElementById('uvvis-peak-sensitivity')?.value || '5');
    let csvContent = "Spektrum Adı,Dalga Boyu (nm),Absorbans Şiddeti,Spektral Bölge\n";

    uvvisSpectraList.forEach(spec => {
        if (!spec.visible) return;
        const peaks = findUVVisPeaks(spec.processedX, spec.processedY, sensitivity);
        peaks.forEach(p => {
            const hint = getUVVisSpectralRegionHint(p.x).replace(/,/g, ' - ');
            csvContent += `"${spec.name}",${p.x.toFixed(2)},${p.intensity.toFixed(4)},"${hint}"\n`;
        });
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `UV_Vis_Pik_Tablosu_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('UV-Vis pik tablosu CSV olarak indirildi!', 'success');
}

function downloadUVVisChart(format = 'png') {
    const chartDiv = document.getElementById('uvvis-plotly-chart');
    if (!chartDiv) return;

    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = `uv_vis_spektrumu_${dateStr}`;

    Plotly.downloadImage(chartDiv, {
        format: format,
        width: 1920,
        height: 1080,
        filename: fileName
    }).then(() => {
        showToast(`UV-Vis Grafiği ${format.toUpperCase()} olarak indirildi!`, 'success');
    }).catch(() => {
        showToast('Görsel indirilirken hata oluştu.', 'error');
    });
}

function updateUVVisSpectraUIList() {
    const container = document.getElementById('uvvis-spectra-list');
    const countEl = document.getElementById('uvvis-spectrum-count');
    if (!container || !countEl) return;
    
    countEl.innerText = uvvisSpectraList.length;

    if (uvvisSpectraList.length === 0) {
        container.innerHTML = `<p class="text-xs text-slate-500 italic text-center py-4">Henüz spektrum yüklenmedi.</p>`;
        return;
    }

    container.innerHTML = uvvisSpectraList.map(spec => `
        <div class="flex items-center justify-between bg-slate-900/80 p-2.5 rounded-xl border border-slate-700/80 text-xs shadow-sm">
            <div class="flex items-center gap-2 overflow-hidden mr-2">
                <input type="color" value="${spec.color}" onchange="changeUVVisSpectrumColor('${spec.id}', this.value)" class="w-4 h-4 rounded cursor-pointer shrink-0">
                <span class="truncate text-slate-200 font-medium text-[11px]" title="${spec.name}">${spec.name}</span>
            </div>
            <div class="flex items-center gap-1 shrink-0">
                <button onclick="toggleUVVisSpectrumVisibility('${spec.id}')" title="Gizle / Göster" class="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition">
                    <i data-lucide="${spec.visible ? 'eye' : 'eye-off'}" class="w-3.5 h-3.5"></i>
                </button>
                <button onclick="removeUVVisSpectrum('${spec.id}')" title="Kaldır" class="p-1 hover:bg-slate-800 rounded text-red-400 hover:text-red-300 transition">
                    <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                </button>
            </div>
        </div>
    `).join('');

    lucide.createIcons();
}

function changeUVVisSpectrumColor(id, color) {
    const spec = uvvisSpectraList.find(s => s.id === id);
    if (spec) {
        spec.color = color;
        updateUVVisPlot();
    }
}

function toggleUVVisSpectrumVisibility(id) {
    const spec = uvvisSpectraList.find(s => s.id === id);
    if (spec) {
        spec.visible = !spec.visible;
        updateUVVisSpectraUIList();
        updateUVVisPlot();
    }
}

function removeUVVisSpectrum(id) {
    uvvisSpectraList = uvvisSpectraList.filter(s => s.id !== id);
    updateUVVisSpectraUIList();
    processAndPlotUVVisData();
    showToast('Spektrum listeden kaldırıldı.');
}

function clearAllUVVisSpectra() {
    uvvisSpectraList = [];
    updateUVVisSpectraUIList();
    processAndPlotUVVisData();
    showToast('Tüm UV-Vis spektrumları temizlendi.');
}

// Çift Sütunlu Klorofil A & B Örnek Verisi
function loadUVVisSampleData() {
    const sampleX1 = [];
    const sampleY1 = [];
    const sampleX2 = [];
    const sampleY2 = [];

    // Klorofil A
    for (let nm = 220; nm <= 750; nm += 1) {
        sampleX1.push(nm);
        let a = 0.04 + (Math.random() - 0.5) * 0.02;
        a += 0.85 * Math.exp(-Math.pow((nm - 260) / 20, 2)); // Soret UV
        a += 1.25 * Math.exp(-Math.pow((nm - 430) / 25, 2)); // Soret bandı (Mavi)
        a += 0.35 * Math.exp(-Math.pow((nm - 580) / 30, 2)); // Qx bandı
        a += 1.45 * Math.exp(-Math.pow((nm - 662) / 18, 2)); // Qy bandı (Kırmızı)
        sampleY1.push(Math.max(0, a));
    }

    // Klorofil B
    for (let nm = 220; nm <= 750; nm += 1) {
        sampleX2.push(nm);
        let b = 0.03 + (Math.random() - 0.5) * 0.02;
        b += 0.70 * Math.exp(-Math.pow((nm - 275) / 22, 2)); // UV
        b += 1.55 * Math.exp(-Math.pow((nm - 455) / 22, 2)); // Soret bandı (Mavi shift)
        b += 0.40 * Math.exp(-Math.pow((nm - 595) / 30, 2)); // Qx bandı
        b += 1.10 * Math.exp(-Math.pow((nm - 642) / 18, 2)); // Qy bandı (Kırmızı)
        sampleY2.push(Math.max(0, b));
    }

    const mockCSVRows = [
        ['Dalga Boyu (nm)', 'Klorofil_A_Absorbans', 'Dalga Boyu (nm)', 'Klorofil_B_Absorbans']
    ];

    const maxLen = Math.max(sampleX1.length, sampleX2.length);
    for (let i = 0; i < maxLen; i++) {
        mockCSVRows.push([
            sampleX1[i] !== undefined ? sampleX1[i] : '',
            sampleY1[i] !== undefined ? sampleY1[i] : '',
            sampleX2[i] !== undefined ? sampleX2[i] : '',
            sampleY2[i] !== undefined ? sampleY2[i] : ''
        ]);
    }

    processUVVisParsedCSV(mockCSVRows, 'Klorofil_A_ve_B_Spektrumu.csv');
}

/* ========================================================================= */
/* FOTOKATALİTİK BOZUNMA (DEGRADATION) & KİNETİK ANALİZ MOTORU               */
/* ========================================================================= */

let uvvisDegradationSeries = []; // [{ id, name, color, records: [{ time, absorbance, c_c0, degradation, ln_c0_ct, fileName }], k, r2, tHalf, maxDegradation, c0 }]
let uvvisDegradationPlotMode = 'degradation'; // 'degradation', 'c_ratio', 'kinetics'
const uvvisDegradationColors = ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899'];

// Dosya Adından Süre Bilgisi Ayıklama (0dk, 15dk, 30dk, 60dk, 0min, 10s vb.)
function extractTimeFromUVVisFileName(fileName, defaultFallbackIndex = 0) {
    if (!fileName) return defaultFallbackIndex * 10;
    const cleanName = fileName.replace(/\.[^/.]+$/, "").trim();

    // 1. Dakika Kalıpları (0dk, 15dk, 30dk, 60dk, 15min, 30mins, 60dakika vb.)
    const minMatch = cleanName.match(/(?:[_\-\s]|^)(\d+(?:\.\d+)?)\s*(dk|dakika|min|mins|minutes?)$/i) ||
                     cleanName.match(/(\d+(?:\.\d+)?)\s*(dk|dakika|min|mins|minutes?)$/i);
    if (minMatch) {
        return parseFloat(minMatch[1]);
    }

    // 2. Saniye Kalıpları (0sn, 60sn, 120sn vb. -> Dakikaya çevir veya saniye olarak al)
    const secMatch = cleanName.match(/(?:[_\-\s]|^)(\d+(?:\.\d+)?)\s*(sn|saniye|sec|seconds?|s)$/i) ||
                     cleanName.match(/(\d+(?:\.\d+)?)\s*(sn|saniye|sec|seconds?|s)$/i);
    if (secMatch) {
        return parseFloat(secMatch[1]); // Doğrudan sayı olarak
    }

    // 3. Dosya içi herhangi bir yerdeki "15dk" veya "30min"
    const anyMinMatch = cleanName.match(/(\d+(?:\.\d+)?)\s*(dk|dakika|min|mins)(?=[_\-\s\.]|$)/i);
    if (anyMinMatch) {
        return parseFloat(anyMinMatch[1]);
    }

    // 4. Dosya sonundaki saf sayılar (örn: "TiO2_0", "TiO2_15", "TiO2_30")
    const endNumMatch = cleanName.match(/(?:[_\-\s])(\d+(?:\.\d+)?)$/);
    if (endNumMatch) {
        return parseFloat(endNumMatch[1]);
    }

    return defaultFallbackIndex * 10;
}

// Fotokatalitik Bozunma Bölümünü Göster / Gizle
function toggleUVVisDegradation(enable) {
    const section = document.getElementById('uvvis-degradation-section');
    if (!section) return;

    if (enable) {
        section.classList.remove('hidden');
        initUVVisDegradationPlotly();

        if (uvvisSpectraList.length >= 2) {
            extractDegradationFromSpectra();
        } else {
            // Yüklü spektrum yoksa çoklu numuneli örnek fotokataliz serisini yükle
            loadUVVisDegradationMultiSampleSampleData();
        }

        updateUVVisPlot(); // Üst grafikteki 664 nm takip çizgisini çizdir

        setTimeout(() => {
            if (document.getElementById('uvvis-degradation-plotly-chart')) {
                Plotly.Plots.resize('uvvis-degradation-plotly-chart');
            }
            if (document.getElementById('uvvis-plotly-chart')) {
                Plotly.Plots.resize('uvvis-plotly-chart');
            }
            section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 150);

        showToast('⚡ 2. Grafik: Fotokatalitik Bozunma & Kinetik Analizi aktif edildi!', 'success');
    } else {
        section.classList.add('hidden');
        updateUVVisPlot(); // Takip çizgisini kaldır
        showToast('Bozunma analizi bölümü gizlendi.');
    }
}

// Grafik Görünüm Modunu Değiştirme (% Bozunma, C_t/C_0, ln(C0/Ct))
function setUVVisDegradationPlotMode(mode) {
    uvvisDegradationPlotMode = mode;

    document.querySelectorAll('.degradation-mode-btn').forEach(btn => {
        if (btn.getAttribute('data-mode') === mode) {
            btn.classList.add('bg-purple-600', 'text-white', 'shadow-md', 'shadow-purple-600/30');
            btn.classList.remove('bg-slate-800', 'text-slate-300');
        } else {
            btn.classList.remove('bg-purple-600', 'text-white', 'shadow-md', 'shadow-purple-600/30');
            btn.classList.add('bg-slate-800', 'text-slate-300');
        }
    });

    processAndPlotDegradation();
}

function initUVVisDegradationPlotly() {
    const chartDiv = document.getElementById('uvvis-degradation-plotly-chart');
    if (!chartDiv) return;

    const layout = getUVVisDegradationPlotlyLayout();
    const config = {
        responsive: true,
        displaylogo: false,
        modeBarButtonsToRemove: ['lasso2d', 'select2d'],
        toImageButtonOptions: {
            format: 'png',
            filename: 'uvvis_fotokatalitik_bozunma_kinetigi',
            height: 900,
            width: 1600,
            scale: 2
        }
    };

    Plotly.newPlot('uvvis-degradation-plotly-chart', [], layout, config);
}

function getUVVisDegradationPlotlyLayout() {
    const targetWl = document.getElementById('degradation-target-wavelength')?.value || '664';
    const isLight = (uvvisChartTheme === 'light');
    let yTitle = `% Bozunma Verimi (% Degradation @ ${targetWl} nm)`;
    let yRange = [-5, 105];

    if (uvvisDegradationPlotMode === 'c_ratio') {
        yTitle = `Göreceli Konsantrasyon (C_t / C_0 @ ${targetWl} nm)`;
        yRange = [-0.05, 1.05];
    } else if (uvvisDegradationPlotMode === 'kinetics') {
        yTitle = `Yalancı 1. Derece Kinetik: ln(C_0 / C_t)`;
        yRange = null;
    }

    return {
        paper_bgcolor: isLight ? '#ffffff' : 'rgba(0,0,0,0)',
        plot_bgcolor: isLight ? '#ffffff' : 'rgba(15, 23, 42, 0.65)',
        margin: { l: 65, r: 35, t: 35, b: 65 },
        showlegend: true,
        legend: {
            x: uvvisDegradationPlotMode === 'c_ratio' ? 0.98 : 0.02,
            xanchor: uvvisDegradationPlotMode === 'c_ratio' ? 'right' : 'left',
            y: 0.98,
            font: { color: isLight ? '#0f172a' : '#94a3b8', size: 11, family: 'Inter' },
            bgcolor: isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(30, 41, 59, 0.85)',
            bordercolor: isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.1)',
            borderwidth: 1
        },
        xaxis: {
            title: { text: 'Işıma Süresi (Zaman, t) [dakika]', font: { color: isLight ? '#0f172a' : '#cbd5e1', size: 13, family: 'Inter', weight: isLight ? 'bold' : 'normal' } },
            gridcolor: isLight ? '#f1f5f9' : 'rgba(51, 65, 85, 0.6)',
            zerolinecolor: isLight ? '#cbd5e1' : 'rgba(71, 85, 105, 0.8)',
            tickfont: { color: isLight ? '#1e293b' : '#94a3b8', family: 'Inter' },
            showline: isLight,
            linecolor: '#0f172a',
            linewidth: isLight ? 1.5 : 1
        },
        yaxis: {
            title: { text: yTitle, font: { color: isLight ? '#7e22ce' : '#a855f7', size: 13, family: 'Inter', weight: isLight ? 'bold' : 'normal' } },
            gridcolor: isLight ? '#f1f5f9' : 'rgba(51, 65, 85, 0.6)',
            zerolinecolor: isLight ? '#cbd5e1' : 'rgba(71, 85, 105, 0.8)',
            tickfont: { color: isLight ? '#7e22ce' : '#a855f7', family: 'Inter' },
            range: yRange,
            showline: isLight,
            linecolor: '#0f172a',
            linewidth: isLight ? 1.5 : 1
        },
        hovermode: 'closest'
    };
}

// Fotokatalitik Bozunma Verilerini Hesaplama ve Çoklu Numuneleri Çizme
function processAndPlotDegradation() {
    if (uvvisDegradationSeries.length === 0) return;

    const plotlyTraces = [];
    let bestK = 0;
    let bestR2 = 0;
    let bestMaxDeg = 0;
    let bestTHalf = null;

    uvvisDegradationSeries.forEach((series, sIdx) => {
        // Zamana göre küçükten büyüğe sırala
        series.records.sort((a, b) => a.time - b.time);

        // Başlangıç C0 Absorbansını Belirle (t=0)
        const c0 = series.records[0].absorbance > 0 ? series.records[0].absorbance : 0.0001;
        series.c0 = c0;

        const times = [];
        const yValues = [];
        const hoverTexts = [];

        // Her zaman noktası için C_t/C_0, % Degradation ve ln(C0/Ct) hesapla
        series.records.forEach(r => {
            const ct = Math.max(0.0001, r.absorbance);
            const c_ratio = Math.min(1.0, Math.max(0.0, ct / c0));
            const deg = Math.max(0.0, Math.min(100.0, ((c0 - ct) / c0) * 100));
            const ln_ratio = Math.max(0.0, Math.log(c0 / ct));

            r.c_c0 = c_ratio;
            r.degradation = deg;
            r.ln_c0_ct = ln_ratio;

            times.push(r.time);

            if (uvvisDegradationPlotMode === 'degradation') {
                yValues.push(deg);
                hoverTexts.push(`<b>${series.name}</b><br>Zaman: ${r.time} dk<br>% Bozunma: %${deg.toFixed(2)}<br>Absorbans (C_t): ${r.absorbance.toFixed(4)}`);
            } else if (uvvisDegradationPlotMode === 'c_ratio') {
                yValues.push(c_ratio);
                hoverTexts.push(`<b>${series.name}</b><br>Zaman: ${r.time} dk<br>C_t / C_0: ${c_ratio.toFixed(4)}<br>Absorbans: ${r.absorbance.toFixed(4)}`);
            } else if (uvvisDegradationPlotMode === 'kinetics') {
                yValues.push(ln_ratio);
                hoverTexts.push(`<b>${series.name}</b><br>Zaman: ${r.time} dk<br>ln(C₀/Cₜ): ${ln_ratio.toFixed(4)}`);
            }
        });

        // Yalancı 1. Derece Doğrusal Regresyonu Hesapla (ln(C0/Ct) = k * t)
        const n = times.length;
        let sumT = 0, sumY = 0, sumTY = 0, sumT2 = 0, sumY2 = 0;

        for (let i = 0; i < n; i++) {
            sumT += times[i];
            sumY += series.records[i].ln_c0_ct;
            sumTY += times[i] * series.records[i].ln_c0_ct;
            sumT2 += times[i] * times[i];
            sumY2 += series.records[i].ln_c0_ct * series.records[i].ln_c0_ct;
        }

        const denominator = (n * sumT2 - sumT * sumT);
        let k = 0;
        let intercept = 0;
        let r2 = 0;

        if (denominator !== 0 && n >= 2) {
            k = (n * sumTY - sumT * sumY) / denominator;
            intercept = (sumY - k * sumT) / n;

            const rNumerator = (n * sumTY - sumT * sumY);
            const rDenom = Math.sqrt((n * sumT2 - sumT * sumT) * (n * sumY2 - sumY * sumY));
            const r = rDenom !== 0 ? rNumerator / rDenom : 0;
            r2 = r * r;
        }

        k = Math.max(0, k);
        series.k = k;
        series.r2 = r2;
        series.tHalf = k > 0 ? (0.693 / k) : null;
        series.maxDegradation = Math.max(...series.records.map(r => r.degradation));

        if (series.maxDegradation > bestMaxDeg) bestMaxDeg = series.maxDegradation;
        if (series.k > bestK) {
            bestK = series.k;
            bestR2 = series.r2;
            bestTHalf = series.tHalf;
        }

        // Ana Eğri / Noktalar
        if (uvvisDegradationPlotMode === 'kinetics') {
            // Kinetik Modunda: Noktalar + Doğrusal Regresyon Uyum Çizgisi
            plotlyTraces.push({
                x: times,
                y: yValues,
                mode: 'markers',
                name: `${series.name} (Veri)`,
                text: hoverTexts,
                hoverinfo: 'text',
                marker: { color: series.color, size: 8, symbol: 'circle' }
            });

            // Regresyon Doğrusu
            const maxT = Math.max(...times);
            const lineX = [0, maxT];
            const lineY = lineX.map(t => k * t + (intercept > 0 ? intercept : 0));

            plotlyTraces.push({
                x: lineX,
                y: lineY,
                mode: 'lines',
                name: `${series.name} [k = ${k.toFixed(4)} dk⁻¹, R² = ${r2.toFixed(4)}]`,
                line: { color: series.color, width: 2, dash: 'solid' },
                hoverinfo: 'none'
            });
        } else {
            // % Bozunma veya C_t / C_0 Modu: Çizgiler + Noktalar
            plotlyTraces.push({
                x: times,
                y: yValues,
                mode: 'lines+markers',
                name: `${series.name} (Maks: %${series.maxDegradation.toFixed(1)})`,
                text: hoverTexts,
                hoverinfo: 'text',
                line: { color: series.color, width: 2.5, shape: 'spline' },
                marker: { color: series.color, size: 7 }
            });
        }
    });

    // Metrik Kartlarını Güncelle
    const metricMaxDeg = document.getElementById('degradation-metric-max-deg');
    const metricK = document.getElementById('degradation-metric-k');
    const metricR2 = document.getElementById('degradation-metric-r2');
    const metricTHalf = document.getElementById('degradation-metric-thalf');

    if (metricMaxDeg) metricMaxDeg.innerText = `%${bestMaxDeg.toFixed(2)}`;
    if (metricK) metricK.innerText = `${bestK.toFixed(4)} dk⁻¹`;
    if (metricR2) metricR2.innerText = bestR2 > 0 ? bestR2.toFixed(4) : '-';
    if (metricTHalf) metricTHalf.innerText = bestTHalf !== null ? `${bestTHalf.toFixed(1)} dk` : '-';

    const layout = getUVVisDegradationPlotlyLayout();
    Plotly.react('uvvis-degradation-plotly-chart', plotlyTraces, layout);

    updateUVVisDegradationTable();
}

function updateUVVisDegradationTable() {
    const tableBody = document.getElementById('uvvis-degradation-table-body');
    const rowCountEl = document.getElementById('uvvis-degradation-row-count');
    if (!tableBody) return;

    let totalRows = 0;
    uvvisDegradationSeries.forEach(s => totalRows += s.records.length);

    if (rowCountEl) rowCountEl.innerText = `${totalRows} veri noktası (${uvvisDegradationSeries.length} seri)`;

    if (totalRows === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-slate-500 italic">Bozunma verisi bulunamadı.</td></tr>`;
        return;
    }

    let rowsHTML = '';
    uvvisDegradationSeries.forEach(s => {
        s.records.forEach(r => {
            rowsHTML += `
                <tr class="hover:bg-slate-800/40 transition border-b border-slate-800/80 text-xs">
                    <td class="p-2 font-medium text-slate-200 flex items-center gap-1.5 truncate max-w-[170px]" title="${s.name}">
                        <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background-color: ${s.color};"></span>
                        <span class="truncate">${s.name}</span>
                    </td>
                    <td class="p-2 font-mono text-amber-300 font-semibold">${r.time} dk</td>
                    <td class="p-2 font-mono text-sky-300">${r.absorbance.toFixed(4)}</td>
                    <td class="p-2 font-mono text-cyan-300">${r.c_c0 !== undefined ? r.c_c0.toFixed(4) : '-'}</td>
                    <td class="p-2 font-mono text-emerald-400 font-bold">%${r.degradation !== undefined ? r.degradation.toFixed(2) : '-'}</td>
                    <td class="p-2 font-mono text-purple-300">${r.ln_c0_ct !== undefined ? r.ln_c0_ct.toFixed(4) : '-'}</td>
                </tr>
            `;
        });
    });

    tableBody.innerHTML = rowsHTML;
    lucide.createIcons();
}

// 3 Numuneli Karşılaştırmalı Örnek Metilen Mavisi Fotokatalitik Bozunma Verisi (664 nm)
function loadUVVisDegradationMultiSampleSampleData() {
    uvvisSpectraList = [];
    uvvisDegradationSeries = [];

    const targetWl = 664; // Metilen Mavisi λmax

    // Seri 1: Saf Boya Kontrolü (Sadece Işık / Fotoliz - Yavaş Bozunma)
    const series1Times = [0, 10, 20, 30, 45, 60];
    const series1Abs = [1.850, 1.810, 1.775, 1.730, 1.680, 1.625]; // ~%12 bozunma

    // Seri 2: TiO2 Nanopartikül (Standart Fotokatalizör - Orta Hızlı Bozunma)
    const series2Times = [0, 10, 20, 30, 45, 60];
    const series2Abs = [1.850, 1.420, 1.050, 0.780, 0.510, 0.390]; // ~%79 bozunma

    // Seri 3: Ag/TiO2 Kompozit (Gelişmiş Fotokatalizör - Çok Hızlı Bozunma)
    const series3Times = [0, 10, 20, 30, 45, 60];
    const series3Abs = [1.850, 0.980, 0.520, 0.280, 0.120, 0.065]; // ~%96.5 bozunma

    // UV-Vis Spektrum Listesine Ag/TiO2 serisini ekle (kullanıcı üst grafikte de pikin azalışını görsün)
    series3Times.forEach((t, idx) => {
        const xVals = [];
        const yVals = [];
        const remainingAbs = series3Abs[idx];

        for (let nm = 400; nm <= 800; nm += 2) {
            xVals.push(nm);
            let a = 0.03 + (Math.random() - 0.5) * 0.01;
            // 664 nm Metilen Mavisi Monomer Piki (Zamanla azalan)
            a += remainingAbs * Math.exp(-Math.pow((nm - 664) / 32, 2));
            // 612 nm Metilen Mavisi Dimer Omuzu (Orantılı azalan)
            a += (remainingAbs * 0.55) * Math.exp(-Math.pow((nm - 612) / 25, 2));
            // 290 nm UV bandı
            a += (remainingAbs * 0.75) * Math.exp(-Math.pow((nm - 290) / 20, 2));

            yVals.push(Math.max(0, a));
        }

        const color = defaultColors[idx % defaultColors.length];
        uvvisSpectraList.push({
            id: 'uvvis_deg_spec_' + t + '_' + Date.now(),
            name: `Ag_TiO2_MetilenMavisi_${t}dk.csv`,
            rawX: xVals,
            rawY: yVals,
            processedX: xVals,
            processedY: yVals,
            color: color,
            visible: true
        });
    });

    // 3 Karşılaştırmalı Seriyi Bozunma Motoruna Ekle
    const rawSeriesConfigs = [
        { name: 'Saf Boya (Fotoliz Kontrol)', color: '#f43f5e', times: series1Times, abs: series1Abs, prefix: 'saf_boya' },
        { name: 'TiO₂ Nanopartikül', color: '#3b82f6', times: series2Times, abs: series2Abs, prefix: 'tio2' },
        { name: 'Ag/TiO₂ Kompozit', color: '#10b981', times: series3Times, abs: series3Abs, prefix: 'ag_tio2' }
    ];

    rawSeriesConfigs.forEach((cfg, sIdx) => {
        const records = cfg.times.map((t, idx) => ({
            time: t,
            fileName: `${cfg.prefix}_${t}dk.csv`,
            absorbance: cfg.abs[idx],
            c_c0: 0,
            degradation: 0,
            ln_c0_ct: 0
        }));

        uvvisDegradationSeries.push({
            id: 'deg_series_' + sIdx + '_' + Date.now(),
            name: cfg.name,
            color: cfg.color,
            records: records,
            k: 0,
            r2: 0,
            tHalf: null,
            maxDegradation: 0,
            c0: cfg.abs[0]
        });
    });

    const wlInput = document.getElementById('degradation-target-wavelength');
    if (wlInput) wlInput.value = '664';

    updateUVVisSpectraUIList();
    processAndPlotUVVisData();
    processAndPlotDegradation();
    showToast('Örnek 3 Numuneli Fotokatalitik Bozunma Verisi (664 nm Metilen Mavisi) yüklendi!', 'success');
}

// Yüklenmiş UV-Vis Spektrumlarından Belirli Dalga Boyundaki (örn: 664 nm) Absorbansları Otomatik Çekme
function extractDegradationFromSpectra() {
    if (uvvisSpectraList.length < 2) {
        showToast('Spektrumlardan bozunma eğrisi çıkarmak için en az 2 UV-Vis spektrumu yüklemelisiniz.', 'warning');
        return;
    }

    const targetWl = parseFloat(document.getElementById('degradation-target-wavelength')?.value || '664');
    uvvisDegradationSeries = [];

    // Spektrumları numune adına göre grupla (varsayılan tek seri veya çoklu numuneler)
    const seriesMap = {};

    uvvisSpectraList.forEach((spec, index) => {
        const timeVal = extractTimeFromUVVisFileName(spec.name, index);

        // Numune ön adını tespit et (örn: "TiO2_15dk" -> "TiO2", "NumuneA - 30min" -> "NumuneA")
        let seriesName = spec.name.replace(/_?\d+\s*(dk|dakika|min|mins|sn|saniye|s|sec)?(\.[^/.]+)?$/i, '').trim();
        if (!seriesName) seriesName = 'Fotokataliz Numunesi';

        if (!seriesMap[seriesName]) {
            const sColor = uvvisDegradationColors[Object.keys(seriesMap).length % uvvisDegradationColors.length];
            seriesMap[seriesName] = {
                id: 'deg_series_' + Object.keys(seriesMap).length + '_' + Date.now(),
                name: seriesName,
                color: sColor,
                records: [],
                k: 0,
                r2: 0,
                tHalf: null,
                maxDegradation: 0,
                c0: 0
            };
        }

        // Hedef dalga boyuna en yakın indeksi bul
        let closestIdx = 0;
        let minDiff = Infinity;
        for (let i = 0; i < spec.processedX.length; i++) {
            const diff = Math.abs(spec.processedX[i] - targetWl);
            if (diff < minDiff) {
                minDiff = diff;
                closestIdx = i;
            }
        }

        const absVal = Math.max(0.0001, spec.processedY[closestIdx]);

        seriesMap[seriesName].records.push({
            time: timeVal,
            fileName: spec.name,
            absorbance: absVal,
            c_c0: 0,
            degradation: 0,
            ln_c0_ct: 0
        });
    });

    uvvisDegradationSeries = Object.values(seriesMap);

    processAndPlotDegradation();
    showToast(`${uvvisSpectraList.length} spektrumdan ${targetWl} nm pik değerleri ayıklanarak bozunma eğrisi oluşturuldu!`, 'success');
}

// Bozunma CSV Dosyası Yükleme (Time, Sample1_Abs, Sample2_Abs...)
function handleDegradationCSVUpload(files) {
    const file = files[0];
    if (!file) return;

    Papa.parse(file, {
        skipEmptyLines: true,
        dynamicTyping: true,
        complete: (results) => {
            const rows = results.data;
            if (!rows || rows.length < 2) {
                showToast('Geçerli bozunma tablosu bulunamadı.', 'error');
                return;
            }

            // Başlık satırı
            let headers = rows[0].map(c => String(c).trim());
            let startRow = 1;

            if (typeof rows[0][0] === 'number') {
                headers = ['Zaman', 'Numune 1'];
                startRow = 0;
            }

            uvvisDegradationSeries = [];

            const numCols = headers.length;
            for (let c = 1; c < numCols; c++) {
                const sampleName = headers[c] || `Numune ${c}`;
                const color = uvvisDegradationColors[(c - 1) % uvvisDegradationColors.length];
                const records = [];

                for (let r = startRow; r < rows.length; r++) {
                    const row = rows[r];
                    if (!row || row.length <= c) continue;

                    const tVal = parseFloat(row[0]);
                    const absVal = parseFloat(row[c]);

                    if (!isNaN(tVal) && !isNaN(absVal)) {
                        records.push({
                            time: tVal,
                            fileName: `${sampleName} (t=${tVal}dk)`,
                            absorbance: Math.max(0.0001, absVal),
                            c_c0: 0,
                            degradation: 0,
                            ln_c0_ct: 0
                        });
                    }
                }

                if (records.length > 0) {
                    uvvisDegradationSeries.push({
                        id: 'deg_series_upload_' + c + '_' + Date.now(),
                        name: sampleName,
                        color: color,
                        records: records,
                        k: 0,
                        r2: 0,
                        tHalf: null,
                        maxDegradation: 0,
                        c0: records[0].absorbance
                    });
                }
            }

            if (uvvisDegradationSeries.length > 0) {
                processAndPlotDegradation();
                showToast(`"${file.name}" dosyasından ${uvvisDegradationSeries.length} adet numune serisi yüklendi!`, 'success');
            } else {
                showToast('Dosya içinde geçerli zaman ve absorbans verisi bulunamadı.', 'error');
            }
        },
        error: (err) => {
            showToast(`Dosya okunurken hata: ${err.message}`, 'error');
        }
    });
}

function exportDegradationCSV() {
    if (uvvisDegradationSeries.length === 0) {
        showToast('Dışa aktarılacak bozunma verisi bulunmuyor.', 'warning');
        return;
    }

    const targetWl = document.getElementById('degradation-target-wavelength')?.value || '664';
    let csv = `Numune,Zaman (dk),Absorbans (C_t @ ${targetWl} nm),Goreceli Derisim (C_t / C_0),Yuzde Bozunma Verimi (% Degradation),Yalanci 1. Derece ln(C_0 / C_t)\n`;

    uvvisDegradationSeries.forEach(s => {
        s.records.forEach(r => {
            csv += `"${s.name}",${r.time.toFixed(2)},${r.absorbance.toFixed(6)},${r.c_c0 !== undefined ? r.c_c0.toFixed(6) : ''},${r.degradation !== undefined ? r.degradation.toFixed(4) : ''},${r.ln_c0_ct !== undefined ? r.ln_c0_ct.toFixed(6) : ''}\n`;
        });
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Fotokatalitik_Bozunma_Kinetigi_${targetWl}nm_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Bozunma kinetik tablosu CSV olarak indirildi!', 'success');
}

function downloadDegradationChart(format = 'png') {
    const chartDiv = document.getElementById('uvvis-degradation-plotly-chart');
    if (!chartDiv) return;

    const dateStr = new Date().toISOString().slice(0, 10);
    const targetWl = document.getElementById('degradation-target-wavelength')?.value || '664';

    Plotly.downloadImage(chartDiv, {
        format: format,
        width: 1920,
        height: 1080,
        filename: `uvvis_fotokatalitik_bozunma_${targetWl}nm_${uvvisDegradationPlotMode}_${dateStr}`
    }).then(() => {
        showToast(`Bozunma Grafiği ${format.toUpperCase()} olarak indirildi!`, 'success');
    }).catch(() => {
        showToast('Görsel indirilirken hata oluştu.', 'error');
    });
}

