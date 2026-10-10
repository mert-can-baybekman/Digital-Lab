/**
 * Dijital Laboratuvar - FTIR Spektrum Analizörü & Grafik Stüdyosu
 */

let ftirSpectraList = [];
const ftirDefaultColors = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#f97316', '#14b8a6'];

function initFTIRModule() {
    setupFTIRDropZone();
    initFTIRPlotly();
}

function setupFTIRDropZone() {
    const dropZone = document.getElementById('ftir-drop-zone');
    const fileInput = document.getElementById('ftir-file-input');

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
        if (files.length > 0) handleFTIRFiles(files);
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) handleFTIRFiles(e.target.files);
    });
}

function handleFTIRFiles(files) {
    Array.from(files).forEach(file => {
        if (!file.name.match(/\.(csv|txt|dat)$/i)) {
            showToast(`${file.name} desteklenmeyen dosya formatı. (.csv, .txt, .dat kullanın)`, 'error');
            return;
        }

        Papa.parse(file, {
            skipEmptyLines: true,
            dynamicTyping: true,
            complete: (results) => {
                processFTIRParsedCSV(results.data, file.name);
            },
            error: (err) => {
                showToast(`Dosya okunurken hata: ${err.message}`, 'error');
            }
        });
    });
}

function processFTIRParsedCSV(rows, fileName) {
    let rawX = [];
    let rawY = [];

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length < 2) continue;

        const valX = parseFloat(row[0]);
        const valY = parseFloat(row[1]);

        if (!isNaN(valX) && !isNaN(valY)) {
            rawX.push(valX);
            rawY.push(valY);
        }
    }

    if (rawX.length === 0) {
        showToast(`${fileName} içinde geçerli FTIR sayısal verisi bulunamadı.`, 'error');
        return;
    }

    // Dalga sayılarına göre sırala (Küçükten büyüğe)
    const combined = rawX.map((x, idx) => ({ x: x, y: rawY[idx] }));
    combined.sort((a, b) => a.x - b.x);

    const sortedX = combined.map(item => item.x);
    const sortedY = combined.map(item => item.y);

    const color = ftirDefaultColors[ftirSpectraList.length % ftirDefaultColors.length];

    ftirSpectraList.push({
        id: 'ftir_' + Date.now() + Math.random().toString(36).substring(2, 5),
        name: fileName.replace(/\.[^/.]+$/, ""),
        rawX: sortedX,
        rawY: sortedY,
        processedX: sortedX,
        processedY: sortedY,
        color: color,
        visible: true
    });

    incrementStat('spectraAnalyzed');
    updateFTIRSpectraUIList();
    processAndPlotFTIRData();
    showToast(`${fileName} FTIR listesine eklendi!`, 'success');
}

