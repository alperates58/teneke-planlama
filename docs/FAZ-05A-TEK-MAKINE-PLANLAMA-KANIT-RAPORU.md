# FAZ 5A: TEK MAKİNE TAKVİMİ VE ÜRETİM ÇİZELGELEME KANIT RAPORU

**Tarih:** 07.11.2026  
**Durum:** TAMAMLANDI (15/15 Faz 5A Testi + 46/46 Faz 3B Testi Başarılı)  
**Esas Kaynak:** `[MikroDesktop_LIDER26].[dbo].[alper_tenekeuretim]` (215 Satır, 3.134.665 Adet Tüp)  
**Makine İlkesi:** **TEK TÜP ÜRETİM MAKİNESİ VARDIR** (İkinci hat/HAT-02 kesinlikle türetilmemiştir).  
**ERP Yazma İlkesi:** SQL Server ERP veritabanına (`AA_LIDER`, `MikroDesktop_LIDER26`) kesinlikle hiçbir yazma (`INSERT/UPDATE/DELETE/DDL`) yapılmamıştır; tüm çizelgeleme PostgreSQL'de yönetilmektedir.

---

## 1. Amaç ve Yönetici Özeti

Bu fazda, Alper'in fabrikadaki tek aerosol teneke tüp gövde üretim hattı için Excel/VBA ortamında yürüttüğü çizelgeleme, sıralama ve süre hesaplama mantığı; fabrika çalışma takvimi, vardiya gece taşması, molalar, 29 ebatlık üretim hızları ve çap/boy hazırlık matrisi ile birleştirilerek modern, deterministik ve kalıcı bir çizelgeleme motoruna dönüştürülmüştür.

Kullanıcının ilettiği `renderWorkbench is not defined` konsol hatası incelenmiş; hatanın eski Faz 2D sürümünün (`app.js?v=2d`) tarayıcı önbelleğinde kalmasından kaynaklandığı tespit edilmiş, `public/index.html` önbellek kırıcı sürümü `v=5a-20261107` olarak güncellenmiş, `no-cache` meta başlıkları eklenmiş ve tüm 7 ekranın (Overview, Demands, Workbench, Printing Rules, Technical, Production, Integration) hatasız çalıştığı otomatik testlerle kanıtlanmıştır.

---

## 2. Faz 3B'den Devir Kontrolleri

