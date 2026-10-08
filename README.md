# 🧪 Dijital Laboratuvar (Digital-Lab)

**Dijital Laboratuvar**, spektroskopi ve laboratuvar verilerini tarayıcı üzerinde hızlı, güvenli ve yayın kalitesinde işlemek için tasarlanmış modern, modüler ve açık kaynaklı bir bilimsel analiz platformudur.

Tüm işlemler **%100 istemci tarafında (tarayıcınızda)** gerçekleşir; hiçbir veri sunucuya yüklenmez.

---

## 🚀 Dahili Modüller ve Yetenekler

### 1. 🔬 FTIR Spektrum Maker & Analizörü
- **Geniş Format Desteği:** CSV, TXT ve DAT formatlarındaki spektral verileri okuma.
- **Spektral Dönüşümler:**
  - Transmitans (%T) $\longleftrightarrow$ Absorbans ($A$) çift yönlü dönüşümü ($A = 2 - \log_{10}(\%T)$).
  - Min-Max Normalizasyonu (0 – 1 skalası).
  - Ağırlıklı Hareketli Ortalama (Triangular Weighted) ile Gürültü Azaltma / Spektral Yumuşatma.
  - Şelale (Waterfall) / Yığılma ofseti ile çoklu spektrumları üst üste net biçimde kıyaslama.
- **Otomatik Pik & Fonksiyonel Grup Tespiti:**
  - Ayarlanabilir hassasiyet ile pik tepe ve çukurlarını otomatik etiketleme.
  - O-H, N-H, C-H, C=O (karbonil), C≡C, C=C, C-O ve parmak izi bölgelerini otomatik analiz eden kimyasal fonksiyonel grup motoru.
- **⚡ Real-Time Kinetik & % Dönüşüm (% Conversion) Analizörü:**
  - Belirli bir reaksiyon piki (örneğin $810\text{ cm}^{-1}$ akrilat/vinil $C=C$ çift bağı) takip edilerek reaksiyon ilerleyişinin $\% \text{Conversion}_t = \frac{A_0 - A_t}{A_0} \times 100$ formülüyle hesaplanması.
  - İnteraktif kinetik eğrisi grafiği, $t_{50\%}$ yarı ömür ve $\% \text{Conv}_{\max}$ nihai dönüşüm metrikleri.
  - Çoklu zaman serisi FTIR spektrumlarından veya doğrudan zaman-sinyal CSV dosyalarından veri çekme.
- **Yüksek Çözünürlüklü Dışa Aktarma:** PNG (yüksek DPI), SVG ve JPEG grafik indirme; pik ve kinetik tablolarını CSV olarak kaydetme.


---

### 2. ☀️ UV-Vis Spektrum Maker & λmax Analizörü
- **Akıllı Sütun Tespiti:**
  - Hem tek dalga boylu (`X, Y1, Y2...`) hem de çoklu çiftli (`X1, Y1, X2, Y2...`) CSV yapılarını otomatik tanıma.
- **$\lambda_{\max}$ Tespiti & Spektral Bölge Sınıflandırması:**
  - Maksimum ve minimum absorbans dalga boylarını ($\lambda_{\max}$) tespit etme.
  - UV-C, UV-B, UV-A ve Görünür bölge (380–750 nm) renk spektrumunu tamamlayıcı renk paleti ile eşleştirme.
- **⚡ Fotokatalitik & Kimyasal Bozunma (Degradation) & Kinetik Analizörü:**
  - Belirli bir boyar madde / kirletici piki (örneğin $\lambda_{\max} = 664\text{ nm}$ Metilen Mavisi, $554\text{ nm}$ Rhodamine B) takip edilerek zamana bağlı yüzde bozunma veriminin hesaplanması:
    $$\text{Degradation } (\%) = \frac{C_0 - C_t}{C_0} \times 100$$
  - **Yalancı 1. Derece Kinetik (Pseudo-First-Order) Modeli:** $\ln(C_0 / C_t) = k \cdot t$ doğrusal regresyonu ile reaksiyon hız sabiti ($k$), korelasyon ($R^2$) ve yarı ömür ($t_{1/2}$) tayini.
  - **Çoklu Numune Karşılaştırması (Overlay):** Saf Boya (fotoliz kontrolü), Katalizörlü numuneler ve nanokompozitleri aynı grafikte üst üste kıyaslama.
  - **3 Farklı Grafik Modu:** `% Bozunma Verimi vs Zaman`, `C_t / C_0 vs Zaman`, `ln(C_0 / C_t) vs Zaman`.
  - **Akıllı Süre Ayrıştırıcı (`0dk`, `15dk`, `30dk`, `60dk`):** Dosya adlarından süreleri otomatik okuma ve kronolojik sıralama.
