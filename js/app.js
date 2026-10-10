/**
 * Dijital Laboratuvar - Ana Uygulama Yöneticisi & Router
 */

// Global Uygulama Durumu
const DigitalLab = {
    currentTab: 'hub',
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
        } else {
            btn.classList.remove('bg-indigo-600', 'text-white', 'shadow-md', 'shadow-indigo-600/30');
            btn.classList.add('text-slate-400', 'hover:text-slate-200', 'hover:bg-slate-800/60');
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
