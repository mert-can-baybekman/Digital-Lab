/**
 * Dijital Laboratuvar - Floresans Spektroskopisi & Analiz Stüdyosu
 * Fotolüminesans, Uyarılma (Excitation) & Emisyon (Emission) Spektroskopisi ve Stokes Kayması
 */

let fluorescenceSpectraList = [];
let fluorescenceChartTheme = 'dark'; // 'dark' | 'light'
const fluorescenceDefaultColors = ['#ef4444', '#0284c7', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#eab308'];

// Hazır Örnek Spektrum Verileri (DTBA ve MOF)
const FLUORESCENCE_PRESETS = {"dtbaExc":[[250,143521.11],[251,138862.94],[252,141922.44],[253,160393.95],[254,190850.08],[255,243078.22],[256,324552.47],[257,422489.88],[258,557813.44],[259,694810],[260,836578.44],[261,1003568.75],[262,1151838.38],[263,1304428.13],[264,1457123.38],[265,1632973.88],[266,1802758.38],[267,1979050.38],[268,2177411.75],[269,2405684.75],[270,2665432.75],[271,2972294.75],[272,3328098.5],[273,3710788.25],[274,4198542],[275,4636159],[276,5151841.5],[277,5678460],[278,6263937.5],[279,6916130.5],[280,7571085.5],[281,8293710],[282,9104939],[283,9834386],[284,10639141],[285,11405643],[286,12155211],[287,12849920],[288,13512998],[289,14150069],[290,14900248],[291,15403241],[292,15811003],[293,16174668],[294,16427350],[295,16566130],[296,16650279],[297,16565839],[298,16411526],[299,16204452],[300,15934511],[301,15627608],[302,15294785],[303,14933221],[304,14504219],[305,14010830],[306,13439751],[307,12857972],[308,12146069],[309,11470081],[310,10840776],[311,10209376],[312,9662445],[313,9194302],[314,8778248],[315,8440584],[316,8149576.5],[317,7902102],[318,7686272],[319,7451564],[320,7251651],[321,7045905.5],[322,6879696],[323,6737483],[324,6621550.5],[325,6532291],[326,6490929],[327,6452640],[328,6450825.5],[329,6457350.5],[330,6466241],[331,6498643.5],[332,6502974.5],[333,6518315.5],[334,6522366.5],[335,6508987],[336,6486252.5],[337,6453177],[338,6380093],[339,6309842],[340,6201077.5],[341,6080301],[342,5950418],[343,5815285.5],[344,5704857.5],[345,5620200],[346,5552856.5],[347,5496571],[348,5410252],[349,5273337.5],[350,5060513],[351,4749099],[352,4412097.5],[353,4050488.75],[354,3716284.25],[355,3387590.5],[356,3137411.25],[357,2909483.75],[358,2693752.5],[359,2476952],[360,2280023.5],[361,2086821.75],[362,1901505.13],[363,1706812.5],[364,1544405.25],[365,1389536.75],[366,1236405],[367,1116390.5],[368,998920.88],[369,897367.44],[370,797182.69],[371,707667.31],[372,632622.44],[373,568154.38],[374,528950.38],[375,508763.78]],"dtbaEm":[[320,17779.54],[321,5618.6],[322,16594.97],[323,21641.25],[324,15705.19],[325,26531.05],[326,23125.82],[327,28465.57],[328,26691.64],[329,28917.07],[330,31875.36],[331,31587.11],[332,41978.3],[333,47030.84],[334,39171.52],[335,46284.62],[336,47050.39],[337,51796.45],[338,57126.85],[339,69132.2],[340,95598.5],[341,123187.17],[342,110124.39],[343,93941.58],[344,67528.95],[345,73014.23],[346,68284.41],[347,63827.97],[348,69298.08],[349,70017.36],[350,74046.73],[351,73001.23],[352,81605.63],[353,81616.52],[354,87696.84],[355,79264.04],[356,99313.29],[357,104369.29],[358,111323.48],[359,131505.7],[360,157867.58],[361,149527.75],[362,176425.81],[363,205414.13],[364,203584.2],[365,241680.91],[366,285436.88],[367,294479.09],[368,340598.5],[369,363458.44],[370,384859.53],[371,438400.69],[372,487101.5],[373,517696.66],[374,548327.75],[375,569110.06],[376,595548.5],[377,644073.88],[378,666598.56],[379,684438.44],[380,708865.13],[381,759189.25],[382,761143.31],[383,770023.63],[384,813426.88],[385,843872.06],[386,826578.75],[387,840483.63],[388,832930.94],[389,854038.56],[390,845731.88],[391,857590.94],[392,862662.44],[393,864057.94],[394,886969.19],[395,847401.31],[396,833104.38],[397,860974.5],[398,849986.63],[399,832918.5],[400,818772.19],[401,795370.13],[402,809876.69],[403,791866.56],[404,802714.63],[405,771040.38],[406,777977.06],[407,759772.25],[408,747225.69],[409,711806.06],[410,719584.38],[411,699694.63],[412,672639.81],[413,650040.13],[414,622744.31],[415,612186.94],[416,612550.69],[417,587779.81],[418,584757.63],[419,545959.75],[420,537756.38],[421,523373.69],[422,527547.63],[423,491317.34],[424,477098.25],[425,485490.41],[426,467162.91],[427,450098.75],[428,426319.03],[429,415126.22],[430,408399.31],[431,372716.81],[432,365742.75],[433,362224.97],[434,357447.84],[435,341476],[436,332755.44],[437,331419],[438,302458.56],[439,314434.72],[440,307374.63],[441,283074.53],[442,265084.59],[443,270099.28],[444,244709.19],[445,245096.95],[446,235988.03],[447,224430.34],[448,221768.52],[449,211071.47],[450,211396.38],[451,207449.09],[452,195329.31],[453,180518.47],[454,180631.02],[455,180612.25],[456,170893.73],[457,168421.56],[458,151782.14],[459,147899.91],[460,144816.5],[461,142431.59],[462,132923.08],[463,133813.31],[464,132021.09],[465,130107.87],[466,126197.64],[467,113223.16],[468,110957.39],[469,109043.23],[470,102073.75],[471,89292.34],[472,94760.45],[473,93761.13],[474,90496.65],[475,89585.06],[476,86332.88],[477,80406.43],[478,78761.33],[479,78342.98],[480,68101.54],[481,70466.69],[482,69413.54],[483,71490.56],[484,75331.14],[485,59177.63],[486,71502.23],[487,60363.63],[488,58451.44],[489,50734.59],[490,56669.78],[491,54730.85],[492,54131.74],[493,48046.25],[494,49985.16],[495,44185.27],[496,54151.82],[497,45536.5],[498,44781.93],[499,44338.21],[500,46129.36],[501,39293.71],[502,41234.48],[503,38545.68],[504,34244.29],[505,37818.65],[506,42126.08],[507,28317.63],[508,38255.84],[509,27869.25],[510,29951.34],[511,28316.79],[512,38984.3],[513,34243.78],[514,30843.36],[515,31869.69],[516,32317.04],[517,23422.55],[518,19416.5],[519,28463.03],[520,22078.13],[521,24448.38],[522,24449.47],[523,13626.86],[524,25341.47],[525,26083.77],[526,24009.94],[527,23278.33],[528,17784.55],[529,27722.97],[530,21342.96],[531,22972.35],[532,20298.53],[533,22976.1],[534,16888.13],[535,16297.82],[536,23271.42],[537,19560.22],[538,15254.75],[539,14961.73],[540,18667.51],[541,16737.6],[542,22226.75],[543,11545.42],[544,14813.19],[545,17038.21],[546,12437.17],[547,19110.43],[548,13918.13],[549,16885.63],[550,19408.15]],"mofExc":[[250,460882.38],[251,429650.84],[252,404399.88],[253,389457.78],[254,404227.63],[255,422780.94],[256,466151.59],[257,531298.94],[258,596894.19],[259,680884.13],[260,777211],[261,898864.63],[262,1002500.81],[263,1108307.5],[264,1213151],[265,1325277],[266,1407377],[267,1478017.5],[268,1565007.63],[269,1652761.25],[270,1742431.13],[271,1829881.13],[272,1922428.63],[273,1980978.25],[274,2053834.13],[275,2080854.5],[276,2093333.88],[277,2087511.13],[278,2068003.25],[279,2047170.13],[280,2026916.25],[281,2025251.75],[282,2063034.38],[283,2062592.25],[284,2078703.75],[285,2107698],[286,2131424.5],[287,2148885],[288,2158321.25],[289,2183477],[290,2220580],[291,2248595.75],[292,2256351.75],[293,2269641.5],[294,2280208],[295,2287432.25],[296,2276991.25],[297,2262820.25],[298,2257119.25],[299,2251329],[300,2225537.5],[301,2212091.25],[302,2185186.5],[303,2162760.75],[304,2133376.75],[305,2106204.75],[306,2067383.25],[307,2014728.38],[308,1956628.25],[309,1899474.13],[310,1843308.25],[311,1795717.25],[312,1733542.25],[313,1692444.5],[314,1647384.88],[315,1625275],[316,1617041.88],[317,1594105.88],[318,1594567.88],[319,1593769],[320,1594850.63],[321,1584868.38],[322,1563922.38],[323,1545244.38],[324,1498510.63],[325,1451744.25],[326,1413535.75],[327,1365735.88],[328,1335937.63],[329,1306628.13],[330,1303935.25],[331,1312702.75],[332,1327352.88],[333,1346621],[334,1379325.63],[335,1422706],[336,1448991.5],[337,1468488.63],[338,1458565.38],[339,1424607.63],[340,1365124.88],[341,1294545.75],[342,1222810.38],[343,1177832.88],[344,1174600.75],[345,1221392.5],[346,1315093.88],[347,1428746.25],[348,1525942.88],[349,1570950.38],[350,1531516.88],[351,1406114.63],[352,1240118.38],[353,1058216.13],[354,897729.25],[355,768714.44],[356,695717.13],[357,641773.94],[358,610900.06],[359,588316.25],[360,575867.63],[361,562192.88],[362,548548.5],[363,542187.38],[364,535305.06],[365,536198.38],[366,547904.13],[367,554276.94],[368,570281.81],[369,579074.94],[370,588859.13],[371,592761.06],[372,608590.19],[373,630919.38],[374,666749.69],[375,716937]],"mofEm":[[310,108264.33],[311,104892.69],[312,107554.88],[313,101108.98],[314,106116.82],[315,98778.9],[316,96622.79],[317,98649.84],[318,100316.26],[319,110367.44],[320,120939.91],[321,126403.93],[322,144928.34],[323,153546.31],[324,174410.2],[325,215087.7],[326,282221.19],[327,384419.81],[328,505421.88],[329,563356.75],[330,549131.19],[331,478334.78],[332,397558.69],[333,347741.03],[334,319629.34],[335,321789.97],[336,328516.41],[337,330154.16],[338,337792.75],[339,347690.03],[340,364112.91],[341,382440.41],[342,382087.28],[343,405188.47],[344,412726.91],[345,411334.16],[346,422079.59],[347,415206],[348,431744.63],[349,419117.91],[350,432228],[351,439862.94],[352,446904.56],[353,457389.53],[354,457102.81],[355,454059.63],[356,454661.03],[357,459154.75],[358,453836.03],[359,463150.63],[360,459292.38],[361,469163.63],[362,458839.28],[363,463863.09],[364,470016.94],[365,468493.16],[366,470604.72],[367,474156.19],[368,482621.16],[369,499063.56],[370,503261],[371,509474.81],[372,524572],[373,536892.94],[374,534866.75],[375,539922.31],[376,526458.5],[377,526412.88],[378,537310.19],[379,536394.25],[380,515666.28],[381,533235.06],[382,535475.06],[383,533662],[384,525722.5],[385,515339.81],[386,508875.72],[387,507683.13],[388,513432.88],[389,514139.47],[390,509157.56],[391,507965.88],[392,500164.38],[393,486877.31],[394,493940.13],[395,477964.84],[396,479925.44],[397,480947.41],[398,466401.09],[399,463487],[400,449264.66],[401,447584.94],[402,444365.41],[403,437174.31],[404,431927.72],[405,435139.06],[406,443670.19],[407,425768.97],[408,432724.66],[409,416037.75],[410,410828.75],[411,398406.13],[412,388773.13],[413,389186.41],[414,378718.78],[415,368802.81],[416,369198.5],[417,346040.94],[418,348103.72],[419,347017.22],[420,340206.75],[421,332859.72],[422,324763.06],[423,328624.75],[424,314413.63],[425,315423.16],[426,307332.5],[427,296597.63],[428,295098.16],[429,296020.34],[430,288949.03],[431,289648.19],[432,283730.56],[433,280653.22],[434,283523],[435,275067.22],[436,272509.91],[437,266307.97],[438,270909.97],[439,259867.09],[440,255497.53],[441,250174.13],[442,246013.23],[443,243801.03],[444,246938.52],[445,237449.42],[446,232727.16],[447,229429.61],[448,226697.47],[449,221640.06],[450,218596.14],[451,208273.8],[452,213921.81],[453,210343.64],[454,201878.45],[455,201508.25],[456,192868.42],[457,194758.94],[458,197449.72],[459,196359.53],[460,188698.03],[461,185397.27],[462,186966],[463,184122.78],[464,186353.25],[465,177749.53],[466,178732.47],[467,181681.02],[468,174980.38],[469,169344.5],[470,159669.03],[471,163407.55],[472,160790.16],[473,155260.91],[474,155745.14],[475,148771.44],[476,150936.17],[477,149402.03],[478,146929.58],[479,146109.39],[480,148667.38],[481,148179.11],[482,164080.2],[483,181441.17],[484,210262.39],[485,247721.38],[486,299153.5],[487,333929.56],[488,351439.19],[489,352289.94],[490,330932.38],[491,311537.94],[492,288378.41],[493,262366.91],[494,253936.75],[495,224419.08],[496,210288.89],[497,188825.84],[498,159082.17],[499,151318.08],[500,129326.56],[501,124360.84],[502,118633.66],[503,111893.16],[504,104269.17],[505,101569.52],[506,95544.84],[507,94054.91],[508,92083.16],[509,87592.24],[510,87278.96],[511,92071.55],[512,90458.77],[513,88490.2],[514,86629.36],[515,84243.39],[516,82713.66],[517,81691.8],[518,82698.38],[519,76672.59],[520,79611.05],[521,75177.31],[522,76503.29],[523,73360.48],[524,72392.4],[525,76208.34],[526,75622.28],[527,72321.34],[528,73402.48],[529,70852.3],[530,77230.27],[531,75187.08],[532,76043.88],[533,75441.45],[534,79088.2],[535,84709.19],[536,95023.99],[537,110445.33],[538,155266.05],[539,237692.11],[540,383421.66],[541,615502.25],[542,793451.38],[543,892588.5],[544,872764.38],[545,838459.56],[546,771719.06],[547,694895.69],[548,605987.63],[549,522650.69],[550,418451],[551,308192.31],[552,228339.84],[553,163270.61],[554,121658.61],[555,103289.48],[556,89112],[557,77001.95],[558,68806.27],[559,62165.13],[560,62419.35],[561,60121.36],[562,55770.02],[563,55554.87],[564,49819.23],[565,54176.62],[566,46698.84],[567,44253.04],[568,48274.22],[569,48566.02],[570,46565.26]]};

function initFluorescenceModule() {
    setupFluorescenceDropZone();
    initFluorescencePlotly();
}

function setupFluorescenceDropZone() {
    const dropZone = document.getElementById('fluorescence-drop-zone');
    const fileInput = document.getElementById('fluorescence-file-input');

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
        if (files.length > 0) handleFluorescenceFiles(files);
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) handleFluorescenceFiles(e.target.files);
    });
}