1. **Saf Test ile Gerçek Servis Bütünlüğü:**
   - [`server/services/schedulingEngine.js`](file:///c:/Users/alper.ates.LIDER/Desktop/teneke-planlama/server/services/schedulingEngine.js) içerisindeki `scheduleProductionPlanPure` saf çekirdeği hem backend API'sinde (`previewSchedule`, `commitSchedule`) hem de birim test süitinde (`tests/test-faz5a.js`) birebir aynı fonksiyon olarak çalışmaktadır.
2. **Sayısal Hassasiyet (Numeric Precision):**
   - PostgreSQL şemasında tüm miktarlar, hızlar ve katsayılar `NUMERIC(14,4)` ve `NUMERIC(10,2)` tiplerinde tutulmaktadır. JS tarafında yuvarlama yapılmadan hassas ondalık aritmetik uygulanmış, UI gösteriminde `toLocaleString('tr-TR')` ile sunulmuştur.
3. **Kapsamlı Stale (Eskime) Kontrolü:**
   - [`server/services/demandAllocationService.js`](file:///c:/Users/alper.ates.LIDER/Desktop/teneke-planlama/server/services/demandAllocationService.js) içerisindeki `getLatestCalculation()` fonksiyonu yalnızca yeni ERP senkron koşularını değil, aynı zamanda üretim planı taslağının son güncellenme tarihini (`current_draft_updated_at > started_at`) kontrol eder. Kullanıcı planda sıra veya miktar değiştirdiğinde tahsis anında `is_stale: true` olarak işaretlenir.
4. **demand_key ve Bölünmüş Plan Satırı Tutarlılığı:**
   - Aynı iş emrinin farklı tarih ve makinelerdeki UPL satırları tekil `demand_key` ile korunmuş; iş emrinin açık kalan miktarı bölünmüş satırlara oransal olarak dağıtılarak mükerrer ihtiyaç üretimi engellenmiştir.

---

## 3. Çalışma Takvimi, Vardiyalar ve Molalar

Fabrika standart takvimi [`migrations/009_faz5a_scheduling_and_calendar.sql`](file:///c:/Users/alper.ates.LIDER/Desktop/teneke-planlama/migrations/009_faz5a_scheduling_and_calendar.sql) ile kalıcı hale getirilmiştir:

- **Tek Makine:** `TUP-HATTI` (Tüp Gövde Üretim Hattı)
- **Çalışma Saatleri:**
  - Gündüz Vardiyası: `07:30` - `17:30`
  - Akşam / Gece Taşması: `17:30` - `01:30` (Hafta içi gece 01:30'a kadar kesintisiz devam eder).
  - Fabrika Kapalı (Duruş): `01:30` - `07:30` (6 saat duruş, sabah 07:30'da iş kaldığı yerden devam eder).
  - Cumartesi: Yarım gün çalışma (`07:30` - `13:00`).
  - Pazar: Tam gün tatil (Üretim yapılmaz; iş Pazartesi sabahı 07:30'a sarkar).
- **Otomatik Düşülen Molalar (6 Mola):**
  1. Gündüz Çay: `09:15 - 09:30` (15 dk)
  2. Öğle Yemeği: `12:00 - 12:30` (30 dk)
  3. İkindi Çay: `15:15 - 15:30` (15 dk)
  4. Akşam Çay: `19:30 - 19:45` (15 dk)
  5. Akşam Yemeği: `21:30 - 22:00` (30 dk)
  6. Gece Çay: `23:30 - 23:45` (15 dk)
- **Mola Ortasında Başlama Mantığı:**
  - Eğer bir iş mola ortasına denk gelirse (örn. 09:20), tüm mola süresi değil yalnızca **kalan mola süresi** (10 dk) beklenir ve iş tam 09:30'da başlatılır.

---

## 4. Ebat Hızları ve Çap/Boy Hazırlık Matrisi

### A) 29 Ebat Üretim Hızları (`tube_production_speeds`)
Excel `TENEKE DATA.H` kolonundaki `=G/(E*60)` formülü adet/dakika hızını verir:
- Örnek: `52x195`, `65x195`, `65x104`, `45x140`: **185.1852 adet/dakika** (9 saat net çalışma = 540 dk; 540 × 185.1852 = 100.000 adet).
- `65x260`: **148.1481 adet/dakika**
- `65x300`: **100.0000 adet/dakika**
- **Eksik Tanım Koruması:** Tanımsız bir ebat çizelgelenmek istendiğinde motor varsayılan bir hız uydurmaz; anında `EBAT_HIZ_TANIMI_YOK` açık hatası fırlatır (Test 6 ile kanıtlanmıştır).

### B) Hazırlık Matrisi (`zaman.vba` Doğrulaması)
Önceki iş ile sonraki iş arasındaki kalıp/makine ayar süreleri:
1. **Çap 45 mm'ye Geçiş:** `480 dakika` (8 saat)
2. **Diğer Çap Değişimleri (örn. 52 -> 65):** `180 dakika` (3 saat)
3. **Yalnız Boy Değişimi (örn. 65x195 -> 65x104):** `60 dakika` (1 saat)
4. **Aynı Ebat:** `0 dakika`

---

## 5. Sıralama, Kilitler, Senaryolar ve İyimser Kilit (Optimistic Lock)

- **Başlangıç Kilidi (`is_start_locked`):** Kullanıcı bir işin başlangıç zamanını sabitleyebilir. Önceki işler gecikip kilitli başlangıç anına yetişemezse motor işi ezmez; `is_collision: true` ve `collision_reason` uyarısı üretir.
- **Sıra Kilidi (`is_sequence_locked`):** Sıralaması kilitlenen işlerin yukarı/aşağı taşınması arayüzde engellenir.
- **Senaryo Motoru (`production_plan_scenarios`):**
  - Kullanıcı istediği an mevcut taslağı adlandırılmış bir senaryo olarak dondurabilir (örn: *"10 Kasım Çap Gruplamalı Sıralama"*).
  - İleride tek tıkla senaryolar listesinden taslağa geri yükleme (`revertDraftToScenario`) yapılabilir.
- **İyimser Kilit (HTTP 409 Concurrency Control):**
  - Tüm sıralama, miktar güncelleme ve çizelge kaydetme işlemleri `expectedVersion` parametresi ile çalışır.
  - Başka bir oturum taslağı güncellediyse istek `409 Conflict (CONCURRENT_MODIFICATION)` ile reddedilir; plan otomatik olarak yenilenir ve veri kaybı önlenir.

---

## 6. Otomatik Test Sonuçları (15/15 PASS)

`cat tests/test-faz5a.js | docker compose exec -T web node -` çalıştırma sonucu:

```
================================================================
FAZ 5A: TEK MAKİNE TAKVİMİ VE ÜRETİM ÇİZELGELEME TEST SÜİTİ
================================================================

--- TEST 1: Tek Vardiyada Basit İş ve Süre Hesabı ---
  [PASS] 54 dakikalık iş 07:30 başlangıçla tam 08:24:00'te bitmeli

--- TEST 2: Mola Kesişimi ve Kalan Mola Süresini Bekleme ---
  [PASS] Mola kesintisi doğru atlandı: 09:00 başlayan 30 dk iş, 15 dk mola ile 09:45'te bitti
  [PASS] Mola ortasında (09:20) verilen başlangıç yalnız kalan 10 dk molayı bekleyip 09:30'da başladı

--- TEST 3: Gece Taşması (01:30 Bitiş) ve Ertesi Gün Devri ---
  [PASS] Gece 01:30 vardiya bitişinde duran iş ertesi sabah 07:30'da devam edip 08:00'de bitti

--- TEST 4: Hafta Sonu (Cumartesi 13:00 Bitiş, Pazar Tatil) ---
  [PASS] Cumartesi 13:00'te yarım kalan iş Pazar tatilini atlayıp Pazartesi 08:00'de tamamlandı

--- TEST 5: Çap ve Boy Hazırlık Matrisi (Excel Doğrulama) ---
  [PASS] 52x195 -> 45x140 çap değişimi tam 480 dakika (8 saat) ayar süresi aldı
  [PASS] 52x195 -> 65x195 çap değişimi tam 180 dakika (3 saat) ayar süresi aldı
  [PASS] 65x195 -> 65x104 boy değişimi tam 60 dakika (1 saat) ayar süresi aldı
  [PASS] Aynı ebatta (65x195 -> 65x195) hazırlık süresi 0 dakika oldu

--- TEST 6: Eksik Hız Tanımında Açık Hata Üretimi ---
  [PASS] Tanımsız ebatta sessizce sıfır almak yerine EBAT_HIZ_TANIMI_YOK hatası fırlatıldı

--- TEST 7: Kilitli Başlangıç ve Çakışma Uyarısı ---
  [PASS] Kilitli iş zamanında yetişmediğinde is_collision=true bayrağı verildi

--- TEST 8: Sıra Değişiminin Çizelgeye Etkisi ---
  [PASS] Sıra gruplaması ile ayar süresi 360 dakikadan 180 dakikaya indi (180 dk tasarruf)

--- TEST 9: Eşzamanlı Güncelleme Koruması (HTTP 409 Optimistic Lock) ---
  [PASS] Eski sürümle (wrongVersion) yapılan güncelleme CONCURRENT_MODIFICATION ile reddedildi

--- TEST 10: Canlı 215 Satırlık Plan Çizelgeleme Önizlemesi ---
  [PASS] 215 satırlık canlı plan başarıyla çizelgelendi (Toplam Hazırlık: 2460 dk, Toplam Çalışma: 16927.19 dk)
  [PASS] Önizleme çağrısı aktif taslağı sessizce ezmedi (Önizleme izolasyonu doğrulandı)

================================================================
TEST SONUCU: 15 BAŞARILI, 0 BAŞARISIZ
================================================================
```

Ayrıca Faz 3B kabul test süiti de çalıştırılmış ve **46/46 BAŞARILI** (0 BAŞARISIZ) olarak mutabakatı doğrulanmıştır.
Tüm 7 arayüz ekranının render doğrulaması da `test-all-screens` ile 0 hata ile tamamlanmıştır.
