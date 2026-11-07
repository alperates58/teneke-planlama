# TENEKE PLANLAMA — REÇETE GÖSTERİMİ VE EXCEL TAKVİMİ UYUM RAPORU

**Tarih:** 07.11.2026  
**Referans Başlangıç:** `6d3aaf0`  
**Kapsam:** Reçete Çözümleme & Stok Tahsisi Ayrımı, Gerçek Ürün Doğrulaması (`511112011210-8709`), Havuz Kolonları ve Excel Takvim/Hız Birebir Uyumu

---

## 1. REÇETE ÇÖZÜMLEMENİN STOK TAHSİSİNDEN AYRILMASI

### A) Sorunun Kök Nedeni
Önceki `demandAllocationService.js` uygulamasında reçete çözümleme `if (netTubeDemand <= 0) { ... } else { /* reçete ara */ }` bloğunun içinde yer alıyordu. Brüt talebin tamamı ambarındaki tüp stoğundan karşılandığında (`netTubeDemand = 0`), motor kesik ve baskılı reçetelerini hiç sorgulamıyor; `cutting_stock_code` ve `print_stock_code` alanları `null` kalıyor ve kullanıcı arayüzü bu geçerli reçeteli ürünleri yanıltıcı biçimde **"Reçetesiz"** olarak etiketliyordu.

### B) Uygulanan Çözüm Mimarisi
Reçete çözümleme ve stok tahsisi mantıksal ve operasyonel olarak iki bağımsız aşamaya ayrıldı:

1. **Aşama 0 — Bağımsız Reçete Çözümleme (Her zaman çalışır):**
   - Brüt veya net ihtiyaç sıfır olsa dahi, havuza giren her bir tüp için reçete zinciri çözümlenir.
   - Tüpün `K-` (kesik) bileşeni, kesiğin `B-` (baskılı) bileşeni ve baskılının ham levha bileşeni ile hazır kapasite parametresi belirlenir.
   - İlgili kesik ve baskılı kodlarının güncel ambar stok havuzları (`cutting_stock_before`, `print_stock_before`) okunur.
2. **Parametrik Önek ve Kategori Doğrulaması (`RECIPE_RULES`):**
   - `K-` ve `B-` sayısal stok kodu değil, stok **adı** (`stock_name`) önekleridir.
   - Parametrik kural objesi oluşturuldu:
     ```javascript
     const RECIPE_RULES = {
       cuttingPrefix: 'K-',
       printPrefix: 'B-',
       excludedCategories: ['BAKIR', 'DIP', 'BOMBE', 'LAK', 'HURDA']
     };
     ```
   - Yardımcı malzemeler (tel bakır, dip, bombe pres parçaları, lak, hurda) kesinlikle kesik/baskılı levha olarak seçilmez.
   - Birden fazla alternatif reçete adayı tespit edilirse rastgele ilk kayıt seçilmez; durum şeffafça `UNRESOLVED` (`AMBIGUOUS_CANDIDATES`) olarak işaretlenir.
3. **Aşama 1-3 — Kademeli Stok Tahsisi:**
   - Talep tüp stoğundan tamamen karşılandığında (`netTubeDemand = 0`):
     - `net_tube_demand = 0`
     - `allocated_cutting_stock = 0`, `net_cutting_demand = 0`
     - `allocated_print_stock = 0`, `net_print_demand = 0`
     - Ancak `cutting_stock_code`, `print_stock_code`, `cutting_stock_name`, `print_stock_name` ve eldeki ambar stokları **eksiksiz olarak veritabanına ve arayüze kaydedilir**.
     - Durum `CALCULATED` (Hesaplandı) kalır; **"Reçetesiz"** yalnızca gerçekten kontrol edilip reçetesi bulunamayan kayıtlarda gösterilir.

---

## 2. GERÇEK ÜRÜN KABULÜ (`511112011210-8709`)

Kullanıcının talep ettiği aerosol tüpü için canlı ERP veritabanı kayıtları incelenmiş ve doğrulanmıştır:

| Seviye | Gerçek Stok Kodu | Gerçek Stok Adı | Kategori | Katsayı | Stok Durumu |
|---|---|---|---|---|---|
| **Tüp** | `511112011210-8709` | TUP-NEW LADY BELLA SAC SPR 400 ml(52x234)-EXTRA STRONG-B-SIYAH | `TENEKETUP` | - | 20.722,00 ADET |
| **Kesik (K-)** | `511112011211-8709` | K-NEW LADY BELLA SAC SPR 400 ml (52x234)-EXTRA STRONG | `KESIKLEVHA` | 1,0000 | 0,00 ADET |
| **Baskılı (B-)** | `511112001211-8709` | B-NEW LADY BELLA SAC SPR 400 ml (52x234)-EXTRA STRONG | `BASKILILEVHA` | 1,0000 | 0,00 ADET |
| **Ham Levha** | `500011000004-1208` | (Onaylı Ham Levha Kartı) | `HAMLEVHA` | 0,053295 | Mevcut |