function handleFluorescenceFiles(files) {
    Array.from(files).forEach(file => {
        if (!file.name.match(/\.(csv|txt|dat)$/i)) {
            showToast(`${file.name} desteklenmeyen format. (.txt, .csv, .dat kullanın)`, 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            parseFluorescenceText(content, file.name);
        };
        reader.onerror = () => {
            showToast(`Dosya okunurken hata oluştu: ${file.name}`, 'error');
        };
        reader.readAsText(file);
    });
}

function parseFluorescenceText(content, fileName) {
    const lines = content.split(/\r?\n/);
    const rawX = [];
    const rawY = [];
    let detectedType = 'general';

    const lowerName = fileName.toLowerCase();
    if (lowerName.includes('exc') || lowerName.includes('xenon') || lowerName.includes('uyar') || lowerName.includes('ex_')) {
        detectedType = 'excitation';
    } else if (lowerName.includes('em') || lowerName.includes('c.txt') || lowerName.includes('isi') || lowerName.includes('dms') || lowerName.includes('em_')) {
        detectedType = 'emission';
    }

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const lowerLine = line.toLowerCase();
        if (lowerLine.includes('xenon') || lowerLine.includes('excitation') || lowerLine.includes('exc:')) {
            detectedType = 'excitation';
        }
        if (lowerLine.includes('emission') || lowerLine.includes('ems:')) {
            detectedType = 'emission';
        }

        const parts = line.split(/[\s,\t;]+/).filter(Boolean);
        if (parts.length >= 2) {
            const x = parseFloat(parts[0]);
            const y = parseFloat(parts[1]);
            if (!isNaN(x) && !isNaN(y)) {
                rawX.push(x);
                rawY.push(y);
            }
        }
    }

    if (rawX.length === 0) {
        Papa.parse(content, {
            skipEmptyLines: true,
            dynamicTyping: true,
            complete: (results) => {
                const rows = results.data;
                const fx = [], fy = [];
                for (let r = 0; r < rows.length; r++) {
                    const row = rows[r];
                    if (!row || row.length < 2) continue;
                    const x = parseFloat(row[0]);
                    const y = parseFloat(row[1]);
                    if (!isNaN(x) && !isNaN(y)) {
                        fx.push(x);
                        fy.push(y);
                    }
                }
                if (fx.length > 0) {
                    processFluorescenceData(fx, fy, fileName, detectedType);
                } else {
                    showToast(`${fileName} içinde floresans sayısal verisi bulunamadı.`, 'error');
                }
            }
        });
        return;
    }

    processFluorescenceData(rawX, rawY, fileName, detectedType);
}

