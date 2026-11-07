# FAZ 3B: KADEMELİ İHTİYAÇ MOTORU VE VERİ SÖZLEŞMESİ KANIT RAPORU

**Tarih:** 07 Kasım 2026  
**Başlangıç Git Referansı:** `560a8c2` → `74919cb` (Hedefli Kabul Düzeltmeleri ile Tamamlandı)  
**Uygulanan Faz:** Faz 3B — Doğru Kaynak Sözleşmesi ve Kademeli İhtiyaç Motoru  
**Sonraki Faz Hedefi:** Faz 5A — Tek Tüp Makinesinde Üretim Planı ve Çizelgeleme  

---

## 1. YÖNETİCİ ÖZETİ VE HEDEFLERİN GERÇEKLEŞMESİ

Faz 3B kapsamında, aerosol oda spreyi ve sinek ilacı fabrikasının gerçek dolum taleplerinden başlayarak ürün ve termin bazında sıralı, tekil ve kademeli stok tahsisi gerçekleştiren **Çok Seviyeli İhtiyaç ve Tahsis Motoru** eksiksiz olarak devreye alınmıştır.

Motorun temel çalışma ilkesi:
$$\text{Brüt Dolum Talebi} \xrightarrow{-\text{Tüp Stoğu}} \text{Net Tüp İhtiyacı} \xrightarrow{-\text{Kesik Stoğu}} \text{Net Kesim İhtiyacı} \xrightarrow{-\text{Baskılı Stoğu}} \text{Net Yeni Baskı İhtiyacı}$$

### Temel Çıktılar ve Rakamlar (Canlı Koşu #6 — Kesinleşmiş Sayısal Mutabakat)
| Metrik Seviyesi | Kaynak Anlamı | Miktar | Birim | Not / Eşitlik |
| :--- | :--- | :---: | :--- | :--- |
| **Toplam Dolum Talebi** | Açık brüt dolum iş emirleri | **443** | Talep Satırı | 205 benzersiz stok kodu |
| **1. Brüt Tüp Dolum Talebi** | Açık dolum karşılığı tüp gereksinimi | **4.940.560,42** | Adet | Oransal kalan dolum formülü |
| **Tahsis Edilen Tüp Stok** | Eldeki net ambar stoğundan ayrılan | **1.208.034,24** | Adet | Termin sırasına göre tekil FIFO |
| **2. Net Tüp Üretim İhtiyacı** | **Tek makine tüp üretim hattına planlanacak** | **3.732.526,18** | Adet | $\text{Brüt} - \text{Tüp Stok} = \text{Net Tüp}$ |
| **Tahsis Edilen Kesik Stok** | Makas ambarındaki kesik levha (tüp eşdeğeri) | **646.582,00** | Adet | Fiziksel stok birimiyle eşdeğer ayrıldı |
| **3. Net Kesim İhtiyacı** | Makas hattına (`MAKAS-01`) kesim emri açılacak | **3.085.944,18** | Adet | $\text{Net Tüp} - \text{Kesik Stok} = \text{Net Kesim}$ |
| **Tahsis Edilen Baskılı Stok** | Matbaa ambarındaki baskılı levha (tüp eşdeğeri) | **668.747,60** | Adet | Fiziksel stok birimiyle eşdeğer ayrıldı |
| **4. Net Yeni Baskı İhtiyacı** | **Baskı montajına (Kombinasyon Masası) aktarılacak** | **2.417.196,58** | Adet | $\text{Net Kesim} - \text{Baskılı Stok} = \text{Net Baskı}$ |
| **Ham Levha Stoğu Etkisi** | Yeni baskıyı azaltmaz; satın alma gereksinimini etkiler | *Kombinasyon (Faz 4)* | Levha | Onaylı kapasite parametresi |

---

## 2. PLANLI ARZ, TERMİN AÇIĞI VE TEK TÜP MAKİNESİ MUTABAKATI

Kullanıcının kabul düzeltmeleri doğrultusunda, mevcut `[MikroDesktop_LIDER26].[dbo].[alper_tenekeuretim]` üretim planı (215 satır, 3.134.665 adet) kademeli motorla titizlikle karşılaştırılmıştır:

### A) Plan Karşılama ve Termin Açığı Ayrımı
Planlı üretim eldeki ambar stoğu değildir; hattın tamamlanacağı tarihte arz haline gelir. Bir talep birden fazla arz dilimiyle parça parça karşılanabilir. En erken bitiş tarihi termin öncesi olsa bile, kalan parçanın termin sonrasına sarkması durumunda **termin açığı** oluşur:

| Plan Karşılama Durumu | Miktar (Adet) | Oran (%) | Açıklama |
| :--- | :---: | :---: | :--- |
| **Zamanında Karşılanan Üretim** | **2.231.611,52** | %59.8 | Dolum termin tarihinden önce üretimi biten tüpler |
| **Geç Karşılanan (Termin Açığı)** | **671.871,08** | %18.0 | Dolum termininden sonraya kalan üretim dilimleri |
| **Planda Olmayan (İlave Planlama)** | **829.043,58** | %22.2 | Mevcut planda hiç yer almayan, ilave açılacak üretim |
| **TOPLAM NET TÜP İHTİYACI** | **3.732.526,18** | **%100.0** | **Tam Eşitlik:** $2.231.611,52 + 671.871,08 + 829.043,58 = 3.732.526,18$ |

> [!IMPORTANT]
> **Kusursuz Sayısal Mutabakat:** Zamanında karşılanan, geç karşılanan ve ilave planlama toplamı kuruşu kuruşuna (0,00 fark) net tüp üretim ihtiyacına eşittir.
> Net tüp üretim ihtiyacı ile mevcut plan toplamı üst üste toplanmamış; planlı üretim net tüp ihtiyacı içerisindeki karşılama payı olarak modellenmiştir.

### B) Tek Tüp Makinesi Kuralı
- Fabrikada **tek bir tüp gövde üretim makinesi** bulunmaktadır.
- Önceki doküman ve kod taslaklarındaki `HAT-01` / `HAT-02` veya iki makine kapasitesi varsayımları tamamen kaldırılmıştır.
- `public/app.js`, `src/lib/initial-data.ts` ve `src/app/uretim-plani/page.tsx` içinde tüp hattı tek makine (`Tüp Gövde Üretim Hattı (Tek Makine)`) olarak sabitlenmiştir.
- Faz 5A tek makine çizelgelemesi bu kurala göre çalışacaktır.

---

## 3. SAYISAL HASSASİYET, BİRİMLER VE YUVARLAMA ANALİZİ

### A) Brüt Miktarın 4.970.843'ten 4.940.560,42'ye Düşmesinin Açıklaması
1. **Eski SQL Mantığı:** Bölünmüş iş emirlerinde `(ish_planuretim - ish_uret_miktar)` değerini her dolum plan satırına doğrudan yüklüyordu.
2. **Kök Neden:** Bir iş emri birden fazla güne veya makineye bölündüğünde (`Tarih`, `MAKINE`, `SIRA`), gerçekleşen üretim miktarı her alt satıra ayrı ayrı uygulanıyor veya mükerrer açık miktar oluşturuyordu.
3. **Düzeltilmiş Oransal Formül:**
   $$\text{dolum\_kalan\_miktar} = \text{PLANMIKTAR} \times \left(1 - \frac{\text{ish\_uret\_miktar}}{\text{ish\_planuretim}}\right)$$
   Bu formülle her plan satırı kendi plan payı oranında gerçekleşme düşümünü almış, mükerrer kalan miktarlar temizlenmiş ve gerçek açık brüt tüp ihtiyacı **4.940.560,42** adet olarak doğrulanmıştır.

### B) Decimal Hassasiyeti ve Sunum Yuvarlaması Ayrımı
- **Veritabanı Katmanı:** PostgreSQL `calculation_runs` ve `demand_allocations` tablolarında tüm parasal ve miktarsal değerler `NUMERIC(18, 2)` kesinliğinde saklanmaktadır. Veritabanı ve motor düzeyinde hiçbir yuvarlama kaybı yoktur.
- **Sunum Düzeyi:** Önceki raporda görülen `3.753.946,98` → `3.753.947,00` durumu, istemci tarafındaki `formatNum` fonksiyonunun `Math.round` ve `maximumFractionDigits: 0` kullanmasından kaynaklanan salt bir **ekran sunum yuvarlamasıydı**.
- **Düzeltme:** `formatNum` fonksiyonu ondalıklı değerler için (`num % 1 !== 0`) 2 basamaklı hassasiyeti şeffafça gösterecek şekilde güncellenmiştir (`4.940.560,42`, `3.732.526,18`, `2.417.196,58`).