### A) Canlı Talep Sonucu (Talep No: `EH260205A048`, Miktar: 4.800 Adet)
- Brüt Talep: **4.800 adet**
- Tahsis Edilen Tüp Stok: **4.800 adet** (Mevcut 20.722 stoktan karşılandı)
- Net Tüp Üretimi: **0 adet**
- Kesik Stok Kodu: `511112011211-8709` (Mevcut: 0 ADET, Tahsis: 0 ADET, Net Kesim: 0)
- Baskılı Stok Kodu: `511112001211-8709` (Mevcut: 0 ADET, Tahsis: 0 ADET, Yeni Baskı: 0)
- Hesap Durumu: **HESAPLANDI** (Artık "Reçetesiz" yazmıyor, reçete ve stoklar açıkça görülüyor).

### B) İzole Test Verisiyle Stok Yetersizliği Senaryosu
Canlı stok veya plan verisine dokunulmadan, aynı çekirdek motor (`calculateSingleDemandPure`) üzerinden izole test gerçekleştirilmiştir:
- Brüt Talep: 5.000 adet
- Tüp Stoğu: 0 adet -> **Net Tüp Üretimi = 5.000 adet**
- Kesik Stoğu: 1.000 adet -> **Net Kesim İhtiyacı = 4.000 adet** (1.000 adet kesik stok tahsis edildi)
- Baskılı Stoğu: 1.000 adet -> **Net Yeni Baskı İhtiyacı = 3.000 adet** (1.000 adet baskılı stok tahsis edildi)
- Tahmini Ham Levha: 3.000 / 20 = **150 levha**

---

## 3. İHTİYAÇ HAVUZU TABLOSU YENİ KOLONLARI

İhtiyaç Havuzu ekranı (`renderDemands` ve `renderDemandDetailDrawer`) zenginleştirildi:

1. **Bağımsız Kolonlar:**
   - **Tüp Stok / Tahsis:** Fiziksel tüp ambar stoğu ve bu siparişe tahsis edilen miktar.
   - **Net Tüp:** Tüp stoğundan sonra hatta girmesi gereken net gövde üretim adedi.
   - **Kesik Stok:** Reçetedeki `K-` kodu, tahsis edilen miktar ve eldeki ambar stoğu (`kod / tahsis / stok`).
   - **Net Kesim:** Kesik stok tahsisinden sonra kalan net kesim gereksinimi.
   - **Baskılı Stok:** Reçetedeki `B-` kodu, tahsis edilen miktar ve eldeki ambar stoğu (`kod / tahsis / stok`).
   - **Yeni Baskı:** Matbaa montajına gidecek net doğrulanmış yeni baskı ihtiyacı.
2. **Mükerrersiz Stok Toplamları:**
   - Özet sayaç çubuğunda aynı stok kodu birden çok siparişte yer alsa dahi tekil bazda ambar stoğu toplanır:
     - `Brüt Talep` • `Tüp Stok` • `Net Tüp` • `Kesik Stok` • `Net Kesim` • `Baskılı Stok` • `Yeni Baskı`.
3. **Birim Doğrulaması:**
   - ERP'de `ADET` olarak kayıtlı kesik/baskılı stokları zorla `LEVHA` etiketleme hatası giderildi; nesnenin kendi birimi (`cutting_stock_unit || 'ADET'`) kullanıldı.

---

## 4. EXCEL TARİH HESABI, HIZLAR VE TAKVİM UYUMU

`zaman.vba`, `DATAYAAKTAR.vba`, `TENEKE DATA` ve `Çalışma Tarihleri` kaynakları derinlemesine incelenmiştir:

### A) Hız Formülü Doğrulaması (`TENEKE DATA`)
- Excel'deki formül: `=G / (E * 60)` -> `Adet / (Saat * 60)` = **adet/dakika**.
- `DATA` sayfası arşiv sayfasıdır; hız kaynağı değildir. Hızlar yalnızca `TENEKE DATA` tablosundaki 29 ebat satırından gelir.
- **`65x157` Düzeltmesi:** Excel'in `TENEKE DATA` sayfasında `65x157` ebadı **bulunmamaktadır**. Migration 009'dan ve veritabanından `65x157` silinmiştir. Tanımsız ebatlarda uydurma hız atanması engellenmiş, `EBAT_HIZ_TANIMI_YOK` açık hatası fırlatılmıştır.
- Doğrulanmış hız örnekleri:
  - `45x100 .. 65x240` (26 ebat): 100.000 / (9 * 60) = **185,1852 adet/dk**
  - `65x260`: 80.000 / (9 * 60) = **148,1481 adet/dk**
  - `65x270`: 54.000 / (9 * 60) = **100,0000 adet/dk**
  - `65x300`: 54.000 / (9 * 60) = **100,0000 adet/dk**