function processFluorescenceData(rawX, rawY, fileName, detectedType = 'general') {
    const combined = rawX.map((x, idx) => ({ x: x, y: rawY[idx] }));
    combined.sort((a, b) => a.x - b.x);

    const sortedX = combined.map(item => item.x);
    const sortedY = combined.map(item => item.y);

    let color;
    if (detectedType === 'excitation') {
        color = '#ef4444'; // Origin standardı Kırmızı
    } else if (detectedType === 'emission') {
        color = '#0284c7'; // Emisyon Mavisi / Siyah
    } else {
        color = fluorescenceDefaultColors[fluorescenceSpectraList.length % fluorescenceDefaultColors.length];
    }

    fluorescenceSpectraList.push({
        id: 'fl_' + Date.now() + Math.random().toString(36).substring(2, 5),
        name: fileName.replace(/\.[^/.]+$/, ''),
        type: detectedType,
        rawX: sortedX,
        rawY: sortedY,
        processedX: sortedX,
        processedY: sortedY,
        color: color,
        visible: true,
        scaleMultiplier: 1.0,
        yOffset: 0.0
    });

    incrementStat('spectraAnalyzed');
    updateFluorescenceSpectraUIList();
    processAndPlotFluorescenceData();
    showToast(`${fileName} Floresans analizörüne eklendi! (${detectedType === 'excitation' ? 'Uyarılma' : detectedType === 'emission' ? 'Emisyon' : 'Genel'})`, 'success');
}

