/**
 * Dijital Laboratuvar - Bilimsel Hesaplayıcılar & Referans Kütüphanesi
 */

// Kapsamlı IR Korelasyon Veritabanı
const irCorrelationData = [
    { range: '3200 - 3650', bond: 'O-H (Alkol / Fenol)', type: 'Gerilme (Serbest / H-Bağlı)', intensity: 'Güçlü, Geniş', group: 'Alkoller, Fenoller' },
    { range: '2500 - 3300', bond: 'O-H (Karboksilik Asit)', type: 'Gerilme (Çok Geniş)', intensity: 'Çok Güçlü, Yayvan', group: 'Karboksilik Asitler' },
    { range: '3300 - 3500', bond: 'N-H (Primer / Sekonder Amin)', type: 'Gerilme (İki Tepe / Tek Tepe)', intensity: 'Orta, Keskin', group: 'Aminler, Amidler' },
    { range: '3000 - 3100', bond: '=C-H (Alken / Aromatik)', type: 'Gerilme', intensity: 'Orta-Zayıf', group: 'Alkenler, Aromatikler' },
    { range: '2850 - 2960', bond: 'C-H (Alkan CH2, CH3)', type: 'Simetrik / Asimetrik Gerilme', intensity: 'Güçlü-Orta', group: 'Alkanlar, Alifatik Zincirler' },
    { range: '2720 - 2820', bond: 'C-H (Aldehit - Fermi Çifti)', type: 'Çift Bant Gerilme', intensity: 'Zayıf-Orta (Karakteristik)', group: 'Aldehitler' },
    { range: '2200 - 2260', bond: 'C≡N (Nitril)', type: 'Gerilme', intensity: 'Orta-Güçlü, Keskin', group: 'Nitriller' },
    { range: '2100 - 2260', bond: 'C≡C (Alkin)', type: 'Gerilme (Uç / İç Alkin)', intensity: 'Değişken (Uç: Keskin)', group: 'Alkinler' },
    { range: '1735 - 1750', bond: 'C=O (Ester)', type: 'Karbonil Gerilmesi', intensity: 'Çok Güçlü', group: 'Esterler' },
    { range: '1720 - 1740', bond: 'C=O (Aldehit)', type: 'Karbonil Gerilmesi', intensity: 'Çok Güçlü', group: 'Aldehitler' },
    { range: '1705 - 1725', bond: 'C=O (Keton)', type: 'Karbonil Gerilmesi', intensity: 'Çok Güçlü', group: 'Ketonlar' },
    { range: '1700 - 1725', bond: 'C=O (Karboksilik Asit)', type: 'Karbonil Gerilmesi', intensity: 'Çok Güçlü', group: 'Karboksilik Asitler' },
    { range: '1640 - 1690', bond: 'C=O (Amid - Amid I)', type: 'Karbonil / C-N Gerilmesi', intensity: 'Çok Güçlü', group: 'Amidler' },
    { range: '1620 - 1680', bond: 'C=C (Alken)', type: 'Çift Bağ Gerilmesi', intensity: 'Değişken, Keskin', group: 'Alkenler' },
    { range: '1500 - 1600', bond: 'C=C (Aromatik Halka)', type: 'Halka İçi İskelet Titreşimi', intensity: 'Orta (Genelde 2-3 Tepe)', group: 'Aromatik Bileşikler' },
    { range: '1515 - 1560', bond: 'N-O (Nitro Asimetrik)', type: 'Asimetrik Gerilme', intensity: 'Güçlü', group: 'Nitro Bileşikleri (-NO2)' },
    { range: '1340 - 1385', bond: 'N-O (Nitro Simetrik)', type: 'Simetrik Gerilme', intensity: 'Güçlü', group: 'Nitro Bileşikleri (-NO2)' },
    { range: '1375 & 1450', bond: 'C-H (Metil / Metilen)', type: 'Bükülme Titreşimleri', intensity: 'Orta', group: 'Alkanlar' },
    { range: '1050 - 1300', bond: 'C-O (Alkol, Eter, Ester)', type: 'Tekli Bağ Gerilmesi', intensity: 'Güçlü', group: 'Oksijenli Fonksiyonel Gruplar' },
    { range: '690 - 900', bond: '=C-H (Aromatik Düzlem Dışı)', type: 'İkame Deseni (Orto/Meta/Para)', intensity: 'Güçlü', group: 'Aromatik Parmak İzi' },
    { range: '500 - 800', bond: 'C-Cl, C-Br (Haloalkan)', type: 'Karbon-Halojen Gerilmesi', intensity: 'Güçlü', group: 'Halojenli Bileşikler' }
];