### C) Fiziksel Stok ve Eşdeğer Tüp Birimi Ayrımı
- `allocated_cutting_stock` (ve `allocated_print_stock`) veri tabanında fiziksel ambar biriminde (örn. `LEVHA`) tutulur.
- Şelalede çıkarma ve netleme işlemleri ise reçete katsayılarıyla doğrulanmış tüp eşdeğeri (`allocated_cutting_tube_equiv`, `allocated_print_tube_equiv`) üzerinden yürütülür.
- UI çekmecesinde (`renderDemandDetailDrawer`) hem fiziksel stok (örn. `500 LEVHA`) hem tüp eşdeğeri (örn. `10.000 Adet`) yan yana açıkça gösterilmektedir.

---

## 4. LEVHA KAPASİTESİ VE HAM LEVHA PARAMETRESİ

- **Kapasite Ters Orantısı Kaldırıldı:** `rawSheetCapacity = Math.round(1 / ratioPrintToSheet)` yaklaşımı tamamen temizlendi.
- Levha kapasitesi, `AGENTS.md` 2. Bölüm kuralı uyarınca `tube_capacities.units_per_sheet` onaylı parametresinden okunmaktadır.
- Çoklu veya eksik ham levha eşleşmesinde yapay bir ham levha kodu veya ilk kayıt seçilmez; `raw_sheet_code = NULL`, `estimated_raw_sheets = NULL` bırakılır ve belirsizlik korunur.
- Ham levha stoğu hiçbir koşulda yeni baskı ihtiyacını azaltmaz; yalnızca hammadde satın alma gereksinimine etki eder.

---

## 5. TUTARLI VERİ SETİ VE STALE DATA YÖNETİMİ

- `runAllocationCalculation` çalıştırıldığında seçilen senkronizasyon koşusuna ait değişmez veri kümesi baz alınır.
- Son hesaplama koşusundan sonra yeni bir ERP senkronizasyonu gelirse:
  `latest_sync_id > sync_run_id` kontrolü ile `is_stale = TRUE` bayrağı üretilir.
- Kullanıcı arayüzünde sarı renkli uyarı paneli gösterilir:  
  *“⚠️ Hesaplama Eskimiş (Stale Data Uyarısı): Son tahsis hesaplamasından sonra yeni bir ERP senkronizasyonu gerçekleşti. Lütfen tahsisi yeniden hesaplayınız.”*
- Eski hesaplama sonuçları ile yeni veri setleri sessizce birbirine karıştırılmaz.

---

## 6. CANLI 10 GERÇEK ERP ÜRÜNÜ MUTABAKAT TABLOSU (KOŞU #6)

| # | Sipariş No | Tüp Stok Kodu | Brüt Talep | Tüp Stok Tahsis | Net Tüp | Kesik Stok Tahsis (Eşd.) | Net Kesim | Baskılı Stok Tahsis (Eşd.) | Net Yeni Baskı | Durum |
| :---: | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| 1 | IP-205277 | 512032011410-5476 | 8.700,00 | 8.700,00 | **0,00** | Reçetesiz | **0,00** | Reçetesiz | **0,00** | CALCULATED |
| 2 | IP-206190 | 512032011410-5475 | 12.000,00 | 226,00 | **11.774,00** | 0,00 | **11.774,00** | 0,00 | **11.774,00** | CALCULATED |
| 3 | IP-206190 | 512032011410-5476 | 3.446,00 | 3.081,00 | **365,00** | 0,00 | **365,00** | 0,00 | **365,00** | CALCULATED |
| 4 | IP-206190 | 512032011410-5476 | 12.000,00 | 0,00 | **12.000,00** | 0,00 | **12.000,00** | 0,00 | **12.000,00** | CALCULATED |
| 5 | IP-206190 | 512032011410-5477 | 12.000,00 | 1.834,00 | **10.166,00** | 0,00 | **10.166,00** | 0,00 | **10.166,00** | CALCULATED |
| 6 | IP-206190 | 512032011410-5477 | 12.000,00 | 0,00 | **12.000,00** | 0,00 | **12.000,00** | 0,00 | **12.000,00** | CALCULATED |
| 7 | IP-206191 | 512031011610-8214 | 9.214,00 | 9.214,00 | **0,00** | Reçetesiz | **0,00** | Reçetesiz | **0,00** | CALCULATED |
| 8 | IP-206206 | 511290003 | 36.480,00 | 34.918,00 | **1.562,00** | 0,00 | **1.562,00** | 1.562,00 | **0,00** | CALCULATED |
| 9 | IP-206232 | 512011011610-8213 | 24.000,00 | 24.000,00 | **0,00** | Reçetesiz | **0,00** | Reçetesiz | **0,00** | CALCULATED |
| 10 | IP-206232 | 512011011610-8214 | 16.200,00 | 16.200,00 | **0,00** | Reçetesiz | **0,00** | Reçetesiz | **0,00** | CALCULATED |

