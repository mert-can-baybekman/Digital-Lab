/**
 * Dijital Laboratuvar - Ana Uygulama Yöneticisi & Router
 */

// Global Uygulama Durumu
const DigitalLab = {
    currentTab: 'hub',
    recentTabs: [],
    commandPaletteIndex: 0,
    stats: {
        spectraAnalyzed: 0,
        filesConverted: 0,
        peaksFound: 0
    }
};

// Sayfa Yüklendiğinde Başlat
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    initRouter();
    loadPersistedStats();

    // Başlangıç modüllerini hazırla
    if (typeof initFTIRModule === 'function') initFTIRModule();
    if (typeof initUVVisModule === 'function') initUVVisModule();
    if (typeof initFluorescenceModule === 'function') initFluorescenceModule();
    if (typeof initXRDMLModule === 'function') initXRDMLModule();
    if (typeof initDSCModule === 'function') initDSCModule();
    if (typeof initGPCModule === 'function') initGPCModule();
    if (typeof initCSVConverterModule === 'function') initCSVConverterModule();
    if (typeof initXLSXConverterModule === 'function') initXLSXConverterModule();
    if (typeof initCalculatorsModule === 'function') initCalculatorsModule();
    initCommandPalette();
    initChartStyleControls();
    initGlobalNavigationShortcuts();
});

// Tab / Router Sistemi
function initRouter() {
    const hash = window.location.hash.replace('#', '') || 'hub';
    switchTab(hash, false);

    window.addEventListener('hashchange', () => {
        const newHash = window.location.hash.replace('#', '') || 'hub';
        switchTab(newHash, false);
    });
}

function switchTab(tabId, updateHash = true) {
    const validTabs = ['hub', 'ftir', 'uvvis', 'fluorescence', 'xrdml', 'dsc', 'gpc', 'csv-converter', 'xlsx-converter', 'calculators'];
    if (!validTabs.includes(tabId)) tabId = 'hub';

    DigitalLab.currentTab = tabId;
    rememberRecentTab(tabId);

    if (updateHash) {
        window.location.hash = tabId;
    }

    // Tab içeriklerini göster / gizle
    document.querySelectorAll('.tab-content').forEach(el => {
        el.classList.remove('active');
    });

    const activeTarget = document.getElementById(`tab-${tabId}`);
    if (activeTarget) {
        activeTarget.classList.add('active');
    }

    // Navigasyon butonlarının aktiflik durumunu güncelle
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
        const target = btn.getAttribute('data-tab');
        if (target === tabId) {
            btn.classList.add('bg-indigo-600', 'text-white', 'shadow-md', 'shadow-indigo-600/30');
            btn.classList.remove('text-slate-400', 'hover:text-slate-200', 'hover:bg-slate-800/60');
            btn.setAttribute('aria-current', 'page');
        } else {
            btn.classList.remove('bg-indigo-600', 'text-white', 'shadow-md', 'shadow-indigo-600/30');
            btn.classList.add('text-slate-400', 'hover:text-slate-200', 'hover:bg-slate-800/60');
            btn.removeAttribute('aria-current');
        }
    });

    // Plotly grafiklerinin resize edilmesini sağla
    setTimeout(() => {
        if (tabId === 'ftir' && document.getElementById('ftir-plotly-chart')) {
            Plotly.Plots.resize('ftir-plotly-chart');
        } else if (tabId === 'uvvis' && document.getElementById('uvvis-plotly-chart')) {
            Plotly.Plots.resize('uvvis-plotly-chart');
        } else if (tabId === 'fluorescence' && document.getElementById('fluorescence-plotly-chart')) {
            Plotly.Plots.resize('fluorescence-plotly-chart');
        } else if (tabId === 'xrdml' && document.getElementById('xrdml-plotly-chart')) {
            Plotly.Plots.resize('xrdml-plotly-chart');
        } else if (tabId === 'dsc' && document.getElementById('dsc-plotly-chart')) {
            Plotly.Plots.resize('dsc-plotly-chart');
        } else if (tabId === 'gpc' && document.getElementById('gpc-plotly-chart')) {
            Plotly.Plots.resize('gpc-plotly-chart');
        }

    }, 100);

    lucide.createIcons();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