function initCalculatorsModule() {
    renderIRCorrelationTable();
    initCalibrationPlot();
}

function getCalculatorNumber(id) {
    return document.getElementById(id)?.valueAsNumber;
}

function calculateDilution() {
    const c1 = getCalculatorNumber('dilution-c1');
    const c2 = getCalculatorNumber('dilution-c2');
    const v2 = getCalculatorNumber('dilution-v2');
    const result = document.getElementById('dilution-result-box');
    const v1Field = document.getElementById('dilution-v1');
    if (![c1, c2, v2].every(value => Number.isFinite(value) && value > 0) || c2 > c1) {
        showToast('C₁, C₂ ve V₂ pozitif olmalı; hedef derişim stoktan büyük olamaz.', 'warning');
        return;
    }
    const v1 = (c2 * v2) / c1;
    const solvent = v2 - v1;
    v1Field.value = v1.toFixed(4);
    result.innerHTML = `<p class="font-semibold text-rose-300">Hazırlama talimatı</p>
        <p><strong>${v1.toFixed(4)} mL</strong> stok çözeltiden alın ve hacmi çözücü ile <strong>${v2.toFixed(4)} mL</strong>'ye tamamlayın.</p>
        <p class="text-slate-400">Eklenecek yaklaşık çözücü: <strong>${solvent.toFixed(4)} mL</strong></p>
        <p class="text-[10px] text-slate-500 font-mono mt-1">V₁ = (C₂ × V₂) / C₁ = (${c2} × ${v2}) / ${c1}</p>`;
    result.classList.remove('hidden');
}

function calculateArrhenius() {
    const k1 = getCalculatorNumber('arrhenius-k1');
    const k2 = getCalculatorNumber('arrhenius-k2');
    const t1 = getCalculatorNumber('arrhenius-t1');
    const t2 = getCalculatorNumber('arrhenius-t2');
    const result = document.getElementById('arrhenius-result-box');
    if (![k1, k2, t1, t2].every(value => Number.isFinite(value) && value > 0) || t1 === t2) {
        showToast('k₁, k₂ ve Kelvin cinsinden farklı pozitif sıcaklıklar girin.', 'warning');
        return;
    }
    const gasConstant = 8.31446261815324;
    const activationEnergy = gasConstant * Math.log(k2 / k1) / (1 / t1 - 1 / t2);
    const preExponential = k1 * Math.exp(activationEnergy / (gasConstant * t1));
    const signNote = activationEnergy < 0 ? '<p class="text-amber-300">Not: Negatif Eₐ değeri, hız sabitinin sıcaklıkla beklenmedik yönde değiştiğini gösterir; verileri kontrol edin.</p>' : '';
    result.innerHTML = `<p><span class="text-slate-400">Aktivasyon enerjisi Eₐ:</span> <strong class="text-orange-300">${(activationEnergy / 1000).toFixed(4)} kJ·mol⁻¹</strong></p>
        <p><span class="text-slate-400">Ön-üstel faktör A:</span> <strong class="text-orange-300">${preExponential.toExponential(5)}</strong></p>
        <p class="text-[10px] text-slate-500 font-mono mt-1">Eₐ = R·ln(k₂/k₁) / (1/T₁ − 1/T₂), R = 8.314462618 J·mol⁻¹·K⁻¹</p>${signNote}`;
    result.classList.remove('hidden');
}

