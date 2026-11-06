# TENEKE PLANLAMA — TEK TASARIM SÖZLEŞMESİ (DESIGN.md)

**Versiyon:** 1.0.0 (Faz 2D Pilot)  
**Tasarım Modu:** Operate (Veri Yoğun Kurumsal Planlama Tezgahı)  
**Kaynak Kılavuzlar:** Impeccable (v4.8.0) birincil kalite ve eleştiri standardı; UI UX Pro Max tipografi ve endüstriyel veri tablosu ilkeleri.  
**Uygulama Alanı:** Lider Fabrika Teneke Planlama Workbench (`http://localhost:3001`).

---

## 1. Temel Tasarım Felsefesi ve Mod: "Operate"

- **Araç Görev İçinde Görünmez Olmalıdır:** Planlamacının odak noktası süslü kartlar, animasyonlar veya grafikler değil; doğru miktarlar, teknik reçete uyumu ve hatasız montaj kombinasyonudur.
- **Dürüstlük ve Şeffaflık (Truthful UI):** Henüz backend tarafından hesaplanmayan veriler (örn. Faz 3B kesik levha ve net baskı ihtiyacı) sahte sayılarla doldurulmaz; açıkça "Henüz hesaplanmadı" olarak etiketlenir. Canlı SQL verisi ile demo senaryoları kesin sınırla ayrılır.
- **Görsel Hijyen:** Sürekli yanıp sönen animasyonlu rozetler, gereksiz emojiler, yapay KPI sayaçları ve ölü butonlar kaldırılmıştır.

---

## 2. Tipografi ve Rakam Hiyerarşisi

| Kullanım | Font Ailesi | Boyut / Ağırlık | Özellik / Not |
|---|---|---|---|
| **Sayfa Başlıkları** | `Inter`, sans-serif | 18px (`text-lg`), SemiBold (600) | Net, sade, gereksiz büyük puntodan arındırılmış |
| **Bölüm Başlıkları** | `Inter`, sans-serif | 14px (`text-sm`), SemiBold (600) | Kart ve tablo üst başlıkları |
| **Gövde Metinleri** | `Inter`, sans-serif | 13px (`text-[13px]`) / 12px (`text-xs`), Regular (400) | Okunabilirlik için dengeli satır aralığı (`leading-relaxed`) |
| **Tablo Hücreleri** | `Inter`, sans-serif | 12px (`text-xs`), Medium (500) | Kompakt ve net |
| **Stok / Sipariş Kodları** | Monospace (`ui-monospace`, `Consolas`) | 11px (`text-[11px]`), Medium (500) | Kodların harf ve rakam ayrımı net |
| **Tüm Sayılar ve Miktarlar** | Tabular Numerals | `font-variant-numeric: tabular-nums` | Kolonlarda alt alta basamak hizalama şarttır |
| **Rozetler ve Etiketler** | Monospace / Sans | 10px (`text-[10px]`), SemiBold (600) | Büyük harf, dar padding (`px-2 py-0.5`) |

---

## 3. Renk Paleti ve Semantik Roller (Light Theme)

Kurumsal açık tema (Light Theme) esastır:

### 3.1 Nötr Renkler (Slate / Neutral)
- **Sayfa Arka Planı (Canvas):** `#f8fafc` (`slate-50`)
- **Kart ve Tablo Yüzeyi:** `#ffffff` (`white`)
- **İkincil / Zebra Satır Yüzeyi:** `#f8fafc` (`slate-50 / 50%`)
- **Çerçeveler ve Ayırıcılar:** `#e2e8f0` (`slate-200`) ve `#cbd5e1` (`slate-300`)
- **Gövde Metni (Primary Text):** `#0f172a` (`slate-900`)
- **İkincil Açıklama Metni:** `#475569` (`slate-600`)
- **Pasif / Yardımcı Metin:** `#64748b` (`slate-500`)

### 3.2 Marka & Vurgu (Primary Accent)
- **Kurumsal Mavi (Primary):** `#0284c7` (`sky-600`) / Hover: `#0369a1` (`sky-700`)
- **Odak / Seçim Vurgusu:** `#e0f2fe` (`sky-100`) arka plan, `#0369a1` metin, sol kenar çizgisi `#0284c7`

### 3.3 Semantik Durumlar (Status Tokens)
- **Doğrulanmış / Kaynak Veri (Verified Source):**
  - Arka plan: `#ecfdf5` (`emerald-50`), Metin: `#065f46` (`emerald-800`), Sınır: `#a7f3d0` (`emerald-200`)