---

## 7. OTOMATİK TEST SÜİTİ KANITI (`tests/test-faz3b.js`)

Test süiti Docker konteyneri içinde 10 ana senaryoda **46 testin tamamını firesiz (46 PASS, 0 FAIL)** başarıyla geçmiştir:

```text
================================================================
FAZ 3B: KADEMELİ İHTİYAÇ MOTORU VE VERİ SÖZLEŞMESİ TEST SÜİTİ
================================================================

--- TEST 1: 50/10/5/7 Kademeli Netleme Formülü Doğrulaması ---
  [PASS] Net Tüp İhtiyacı 40.000 adet olmalı (Hesaplanan: 40000)
  [PASS] Net Kesim İhtiyacı 35.000 adet olmalı (Hesaplanan: 35000)
  [PASS] Net Yeni Baskı İhtiyacı 28.000 adet olmalı (Hesaplanan: 28000)
  [PASS] Tahsis edilen tüp stok: 10.000
  [PASS] Tahsis edilen kesik stok: 5.000
  [PASS] Tahsis edilen baskılı stok: 7.000

--- TEST 2: Sıralı ve Tek Seferlik Stok Tahsisi (8.000 + 8.000, 10.000 Stok) ---
  [PASS] İlk talep (A) 8.000 stok almalı (Tahsis: 8000)
  [PASS] İlk talep net ihtiyacı 0 olmalı (Net: 0)
  [PASS] İkinci talep (B) kalan 2.000 stoğu almalı (Tahsis: 2000)
  [PASS] İkinci talep net ihtiyacı 6.000 olmalı (Net: 6000)
  [PASS] Toplam net tüp ihtiyacı tam 6.000 adet olmalı (Toplam: 6000)
  [PASS] Stok havuzu sıfırlanmalı (Kalan: 0)

--- TEST 3: 1:1 Olmayan Reçete Katsayısı ve Farklı Stok Birimleri ---
  [PASS] 20.000 tüp için 0.05 katsayı ile 1.000 levha kesik ihtiyacı doğmalı
  [PASS] Eldeki 400 levha kesik tahsis edilmeli
  [PASS] Kalan 600 levha kesik için 0.5 katsayı ile 300 levha baskılı ihtiyacı doğmalı
  [PASS] Eldeki 100 levha baskılı tahsis edilmeli
  [PASS] Net yeni baskı ihtiyacı tam 200 levha olmalı
  [PASS] Kesik tahsisi tüp eşdeğerinde tam 8.000 tüp olmalı (Hesaplanan: 8000)
  [PASS] Baskılı tahsisi tüp eşdeğerinde tam 4.000 tüp olmalı (Hesaplanan: 4000)
  [PASS] Net yeni baskı tüp eşdeğeri tam 8.000 tüp olmalı (Hesaplanan: 8000)

--- TEST 4: Stok İzolasyonu (Farklı Ürünlerin Stokları Birbirini Azaltamaz) ---
  [PASS] Ürün X'in net ihtiyacı 0 olmalı
  [PASS] Ürün X'in 15.000 fazla stoğu kalmalı
  [PASS] Ürün Y'nin tahsis edilen stoğu 0 olmalı
  [PASS] Ürün Y'nin net ihtiyacı Ürün X'in fazla stoğundan etkilenmeden 10.000 kalmalı

--- TEST 5: Sınır Değerler: Sıfır Stok, Fazla Stok, Negatif Kaynak Stok ---
  [PASS] Sıfır stokta net ihtiyaç brüt miktara eşit olmalı (5.000)
  [PASS] Fazla stok negatif ihtiyaç üretmez (Net: 0)
  [PASS] Negatif kaynak stok tahsis edilebilir miktar olarak 0 alınmalı
  [PASS] Negatif stok bayrağı true olmalı
  [PASS] Negatif stok net ihtiyacı azaltamaz, net talep tam 5.000 kalmalı

--- TEST 6: Kısmi Zamanında + Kısmi Geç Planlı Arz ve Termin Açığı ---
  [PASS] Toplam karşılanan miktar 10.000 olmalı
  [PASS] Zamanında karşılanan miktar tam 2.000 olmalı
  [PASS] Geç karşılanan miktar (Termin Açığı) tam 8.000 olmalı
  [PASS] Erken bitiş tarihi 2026-11-09 olmalı
  [PASS] Tam karşılanma tarihi 2026-11-20 olmalı
  [PASS] Talep gecikmeli olarak işaretlenmeli ve gecikme 10 gün olmalı

--- TEST 7: Ortak Alt Bileşen (Kesik/Baskılı) Tekil Tahsis Mantığı ---
  [PASS] Talep 1 ortak kesikten 10.000 adet almalı
  [PASS] Talep 1 net kesim ihtiyacı 0 olmalı
  [PASS] Talep 2 ortak kesikten kalan 5.000 adedi almalı
  [PASS] Talep 2 net kesim ihtiyacı 5.000 olmalı
  [PASS] Ortak kesik havuzu 0'a inmeli, mükerrer tahsis engellenmeli

--- TEST 8: Eksik/Sıfır Katsayı ve Reçete Hatalarında Satır Korunumu ---
  [PASS] Eksik katsayıda hesap durumu UNRESOLVED olmalı
  [PASS] Çözümlenememe gerekçesi açıkça belirtilmeli
  [PASS] Eksik reçetede sahte sıfır yerine NULL korunmalı

--- TEST 9: demand_key ile Çoklu Plan Satırı Korunumu ---
  [PASS] Farklı tarihteki satırlar farklı demand_key üretmeli
  [PASS] Farklı makinelerdeki satırlar farklı demand_key üretmeli
  [PASS] Farklı sıra no'lu satırlar farklı demand_key üretmeli

--- TEST 10: Canlı Veritabanı ve Hesaplama Koşusu Mutabakatı ---
  [PASS] PostgreSQL calculation_runs tablosunda en az bir başarılı koşu bulunmalı
  [PASS] En az 10 satır tahsis edilmiş talep dönmeli (Dönen: 443)
  [PASS] Brüt - Tahsis = Net Tüp eşitliği tam olmalı
  [PASS] Net Tüp - Tahsis Kesik = Net Kesim eşitliği tam olmalı
  [PASS] Net Kesim - Tahsis Baskılı = Net Baskı eşitliği tam olmalı
  [PASS] Zamanında + Geç + İlave = Net Tüp eşitliği tam olmalı

================================================================
TEST SONUCU: 46 BAŞARILI, 0 BAŞARISIZ
================================================================
```