// Jablonski Diyagramı ve Foton Enerjisi Hesaplayıcısı
function calculateJablonskiDiagram() {
    const fields = {
        absorption1: document.getElementById('jablonski-absorption-1')?.valueAsNumber,
        absorption2: document.getElementById('jablonski-absorption-2')?.valueAsNumber,
        fluorescence: document.getElementById('jablonski-fluorescence')?.valueAsNumber,
        phosphorescence: document.getElementById('jablonski-phosphorescence')?.valueAsNumber
    };
    const wavelengths = {};
    Object.entries(fields).forEach(([key, value]) => {
        if (Number.isFinite(value)) wavelengths[key] = value;
    });

    if (!Number.isFinite(wavelengths.absorption1) || !Number.isFinite(wavelengths.fluorescence) || !Number.isFinite(wavelengths.phosphorescence)
        || wavelengths.absorption1 <= 0 || wavelengths.fluorescence <= 0 || wavelengths.phosphorescence <= 0) {
        showToast('Absorpsiyon 1, floresans ve fosforesans dalgaboylarını girin.', 'warning');
        return;
    }
    const invalid = Object.entries(wavelengths).some(([, value]) => !Number.isFinite(value) || value <= 0);
    if (invalid) {
        showToast('Dalgaboyları 0’dan büyük geçerli sayılar olmalıdır.', 'warning');
        return;
    }

    const planck = 6.62607015e-34;
    const lightSpeed = 299792458;
    const electronVolt = 1.602176634e-19;
    const energy = wavelength => (planck * lightSpeed) / (wavelength * 1e-9 * electronVolt);
    const energies = {
        absorption1: energy(wavelengths.absorption1),
        absorption2: wavelengths.absorption2 ? energy(wavelengths.absorption2) : null,
        fluorescence: wavelengths.fluorescence ? energy(wavelengths.fluorescence) : null,
        phosphorescence: wavelengths.phosphorescence ? energy(wavelengths.phosphorescence) : null
    };

    if (energies.absorption2 !== null && energies.absorption2 <= energies.absorption1) {
        showToast('Absorpsiyon 2, S2 için Absorpsiyon 1’den daha yüksek enerjili olmalıdır.', 'warning');
        return;
    }
    if (energies.fluorescence >= energies.absorption1 || energies.phosphorescence >= energies.absorption1) {
        showToast('Işıma enerjileri absorpsiyon enerjisinden yüksek; değerleri fiziksel olarak kontrol edin.', 'warning');
    }

    drawJablonskiDiagram(energies);
    const resultBox = document.getElementById('jablonski-result-box');
    const resultText = document.getElementById('jablonski-result-text');
    if (resultBox && resultText) {
        const rows = [
            ['Absorpsiyon 1', wavelengths.absorption1, energies.absorption1],
            ['Absorpsiyon 2', wavelengths.absorption2, energies.absorption2],
            ['Floresans', wavelengths.fluorescence, energies.fluorescence],
            ['Fosforesans', wavelengths.phosphorescence, energies.phosphorescence]
        ].filter(([, nm]) => nm !== undefined && nm !== null);
        resultText.innerHTML = `
            <p class="text-slate-400">E = h·c / λ<br>E (eV) =
                <strong class="text-slate-200">(6.62607015 × 10⁻³⁴ × 299792458) /
                (λ × 10⁻⁹ × 1.602176634 × 10⁻¹⁹)</strong>
                = <strong class="text-amber-300">1239.841984 / λ</strong></p>
            ${rows.map(([label, nm, ev]) =>
            `<p><span class="text-slate-400">${label}:</span> <strong class="text-violet-300">${Number(nm).toFixed(2)} nm</strong> → <strong class="text-amber-300">${Number(ev).toFixed(4)} eV</strong></p>`
            ).join('')}`;
        resultBox.classList.remove('hidden');
    }
    showToast('Jablonski diyagramı hesaplandı!', 'success');
}

window.calculateJablonskiDiagram = calculateJablonskiDiagram;