- **Spektrum Yönetimi:** Renk paleti seçimi, tekil/toplu görünürlük kontrolü ve yüksek kaliteli grafik çıktısı (PNG, SVG, JPEG, CSV).

---

### 3. ✨ Floresans Spektrum Maker & Stokes Kayması Analizörü
- **Uyarılma (Excitation) & Emisyon (Emission) Çift Spektral Bindirme:**
  - TXT, CSV ve DAT cihaz çıktılarını (Horiba, PTI, Edinburgh vb.) otomatik algılama ve başlık ayıklama.
  - Excitation ve Emission eğrilerini OriginLab standardında (Kırmızı & Mavi/Siyah) tek grafik ekseninde bir araya getirme.
- **Otomatik Zirve Eşitleme & Normalizasyon:**
  - Excitation lamba profili ve emisyon dedektör sayım farklarını eşitleyen "Otomatik Zirve Eşitleme (Auto-Scale)" modu.
  - %0-100 Maksimuma göre normalize ve 0-1 Min-Max ölçekleme.
  - Her numune için bağımsız çarpan (0.1x, 1x, 10x) ve şelale ofseti.
- **⚡ Otomatik Stokes Kayması (Stokes Shift) Analizörü:**
  - $\Delta\lambda = \lambda_{\text{em}}^{\max} - \lambda_{\text{exc}}^{\max}$ (nm),
  - Enerji bazlı dalga sayısı kayması $\Delta\bar{\nu} = (1/\lambda_{\text{exc}} - 1/\lambda_{\text{em}}) \times 10^7\text{ cm}^{-1}$,
  - Foton enerji kaybı $\Delta E = 1239.84 \times (1/\lambda_{\text{exc}} - 1/\lambda_{\text{em}})\text{ eV}$ otomatik hesaplama ve metrik kartları.
- **Akıllı Pik Tespiti:**
  - Taban gürültüsünü filtreleyen *prominence* (belirginlik) tabanlı $\lambda_{\max}$ tespiti.
- **Karanlık / Aydınlık (OriginLab / Makale Beyazı) Grafik Teması:**
  - Tek tıkla akademik makale standardında beyaz zemin, siyah çerçeve ve yüksek kontrastlı grafik görünümüne geçiş ve yüksek çözünürlüklü dışa aktarma (PNG, SVG, JPG, CSV).

---

### 4. 📈 XRDML Difraktogram Analizörü & Excel Dışa Aktarımı
- Bir veya daha fazla XRDML dosyasındaki birden çok taramayı ayrıştırma; bozuk veya desteklenmeyen taramalar için anlaşılır hata bildirimi.
- Taramaları aynı interaktif Plotly grafiğinde görüntüleme ve her taramanın görünürlüğünü ayrı ayrı kontrol etme.
- Hassasiyet ayarlı, sinyal gürültüsüne uyarlanan prominence tabanlı pik tespiti; grafikte kontrastlı pik işaretleri ile pik konumu, bağıl şiddet, belirginlik ve FWHM analizi.
- XRDML'de dalga boyu bilgisi bulunduğunda Bragg yasası ile d-aralığı hesabı; pik sonuçlarını CSV olarak indirme.
- Her taramayı ve birleştirilmiş pik özetini ayrı sayfalara koyan çok sekmeli Excel (.xlsx) çalışma kitabı oluşturma.
- XML verileri tarayıcıda işlenir; dosyalar sunucuya gönderilmez.