function loadFluorescenceSampleDTBA() {
    fluorescenceSpectraList = [];

    const excX = FLUORESCENCE_PRESETS.dtbaExc.map(p => p[0]);
    const excY = FLUORESCENCE_PRESETS.dtbaExc.map(p => p[1]);
    const emX = FLUORESCENCE_PRESETS.dtbaEm.map(p => p[0]);
    const emY = FLUORESCENCE_PRESETS.dtbaEm.map(p => p[1]);

    fluorescenceSpectraList.push({
        id: 'fl_dtba_exc',
        name: 'DTBA_Excitation (296 nm)',
        type: 'excitation',
        rawX: excX,
        rawY: excY,
        processedX: excX,
        processedY: excY,
        color: '#ef4444',
        visible: true,
        scaleMultiplier: 1.0,
        yOffset: 0.0
    });

    fluorescenceSpectraList.push({
        id: 'fl_dtba_em',
        name: 'DTBA_Emission (394 nm)',
        type: 'emission',
        rawX: emX,
        rawY: emY,
        processedX: emX,
        processedY: emY,
        color: '#0284c7',
        visible: true,
        scaleMultiplier: 1.0,
        yOffset: 0.0
    });

    incrementStat('spectraAnalyzed');
    incrementStat('spectraAnalyzed');
    updateFluorescenceSpectraUIList();
    processAndPlotFluorescenceData();
    showToast('Örnek DTBA Uyarılma & Emisyon spektrumları yüklendi!', 'success');
}