function drawJablonskiDiagram(energies) {
    const svg = document.getElementById('jablonski-diagram');
    if (!svg) return;

    const maxEnergy = Math.max(
        energies.absorption1,
        energies.absorption2 || 0,
        energies.fluorescence || 0,
        energies.phosphorescence || 0,
        1
    );
    const top = 42;
    const bottom = 365;
    const levelY = energy => bottom - (energy / maxEnergy) * 285;
    const s0Y = bottom;
    const s1Y = levelY(energies.absorption1);
    const s2Y = energies.absorption2 ? levelY(energies.absorption2) : null;
    const t1Energy = energies.phosphorescence || Math.max(energies.absorption1 * 0.55, 0.1);
    const t1Y = levelY(t1Energy);
    const safe = value => Number(value).toFixed(1);
    const line = (x1, y1, x2, y2, stroke, width = 4, dash = '') =>
        `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${width}" ${dash ? `stroke-dasharray="${dash}"` : ''} stroke-linecap="round"/>`;
    const label = (x, y, text, color = '#cbd5e1', anchor = 'start', size = 13) =>
        `<text x="${x}" y="${y}" fill="${color}" text-anchor="${anchor}" font-size="${size}" font-family="Inter, sans-serif">${text}</text>`;
    const arrow = (x1, y1, x2, y2, color, marker, dash = '') =>
        `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="3" ${dash ? `stroke-dasharray="${dash}"` : ''} marker-end="url(#${marker})"/>`;
    const zigzag = (x1, y1, x2, y2, color) => {
        const segments = 8;
        const dx = (x2 - x1) / segments;
        const dy = (y2 - y1) / segments;
        const points = [`${x1},${y1}`];
        for (let i = 1; i < segments; i++) {
            points.push(`${x1 + dx * i},${y1 + dy * i + (i % 2 ? -7 : 7)}`);
        }
        points.push(`${x2},${y2}`);
        return `<polyline points="${points.join(' ')}" fill="none" stroke="${color}" stroke-width="2.5" stroke-dasharray="5 4" marker-end="url(#marker-ic)"/>`;
    };

    const parts = [`
        <defs>
            <marker id="marker-abs" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#34d399"/></marker>
            <marker id="marker-fl" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="#fde047"/></marker>
            <marker id="marker-ph" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="#fb923c"/></marker>
            <marker id="marker-ic" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="#a78bfa"/></marker>
        </defs>
        <rect x="0" y="0" width="760" height="420" rx="12" fill="#020617"/>
        ${label(200, 25, 'Singlet durumları', '#c4b5fd', 'middle', 14)}
        ${label(560, 25, 'Triplet durumları', '#fdba74', 'middle', 14)}
        ${line(120, s0Y, 330, s0Y, '#e2e8f0')}
        ${line(450, s0Y, 670, s0Y, '#e2e8f0')}
        ${label(92, s0Y + 5, 'S₀', '#f8fafc', 'end', 16)}
        ${label(345, s0Y + 5, '0.000 eV', '#94a3b8', 'start', 12)}
        ${line(120, s1Y, 330, s1Y, '#c4b5fd')}
        ${label(92, s1Y + 5, 'S₁', '#c4b5fd', 'end', 16)}
        ${label(345, s1Y + 5, `${safe(energies.absorption1)} eV`, '#c4b5fd', 'start', 12)}
        ${s2Y !== null ? `${line(120, s2Y, 330, s2Y, '#a78bfa')}${label(92, s2Y + 5, 'S₂', '#a78bfa', 'end', 16)}${label(345, s2Y + 5, `${safe(energies.absorption2)} eV`, '#a78bfa', 'start', 12)}` : ''}
        ${line(450, t1Y, 670, t1Y, '#fdba74')}
        ${label(422, t1Y + 5, 'T₁', '#fdba74', 'end', 16)}
        ${label(685, t1Y + 5, `${safe(t1Energy)} eV`, '#fdba74', 'start', 12)}
        ${arrow(155, s0Y - 3, 155, s1Y + 3, '#34d399', 'marker-abs')}
        ${label(155, (s0Y + s1Y) / 2, 'Abs 1', '#34d399', 'middle', 11)}
        ${s2Y !== null ? `${arrow(245, s0Y - 3, 245, s2Y + 3, '#60a5fa', 'marker-abs')}${label(245, (s0Y + s2Y) / 2, 'Abs 2', '#60a5fa', 'middle', 11)}${zigzag(300, s2Y + 4, 300, s1Y - 4, '#a78bfa')}${label(310, (s2Y + s1Y) / 2, 'IC', '#a78bfa', 'start', 11)}` : ''}
        ${energies.fluorescence !== null ? `${arrow(285, s1Y + 4, 285, s0Y - 4, '#fde047', 'marker-fl')}${label(300, (s1Y + s0Y) / 2, 'Floresans', '#fde047', 'start', 11)}` : ''}
        ${energies.phosphorescence !== null ? `${arrow(610, t1Y + 4, 610, s0Y - 4, '#fb923c', 'marker-ph', '8 5')}${label(625, (t1Y + s0Y) / 2, 'Fosforesans', '#fb923c', 'start', 11)}` : ''}
        ${energies.phosphorescence !== null ? `${zigzag(335, s1Y, 545, t1Y, '#f472b6')}${label(440, Math.min(s1Y, t1Y) - 13, 'ISC', '#f472b6', 'middle', 11)}` : ''}
        ${label(200, 402, 'S₀ = temel durum', '#64748b', 'middle', 11)}
    `];
    svg.innerHTML = parts.join('');
}