const commandPaletteModules = [
    { id: 'hub', name: 'Ana Sayfa / Hub', keywords: 'dashboard modüller araçlar' },
    { id: 'ftir', name: 'FTIR Spektrum Maker', keywords: 'ftir infrared kızılötesi pik gürültü' },
    { id: 'uvvis', name: 'UV-Vis Spektrum Maker', keywords: 'uv vis absorbans lambda max renk' },
    { id: 'fluorescence', name: 'Floresans Spektrum Maker', keywords: 'floresans emisyon ölçek çarpanı' },
    { id: 'xrdml', name: 'XRD Difraktogram Analizörü', keywords: 'xrd xrdml difraksiyon fwhm d aralığı' },
    { id: 'dsc', name: 'DSC Termal Analizörü', keywords: 'dsc termal sıcaklık cam geçişi' },
    { id: 'gpc', name: 'GPC Kromatogram Analizörü', keywords: 'gpc kromatografi polimer molekül ağırlığı' },
    { id: 'csv-converter', name: 'CSV Dönüştürücü', keywords: 'csv dosya dönüştürme' },
    { id: 'xlsx-converter', name: 'CSV → Excel Dönüştürücü', keywords: 'excel xlsx tablo dönüştürme' },
    { id: 'calculators', name: 'Bilimsel Hesaplayıcılar', keywords: 'jablonski beer lambert spektroskopi ir regresyon' }
];

function rememberRecentTab(tabId) {
    if (tabId === 'hub') return;
    DigitalLab.recentTabs = [tabId, ...DigitalLab.recentTabs.filter(id => id !== tabId)].slice(0, 4);
    try {
        localStorage.setItem('digital_lab_recent_tabs', JSON.stringify(DigitalLab.recentTabs));
    } catch (error) {
        // Tarayıcı depolaması kapalıysa navigasyon yine çalışmaya devam eder.
    }
}

function initCommandPalette() {
    const palette = document.getElementById('command-palette');
    const input = document.getElementById('command-palette-input');
    if (!palette || !input) return;

    try {
        const saved = JSON.parse(localStorage.getItem('digital_lab_recent_tabs') || '[]');
        if (Array.isArray(saved)) DigitalLab.recentTabs = saved.filter(id => commandPaletteModules.some(module => module.id === id));
    } catch (error) {
        DigitalLab.recentTabs = [];
    }

    input.addEventListener('input', () => renderCommandPaletteResults(input.value));
    input.addEventListener('keydown', handleCommandPaletteKeydown);
    palette.addEventListener('click', event => {
        if (event.target === palette) closeCommandPalette();
    });
    document.addEventListener('keydown', event => {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
            event.preventDefault();
            openCommandPalette();
        } else if (event.key === 'Escape' && !palette.classList.contains('hidden')) {
            closeCommandPalette();
        }
    });
}