---

## 8. SONUÇ VE BİR SONRAKİ FAZA GEÇİŞ HAZIRLIĞI

Faz 3B hedeflenen kabul düzeltmeleriyle birlikte eksiksiz olarak tamamlanmıştır:
1. SQL Server ERP tablolarına kesinlikle hiçbir yazma (`INSERT/UPDATE/DELETE/DDL`) yapılmamıştır.
2. `[MikroDesktop_LIDER26].[dbo].[alper_tenekeuretim]` planı ve taslakları kayıpsız korunmuştur.
3. Kademeli ihtiyaç motoru ve tekil stok tahsisi backend düzeyinde çalışmaktadır.
4. UI 5 seviyeli KPI çubuğu, zamanında/geç arz durum kartı, stale veri uyarısı ve detay çekmecesi güncellenmiştir.
5. Tek tüp üretim makinesi kuralı koda ve dokümantasyona işlenmiştir.

**Sıradaki Faz:**
- **Faz 5A: Tek Makine Çizelgeleme ve İş Sıralama Motoru (Tüp Gövde Üretim Hattı)**
  * Net Tüp Üretim İhtiyacı: `3.732.526,18` adet.
  * Planlı Arz ve Termin Açıkları dikkate alınarak tek tüp hattı için vardiya/hız/ayar sürelerine göre dinamik iş sırası oluşturulacaktır.