// 1. Beer-Lambert Kanunu Hesaplayıcısı (A = ε * b * c)
function calculateBeerLambert() {
    const calcTarget = document.getElementById('bl-calc-target')?.value || 'A';
    const aVal = parseFloat(document.getElementById('bl-absorbance')?.value);
    const epsVal = parseFloat(document.getElementById('bl-epsilon')?.value);
    const bVal = parseFloat(document.getElementById('bl-pathlength')?.value);
    const cVal = parseFloat(document.getElementById('bl-concentration')?.value);

    const resultBox = document.getElementById('bl-result-box');
    const resultText = document.getElementById('bl-result-text');

    let result = '';

    if (calcTarget === 'A') {
        if (isNaN(epsVal) || isNaN(bVal) || isNaN(cVal)) {
            showToast('Lütfen ε, b ve c değerlerini eksiksiz girin.', 'warning');
            return;
        }
        const a = epsVal * bVal * cVal;
        result = `Absorbans (A) = <strong>${a.toFixed(4)}</strong>`;
    } else if (calcTarget === 'c') {
        if (isNaN(aVal) || isNaN(epsVal) || isNaN(bVal) || epsVal === 0 || bVal === 0) {
            showToast('Lütfen A, ε ve b değerlerini eksiksiz girin.', 'warning');
            return;
        }
        const c = aVal / (epsVal * bVal);
        result = `Konsantrasyon (c) = <strong>${c.toExponential(4)} M</strong> (${(c * 1000).toFixed(4)} mM)`;
    } else if (calcTarget === 'eps') {
        if (isNaN(aVal) || isNaN(bVal) || isNaN(cVal) || bVal === 0 || cVal === 0) {
            showToast('Lütfen A, b ve c değerlerini eksiksiz girin.', 'warning');
            return;
        }
        const eps = aVal / (bVal * cVal);
        result = `Molar Absorptivite (ε) = <strong>${eps.toFixed(2)} L·mol⁻¹·cm⁻¹</strong>`;
    } else if (calcTarget === 'b') {
        if (isNaN(aVal) || isNaN(epsVal) || isNaN(cVal) || epsVal === 0 || cVal === 0) {
            showToast('Lütfen A, ε ve c değerlerini eksiksiz girin.', 'warning');
            return;
        }
        const b = aVal / (epsVal * cVal);
        result = `Işık Yolu Uzunluğu (b) = <strong>${b.toFixed(3)} cm</strong> (${(b * 10).toFixed(2)} mm)`;
    }

    if (resultBox && resultText) {
        resultText.innerHTML = result;
        resultBox.classList.remove('hidden');
    }
}

// Kalibrasyon Eğrisi Hesaplayıcısı & Mini Plotly Grafiği
function initCalibrationPlot() {
    const chartDiv = document.getElementById('calibration-plot');
    if (!chartDiv) return;

    const layout = {
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(15, 23, 42, 0.6)',
        margin: { l: 45, r: 25, t: 25, b: 45 },
        xaxis: { title: { text: 'Konsantrasyon (c)', font: { color: '#94a3b8', size: 11 } }, gridcolor: '#334155', tickfont: { color: '#94a3b8' } },
        yaxis: { title: { text: 'Absorbans (A)', font: { color: '#94a3b8', size: 11 } }, gridcolor: '#334155', tickfont: { color: '#94a3b8' } }
    };
    Plotly.newPlot('calibration-plot', [], layout, { responsive: true, displayModeBar: false });
}