function renderCommandPaletteResults(query = '') {
    const results = document.getElementById('command-palette-results');
    if (!results) return;
    const normalized = query.trim().toLocaleLowerCase('tr-TR');
    const recentRank = new Map(DigitalLab.recentTabs.map((id, index) => [id, index]));
    const matches = commandPaletteModules
        .filter(module => !normalized || `${module.name} ${module.keywords}`.toLocaleLowerCase('tr-TR').includes(normalized))
        .sort((a, b) => (recentRank.get(a.id) ?? 99) - (recentRank.get(b.id) ?? 99));
    DigitalLab.commandPaletteIndex = Math.min(DigitalLab.commandPaletteIndex, Math.max(matches.length - 1, 0));

    if (!matches.length) {
        results.innerHTML = '<p class="px-3 py-5 text-center text-xs text-slate-500">Eşleşen modül bulunamadı.</p>';
        return;
    }
    results.innerHTML = matches.map((module, index) => {
        const recent = recentRank.has(module.id);
        const selected = index === DigitalLab.commandPaletteIndex;
        return `<button type="button" data-command-tab="${module.id}" aria-selected="${selected}" class="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left ${selected ? 'bg-slate-800 ring-1 ring-indigo-500/50' : ''} hover:bg-slate-800 transition group" role="option">
            <span class="flex items-center gap-3">
                <span class="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center"><i data-lucide="${module.id === 'calculators' ? 'calculator' : module.id === 'hub' ? 'layout-grid' : 'flask-conical'}" class="w-4 h-4 text-indigo-400"></i></span>
                <span><span class="block text-xs font-semibold text-slate-200 group-hover:text-white">${module.name}</span><span class="block text-[10px] text-slate-500">${module.keywords}</span></span>
            </span>
            ${recent ? '<span class="text-[10px] text-indigo-400">Son kullanılan</span>' : ''}
        </button>`;
    }).join('');
    results.querySelectorAll('[data-command-tab]').forEach(button => {
        button.addEventListener('click', () => {
            switchTab(button.dataset.commandTab);
            closeCommandPalette();
        });
    });
    lucide.createIcons();
}

function handleCommandPaletteKeydown(event) {
    const results = document.querySelectorAll('[data-command-tab]');
    if (!results.length) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const direction = event.key === 'ArrowDown' ? 1 : -1;
        DigitalLab.commandPaletteIndex = (DigitalLab.commandPaletteIndex + direction + results.length) % results.length;
        renderCommandPaletteResults(document.getElementById('command-palette-input')?.value || '');
        return;
    }
    if (event.key === 'Enter') {
        event.preventDefault();
        results[DigitalLab.commandPaletteIndex]?.click();
    }
}

function openCommandPalette() {
    const palette = document.getElementById('command-palette');
    const input = document.getElementById('command-palette-input');
    if (!palette || !input) return;
    palette.classList.remove('hidden');
    palette.classList.add('flex');
    input.value = '';
    DigitalLab.commandPaletteIndex = 0;
    renderCommandPaletteResults();
    requestAnimationFrame(() => input.focus());
}

function closeCommandPalette() {
    const palette = document.getElementById('command-palette');
    if (!palette) return;
    palette.classList.add('hidden');
    palette.classList.remove('flex');
}

function initGlobalNavigationShortcuts() {
    const hubSearch = document.getElementById('hub-search-input');
    const scrollButton = document.getElementById('scroll-top-button');
    if (hubSearch && !hubSearch.dataset.shortcutsBound) {
        hubSearch.dataset.shortcutsBound = 'true';
        hubSearch.addEventListener('keydown', event => {
            if (event.key === 'Escape') {
                clearHubSearch();
                hubSearch.blur();
            }
        });
    }
    window.addEventListener('scroll', () => {
        if (!scrollButton) return;
        const visible = window.scrollY > 360;
        scrollButton.classList.toggle('hidden', !visible);
        scrollButton.classList.toggle('flex', visible);
    }, { passive: true });
}