function loadFluorescenceSampleMOF() {
    fluorescenceSpectraList = [];

    const excX = FLUORESCENCE_PRESETS.mofExc.map(p => p[0]);
    const excY = FLUORESCENCE_PRESETS.mofExc.map(p => p[1]);
    const emX = FLUORESCENCE_PRESETS.mofEm.map(p => p[0]);
    const emY = FLUORESCENCE_PRESETS.mofEm.map(p => p[1]);

    fluorescenceSpectraList.push({
        id: 'fl_mof_exc',
        name: 'MOF_Excitation',
        type: 'excitation',
        rawX: excX,
        rawY: excY,
        processedX: excX,
        processedY: excY,
        color: '#ef4444',
        visible: true,
        scaleMultiplier: 1.0,
        yOffset: 0.0
    });

    fluorescenceSpectraList.push({
        id: 'fl_mof_em',
        name: 'MOF_Emission',
        type: 'emission',
        rawX: emX,
        rawY: emY,
        processedX: emX,
        processedY: emY,
        color: '#0f172a',
        visible: true,
        scaleMultiplier: 1.0,
        yOffset: 0.0
    });

    incrementStat('spectraAnalyzed');
    incrementStat('spectraAnalyzed');
    updateFluorescenceSpectraUIList();
    processAndPlotFluorescenceData();
    showToast('Örnek MOF Uyarılma & Emisyon spektrumları yüklendi!', 'success');
}

function initFluorescencePlotly() {
    const chartDiv = document.getElementById('fluorescence-plotly-chart');
    if (!chartDiv) return;

    const layout = getFluorescencePlotlyLayout();
    const config = {
        responsive: true,
        displaylogo: false,
        modeBarButtonsToRemove: ['lasso2d', 'select2d'],
        toImageButtonOptions: {
            format: 'png',
            filename: 'floresans_spektrumu',
            height: 900,
            width: 1600,
            scale: 2
        }
    };

    Plotly.newPlot('fluorescence-plotly-chart', [], layout, config);
}

function setFluorescenceTheme(theme) {
    fluorescenceChartTheme = theme;
    const darkBtn = document.getElementById('fluorescence-theme-dark-btn');
    const lightBtn = document.getElementById('fluorescence-theme-light-btn');
    const chartContainer = document.getElementById('fluorescence-chart-container-box');

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
    updateFluorescencePlot();
}