---

### 5. 🔄 Çoklu CSV Karakter & Ayırıcı Dönüştürücü
- **Türkçe/Avrupa Cihaz Formatı Dönüşümü:**
  - Noktalı virgül (`;`) ayırıcılarını virgüle (`,`),
  - Ondalık virgül (`,`) karakterlerini noktaya (`.`) dönüştürür.
- **Canlı Karşılaştırmalı Önizleme:** Dosyayı indirmeden önce "Orijinal vs Dönüştürülmüş" satırlarını yan yana inceleme.
- **⚡ Doğrudan Laboratuvara Aktar (Pipeline):** Dönüştürülen dosyayı kaydetmeden tek tıkla **FTIR**, **UV-Vis** veya **Floresans** analizörüne aktarma.
- **Toplu İndirme:** Dosyaları tek tek veya tek bir **.ZIP** arşivi olarak indirme.

---

### 6. 📊 CSV ➔ Excel (.xlsx) Dönüştürücü
- Laboratuvar CSV/TXT dosyalarını biçimlendirilmiş gerçek Excel dosyalarına çevirme (SheetJS).
- Çoklu dosyaları tek bir Excel çalışma kitabında **farklı sekmeler (sheets)** olarak birleştirme veya toplu ZIP indirme.

---

### 7. 🧮 Bilimsel Hesaplayıcılar & Referans Kütüphanesi
- **Beer-Lambert Kanunu Hesaplayıcısı ($A = \varepsilon \cdot b \cdot c$):** Absorbans, Konsantrasyon, Molar Absorptivite veya Küvet Işık Yolu hesaplama.
- **Doğrusal Regresyon & Kalibrasyon Eğrisi Analizi:** Standart veri setlerinden eğim, kesim noktası ve $R^2$ korelasyonunu hesaplama, bilinmeyen numune konsantrasyonunu bulma ve interaktif regresyon grafiği.
- **Spektroskopi Birim Dönüştürücüsü:** Dalga boyu ($\text{nm}$) $\longleftrightarrow$ Dalga sayısı ($\text{cm}^{-1}$) $\longleftrightarrow$ Frekans ($\text{THz}$) $\longleftrightarrow$ Foton Enerjisi ($\text{eV}$) $\longleftrightarrow$ Molar Enerji ($\text{kJ/mol}$).
- **İnteraktif IR Titreşim Korelasyon Tablosu:** Sık karşılaşılan tüm organik kimyasal bağların dalga sayıları ve bant özellikleri aranabilir veritabanı.

---

## 🛠️ Teknoloji Yığını

- **Çekirdek:** Modern HTML5 & Vanilla JavaScript (Modüler Mimari)
- **Stil & Arayüz:** Tailwind CSS + Glassmorphism Özel CSS Tasarım Sistemi
- **Grafik Motoru:** [Plotly.js](https://plot.ly/javascript/) (Bilimsel interaktif grafikler)
- **XRDML Ayrıştırma:** Tarayıcının yerel XML DOMParser API'si
- **Veri Ayrıştırma:** [PapaParse](https://www.papaparse.com/)
- **Elektronik Tablo Motoru:** [SheetJS (xlsx)](https://sheetjs.com/)
- **Arşivleme:** [JSZip](https://stuk.github.io/jszip/)
- **İkonlar:** [Lucide Icons](https://lucide.dev/)

---

## 💻 Yerel Olarak Çalıştırma

Projeyi yerel ortamınızda çalıştırmak için herhangi bir kurulum veya bağımlılık yüklemesi gerekmez. `index.html` dosyasını tarayıcınızda açmanız veya bir yerel sunucu başlatmanız yeterlidir:

```bash
# Python ile yerel sunucu başlatmak için:
python -m http.server 3000

# Veya npx serve ile:
npx serve .
```

Tarayıcınızda `http://localhost:3000` adresine gidin.

---

## 📄 Lisans & Geliştirici

Geliştirici: [@mert-can-baybekman](https://github.com/mert-can-baybekman)
Açık kaynaklı ve bilimsel araştırmalara ücretsizdir.