function clearHubSearch() {
    const input = document.getElementById('hub-search-input');
    const clearButton = document.getElementById('hub-search-clear');
    if (!input) return;
    input.value = '';
    filterHubCards();
    input.focus();
    clearButton?.classList.add('hidden');
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function applyLinearBaselineCorrection(values) {
    if (!Array.isArray(values) || values.length < 3) return Array.isArray(values) ? [...values] : [];
    const first = values[0];
    const last = values[values.length - 1];
    const slope = (last - first) / (values.length - 1);
    return values.map((value, index) => value - (first + slope * index));
}

const chartStyleTargets = [
    ['ftir-plotly-chart', 'FTIR'],
    ['uvvis-plotly-chart', 'UV-Vis'],
    ['fluorescence-plotly-chart', 'Floresans'],
    ['xrdml-plotly-chart', 'XRD'],
    ['dsc-plotly-chart', 'DSC'],
    ['gpc-plotly-chart', 'GPC']
];
const chartStyleStorageKey = 'digital_lab_chart_styles';
const chartStyleState = {};

function initChartStyleControls() {
    loadChartStyleState();
    installChartReactStylePersistence();
    chartStyleTargets.forEach(([chartId, label]) => {
        const chart = document.getElementById(chartId);
        if (!chart || chart.dataset.styleControls) return;
        const toolbar = document.createElement('div');
        toolbar.className = 'chart-style-toolbar flex flex-wrap items-center gap-2 mb-2 px-1 py-2 rounded-lg bg-slate-950/50 border border-slate-800/80';
        toolbar.innerHTML = `
            <span class="text-[10px] font-semibold text-slate-400 flex items-center gap-1.5 mr-1">
                <i data-lucide="palette" class="w-3.5 h-3.5 text-indigo-400"></i>${label} grafik ayarları
            </span>
            <label class="flex items-center gap-1 text-[10px] text-slate-400" title="Çizgi rengi">
                <span>Renk</span><input type="color" data-chart-color value="#38bdf8" class="w-6 h-6 rounded cursor-pointer bg-transparent border-0">
            </label>
            <label class="flex items-center gap-1 text-[10px] text-slate-400">
                <span>Kalınlık</span><input type="range" data-chart-width min="1" max="6" step="0.5" value="2" class="w-16 accent-indigo-500">
                <output data-chart-width-value class="w-5 text-right font-mono text-slate-300">2</output>
            </label>
            <select data-chart-dash class="bg-slate-900 border border-slate-700 text-[10px] text-slate-300 rounded px-1.5 py-1" title="Çizgi tipi">
                <option value="solid">Düz</option><option value="dash">Kesikli</option><option value="dot">Noktalı</option><option value="dashdot">Karma</option>
            </select>
            <label class="flex items-center gap-1 text-[10px] text-slate-400">
                <input type="checkbox" data-chart-markers class="accent-indigo-500"> Noktalar
            </label>
            <label class="flex items-center gap-1 text-[10px] text-slate-400">
                <input type="checkbox" data-chart-grid checked class="accent-indigo-500"> Izgara
            </label>
            <button type="button" data-chart-reset class="ml-auto text-[10px] text-slate-400 hover:text-white border border-slate-700 rounded px-2 py-1 transition">Sıfırla</button>
        `;
        chart.parentElement.insertBefore(toolbar, chart);
        chart.dataset.styleControls = 'true';

        const color = toolbar.querySelector('[data-chart-color]');
        const width = toolbar.querySelector('[data-chart-width]');
        const widthValue = toolbar.querySelector('[data-chart-width-value]');
        const dash = toolbar.querySelector('[data-chart-dash]');
        const markers = toolbar.querySelector('[data-chart-markers]');
        const grid = toolbar.querySelector('[data-chart-grid]');
        const savedStyle = chartStyleState[chartId];
        if (savedStyle) {
            color.value = savedStyle.color;
            width.value = String(savedStyle.width);
            widthValue.textContent = String(savedStyle.width);
            dash.value = savedStyle.dash;
            markers.checked = savedStyle.markers;
            grid.checked = savedStyle.grid;
        }
        const apply = () => applyChartStyle(chart, {
            color: color.value,
            width: Number(width.value),
            dash: dash.value,
            markers: markers.checked,
            grid: grid.checked
        });
        width.addEventListener('input', () => {
            widthValue.textContent = width.value;
            apply();
        });
        [color, dash, markers, grid].forEach(control => control.addEventListener('input', apply));
        toolbar.querySelector('[data-chart-reset]').addEventListener('click', () => {
            color.value = '#38bdf8';
            width.value = '2';
            widthValue.textContent = '2';
            dash.value = 'solid';
            markers.checked = false;
            grid.checked = true;
            apply();
        });
        lucide.createIcons();
    });
}

function loadChartStyleState() {
    try {
        const saved = JSON.parse(localStorage.getItem(chartStyleStorageKey) || '{}');
        if (saved && typeof saved === 'object') Object.assign(chartStyleState, saved);
    } catch (error) {
        // Grafik ayarları depolanamazsa varsayılanlar kullanılmaya devam eder.
    }
}

function saveChartStyleState() {
    try {
        localStorage.setItem(chartStyleStorageKey, JSON.stringify(chartStyleState));
    } catch (error) {
        // Grafik stilleri yalnızca bu oturum için uygulanır.
    }
}

function installChartReactStylePersistence() {
    if (!window.Plotly || window.Plotly.__digitalLabStylePersistence) return;
    const originalReact = window.Plotly.react.bind(window.Plotly);
    window.Plotly.react = function (target, ...args) {
        const result = originalReact(target, ...args);
        const chart = typeof target === 'string' ? document.getElementById(target) : target;
        const chartId = chart?.id;
        const savedStyle = chartId ? chartStyleState[chartId] : null;
        if (savedStyle && result && typeof result.then === 'function') {
            result.then(() => applyChartStyle(chart, savedStyle, false));
        }
        return result;
    };
    window.Plotly.__digitalLabStylePersistence = true;
}

function applyChartStyle(chart, style, notify = true) {
    if (chart?.id) {
        chartStyleState[chart.id] = { ...style };
        saveChartStyleState();
    }
    if (!chart || !window.Plotly || !chart.data || !chart.data.length) {
        if (notify) showToast('Önce bu analizör için bir veri dosyası yükleyin.', 'info');
        return;
    }
    const lineIndices = chart.data
        .map((trace, index) => ({ trace, index }))
        .filter(({ trace }) => String(trace.mode || '').includes('lines'))
        .map(({ index }) => index);
    if (lineIndices.length) {
        Plotly.restyle(chart, {
            'line.color': style.color,
            'line.width': style.width,
            'line.dash': style.dash,
            mode: style.markers ? 'lines+markers' : 'lines'
        }, lineIndices);
    }
    Plotly.relayout(chart, {
        'xaxis.showgrid': style.grid,
        'yaxis.showgrid': style.grid
    });
}

// Global Bildirim Toast Sistemi
function showToast(msg, type = 'info') {
    const toast = document.getElementById('global-toast');
    if (!toast) return;

    const messageEl = document.getElementById('global-toast-message');
    const iconEl = document.getElementById('global-toast-icon');

    messageEl.innerText = msg;
    
    if (type === 'error') {
        iconEl.setAttribute('data-lucide', 'alert-circle');
        iconEl.className = 'w-4 h-4 text-red-400 shrink-0';
        toast.className = 'fixed bottom-5 right-5 bg-slate-900 border border-red-500/50 text-slate-100 text-xs px-4 py-3 rounded-xl shadow-2xl transition-all duration-300 flex items-center gap-2.5 z-50';
    } else if (type === 'success') {
        iconEl.setAttribute('data-lucide', 'check-circle-2');
        iconEl.className = 'w-4 h-4 text-emerald-400 shrink-0';
        toast.className = 'fixed bottom-5 right-5 bg-slate-900 border border-emerald-500/50 text-slate-100 text-xs px-4 py-3 rounded-xl shadow-2xl transition-all duration-300 flex items-center gap-2.5 z-50';
    } else if (type === 'warning') {
        iconEl.setAttribute('data-lucide', 'alert-triangle');
        iconEl.className = 'w-4 h-4 text-amber-400 shrink-0';
        toast.className = 'fixed bottom-5 right-5 bg-slate-900 border border-amber-500/50 text-slate-100 text-xs px-4 py-3 rounded-xl shadow-2xl transition-all duration-300 flex items-center gap-2.5 z-50';
    } else {
        iconEl.setAttribute('data-lucide', 'info');
        iconEl.className = 'w-4 h-4 text-indigo-400 shrink-0';
        toast.className = 'fixed bottom-5 right-5 bg-slate-900 border border-indigo-500/50 text-slate-100 text-xs px-4 py-3 rounded-xl shadow-2xl transition-all duration-300 flex items-center gap-2.5 z-50';
    }
    
    lucide.createIcons();

    toast.classList.remove('translate-y-20', 'opacity-0', 'pointer-events-none');
    toast.classList.add('translate-y-0', 'opacity-100');

    if (window._toastTimeout) clearTimeout(window._toastTimeout);
    window._toastTimeout = setTimeout(() => {
        toast.classList.remove('translate-y-0', 'opacity-100');
        toast.classList.add('translate-y-20', 'opacity-0', 'pointer-events-none');
    }, 3500);
}

// İstatistik Takibi
function incrementStat(key) {
    if (DigitalLab.stats[key] !== undefined) {
        DigitalLab.stats[key]++;
        try {
            localStorage.setItem('digital_lab_stats', JSON.stringify(DigitalLab.stats));
        } catch (e) {}
    }
}

function loadPersistedStats() {
    try {
        const saved = localStorage.getItem('digital_lab_stats');
        if (saved) {
            DigitalLab.stats = Object.assign(DigitalLab.stats, JSON.parse(saved));
        }
    } catch (e) {}
}

// Çapraz Modül Veri Aktarımı (Pipeline)
function sendCSVToFTIR(csvContent, fileName) {
    switchTab('ftir');
    setTimeout(() => {
        Papa.parse(csvContent, {
            skipEmptyLines: true,
            dynamicTyping: true,
            complete: (results) => {
                if (typeof processFTIRParsedCSV === 'function') {
                    processFTIRParsedCSV(results.data, fileName || 'Donusturulmus_Veri.csv');
                    showToast(`"${fileName}" doğrudan FTIR Analizörüne aktarıldı!`, 'success');
                }
            },
            error: (err) => {
                showToast(`Aktarım sırasında hata: ${err.message}`, 'error');
            }
        });
    }, 150);
}

function sendCSVToUVVis(csvContent, fileName) {
    switchTab('uvvis');
    setTimeout(() => {
        Papa.parse(csvContent, {
            skipEmptyLines: true,
            dynamicTyping: true,
            complete: (results) => {
                if (typeof processUVVisParsedCSV === 'function') {
                    processUVVisParsedCSV(results.data, fileName || 'Donusturulmus_Veri.csv');
                    showToast(`"${fileName}" doğrudan UV-Vis Analizörüne aktarıldı!`, 'success');
                }
            },
            error: (err) => {
                showToast(`Aktarım sırasında hata: ${err.message}`, 'error');
            }
        });
    }, 150);
}

function sendCSVToFluorescence(csvContent, fileName) {
    switchTab('fluorescence');
    setTimeout(() => {
        if (typeof parseFluorescenceText === 'function') {
            parseFluorescenceText(csvContent, fileName || 'Donusturulmus_Veri.csv');
            showToast(`"${fileName}" doğrudan Floresans Analizörüne aktarıldı!`, 'success');
        }
    }, 150);
}

function sendCSVToXLSX(csvContent, fileName) {
    switchTab('xlsx-converter');
    setTimeout(() => {
        if (typeof addRawCSVToXLSXQueue === 'function') {
            addRawCSVToXLSXQueue(csvContent, fileName || 'donusturulmus_veri.csv');
            showToast(`"${fileName}" Excel Dönüştürücü listesine aktarıldı!`, 'success');
        }
    }, 150);
}

// Hub Filtreleme
function filterHubCards() {
    const query = (document.getElementById('hub-search-input')?.value || '').toLowerCase().trim();
    document.getElementById('hub-search-clear')?.classList.toggle('hidden', query.length === 0);
    const cards = document.querySelectorAll('.hub-tool-card');
    let count = 0;

    cards.forEach(card => {
        const keywords = card.getAttribute('data-keywords') || '';
        const text = card.innerText.toLowerCase();

        if (text.includes(query) || keywords.includes(query)) {
            card.classList.remove('hidden');
            count++;
        } else {
            card.classList.add('hidden');
        }
    });

    const noResults = document.getElementById('hub-no-results');
    if (noResults) {
        if (count === 0) noResults.classList.remove('hidden');
        else noResults.classList.add('hidden');
    }
}