function calculateCalibrationCurve() {
    const rawData = document.getElementById('cal-data-input')?.value.trim() || '';
    if (!rawData) {
        showToast('Lütfen kalibrasyon standartlarını girin.', 'warning');
        return;
    }

    const lines = rawData.split('\n');
    const xVals = [];
    const yVals = [];

    lines.forEach(line => {
        const parts = line.split(/[,\t;\s]+/).map(p => parseFloat(p.trim().replace(',', '.')));
        if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            xVals.push(parts[0]);
            yVals.push(parts[1]);
        }
    });

    if (xVals.length < 2) {
        showToast('En az 2 geçerli (Konsantrasyon, Absorbans) noktası girilmelidir.', 'error');
        return;
    }

    // Doğrusal Regresyon (En Küçük Kareler Yöntemi - Linear Regression)
    const n = xVals.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;

    for (let i = 0; i < n; i++) {
        sumX += xVals[i];
        sumY += yVals[i];
        sumXY += xVals[i] * yVals[i];
        sumX2 += xVals[i] * xVals[i];
        sumY2 += yVals[i] * yVals[i];
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // R^2 Determinasyon Katsayısı
    const rNumerator = (n * sumXY - sumX * sumY);
    const rDenominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    const r = rDenominator !== 0 ? rNumerator / rDenominator : 0;
    const r2 = r * r;

    // Bilinmeyen Numune Konsantrasyonu (Opsiyonel)
    const unknownAbs = parseFloat(document.getElementById('cal-unknown-abs')?.value);
    let unknownConcText = '';
    if (!isNaN(unknownAbs) && slope !== 0) {
        const unkC = (unknownAbs - intercept) / slope;
        unknownConcText = `<br><span class="text-amber-400 font-semibold">Bilinmeyen Numune Konsantrasyonu (A=${unknownAbs}):</span> <strong>${unkC.toFixed(4)}</strong>`;
    }

    const summaryEl = document.getElementById('cal-regression-summary');
    if (summaryEl) {
        summaryEl.innerHTML = `
            <div class="text-xs space-y-1 text-slate-300">
                <p>Doğru Denklemi: <strong class="text-emerald-400 font-mono">y = ${slope.toFixed(4)}x ${intercept >= 0 ? '+ ' + intercept.toFixed(4) : '- ' + Math.abs(intercept).toFixed(4)}</strong></p>
                <p>Eğim (Epsilon • b): <strong class="font-mono text-white">${slope.toFixed(4)}</strong></p>
                <p>R² Korelasyonu: <strong class="font-mono ${r2 >= 0.99 ? 'text-emerald-400' : 'text-amber-400'}">${r2.toFixed(5)}</strong></p>
                ${unknownConcText}
            </div>
        `;
    }

    // Regresyon Doğrusu Noktaları
    const minX = Math.min(...xVals);
    const maxX = Math.max(...xVals);
    const lineX = [minX * 0.9, maxX * 1.1];
    const lineY = lineX.map(x => slope * x + intercept);

    const traces = [
        {
            x: xVals,
            y: yVals,
            mode: 'markers',
            name: 'Standartlar',
            marker: { color: '#6366f1', size: 9, symbol: 'circle' }
        },
        {
            x: lineX,
            y: lineY,
            mode: 'lines',
            name: 'Regresyon Doğrusu',
            line: { color: '#10b981', width: 2, dash: 'solid' }
        }
    ];

    if (!isNaN(unknownAbs) && slope !== 0) {
        const unkC = (unknownAbs - intercept) / slope;
        traces.push({
            x: [unkC],
            y: [unknownAbs],
            mode: 'markers',
            name: 'Bilinmeyen Numune',
            marker: { color: '#f59e0b', size: 11, symbol: 'diamond' }
        });
    }

    const layout = {
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(15, 23, 42, 0.65)',
        margin: { l: 50, r: 20, t: 20, b: 45 },
        showlegend: true,
        legend: { font: { color: '#94a3b8', size: 10 }, bgcolor: 'rgba(30, 41, 59, 0.7)' },
        xaxis: { title: { text: 'Konsantrasyon', font: { color: '#94a3b8', size: 11 } }, gridcolor: '#334155', tickfont: { color: '#94a3b8' } },
        yaxis: { title: { text: 'Absorbans (A)', font: { color: '#94a3b8', size: 11 } }, gridcolor: '#334155', tickfont: { color: '#94a3b8' } }
    };

    Plotly.react('calibration-plot', traces, layout);
    showToast('Kalibrasyon eğrisi hesaplandı!', 'success');
}