### B) Çalışma Tarihleri Gün Tipleri ve Gece Vardiyası İzolasyonu
- `schedulingEngine.js` içindeki sabit Cumartesi 13:00 ve otomatik gün bazlı gece vardiyası taşması kaldırıldı.
- Desteklenen gün tipleri:
  - `ÇALIŞACAK` / `NORMAL`: 07:30 - 17:30 (Tek gündüz vardiyası; gece uzaması yoktur).
  - `VARDİYA`: 07:30 - 17:30 + gece 01:30'a kadar devam eder.
  - `VARDİYA1`: 17:30 - gece 01:30 (Akşam vardiyası).
  - `MESAİ`: 07:30 - 17:30 + `overtime_hours` (Örn: 2 saat mesai -> bitiş 19:30).
  - `TATİL`: 0 çalışma aralığı (Fabrika kapalı).
- **Önceki Gün Devri Kuralı:** Bir günün sabahında `00:00 - 01:30` vardiya kuyruğunun oluşması, SADECE bir önceki gün gerçek bir vardiya (`VARDİYA` veya `VARDİYA1`) içeriyorsa geçerlidir. Önceki gün `ÇALIŞACAK` (tek vardiya) veya `TATİL` ise ertesi sabah 00:00 devri kesinlikle oluşmaz; mesai doğrudan 07:30'da başlar.

### C) 3 Geçmiş PLAN/DATA Kaydının Karşılaştırılması ve Excel Hesap Davranışları
Canlı `alper_tenekeuretim` planındaki ardışık satırlar ile Excel'in `zaman.vba` davranışı karşılaştırılmıştır:

1. **Kayıt 1 -> Kayıt 2 (Sıra 1 -> 2):**
   - Ürün 1: `65x195`, Bitiş: `2026-11-06 07:58`
   - Ürün 2: `65x195`, Başlangıç: `2026-11-06 07:58`
   - Aynı ebat olduğundan ayar süresi = **0 dakika**. Bitiş ile başlangıç kesintisiz bağlanır.
2. **Kayıt 4 -> Kayıt 5 (Sıra 4 -> 5):**
   - Ürün 4: `65x195`, Miktar: 25.120, Bitiş: `2026-11-10 11:25`
   - Ürün 5: `65x104`, Miktar: 12.000, Başlangıç: `2026-11-10 12:55`
   - Ebat değişimi: `65x195` -> `65x104` (Yalnızca boy değişimi = **60 dakika ayar**).
   - Zaman çizelgesi:
     - 11:25 - 12:00: Ayar çalışması (35 dk)
     - 12:00 - 12:30: Mola 2 (Öğle yemeği - 30 dk duruş)
     - 12:30 - 12:55: Ayar çalışması devamı (25 dk; toplam ayar: 35 + 25 = 60 dk)
     - 12:55: Ayar biter, üretim başlar.
   - **Sonuç:** 11:25 ile 12:55 arasındaki 90 dakikalık fark, 60 dk ayar + 30 dk yemek molasının deterministik toplamıdır.
3. **Kayıt 5 -> Kayıt 6 (Sıra 5 -> 6):**
   - Ürün 5: `65x104`, Miktar: 12.000 adet. Süre = 12.000 / 185,1852 = 64,8 dk (~65 dk).
   - Başlangıç 12:55 + 65 dk = Bitiş **14:00**.
   - Ürün 6: `65x104`, Başlangıç: **14:00**. Aynı ebat olduğu için ayar 0 dk'dır.

---

## 5. OTOMATİK TEST VE DOĞRULAMA KANITLARI

Her iki test süiti konteyner içinde çalıştırılmış ve sıfır hata ile tamamlanmıştır:

1. **`tests/test-faz3b.js`:**
   - **65 / 65 Başarılı, 0 Hata**
   - Kademeli netleme formülü, tekil stok havuzu, birim dönüşümü, termin açığı, oransal kalan miktar, `is_stale`, belirsizlik koruması, canlı DB kesin mutabakatı ve `511112011210-8709` gerçek ürün kabulü doğrulandı.
2. **`tests/test-faz5a.js`:**
   - **21 / 21 Başarılı, 0 Hata**
   - Tek vardiya, molada bekleme, gece taşması, hafta sonu, çap/boy hazırlık matrisi, eksik hız hatası, kilitli başlangıç çakışması, sıra optimizasyonu, HTTP 409 iyimser kilit, 215 satırlık canlı plan çizelgelemesi, gün tipleri (`ÇALIŞACAK`, `MESAİ`, `TATİL`), sabah taşması izolasyonu ve geçmiş PLAN kayıtları tam olarak doğrulandı.
3. **Arayüz Kontrolü:**
   - HTTP 200 OK yanıtı, cache-buster güncellemesi (`v=recete-uyum-20261107`) ve İhtiyaç Havuzu tablosunun yeni kolonlarla hatasız render olduğu doğrulandı.