// Ağırlıklı Spektral Yumuşatıcı (Triangular Weighted Moving Average)
function applyFTIRSmoothing(yValues, windowSize) {
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

function processAndPlotFTIRData() {
    const yMode = document.getElementById('ftir-y-mode')?.value || 'raw';
    const normalize = document.getElementById('ftir-normalize-y')?.checked || false;
    const enableSmoothing = document.getElementById('ftir-enable-smoothing')?.checked || false;
    const smoothingLevel = parseInt(document.getElementById('ftir-smoothing-level')?.value || '7');
    const stackOffset = parseFloat(document.getElementById('ftir-stack-offset')?.value || '0');

    let visibleIndex = 0;

    ftirSpectraList.forEach(spectrum => {
        let yValues = [...spectrum.rawY];

        // Birim Dönüşümü
        if (yMode === 'transmittance_to_absorbance') {
            // A = 2 - log10(%T)
            yValues = yValues.map(val => {
                let t = val;
                if (t <= 0) t = 0.0001;
                if (t > 100) t = 100;
                return 2 - Math.log10(t);
            });
        } else if (yMode === 'absorbance_to_transmittance') {
            // %T = 10^(2 - A)
            yValues = yValues.map(a => Math.pow(10, 2 - a));
        }

        // Gürültü Azaltma Filtresi
        if (enableSmoothing) {
            yValues = applyFTIRSmoothing(yValues, smoothingLevel);
        }

        // Min-Max Normalizasyonu (0 - 1)
        if (normalize && yValues.length > 0) {
            const min = Math.min(...yValues);
            const max = Math.max(...yValues);
            const range = max - min;
            if (range !== 0) {
                yValues = yValues.map(v => (v - min) / range);
            }
        }

        // Şelale / Üst üste Yığma Ofseti (Waterfall Offset)
        if (stackOffset > 0 && spectrum.visible) {
            const offsetVal = visibleIndex * stackOffset;
            yValues = yValues.map(v => v + offsetVal);
            visibleIndex++;
        }

        spectrum.processedX = spectrum.rawX;
        spectrum.processedY = yValues;
    });

    updateFTIRPlot();
}

function initFTIRPlotly() {
    const chartDiv = document.getElementById('ftir-plotly-chart');
    if (!chartDiv) return;

    const layout = getFTIRPlotlyLayout();
    const config = {
        responsive: true,
        displaylogo: false,
        modeBarButtonsToRemove: ['lasso2d', 'select2d'],
        toImageButtonOptions: {
            format: 'png',
            filename: 'ftir_spektrumu',
            height: 900,
            width: 1600,
            scale: 2
        }
    };

    Plotly.newPlot('ftir-plotly-chart', [], layout, config);
}

let ftirChartTheme = 'dark'; // 'dark' | 'light'

function setFTIRTheme(theme) {
    ftirChartTheme = theme;
    const darkBtn = document.getElementById('ftir-theme-dark-btn');
    const lightBtn = document.getElementById('ftir-theme-light-btn');
    const chartContainer = document.getElementById('ftir-chart-container-box');

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
    updateFTIRPlot();
    if (typeof processAndPlotKinetics === 'function' && document.getElementById('ftir-kinetics-plotly-chart')) {
        processAndPlotKinetics();
    }
}

function getFTIRPlotlyLayout() {
    const invertX = document.getElementById('ftir-invert-x')?.checked ?? true;
    const yMode = document.getElementById('ftir-y-mode')?.value || 'raw';
    const isLight = (ftirChartTheme === 'light');

    let yAxisTitle = 'Şiddet / Sinyal';
    if (yMode === 'transmittance_to_absorbance') yAxisTitle = 'Absorbans (A)';
    else if (yMode === 'absorbance_to_transmittance') yAxisTitle = 'Transmitans (%T)';

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
            title: { text: 'Dalga Sayısı (Wavenumber) [cm⁻¹]', font: { color: isLight ? '#0f172a' : '#cbd5e1', size: 13, family: 'Inter', weight: isLight ? 'bold' : 'normal' } },
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

function updateFTIRPlot() {
    const showPeaks = document.getElementById('ftir-show-peaks')?.checked || false;
    const sensitivity = parseInt(document.getElementById('ftir-peak-sensitivity')?.value || '5');
    const yMode = document.getElementById('ftir-y-mode')?.value || 'raw';
    const isLight = (ftirChartTheme === 'light');
    
    const plotlyTraces = [];
    const annotations = [];
    const detectedPeaksList = [];

    ftirSpectraList.forEach(spectrum => {
        if (!spectrum.visible) return;

        plotlyTraces.push({
            x: spectrum.processedX,
            y: spectrum.processedY,
            mode: 'lines',
            name: spectrum.name,
            line: { color: spectrum.color, width: 2 }
        });

        if (showPeaks && spectrum.processedX.length > 0) {
            // FTIR Transmitansta çukur (minima), Absorbansta tepe (maxima) arar
            const isTMode = (yMode === 'raw' || yMode === 'absorbance_to_transmittance');
            const peaks = findFTIRPeaks(spectrum.processedX, spectrum.processedY, sensitivity, isTMode);
            
            peaks.forEach(peak => {
                annotations.push({
                    x: peak.x,
                    y: peak.y,
                    xref: 'x',
                    yref: 'y',
                    text: `${peak.x.toFixed(0)}`,
                    showarrow: true,
                    arrowhead: 2,
                    ax: 0,
                    ay: isTMode ? 26 : -26,
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
                    group: getFTIRFunctionalGroupHint(peak.x)
                });
            });
        }
    });

    const layout = getFTIRPlotlyLayout();

    // Eğer Kinetik Modu açıksa, takip edilen pikin (örn: 810 cm⁻¹) üzerine dikey kılavuz çizgisi ve etiket ekle
    const isKineticsOn = document.getElementById('ftir-toggle-kinetics')?.checked || false;
    const targetWn = parseFloat(document.getElementById('kinetics-target-wavenumber')?.value || '810');

    if (isKineticsOn && !isNaN(targetWn)) {
        annotations.push({
            x: targetWn,
            y: (yMode === 'raw' || yMode === 'absorbance_to_transmittance') ? 10 : 0.85,
            xref: 'x',
            yref: 'y',
            text: `⚡ Takip: ${targetWn} cm⁻¹`,
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

        // Dikey kesikli çizgi ekle
        if (!layout.shapes) layout.shapes = [];
        layout.shapes.push({
            type: 'line',
            x0: targetWn,
            x1: targetWn,
            y0: 0,
            y1: 1,
            yref: 'paper',
            line: {
                color: 'rgba(16, 185, 129, 0.7)',
                width: 1.8,
                dash: 'dash'
            }
        });
    }

    layout.annotations = annotations;

    Plotly.react('ftir-plotly-chart', plotlyTraces, layout);
    updateFTIRPeaksTable(detectedPeaksList);

    if (detectedPeaksList.length > 0) {
        incrementStat('peaksFound');
    }
}

function findFTIRPeaks(xVals, yVals, sensitivity, isTMode = true) {
    const len = yVals.length;
    if (len < 5) return [];

    const minY = Math.min(...yVals);
    const maxY = Math.max(...yVals);
    const rangeY = maxY - minY;
    if (rangeY <= 1e-4) return [];

    // Gürültüyü hafifçe filtrelemek için 5 noktalı hareketli ortalama serisi oluştur
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

    // Arama penceresi adımı (hassasiyet 1-10)
    const step = Math.max(3, Math.floor((12 - sensitivity) * 1.5));
    // Prominence (belirginlik/derinlik) eşiği: hassasiyet 5 için ~8.5%, 1 için ~14%, 10 için ~4.5%
    const promThresh = rangeY * (0.15 - (sensitivity - 1) * 0.012);

    const candidates = [];
    for (let i = step; i < len - step; i++) {
        let isExtremum = true;
        for (let j = i - step; j <= i + step; j++) {
            if (j === i) continue;
            if (isTMode) {
                if (smooth[j] <= smooth[i]) { isExtremum = false; break; }
            } else {
                if (smooth[j] >= smooth[i]) { isExtremum = false; break; }
            }
        }
        if (!isExtremum) continue;

        // Yerel Prominence hesapla
        let leftBase = smooth[i], rightBase = smooth[i];
        for (let j = i - 1; j >= 0; j--) {
            if (isTMode) {
                if (smooth[j] > leftBase) leftBase = smooth[j];
                if (smooth[j] < smooth[j + 1] && leftBase - smooth[i] >= promThresh) break;
            } else {
                if (smooth[j] < leftBase) leftBase = smooth[j];
                if (smooth[j] > smooth[j + 1] && smooth[i] - leftBase >= promThresh) break;
            }
        }
        for (let j = i + 1; j < len; j++) {
            if (isTMode) {
                if (smooth[j] > rightBase) rightBase = smooth[j];
                if (smooth[j] < smooth[j - 1] && rightBase - smooth[i] >= promThresh) break;
            } else {
                if (smooth[j] < rightBase) rightBase = smooth[j];
                if (smooth[j] > smooth[j - 1] && smooth[i] - rightBase >= promThresh) break;
            }
        }

        const prominence = isTMode ? (Math.min(leftBase, rightBase) - smooth[i]) : (smooth[i] - Math.max(leftBase, rightBase));
        if (prominence < promThresh) continue;

        // Transmitans modunda taban çizgisine çok yakın (derinliği olmayan) dip gürültülerini engelle
        if (isTMode && (maxY - smooth[i]) < promThresh) continue;

        candidates.push({ x: xVals[i], y: yVals[i], prominence, index: i });
    }

    // 25 cm⁻¹ içerisindeki yakın pikleri filtrele, daha belirgin olanı seç
    const minSpacing = 25;
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

function getFTIRFunctionalGroupHint(wavenumber) {
    if (wavenumber >= 3200 && wavenumber <= 3650) return 'O-H / N-H Gerilmesi (Alkol, Fenol, Amin, Su)';
    if (wavenumber >= 3000 && wavenumber <= 3100) return '=C-H Gerilmesi (Alken / Aromatik)';
    if (wavenumber >= 2850 && wavenumber < 3000) return 'C-H Gerilmesi (Alkanlar - CH2, CH3)';
    if (wavenumber >= 2500 && wavenumber <= 3300) return 'O-H Çok Geniş (Karboksilik Asit)';
    if (wavenumber >= 2100 && wavenumber <= 2260) return 'C≡C / C≡N Üçlü Bağ Gerilmesi';
    if (wavenumber >= 1680 && wavenumber <= 1780) return 'C=O Güçlü Karbonil (Ester, Keton, Aldehit, Asit)';
    if (wavenumber >= 1600 && wavenumber < 1680) return 'C=C / Amid I Bandı (Alken, Konjuge Keton)';
    if (wavenumber >= 1450 && wavenumber <= 1600) return 'C=C Aromatik Halka Titreşimleri';
    if (wavenumber >= 1350 && wavenumber < 1450) return 'C-H Düzlem İçi Bükülme (Metil / Metilen)';
    if (wavenumber >= 1000 && wavenumber <= 1300) return 'C-O Tekli Bağ Gerilmesi (Eter, Ester, Alkol)';
    if (wavenumber < 1000) return 'Parmak İzi (Fingerprint) & Düzlem Dışı C-H Bükülmesi';
    return 'Diğer Moleküler Titreşim Modları';
}

function updateFTIRPeaksTable(peaks) {
    const tableBody = document.getElementById('ftir-peaks-table-body');
    const peakCountEl = document.getElementById('ftir-detected-peak-count');
    if (!tableBody || !peakCountEl) return;
    
    peakCountEl.innerText = `${peaks.length} pik algılandı`;

    if (peaks.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" class="p-4 text-center text-slate-500 italic">Pik tespiti yapmak için grafik ayarlarından "Otomatik Pik Etiketleri" seçeneğini aktif edin.</td>
            </tr>`;
        return;
    }

    tableBody.innerHTML = peaks.map(p => `
        <tr class="hover:bg-slate-700/30 transition border-b border-slate-700/30">
            <td class="p-2 font-medium text-slate-200">${p.spectrumName}</td>
            <td class="p-2 font-mono text-amber-300">${p.wavenumber.toFixed(1)} cm⁻¹</td>
            <td class="p-2 font-mono text-slate-300">${p.intensity.toFixed(3)}</td>
            <td class="p-2 text-slate-400">${p.group}</td>
        </tr>
    `).join('');
}

function exportFTIRPeaksCSV() {
    const showPeaks = document.getElementById('ftir-show-peaks')?.checked;
    if (!showPeaks || ftirSpectraList.length === 0) {
        showToast('Dışa aktarmak için önce spektrum yükleyin ve pik etiketlerini açın.', 'warning');
        return;
    }

    const sensitivity = parseInt(document.getElementById('ftir-peak-sensitivity')?.value || '5');
    const yMode = document.getElementById('ftir-y-mode')?.value || 'raw';
    const isTMode = (yMode === 'raw' || yMode === 'absorbance_to_transmittance');

    let csvContent = "Spektrum Adı,Dalga Sayısı (cm-1),Şiddet Değeri,Olası İşlevsel Grup\n";

    ftirSpectraList.forEach(spec => {
        if (!spec.visible) return;
        const peaks = findFTIRPeaks(spec.processedX, spec.processedY, sensitivity, isTMode);
        peaks.forEach(p => {
            const hint = getFTIRFunctionalGroupHint(p.x).replace(/,/g, ' - ');
            csvContent += `"${spec.name}",${p.x.toFixed(2)},${p.intensity.toFixed(4)},"${hint}"\n`;
        });
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FTIR_Pik_Tablosu_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('FTIR pik tablosu CSV olarak indirildi!', 'success');
}

function downloadFTIRChart(format = 'png') {
    const chartDiv = document.getElementById('ftir-plotly-chart');
    if (!chartDiv) return;

    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = `ftir_spektrumu_${dateStr}`;

    Plotly.downloadImage(chartDiv, {
        format: format,
        width: 1920,
        height: 1080,
        filename: fileName
    }).then(() => {
        showToast(`FTIR Grafiği ${format.toUpperCase()} olarak indirildi!`, 'success');
    }).catch(() => {
        showToast('Görsel indirilirken hata oluştu.', 'error');
    });
}

function downloadFTIRProcessedWorkbook() {
    if (typeof XLSX === 'undefined') {
        showToast('SheetJS Excel motoru yüklenemedi.', 'error');
        return;
    }
    if (ftirSpectraList.length === 0) {
        showToast('İndirilecek FTIR verisi bulunmuyor.', 'warning');
        return;
    }

    const workbook = XLSX.utils.book_new();
    const yMode = document.getElementById('ftir-y-mode')?.value || 'raw';
    const normalize = document.getElementById('ftir-normalize-y')?.checked || false;
    const enableSmoothing = document.getElementById('ftir-enable-smoothing')?.checked || false;
    const smoothingLevel = parseInt(document.getElementById('ftir-smoothing-level')?.value || '7', 10);

    ftirSpectraList.forEach(spec => {
        const rows = [
            ['Spektrum', spec.name],
            ['Y modu', yMode],
            ['Min-Max normalizasyon', normalize ? 'Açık' : 'Kapalı'],
            ['Gürültü azaltma', enableSmoothing ? 'Açık' : 'Kapalı'],
            ['Filtre gücü', smoothingLevel],
            [],
            ['Dalga Sayısı (cm-1)', 'Orijinal Y', 'İşlenmiş Y']
        ];
        spec.rawX.forEach((x, index) => {
            rows.push([x, spec.rawY[index], spec.processedY[index] ?? '']);
        });
        const sheetName = (spec.name.replace(/[:\\/?*\[\]]/g, '').slice(0, 31) || 'FTIR').trim();
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), sheetName);
    });

    XLSX.writeFile(workbook, `FTIR_Islenmis_Veriler_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast('FTIR işlenmiş verileri XLSX olarak indirildi.', 'success');
}

function updateFTIRSpectraUIList() {
    const container = document.getElementById('ftir-spectra-list');
    const countEl = document.getElementById('ftir-spectrum-count');
    if (!container || !countEl) return;
    
    countEl.innerText = ftirSpectraList.length;

    if (ftirSpectraList.length === 0) {
        container.innerHTML = `<p class="text-xs text-slate-500 italic text-center py-4">Henüz spektrum yüklenmedi.</p>`;
        return;
    }

    container.innerHTML = ftirSpectraList.map(spec => `
        <div class="flex items-center justify-between bg-slate-900/80 p-2.5 rounded-xl border border-slate-700/80 text-xs shadow-sm">
            <div class="flex items-center gap-2 overflow-hidden mr-2">
                <input type="color" value="${spec.color}" onchange="changeFTIRSpectrumColor('${spec.id}', this.value)" class="w-4 h-4 rounded cursor-pointer shrink-0">
                <span class="truncate text-slate-200 font-medium text-[11px]" title="${spec.name}">${spec.name}</span>
            </div>
            <div class="flex items-center gap-1 shrink-0">
                <button onclick="toggleFTIRSpectrumVisibility('${spec.id}')" title="Gizle / Göster" class="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition">
                    <i data-lucide="${spec.visible ? 'eye' : 'eye-off'}" class="w-3.5 h-3.5"></i>
                </button>
                <button onclick="removeFTIRSpectrum('${spec.id}')" title="Kaldır" class="p-1 hover:bg-slate-800 rounded text-red-400 hover:text-red-300 transition">
                    <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                </button>
            </div>
        </div>
    `).join('');

    lucide.createIcons();
}

function changeFTIRSpectrumColor(id, color) {
    const spec = ftirSpectraList.find(s => s.id === id);
    if (spec) {
        spec.color = color;
        updateFTIRPlot();
    }
}

function toggleFTIRSpectrumVisibility(id) {
    const spec = ftirSpectraList.find(s => s.id === id);
    if (spec) {
        spec.visible = !spec.visible;
        updateFTIRSpectraUIList();
        updateFTIRPlot();
    }
}

function removeFTIRSpectrum(id) {
    ftirSpectraList = ftirSpectraList.filter(s => s.id !== id);
    updateFTIRSpectraUIList();
    processAndPlotFTIRData();
    showToast('Spektrum listeden kaldırıldı.');
}

function clearAllFTIRSpectra() {
    ftirSpectraList = [];
    updateFTIRSpectraUIList();
    processAndPlotFTIRData();
    showToast('Tüm FTIR spektrumları temizlendi.');
}

// Örnek FTIR Verisi Yükle (Sentetik Aspirin / Asetilsalisilik Asit Spektrumu)
function loadFTIRSampleData() {
    const sampleX = [];
    const sampleY = [];

    for (let w = 400; w <= 4000; w += 2) {
        sampleX.push(w);
        
        let t = 96 + (Math.random() - 0.5) * 2.5;

        // Karakteristik Aspirin FTIR Çukurları
        t -= 55 * Math.exp(-Math.pow((w - 3320) / 70, 2)); // Fenolik/Karboksilik O-H
        t -= 40 * Math.exp(-Math.pow((w - 2930) / 30, 2)); // C-H alifatik
        t -= 30 * Math.exp(-Math.pow((w - 2850) / 25, 2)); // C-H simetrik
        t -= 80 * Math.exp(-Math.pow((w - 1750) / 18, 2)); // Ester C=O
        t -= 75 * Math.exp(-Math.pow((w - 1690) / 20, 2)); // Asit C=O
        t -= 45 * Math.exp(-Math.pow((w - 1605) / 20, 2)); // Aromatik C=C
        t -= 50 * Math.exp(-Math.pow((w - 1480) / 25, 2)); // Aromatik halka
        t -= 65 * Math.exp(-Math.pow((w - 1200) / 30, 2)); // C-O ester
        t -= 55 * Math.exp(-Math.pow((w - 1015) / 25, 2)); // C-O asit
        t -= 45 * Math.exp(-Math.pow((w - 755) / 20, 2));  // Orto-ikameli aromatik

        sampleY.push(Math.max(1.5, Math.min(100, t)));
    }

    const color = ftirDefaultColors[ftirSpectraList.length % ftirDefaultColors.length];
    ftirSpectraList.push({
        id: 'ftir_' + Date.now(),
        name: 'Ornek_Aspirin_FTIR.csv',
        rawX: sampleX,
        rawY: sampleY,
        processedX: sampleX,
        processedY: sampleY,
        color: color,
        visible: true
    });

    incrementStat('spectraAnalyzed');
    updateFTIRSpectraUIList();
    processAndPlotFTIRData();
    showToast('Örnek Aspirin FTIR spektrumu yüklendi!', 'success');
}

/* ========================================================================= */
/* REAL-TIME FTIR KİNETİK & % DÖNÜŞÜM (% CONVERSION) ANALİZ MOTORU           */
/* ========================================================================= */

let ftirKineticsRecords = []; // { time, transmittance, absorbance, conversion }
let ftirKineticsA0 = null;

// Kinetik Bölümünü Göster / Gizle
function toggleFTIRKinetics(enable) {
    const section = document.getElementById('ftir-kinetics-section');
    if (!section) return;

    if (enable) {
        section.classList.remove('hidden');
        initFTIRKineticsPlotly();

        // Eğer halihazırda 2 veya daha fazla FTIR spektrumu yüklenmişse doğrudan onlardan çek
        if (ftirSpectraList.length >= 2) {
            extractKineticsFromSpectra();
        } else {
            // Yüklü spektrum yoksa veya tek bir spektrum varsa, otomatik zaman serisi spektrumlarını (0sn, 1sn, 5sn, 100sn...) yükle
            loadFTIRMultiSpectraKineticSeries();
        }

        // Üst FTIR grafiğini güncelle (810 cm⁻¹ takip çizgisini çizdir)
        updateFTIRPlot();

        setTimeout(() => {
            if (document.getElementById('ftir-kinetics-plotly-chart')) {
                Plotly.Plots.resize('ftir-kinetics-plotly-chart');
            }
            if (document.getElementById('ftir-plotly-chart')) {
                Plotly.Plots.resize('ftir-plotly-chart');
            }
            section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 150);

        showToast('⚡ 2. Grafik: Real-Time Kinetik & % Dönüşüm Grafiği aktif edildi!', 'success');
    } else {
        section.classList.add('hidden');
        updateFTIRPlot(); // Takip çizgisini kaldır
        showToast('Kinetik analiz bölümü gizlendi.');
    }
}

// Otomatik Çoklu Spektrum Kinetik Serisi Yükleyici (0sn, 1sn, 5sn, 15sn, 30sn, 60sn, 100sn, 180sn)
function loadFTIRMultiSpectraKineticSeries() {
    ftirSpectraList = [];
    ftirKineticsRecords = [];

    const timeSteps = [
        { t: 0, conv: 0.00, name: 'akrilat_polimerizasyon_0sn.csv', t810: 66.25 },
        { t: 1, conv: 12.5, name: 'akrilat_polimerizasyon_1sn.csv', t810: 69.80 },
        { t: 5, conv: 35.0, name: 'akrilat_polimerizasyon_5sn.csv', t810: 76.50 },
        { t: 15, conv: 58.0, name: 'akrilat_polimerizasyon_15sn.csv', t810: 84.80 },
        { t: 30, conv: 72.5, name: 'akrilat_polimerizasyon_30sn.csv', t810: 90.10 },
        { t: 60, conv: 82.0, name: 'akrilat_polimerizasyon_60sn.csv', t810: 93.20 },
        { t: 100, conv: 86.8, name: 'akrilat_polimerizasyon_100sn.csv', t810: 94.70 },
        { t: 180, conv: 88.5, name: 'akrilat_polimerizasyon_180sn.csv', t810: 95.30 }
    ];

    timeSteps.forEach((step, idx) => {
        const xVals = [];
        const yVals = [];

        // 400 - 4000 cm⁻¹ sentetik spektrum
        for (let w = 400; w <= 4000; w += 4) {
            xVals.push(w);
            let t = 96.5 + (Math.random() - 0.5) * 1.5;

            // Sabit Karbonil Piki (C=O @ 1720 cm⁻¹) - Referans
            t -= 75 * Math.exp(-Math.pow((w - 1720) / 22, 2));

            // Sabit C-H piki (2930 cm⁻¹)
            t -= 40 * Math.exp(-Math.pow((w - 2930) / 30, 2));

            // Sabit C-O piki (1190 cm⁻¹)
            t -= 55 * Math.exp(-Math.pow((w - 1190) / 30, 2));

            // ZAMANLA AZALAN AKRİLAT PİKLERİ:
            // 1. Akrilat C=C düzlem dışı bükülme @ 810 cm⁻¹
            const remainingDoubleBond = 1 - (step.conv / 100);
            const peak810Depth = 30.25 * remainingDoubleBond;
            t -= peak810Depth * Math.exp(-Math.pow((w - 810) / 16, 2));

            // 2. Akrilat C=C gerilme @ 1636 cm⁻¹
            const peak1636Depth = 25.0 * remainingDoubleBond;
            t -= peak1636Depth * Math.exp(-Math.pow((w - 1636) / 18, 2));

            yVals.push(Math.max(1.0, Math.min(100, t)));
        }

        const color = ftirDefaultColors[idx % ftirDefaultColors.length];
        ftirSpectraList.push({
            id: 'ftir_kin_' + step.t + '_' + Date.now(),
            name: step.name,
            rawX: xVals,
            rawY: yVals,
            processedX: xVals,
            processedY: yVals,
            color: color,
            visible: true
        });
    });

    updateFTIRSpectraUIList();
    processAndPlotFTIRData();
    extractKineticsFromSpectra();
}

function initFTIRKineticsPlotly() {
    const chartDiv = document.getElementById('ftir-kinetics-plotly-chart');
    if (!chartDiv) return;

    const layout = getFTIRKineticsPlotlyLayout();
    const config = {
        responsive: true,
        displaylogo: false,
        modeBarButtonsToRemove: ['lasso2d', 'select2d'],
        toImageButtonOptions: {
            format: 'png',
            filename: 'ftir_reaksiyon_kinetigi_donusum',
            height: 900,
            width: 1600,
            scale: 2
        }
    };

    Plotly.newPlot('ftir-kinetics-plotly-chart', [], layout, config);
}

function getFTIRKineticsPlotlyLayout() {
    const targetWavenumber = document.getElementById('kinetics-target-wavenumber')?.value || '810';
    const isLight = (ftirChartTheme === 'light');

    return {
        paper_bgcolor: isLight ? '#ffffff' : 'rgba(0,0,0,0)',
        plot_bgcolor: isLight ? '#ffffff' : 'rgba(15, 23, 42, 0.65)',
        margin: { l: 65, r: 65, t: 40, b: 65 },
        showlegend: true,
        legend: {
            x: 0.02,
            y: 0.98,
            font: { color: isLight ? '#0f172a' : '#94a3b8', size: 11, family: 'Inter' },
            bgcolor: isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(30, 41, 59, 0.85)',
            bordercolor: isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.1)',
            borderwidth: 1
        },
        xaxis: {
            title: { text: 'Reaksiyon Süresi (Zaman, t) [saniye]', font: { color: isLight ? '#0f172a' : '#cbd5e1', size: 13, family: 'Inter', weight: isLight ? 'bold' : 'normal' } },
            gridcolor: isLight ? '#f1f5f9' : 'rgba(51, 65, 85, 0.6)',
            zerolinecolor: isLight ? '#cbd5e1' : 'rgba(71, 85, 105, 0.8)',
            tickfont: { color: isLight ? '#1e293b' : '#94a3b8', family: 'Inter' },
            showline: isLight,
            linecolor: '#0f172a',
            linewidth: isLight ? 1.5 : 1
        },
        yaxis: {
            title: { text: `% Dönüşüm (% Conversion @ ${targetWavenumber} cm⁻¹)`, font: { color: '#059669', size: 13, family: 'Inter', weight: 'bold' } },
            gridcolor: isLight ? '#f1f5f9' : 'rgba(51, 65, 85, 0.6)',
            zerolinecolor: isLight ? '#cbd5e1' : 'rgba(71, 85, 105, 0.8)',
            tickfont: { color: '#059669', family: 'Inter' },
            range: [-5, 105],
            showline: isLight,
            linecolor: '#0f172a',
            linewidth: isLight ? 1.5 : 1
        },
        yaxis2: {
            title: { text: `Absorbans (A_t @ ${targetWavenumber} cm⁻¹)`, font: { color: '#0284c7', size: 13, family: 'Inter', weight: 'bold' } },
            overlaying: 'y',
            side: 'right',
            gridcolor: 'transparent',
            tickfont: { color: '#0284c7', family: 'Inter' },
            showgrid: false,
            showline: isLight,
            linecolor: '#0f172a',
            linewidth: isLight ? 1.5 : 1
        },
        hovermode: 'x unified'
    };
}

// Dosya Adından Saniye Bilgisini Akıllıca Ayıklama (örn: 1sn, 5sn, 100sn, 0s, 10sec, 1dk vb.)
function extractSecondsFromFileName(fileName, defaultFallbackIndex = 0) {
    if (!fileName) return defaultFallbackIndex * 10;
    
    // Uzantıyı temizle (.csv, .txt, .dat vb.)
    const cleanName = fileName.replace(/\.[^/.]+$/, "").trim();

    // 1. Dosya adının sonundaki "1sn", "5sn", "100sn", "100s", "100sec", "100saniye" kalıpları
    const endUnitMatch = cleanName.match(/(?:[_\-\s]|^)(\d+(?:\.\d+)?)\s*(sn|saniye|sec|seconds?|s)$/i) ||
                         cleanName.match(/(\d+(?:\.\d+)?)\s*(sn|saniye|sec|seconds?|s)$/i);
    if (endUnitMatch) {
        return parseFloat(endUnitMatch[1]);
    }

    // 2. Dakika kalıpları: "1dk", "5dk", "1min", "5min" -> saniyeye çevir
    const endMinMatch = cleanName.match(/(?:[_\-\s]|^)(\d+(?:\.\d+)?)\s*(dk|dakika|min|mins|minutes?)$/i) ||
                        cleanName.match(/(\d+(?:\.\d+)?)\s*(dk|dakika|min|mins|minutes?)$/i);
    if (endMinMatch) {
        return parseFloat(endMinMatch[1]) * 60;
    }

    // 3. Dosyanın içindeki herhangi bir yerdeki "100sn" veya "5sn"
    const anyUnitMatch = cleanName.match(/(\d+(?:\.\d+)?)\s*(sn|saniye|sec|seconds?|s)(?=[_\-\s\.]|$)/i);
    if (anyUnitMatch) {
        return parseFloat(anyUnitMatch[1]);
    }

    // 4. Dosya adının sonundaki saf sayılar: örn: "Numune_100", "Sample-05", "Polymer_0"
    const endNumberMatch = cleanName.match(/(?:[_\-\s])(\d+(?:\.\d+)?)$/);
    if (endNumberMatch) {
        return parseFloat(endNumberMatch[1]);
    }

    return defaultFallbackIndex * 10;
}

// Kinetik Verilerini Hesaplama ve Grafiğe Çizme
function processAndPlotKinetics() {
    if (ftirKineticsRecords.length === 0) return;

    // Verileri saniyeye (zamana) göre küçükten büyüğe sırala (Kronolojik Sıralama)
    ftirKineticsRecords.sort((a, b) => a.time - b.time);

    // Başlangıç A0 Absorbansını Belirle (t=0 anı)
    const manualA0Input = parseFloat(document.getElementById('kinetics-manual-a0')?.value);
    if (!isNaN(manualA0Input) && manualA0Input > 0) {
        ftirKineticsA0 = manualA0Input;
    } else {
        ftirKineticsA0 = ftirKineticsRecords[0].absorbance;
    }

    if (ftirKineticsA0 <= 0) ftirKineticsA0 = 0.0001;

    // Her satır için Dönüşüm Hesapla: % Conversion = ((A0 - At) / A0) * 100
    ftirKineticsRecords.forEach(rec => {
        if ((rec.absorbance === undefined || isNaN(rec.absorbance)) && rec.transmittance !== undefined) {
            let t = Math.max(0.0001, Math.min(100, rec.transmittance));
            rec.absorbance = 2 - Math.log10(t);
        } else if (rec.transmittance === undefined && rec.absorbance !== undefined) {
            rec.transmittance = Math.pow(10, 2 - rec.absorbance);
        }

        const conv = ((ftirKineticsA0 - rec.absorbance) / ftirKineticsA0) * 100;
        rec.conversion = Math.max(0, conv);
    });

    const times = ftirKineticsRecords.map(r => r.time);
    const conversions = ftirKineticsRecords.map(r => r.conversion);
    const absorbances = ftirKineticsRecords.map(r => r.absorbance);
    const hoverTexts = ftirKineticsRecords.map(r => 
        `<b>${r.fileName || 'Numune'}</b><br>Zaman: ${r.time} sn<br>% Dönüşüm: %${r.conversion.toFixed(2)}<br>Absorbans (A): ${r.absorbance.toFixed(4)}`
    );

    const maxConv = Math.max(...conversions);
    const halfMaxConv = maxConv / 2;

    let t50 = null;
    for (let i = 0; i < conversions.length - 1; i++) {
        if (conversions[i] <= halfMaxConv && conversions[i + 1] >= halfMaxConv) {
            const t1 = times[i], t2 = times[i + 1];
            const c1 = conversions[i], c2 = conversions[i + 1];
            if (c2 !== c1) {
                t50 = t1 + (halfMaxConv - c1) * (t2 - t1) / (c2 - c1);
            } else {
                t50 = t1;
            }
            break;
        }
    }

    const metricMaxConv = document.getElementById('kinetics-metric-max-conv');
    const metricA0 = document.getElementById('kinetics-metric-a0');
    const metricT50 = document.getElementById('kinetics-metric-t50');

    if (metricMaxConv) metricMaxConv.innerText = `%${maxConv.toFixed(2)}`;
    if (metricA0) metricA0.innerText = `${ftirKineticsA0.toFixed(4)}`;
    if (metricT50) metricT50.innerText = t50 !== null ? `${t50.toFixed(1)} sn` : '-';

    const traces = [
        {
            x: times,
            y: conversions,
            mode: 'lines+markers',
            name: '% Dönüşüm (% Conversion)',
            text: hoverTexts,
            hoverinfo: 'text',
            line: { color: '#10b981', width: 2.5, shape: 'spline' },
            marker: { color: '#10b981', size: 7 }
        },
        {
            x: times,
            y: absorbances,
            mode: 'lines+markers',
            name: 'Pik Absorbansı (A_t)',
            yaxis: 'y2',
            text: hoverTexts,
            hoverinfo: 'text',
            line: { color: '#38bdf8', width: 1.8, dash: 'dot' },
            marker: { color: '#38bdf8', size: 5 }
        }
    ];

    const layout = getFTIRKineticsPlotlyLayout();
    Plotly.react('ftir-kinetics-plotly-chart', traces, layout);

    updateFTIRKineticsTable();
}

function updateFTIRKineticsTable() {
    const tableBody = document.getElementById('ftir-kinetics-table-body');
    const rowCountEl = document.getElementById('ftir-kinetics-row-count');
    if (!tableBody) return;

    if (rowCountEl) rowCountEl.innerText = `${ftirKineticsRecords.length} veri noktası`;

    if (ftirKineticsRecords.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-slate-500 italic">Kinetik veri bulunamadı.</td></tr>`;
        return;
    }

    tableBody.innerHTML = ftirKineticsRecords.map((r, idx) => `
        <tr class="hover:bg-slate-800/40 transition border-b border-slate-800/80 text-xs">
            <td class="p-2 font-medium text-slate-200 flex items-center gap-1.5 truncate max-w-[180px]" title="${r.fileName || ('Numune ' + (idx+1))}">
                <i data-lucide="file-text" class="w-3.5 h-3.5 text-slate-400 shrink-0"></i>
                <span class="truncate">${r.fileName || ('Numune_' + r.time + 'sn')}</span>
            </td>
            <td class="p-2 font-mono text-amber-300 font-semibold">${r.time} sn</td>
            <td class="p-2 font-mono text-cyan-300">${r.transmittance !== undefined ? r.transmittance.toFixed(2) + '%' : '-'}</td>
            <td class="p-2 font-mono text-sky-300">${r.absorbance.toFixed(4)}</td>
            <td class="p-2 font-mono text-emerald-400 font-bold">%${r.conversion.toFixed(2)}</td>
        </tr>
    `).join('');

    lucide.createIcons();
}

// Örnek Akrilat Fotopolimerizasyonu Gerçekçi Kinetik Verisi (1sn, 5sn, 100sn vb. İsimlerle)
function loadFTIRKineticsSampleData() {
    ftirKineticsRecords = [];

    const sampleSteps = [
        { time: 0, file: 'akrilat_polimerizasyon_0sn.csv', t: 66.25 },
        { time: 1, file: 'akrilat_polimerizasyon_1sn.csv', t: 68.10 },
        { time: 3, file: 'akrilat_polimerizasyon_3sn.csv', t: 71.45 },
        { time: 5, file: 'akrilat_polimerizasyon_5sn.csv', t: 75.80 },
        { time: 10, file: 'akrilat_polimerizasyon_10sn.csv', t: 82.20 },
        { time: 20, file: 'akrilat_polimerizasyon_20sn.csv', t: 87.50 },
        { time: 30, file: 'akrilat_polimerizasyon_30sn.csv', t: 90.40 },
        { time: 60, file: 'akrilat_polimerizasyon_60sn.csv', t: 93.10 },
        { time: 100, file: 'akrilat_polimerizasyon_100sn.csv', t: 94.60 },
        { time: 150, file: 'akrilat_polimerizasyon_150sn.csv', t: 95.20 },
        { time: 180, file: 'akrilat_polimerizasyon_180sn.csv', t: 95.50 }
    ];

    const initialA = 2 - Math.log10(sampleSteps[0].t);

    sampleSteps.forEach(step => {
        const at = 2 - Math.log10(step.t);
        const conv = ((initialA - at) / initialA) * 100;
        ftirKineticsRecords.push({
            time: step.time,
            fileName: step.file,
            transmittance: step.t,
            absorbance: at,
            conversion: Math.max(0, conv)
        });
    });

    const wnInput = document.getElementById('kinetics-target-wavenumber');
    if (wnInput) wnInput.value = '810';

    const a0Input = document.getElementById('kinetics-manual-a0');
    if (a0Input) a0Input.value = initialA.toFixed(4);

    processAndPlotKinetics();
    showToast('Örnek Akrilat Kinetik Verisi (0sn, 1sn, 5sn, 100sn...) yüklendi!', 'success');
}

// Kinetik CSV Dosyası Yükleme
function handleKineticsCSVUpload(files) {
    const file = files[0];
    if (!file) return;

    Papa.parse(file, {
        skipEmptyLines: true,
        dynamicTyping: true,
        complete: (results) => {
            const rows = results.data;
            if (!rows || rows.length < 2) {
                showToast('Geçerli kinetik satır verisi bulunamadı.', 'error');
                return;
            }

            ftirKineticsRecords = [];

            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                if (!row || row.length < 2) continue;

                const tVal = parseFloat(row[0]);
                const sigVal = parseFloat(row[1]);

                if (!isNaN(tVal) && !isNaN(sigVal)) {
                    const isT = sigVal > 2.5; 
                    if (isT) {
                        const abs = 2 - Math.log10(Math.max(0.001, sigVal));
                        ftirKineticsRecords.push({ time: tVal, fileName: `${file.name} (t=${tVal}s)`, transmittance: sigVal, absorbance: abs, conversion: 0 });
                    } else {
                        const t = Math.pow(10, 2 - sigVal);
                        ftirKineticsRecords.push({ time: tVal, fileName: `${file.name} (t=${tVal}s)`, transmittance: t, absorbance: sigVal, conversion: 0 });
                    }
                }
            }

            if (ftirKineticsRecords.length > 0) {
                processAndPlotKinetics();
                showToast(`"${file.name}" dosyasından ${ftirKineticsRecords.length} kinetik noktası yüklendi!`, 'success');
            } else {
                showToast('CSV içinde sayısal zaman ve sinyal verisi bulunamadı.', 'error');
            }
        },
        error: (err) => {
            showToast(`Dosya okunurken hata: ${err.message}`, 'error');
        }
    });
}

// Yüklenmiş Çoklu FTIR Spektrumlarından Dosya Sonu Saniyeleri (örn: 1sn, 5sn, 100sn) Okuyarak Kinetik Çıkarma
function extractKineticsFromSpectra() {
    if (ftirSpectraList.length < 2) {
        showToast('Spektrumlardan kinetik çıkarmak için en az 2 FTIR spektrumu yüklemelisiniz.', 'warning');
        return;
    }

    const targetWn = parseFloat(document.getElementById('kinetics-target-wavenumber')?.value || '810');
    ftirKineticsRecords = [];

    ftirSpectraList.forEach((spec, index) => {
        // Dosya adının sonundaki "1sn", "5sn", "100sn" değerini otomatik tespit et
        const timeSec = extractSecondsFromFileName(spec.name, index);

        // Hedef dalga sayısına en yakın indeksi bul
        let closestIdx = 0;
        let minDiff = Infinity;
        for (let i = 0; i < spec.rawX.length; i++) {
            const diff = Math.abs(spec.rawX[i] - targetWn);
            if (diff < minDiff) {
                minDiff = diff;
                closestIdx = i;
            }
        }

        const yVal = spec.rawY[closestIdx];
        const yMode = document.getElementById('ftir-y-mode')?.value || 'raw';

        let absVal = yVal;
        let tVal = undefined;

        if (yMode === 'raw' || yMode === 'absorbance_to_transmittance') {
            tVal = yVal;
            absVal = 2 - Math.log10(Math.max(0.001, yVal));
        } else {
            absVal = yVal;
            tVal = Math.pow(10, 2 - absVal);
        }

        ftirKineticsRecords.push({
            time: timeSec,
            fileName: spec.name,
            transmittance: tVal,
            absorbance: absVal,
            conversion: 0
        });
    });

    // Otomatik saniyeye göre sıralanır ve t=0 anı A0 referansı alınır
    processAndPlotKinetics();
    showToast(`${ftirSpectraList.length} adet dosyadan saniyeler (örn: 1sn, 5sn, 100sn) ayıklandı ve kinetik eğri oluşturuldu!`, 'success');
}

function exportKineticsCSV() {
    if (ftirKineticsRecords.length === 0) {
        showToast('Dışa aktarılacak kinetik veri bulunmuyor.', 'warning');
        return;
    }

    const targetWn = document.getElementById('kinetics-target-wavenumber')?.value || '810';
    let csv = `Dosya / Numune,Zaman (s),Transmitans (%T @ ${targetWn} cm-1),Absorbans (A @ ${targetWn} cm-1),Yuzde Donusum (% Conversion)\n`;

    ftirKineticsRecords.forEach(r => {
        csv += `"${r.fileName || ''}",${r.time.toFixed(2)},${r.transmittance !== undefined ? r.transmittance.toFixed(4) : ''},${r.absorbance.toFixed(6)},${r.conversion.toFixed(4)}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FTIR_Kinetik_Donusum_${targetWn}cm1_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Kinetik dönüşüm tablosu CSV olarak indirildi!', 'success');
}

function downloadKineticsChart(format = 'png') {
    const chartDiv = document.getElementById('ftir-kinetics-plotly-chart');
    if (!chartDiv) return;

    const dateStr = new Date().toISOString().slice(0, 10);
    const targetWn = document.getElementById('kinetics-target-wavenumber')?.value || '810';

    Plotly.downloadImage(chartDiv, {
        format: format,
        width: 1920,
        height: 1080,
        filename: `ftir_kinetik_donusum_${targetWn}cm1_${dateStr}`
    }).then(() => {
        showToast(`Kinetik Grafiği ${format.toUpperCase()} olarak indirildi!`, 'success');
    }).catch(() => {
        showToast('Görsel indirilirken hata oluştu.', 'error');
    });
}