// 2. İnteraktif IR Korelasyon Tablosu
function renderIRCorrelationTable(query = '') {
    const tableBody = document.getElementById('ir-table-body');
    if (!tableBody) return;

    const filtered = irCorrelationData.filter(item => {
        const text = `${item.range} ${item.bond} ${item.type} ${item.intensity} ${item.group}`.toLowerCase();
        return text.includes(query.toLowerCase());
    });

    if (filtered.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-slate-500 italic">Eşleşen bağ veya fonksiyonel grup bulunamadı.</td></tr>`;
        return;
    }

    tableBody.innerHTML = filtered.map(item => `
        <tr class="hover:bg-slate-800/40 transition border-b border-slate-800/80 text-xs">
            <td class="p-2.5 font-mono text-amber-300 font-semibold whitespace-nowrap">${item.range} cm⁻¹</td>
            <td class="p-2.5 font-medium text-white">${item.bond}</td>
            <td class="p-2.5 text-slate-300">${item.type}</td>
            <td class="p-2.5 text-slate-400">${item.intensity}</td>
            <td class="p-2.5 text-indigo-300">${item.group}</td>
        </tr>
    `).join('');
}

function filterIRTable() {
    const query = document.getElementById('ir-table-search')?.value || '';
    renderIRCorrelationTable(query);
}

// 3. Spektroskopi Birim Dönüştürücü (nm <-> cm-1 <-> eV <-> THz <-> kJ/mol)
function convertSpectroscopyUnits(sourceUnit) {
    const c = 2.99792458e8; // Işık hızı m/s
    const h = 6.62607015e-34; // Planck sabiti J*s
    const eV_to_J = 1.602176634e-19;
    const NA = 6.02214076e23; // Avogadro

    const val = parseFloat(document.getElementById(`unit-${sourceUnit}`)?.value);
    if (isNaN(val) || val <= 0) return;

    let wavelength_m = 0; // Metre cinsinden dalga boyu

    if (sourceUnit === 'nm') {
        wavelength_m = val * 1e-9;
    } else if (sourceUnit === 'cm1') {
        // Dalga sayısı (cm-1) -> lambda = 1 / (cm-1 * 100)
        wavelength_m = 1 / (val * 100);
    } else if (sourceUnit === 'ev') {
        // E = hc / lambda -> lambda = hc / (E_eV * 1.602e-19)
        wavelength_m = (h * c) / (val * eV_to_J);
    } else if (sourceUnit === 'thz') {
        // f = c / lambda -> lambda = c / (f * 1e12)
        wavelength_m = c / (val * 1e12);
    }

    if (wavelength_m > 0) {
        const nm = wavelength_m * 1e9;
        const cm1 = 1 / (wavelength_m * 100);
        const thz = (c / wavelength_m) / 1e12;
        const ev = (h * c) / (wavelength_m * eV_to_J);
        const kjmol = (h * c * NA) / (wavelength_m * 1000);

        if (sourceUnit !== 'nm') document.getElementById('unit-nm').value = nm.toFixed(2);
        if (sourceUnit !== 'cm1') document.getElementById('unit-cm1').value = cm1.toFixed(2);
        if (sourceUnit !== 'thz') document.getElementById('unit-thz').value = thz.toFixed(2);
        if (sourceUnit !== 'ev') document.getElementById('unit-ev').value = ev.toFixed(4);
        if (sourceUnit !== 'kjmol') document.getElementById('unit-kjmol').value = kjmol.toFixed(2);
    }
}