- **Temsili / Demo Veri (Synthetic Demo):**
  - Arka plan: `#fffbeb` (`amber-50`), Metin: `#92400e` (`amber-800`), Sınır: `#fde68a` (`amber-200`)
- **Eksik Tanım / Kritik Uyarı (Missing Spec / Error):**
  - Arka plan: `#fef2f2` (`rose-50`), Metin: `#991b1b` (`rose-800`), Sınır: `#fecaca` (`rose-200`)
- **Hesaplanmamış / Beklemede (Uncalculated / Pending):**
  - Arka plan: `#f1f5f9` (`slate-100`), Metin: `#64748b` (`slate-500`), Kesikli Sınır: `border-dashed border-slate-300`

---

## 4. İkonografi Standartları

- Emojiler (`📥`, `🧩`, `🖨️`, `⚙️`, `🏭`, `🔌`, `📊`) arayüzden tamamen temizlenmiştir.
- Tüm ikonlar satır içi temiz SVG vektör olarak `stroke-width="1.75"` ve `16×16px` (`w-4 h-4`) standart boyutunda render edilir.
- İkon rengi ebeveyn metin rengini (`currentColor`) devralır; gereksiz görsel dikkat dağıtması önlenir.

---

## 5. İhtiyaç Havuzu Tablosu Ergonomisi

1. **Sabit Başlık ve Kontrollü Genişlik:** Tablo başlığı kaydırmada yukarıda sabit kalır (`sticky top-0 z-10`).
2. **Sabit Ürün Kimliği (Sticky Column):** Yatay kaydırmada `Sipariş No` ve `Ürün / Stok Kodu` sabit kalır, kaybolmaz.
3. **Miktar Hiyerarşisi Ayrımı:**
   - **Brüt İhtiyaç:** Satış veya dolum siparişinden gelen brüt talep.
   - **Kullanılabilir Ambar Stok:** Tüp deposundaki fiziksel kullanılabilir miktar (varsa `-` ile gösterilir).
   - **Net Tüp Üretim:** Brüt - Stok farkı (Tüp üretim hattına gidecek miktar).
   - **Kesik Levha / Baskı İhtiyacı:** Faz 3B çok seviyeli netleme ile hesaplanacak alan ("Henüz Hesaplanmadı — Faz 3B").
4. **Çoklu Seçim ve Aksiyon Çubuğu:**
   - Seçilen satır sayısı anlık sayılır (`X satır seçildi`).
   - "Kombinasyona Aktar (X)" butonu yalnız seçim > 0 iken aktiftir.
   - "Tüp Planına Aktar" butonu henüz uygulanmayan bir fonksiyon olduğu için kafa karıştırmaz; açıkça "Faz 5A — Tek Makine Çizelgeleme (Yakında)" ibaresiyle pasif sunulur.
5. **Arama ve Hızlı Filtreler:**
   - Stok kodu, ürün adı ve sipariş no üzerinde canlı arama kutusu.
   - Ebat ve Zemin filtreleri.
   - Tümü seç / Seçimi temizle hızlı kontrolleri.
6. **Detay Çekmecesi (Slide-Over Drawer):**
   - Satıra veya incele butonuna tıklandığında sağdan açılan detay panelinde:
     - Ürün tam adı (kesilmeden),
     - ERP Stok Kodu,
     - Çap, Boy, Ham Levha kodu ve açıklaması,
     - Vernik, Lak, Zemin, İç Kaplama bağımsız tanımları,
     - CMYK + Pantone renk dökümü,
     - İhtiyaç seviyesi durumu.

---

## 6. Kabuk İyileştirmeleri (Sidebar & Header)

- **Sol Menü (Sidebar):**
  - Minimal kurumsal logo alanı (`TENEKE PLANLAMA` + `Endüstriyel Planlama Tezgahı`).
  - İkonlu, dengeli padding'li navigasyon linkleri.
  - Alt kısımda kullanıcı rolü seçimi ve kontrollü veri sıfırlama butonu.
- **Üst Başlık (Header):**
  - Sayfa başlığı ve konumu.
  - Statik, zarif DB bağlantı göstergesi (yanıp sönen animasyon olmadan).
  - Kullanıcı rol etiketi.
  - Faz rozeti gereksiz baskınlıktan arındırılmış, sağda mütevazı bir sürüm etiketi olarak yer alır.