function getFluorescencePlotlyLayout() {
    const isLight = (fluorescenceChartTheme === 'light');
    const normMode = document.getElementById('fluorescence-norm-mode')?.value || 'auto_scale';

    let yAxisTitle = 'Floresans Şiddeti (Intensity) [cps]';
    if (normMode === 'peak_normalize') yAxisTitle = 'Normalize Şiddet (%)';
    else if (normMode === 'min_max') yAxisTitle = 'Normalize Şiddet (0 – 1)';
    else if (normMode === 'auto_scale') yAxisTitle = 'Ölçeklenmiş Şiddet / Intensity (cps)';

    return {
        paper_bgcolor: isLight ? '#ffffff' : 'rgba(0,0,0,0)',
        plot_bgcolor: isLight ? '#ffffff' : 'rgba(15, 23, 42, 0.65)',
        margin: { l: 75, r: 35, t: 35, b: 65 },
        showlegend: true,
        legend: {
            x: 0.98,
            xanchor: 'right',
            y: 0.98,
            font: { color: isLight ? '#0f172a' : '#94a3b8', size: 11, family: 'Inter' },
            bgcolor: isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(30, 41, 59, 0.85)',
            bordercolor: isLight ? '#0f172a' : 'rgba(255, 255, 255, 0.1)',
            borderwidth: 1
        },
        xaxis: {
            title: { text: 'Dalga Boyu (Wavelength) [nm]', font: { color: isLight ? '#0f172a' : '#cbd5e1', size: 13, family: 'Inter', weight: isLight ? 'bold' : 'normal' } },
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

function applyFluorescenceSmoothing(yValues, windowSize) {
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

function processAndPlotFluorescenceData() {
    const normMode = document.getElementById('fluorescence-norm-mode')?.value || 'auto_scale';
    const enableSmoothing = document.getElementById('fluorescence-enable-smoothing')?.checked || false;
    const smoothingLevel = parseInt(document.getElementById('fluorescence-smoothing-level')?.value || '7');
    const stackOffset = parseFloat(document.getElementById('fluorescence-stack-offset')?.value || '0');

    const maxVals = fluorescenceSpectraList.map(s => Math.max(...s.rawY, 1));
    const targetMax = Math.max(...maxVals, 1e5);

    let visibleIndex = 0;

    fluorescenceSpectraList.forEach(spectrum => {
        let yValues = [...spectrum.rawY];

        if (enableSmoothing) {
            yValues = applyFluorescenceSmoothing(yValues, smoothingLevel);
        }

        const currentMax = Math.max(...yValues, 1e-6);
        const currentMin = Math.min(...yValues);

        if (normMode === 'auto_scale') {
            const factor = targetMax / currentMax;
            yValues = yValues.map(v => v * factor * spectrum.scaleMultiplier);
        } else if (normMode === 'peak_normalize') {
            yValues = yValues.map(v => (v / currentMax) * 100 * spectrum.scaleMultiplier);
        } else if (normMode === 'min_max') {
            const range = currentMax - currentMin;
            if (range > 0) {
                yValues = yValues.map(v => ((v - currentMin) / range) * spectrum.scaleMultiplier);
            }
        } else {
            yValues = yValues.map(v => v * spectrum.scaleMultiplier);
        }

        if (stackOffset > 0 && spectrum.visible) {
            const offsetVal = visibleIndex * (stackOffset / 100) * targetMax;
            yValues = yValues.map(v => v + offsetVal);
            visibleIndex++;
        }

        spectrum.processedX = spectrum.rawX;
        spectrum.processedY = yValues;
    });

    updateFluorescencePlot();
}

function updateFluorescencePlot() {
    const showPeaks = document.getElementById('fluorescence-show-peaks')?.checked || false;
    const sensitivity = parseInt(document.getElementById('fluorescence-peak-sensitivity')?.value || '5');
    const isLight = (fluorescenceChartTheme === 'light');

    const plotlyTraces = [];
    const annotations = [];
    const detectedPeaksList = [];

    fluorescenceSpectraList.forEach(spectrum => {
        if (!spectrum.visible) return;

        let traceColor = spectrum.color;
        if (isLight && spectrum.type === 'emission' && traceColor === '#0f172a') {
            traceColor = '#000000';
        }

        plotlyTraces.push({
            x: spectrum.processedX,
            y: spectrum.processedY,
            mode: 'lines',
            name: spectrum.name,
            line: { color: traceColor, width: 2.2 }
        });

        if (showPeaks && spectrum.processedX.length > 0) {
            const peaks = findFluorescencePeaks(spectrum.processedX, spectrum.processedY, sensitivity);

            peaks.forEach(peak => {
                annotations.push({
                    x: peak.x,
                    y: peak.y,
                    xref: 'x',
                    yref: 'y',
                    text: `${peak.x.toFixed(0)} nm`,
                    showarrow: true,
                    arrowhead: 2,
                    ax: 0,
                    ay: -26,
                    arrowcolor: isLight ? (spectrum.type === 'excitation' ? '#dc2626' : '#0284c7') : '#f59e0b',
                    font: { size: 10, color: isLight ? '#0f172a' : '#fcd34d', family: 'JetBrains Mono', weight: 'bold' },
                    bgcolor: isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(15, 23, 42, 0.85)',
                    bordercolor: isLight ? '#94a3b8' : '#f59e0b',
                    borderwidth: 1,
                    borderpad: 2
                });

                detectedPeaksList.push({
                    spectrumName: spectrum.name,
                    type: spectrum.type,
                    wavelength: peak.x,
                    intensity: peak.y,
                    prominence: peak.prominence
                });
            });
        }
    });

    const layout = getFluorescencePlotlyLayout();
    layout.annotations = annotations;

    Plotly.react('fluorescence-plotly-chart', plotlyTraces, layout);
    updateFluorescencePeaksTable(detectedPeaksList);
    calculateStokesShift();

    if (detectedPeaksList.length > 0) {
        incrementStat('peaksFound');
    }
}

function findFluorescencePeaks(xVals, yVals, sensitivity) {
    const len = yVals.length;
    if (len < 5) return [];

    const minY = Math.min(...yVals);
    const maxY = Math.max(...yVals);
    const rangeY = maxY - minY;
    if (rangeY <= 1e-4) return [];

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
    const promThresh = rangeY * (0.13 - (sensitivity - 1) * 0.010);

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

        if ((smooth[i] - minY) < promThresh * 0.75) continue;

        candidates.push({ x: xVals[i], y: yVals[i], prominence, index: i });
    }

    const minSpacing = 12; // 12 nm
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

function calculateStokesShift() {
    let maxExc = null;
    let maxEm = null;

    fluorescenceSpectraList.forEach(spectrum => {
        if (!spectrum.visible) return;
        const maxIdx = spectrum.rawY.indexOf(Math.max(...spectrum.rawY));
        if (maxIdx === -1) return;
        const peakNm = spectrum.rawX[maxIdx];

        if (spectrum.type === 'excitation') {
            if (!maxExc || spectrum.rawY[maxIdx] > maxExc.intensity) {
                maxExc = { nm: peakNm, intensity: spectrum.rawY[maxIdx], name: spectrum.name };
            }
        } else if (spectrum.type === 'emission') {
            if (!maxEm || spectrum.rawY[maxIdx] > maxEm.intensity) {
                maxEm = { nm: peakNm, intensity: spectrum.rawY[maxIdx], name: spectrum.name };
            }
        }
    });

    const elExc = document.getElementById('fl-metric-max-exc');
    const elEm = document.getElementById('fl-metric-max-em');
    const elStokes = document.getElementById('fl-metric-stokes-shift');
    const elEnergy = document.getElementById('fl-metric-energy-loss');

    if (maxExc && elExc) elExc.innerText = `${maxExc.nm.toFixed(0)} nm`;
    else if (elExc) elExc.innerText = '-';

    if (maxEm && elEm) elEm.innerText = `${maxEm.nm.toFixed(0)} nm`;
    else if (elEm) elEm.innerText = '-';

    if (maxExc && maxEm && maxEm.nm >= maxExc.nm) {
        const deltaNm = maxEm.nm - maxExc.nm;
        const deltaCm = (1 / maxExc.nm - 1 / maxEm.nm) * 1e7;
        const deltaEv = 1239.84193 * (1 / maxExc.nm - 1 / maxEm.nm);

        if (elStokes) elStokes.innerText = `${deltaNm.toFixed(0)} nm (${deltaCm.toFixed(0)} cm⁻¹)`;
        if (elEnergy) elEnergy.innerText = `${deltaEv.toFixed(3)} eV`;
    } else {
        if (elStokes) elStokes.innerText = '-';
        if (elEnergy) elEnergy.innerText = '-';
    }
}

function updateFluorescenceSpectraUIList() {
    const listContainer = document.getElementById('fluorescence-spectra-list');
    const countEl = document.getElementById('fluorescence-spectrum-count');

    if (!listContainer) return;
    if (countEl) countEl.innerText = fluorescenceSpectraList.length;

    if (fluorescenceSpectraList.length === 0) {
        listContainer.innerHTML = `<p class="text-xs text-slate-500 italic text-center py-4">Henüz floresans spektrumu yüklenmedi.</p>`;
        return;
    }

    listContainer.innerHTML = fluorescenceSpectraList.map(spec => `
        <div class="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 flex flex-col gap-2 hover:border-slate-700 transition">
            <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-2 truncate">
                    <input type="checkbox" ${spec.visible ? 'checked' : ''} onchange="toggleFluorescenceSpectrumVisibility('${spec.id}')" class="w-3.5 h-3.5 accent-rose-500 rounded cursor-pointer">
                    <input type="color" value="${spec.color}" onchange="changeFluorescenceSpectrumColor('${spec.id}', this.value)" class="w-5 h-5 rounded cursor-pointer border-0 bg-transparent p-0">
                    <span class="text-xs font-medium text-slate-200 truncate max-w-[120px]" title="${spec.name}">${spec.name}</span>
                </div>
                <div class="flex items-center gap-1.5 shrink-0">
                    <select onchange="changeFluorescenceSpectrumType('${spec.id}', this.value)" class="text-[10px] bg-slate-800 border border-slate-700 text-slate-300 rounded px-1.5 py-0.5 outline-none">
                        <option value="excitation" ${spec.type === 'excitation' ? 'selected' : ''}>Uyarılma (Exc)</option>
                        <option value="emission" ${spec.type === 'emission' ? 'selected' : ''}>Emisyon (Em)</option>
                        <option value="general" ${spec.type === 'general' ? 'selected' : ''}>Genel</option>
                    </select>
                    <button onclick="removeFluorescenceSpectrum('${spec.id}')" class="text-slate-500 hover:text-red-400 p-1 transition" title="Sil">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                    </button>
                </div>
            </div>
            <div class="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/60">
                <span>Ölçek Çarpanı:</span>
                <div class="flex items-center gap-1">
                    <button onclick="changeFluorescenceSpectrumMultiplier('${spec.id}', 0.1)" class="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300">0.1x</button>
                    <button onclick="changeFluorescenceSpectrumMultiplier('${spec.id}', 1.0)" class="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300">1x</button>
                    <button onclick="changeFluorescenceSpectrumMultiplier('${spec.id}', 10.0)" class="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300">10x</button>
                    <span class="font-mono text-rose-300 ml-1">${spec.scaleMultiplier.toFixed(2)}x</span>
                </div>
            </div>
        </div>
    `).join('');

    lucide.createIcons();
}

function toggleFluorescenceSpectrumVisibility(id) {
    const spec = fluorescenceSpectraList.find(s => s.id === id);
    if (spec) {
        spec.visible = !spec.visible;
        processAndPlotFluorescenceData();
    }
}

function changeFluorescenceSpectrumColor(id, color) {
    const spec = fluorescenceSpectraList.find(s => s.id === id);
    if (spec) {
        spec.color = color;
        updateFluorescencePlot();
    }
}

function changeFluorescenceSpectrumType(id, type) {
    const spec = fluorescenceSpectraList.find(s => s.id === id);
    if (spec) {
        spec.type = type;
        processAndPlotFluorescenceData();
    }
}

function changeFluorescenceSpectrumMultiplier(id, mult) {
    const spec = fluorescenceSpectraList.find(s => s.id === id);
    if (spec) {
        spec.scaleMultiplier = mult;
        processAndPlotFluorescenceData();
        updateFluorescenceSpectraUIList();
    }
}

function removeFluorescenceSpectrum(id) {
    fluorescenceSpectraList = fluorescenceSpectraList.filter(s => s.id !== id);
    updateFluorescenceSpectraUIList();
    processAndPlotFluorescenceData();
    showToast('Floresans spektrumu kaldırıldı.');
}

function clearAllFluorescenceSpectra() {
    fluorescenceSpectraList = [];
    updateFluorescenceSpectraUIList();
    processAndPlotFluorescenceData();
    showToast('Tüm floresans spektrumları temizlendi.');
}

function updateFluorescencePeaksTable(peaks) {
    const tableBody = document.getElementById('fluorescence-peaks-table-body');
    const peakCountEl = document.getElementById('fluorescence-detected-peak-count');
    if (!tableBody || !peakCountEl) return;

    peakCountEl.innerText = `${peaks.length} pik`;

    if (peaks.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="p-4 text-center text-slate-500 italic">Pik etiketlerini açarak otomatik tespit edilen pikleri inceleyin.</td>
            </tr>`;
        return;
    }

    tableBody.innerHTML = peaks.map(p => `
        <tr class="hover:bg-slate-700/30 transition border-b border-slate-700/30 text-xs">
            <td class="p-2 font-medium text-slate-200">${p.spectrumName}</td>
            <td class="p-2 font-mono">
                <span class="px-2 py-0.5 rounded text-[10px] ${p.type === 'excitation' ? 'bg-red-500/20 text-red-300 border border-red-500/30' : p.type === 'emission' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-slate-700 text-slate-300'}">
                    ${p.type === 'excitation' ? 'Uyarılma (Exc)' : p.type === 'emission' ? 'Emisyon (Em)' : 'Genel'}
                </span>
            </td>
            <td class="p-2 font-mono text-amber-300 font-semibold">${p.wavelength.toFixed(1)} nm</td>
            <td class="p-2 font-mono text-slate-300">${p.intensity.toFixed(1)}</td>
            <td class="p-2 font-mono text-emerald-400">${p.prominence ? p.prominence.toFixed(1) : '-'}</td>
        </tr>
    `).join('');
}

function exportFluorescencePeaksCSV() {
    if (fluorescenceSpectraList.length === 0) {
        showToast('Dışa aktarılacak floresans spektrumu bulunmuyor.', 'warning');
        return;
    }

    let csv = 'Spektrum Adi,Tur,Dalga Boyu (nm),Siddet (cps),Belirginlik (Prominence)\n';
    const sensitivity = parseInt(document.getElementById('fluorescence-peak-sensitivity')?.value || '5');

    fluorescenceSpectraList.forEach(spec => {
        if (!spec.visible) return;
        const peaks = findFluorescencePeaks(spec.processedX, spec.processedY, sensitivity);
        peaks.forEach(p => {
            csv += `"${spec.name}","${spec.type}",${p.x.toFixed(2)},${p.y.toFixed(2)},${p.prominence ? p.prominence.toFixed(2) : ''}\n`;
        });
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Floresans_Pik_Tablosu_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Floresans pik tablosu CSV olarak indirildi!', 'success');
}

function downloadFluorescenceChart(format = 'png') {
    const chartDiv = document.getElementById('fluorescence-plotly-chart');
    if (!chartDiv) return;

    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = `floresans_spektrumu_${dateStr}`;

    Plotly.downloadImage(chartDiv, {
        format: format,
        width: 1920,
        height: 1080,
        filename: fileName
    }).then(() => {
        showToast(`Grafik ${format.toUpperCase()} formatında indirildi!`, 'success');
    }).catch(() => {
        showToast('Görsel indirilirken bir hata oluştu.', 'error');
    });
}
