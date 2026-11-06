# TENEKE PLANLAMA — FAZ 3A.1 MEVCUT PLANIN KAYIPSIZ İÇERİ ALINMASI KANIT RAPORU
**(KAYNAK DÜZELTMESİ: `MikroDesktop_LIDER26.dbo.alper_tenekeuretim`)**

**Tarih:** 06.11.2026  
**Aktif Faz:** Faz 3A.1 (Mevcut SQL Planının Kayıpsız İçeri Alınması ve Değişmez Snapshot Modeli)  
**Durum:** TAMAMLANDI VE KANITLANDI  
**Aktif Çalışma Adresi:** `http://localhost:3001` (Host: 3001 → Docker Konteyner: 3000)  
**Esas Kaynak Tablo:** `[MikroDesktop_LIDER26].[dbo].[alper_tenekeuretim]` (Parametrik)  
**Bağlantı Veritabanı:** `AA_LIDER` via `host.docker.internal:11433` (SSH Gateway: `lider-server` / `0101`)  
**Hedef Kalıcı Veritabanı:** PostgreSQL 16-alpine (`teneke-planlama-db` Port 5432)  
**Entegrasyon Test Skoru:** 48/48 Test BAŞARILI (%100 PASS)  
**Kaynak SQL Server Değişikliği:** KESİNLİKLE SIFIR (0 INSERT, 0 UPDATE, 0 DELETE, 0 DDL)

---

## 1. YÜRÜTÜCÜ VE YÖNETİCİ ÖZETİ

Kullanıcının 06.11.2026 tarihli güncel düzeltmesi doğrultusunda:
- **Önceki Varsayım Düzeltildi:** `AA_LIDER.dbo.meltem_teneke` tablosunun güncel üretim planı kaynağı olmadığı; tüp üretim planının fiili ve esas kaynağının `[MikroDesktop_LIDER26].[dbo].[alper_tenekeuretim]` olduğu teyit edilmiştir.
- **Parametrik Üç Parçalı Erişim:** SQL bağlantı veritabanı `AA_LIDER` olarak korunmuş; plan sorguları `MikroDesktop_LIDER26.dbo.alper_tenekeuretim` üç parçalı nesne adı üzerinden parametrik olarak yapılandırılmıştır (`config.ERP_SQL.planSourceTable`).
- **Zengin Veri Modeli Keşfi:** `MikroDesktop_LIDER26.dbo.alper_tenekeuretim` tablosunun 19 kolondan oluştuğu; 215 satır, 205 benzersiz stok kodu, 3.134.665 adet teneke tüp ve eksiksiz `Başlangıç Tarih` / `Bitiş Tarih` kronolojisi içerdiği doğrulanmıştır.
- **Tek Satır Bütünlüğü:** Miktar, başlangıç tarihi, bitiş tarihi, üretim tarihi, seri ve ebat bilgileri kesinlikle aynı kaynak satırından okunmuş; hiçbir yapay join veya dış tablodan tarih uydurma yapılmamıştır. Aynı stok koduna ait farklı parti satırları (10 mükerrer stok satırı) bağımsız üretim işleri olarak korunmuştur.
- **Kronolojik Makine Sırası:** Kaynakta açık bir sıra/kimlik alanı bulunmadığı teyit edilmiş; `[Başlangıç Tarih] ASC, [Bitiş Tarih] ASC` makine çizelgeleme sırası önerilen sıra olarak kabul edilerek arayüzde şeffafça açıklanmıştır.
- **Eski Snapshot ve Taslakların Korunması:** Önceki `meltem_teneke` snapshot'ları ve kullanıcının düzenlediği taslaklar silinmemiş; yeni kaynak ile eski kaynak arasındaki farklar (+91 satır, +1.020.588 adet) karşılaştırmalı olarak raporlanmıştır.
- **Geri Yazım Varsayımı Askıya Alındı:** İlerideki Faz 5W geri yazım hedefi için önceki `meltem_teneke` varsayımı askıya alınmış; Excel VBA yazma akışı incelenerek kesin geri yazım hedefi Faz 5W öncesinde belirlenecektir.
- **48/48 Entegrasyon Testi ve Sıfır Kaynak Değişikliği:** Tüm akış uçtan uca otomatik test edilmiş; kaynak SQL Server üzerinde kesinlikle sıfır değişiklik olduğu kanıtlanmıştır.

---

## 2. ESAS KAYNAK: `[MikroDesktop_LIDER26].[dbo].[alper_tenekeuretim]` DETAYLI ŞEMA VE VERİ ANALİZİ

### 2.1. Kolon Analizi (19 Kolon)

| # | Kolon Adı | Veri Tipi | Null Olabilir | Açıklama ve Anlamı |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `STOKKODU` | nvarchar(50) | Evet | Teneke tüp stok kodu (Örn: `511121010410-5004`, `511280003`) |
| 2 | `STOKISMI` | nvarchar(max) | Evet | Ürün tam ticari açıklaması |
| 3 | `ADET` | float | Evet | Planlanan tüp üretim adedi (Örn: `5032`, `60000`) |
| 4 | `TARIH` | datetime2 | Evet | Hedef plan tarihi |
| 5 | `Çap ve Boy` | nvarchar(50) | Evet | Tüp ebat tanımı (Örn: `65x195`, `52x165`, `65x104`) |
| 6 | `İş Kod` | nvarchar(50) | Evet | İş / Sipariş kodu (Örn: `242`, `221`, `35`) |
| 7 | `Seri` | nvarchar(20) | Evet | Üretim serisi (Örn: `S1`) |
| 8 | `Plana Eklenen Tarih` | datetime | Evet | Planlama kaydının sisteme girildiği tarih |
| 9 | `Kısa Kod` | nvarchar(50) | Evet | Mikro ERP kısa malzeme kodu |
| 10 | `Ürün Kodu` | nvarchar(100) | Evet | Alternatif ürün kodu eşlemesi |
| 11 | `Ürün Adı` | nvarchar(255) | Evet | Ürün kısa adı |
| 12 | `Kalan` | float | Evet | Üretimden kalan net ihtiyaç |
| 13 | `Başlangıç Tarih` | datetime | Evet | **Makinede üretimin fiili başlangıç zamanı** (Örn: `2026-11-06 10:30:00`) |
| 14 | `Bitiş Tarih` | datetime | Evet | **Makinede üretimin fiili bitiş zamanı** (Örn: `2026-11-06 10:58:00`) |
| 15 | `Üretim Tarihi` | datetime | Evet | Planlanan vardiya/üretim tarihi (Örn: `2026-11-09`) |
| 16 | `Kesik Stok` | float | Evet | Ambar kesik levha stok eşdeğeri |
| 17 | `Baskılı Stok` | float | Evet | Ambar baskılı levha stok eşdeğeri |
| 18 | `Baskı Talep` | float | Evet | Matbaaya iletilecek baskı ihtiyacı |
| 19 | `Açıklama` | nvarchar(255) | Evet | Planlama uzmanı notları (Örn: `rev:00 müşteriden talep gelene kadar rpt`, `REV:02 OLDU`, `RPT`) |

### 2.2. Sayısal Özet ve Bütünlük İstatistikleri

- **Toplam Satır Sayısı:** **215 Satır**
- **Toplam Üretim Miktarı:** **3.134.665,00 Adet**
- **Benzersiz Stok Kodu Sayısı:** **205 Tekil Stok Kodu**
- **Mükerrer Stok Satırı:** **10 Stok Kodu** birden fazla partide yer almaktadır (Toplam 20 satır). Her biri bağımsız başlangıç/bitiş tarihine ve partiye sahiptir; bu kayıtlar birleştirilmemiş, tekil üretim işleri olarak korunmuştur.
- **Tarih Aralıkları (Gerçek ve Doğrulanmış):**
  - `Başlangıç Tarih`: **06.11.2026 10:30:00** ile **18.12.2026 19:05:00** arasında (215/215 dolu, 0 NULL).
  - `Bitiş Tarih`: **06.11.2026 10:58:00** ile **21.12.2026 11:29:00** arasında (215/215 dolu, 0 NULL).
  - `Üretim Tarihi`: **09.11.2026** ile **22.02.2027** arasında (215/215 dolu, 0 NULL).
  - `Plana Eklenen Tarih`: **14.09.2026** ile **04.11.2026** arasında.
- **Tarih Bütünlüğü:** Tarihler üzerinde hiçbir yapay kaydırma, filtreleme veya bugüne çekme işlemi yapılmamıştır.
- **SHA256 Doğrulama Checksum'ı:** `918d16ad3cad02a9d21d315f60377e112fce0adae1b47b87e863ca38132132e5`

### 2.3. Sıra ve Çizelgeleme Mantığı
Tabloda `IDENTITY`, `SEQUENCE` veya `PRIMARY KEY` alanı bulunmamaktadır. Ancak `Başlangıç Tarih` ve `Bitiş Tarih` alanları incelendiğinde; her işin bitişi ile bir sonraki işin başlangıcı arasındaki kesintisiz hat akışı ve kalıp değişim süreleri görülmektedir. Bu sebeple:
- SQL sorgusunda önerilen sıra: `ORDER BY [Başlangıç Tarih] ASC, [Bitiş Tarih] ASC` olarak yapılandırılmıştır.
- Bu sıra fiziksel bir kesinlik değil, makine çizelgeleme önerisidir. Kullanıcı arayüzdeki ▲ / ▼ butonlarıyla sırayı dilediği gibi yönetebilmektedir.

### 2.4. Maskeli Örnek Kayıtlar (İlk ve Son Satırlar)

| Sıra | Stok Kodu | Ürün Açıklaması | Ebat | Seri | Miktar | Başlangıç | Bitiş | Not / Açıklama |
| :-: | :--- | :--- | :-: | :-: | :-: | :---: | :---: | :--- |
| **1** | `511121010410-5004` | TUP-NEWO FIRIN&IZGARA TEMIZLEYICI KOPUK 500 ml (65x195)-LIMON-LAKSIZ | 65x195 | S1 | 5.032 | 06.11.2026 10:30 | 06.11.2026 10:58 | rev:00 müşteriden talep gelene kadar rpt |
| **2** | `511280003` | TUP-DOMOL OVEN CLEANER 500 ml (65x195)-LAKSIZ-AL | 65x195 | S1 | 60.000 | 06.11.2026 10:58 | 06.11.2026 17:08 | - |
| **3** | `511121010410-5002` | TUP-DOMOL CAM TEMIZ. 500 ml (65x195)-LAKSIZ | 65x195 | S1 | 150.080 | 06.11.2026 17:08 | 10.11.2026 11:54 | - |
| **4** | `511280019` | TUP-PAKZONE FIRIN TEMIZLEYICI 500 ml (65x195)-LAKSIZ-LIMON | 65x195 | S1 | 25.120 | 10.11.2026 11:54 | 10.11.2026 14:25 | - |
| **5** | `511109011610-1501` | TUP-GW-MS YEDEK SPR 250 ml (65x104)-MOSS&SPRING | 65x104 | S1 | 12.000 | 10.11.2026 15:55 | 10.11.2026 17:00 | - |
| ... | ... | ... | ... | ... | ... | ... | ... | ... |
| **214** | `511700016` | TUP-JOKER GOLD INSECTICIDE BELAMIONIX 300 ml (52x195)-RED | 52x195 | S1 | 40.032 | 18.12.2026 14:43 | 18.12.2026 19:05 | - |
| **215** | `511700017` | TUP-JOKER GOLD INSECTICIDE BELAMIONIX 300 ml (52x195)-BLUE | 52x195 | S1 | 26.496 | 18.12.2026 19:05 | 21.12.2026 11:29 | - |

---

## 3. POSTGRESQL MIGRATION 005 VE VERİ TABANI MODELİ

`migrations/005_faz3a1_correct_source_alper_tenekeuretim.sql` ile yeni kaynak yapısı birinci sınıf kolonlarla desteklenmiştir:

```sql
-- 1. Snapshot üst bilgisi kolon genişletmeleri
ALTER TABLE production_plan_snapshots ALTER COLUMN source_table TYPE VARCHAR(100);
ALTER TABLE production_plan_snapshots ALTER COLUMN source_db TYPE VARCHAR(100);

-- 2. Snapshot satırlarına başlangıç/bitiş tarihleri ve seri ekleme
ALTER TABLE production_plan_snapshot_items ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ;
ALTER TABLE production_plan_snapshot_items ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ;
ALTER TABLE production_plan_snapshot_items ADD COLUMN IF NOT EXISTS series VARCHAR(50);

-- 3. Taslak satırlarına başlangıç/bitiş tarihleri ve seri ekleme
ALTER TABLE production_plan_draft_items ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ;
ALTER TABLE production_plan_draft_items ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ;
ALTER TABLE production_plan_draft_items ADD COLUMN IF NOT EXISTS series VARCHAR(50);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_plan_snapshot_items_dates
ON production_plan_snapshot_items(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_plan_draft_items_dates
ON production_plan_draft_items(start_date, end_date);
```

### Eski Snapshot ve Taslak Koruma:
- Önceki `meltem_teneke` snapshot'ları (`SNAP-20261106193116-d284fd` vb.) silinmemiş, veritabanında arşiv olarak saklanmaktadır.
- Yeni önizleme servisi, önceki snapshot ile yeni snapshot arasındaki farkları anlık olarak raporlamaktadır:
  - *Önceki Kaynak:* `dbo.meltem_teneke` (124 Satır, 2.114.077 Adet)
  - *Yeni Kaynak:* `MikroDesktop_LIDER26.dbo.alper_tenekeuretim` (215 Satır, 3.134.665 Adet)
  - *Fark:* +91 Satır, +1.020.588 Adet Tüp.
- Kullanıcı taslakta değişiklik yapmışsa (`is_dirty = true`), kullanıcının açık onayı (`forceOverwrite: true`) olmaksızın taslak ezilmez.

---

## 4. KULLANICI ARAYÜZÜ VE CANLI EKRAN KANITLARI

### 4.1. Ekran 1: Tek Tüp Makinesi Üretim Planı Tablosu (215 Satır)
![Üretim Planı Tablosu](screenshots/faz3a1-alper-tenekeuretim-tablo.png)
*Açıklama: MikroDesktop_LIDER26.dbo.alper_tenekeuretim kaynaklı 215 satırlık plan; Stok Kodu, Ürün Açıklaması, Ebat, Seri, Planlanan Adet, Başlangıç Tarihi, Bitiş Tarihi kolonları ve satır taşıma butonları.*

### 4.2. Ekran 2: Canlı SQL Planı Önizleme Modalı
![SQL Önizleme Modalı](screenshots/faz3a1-alper-tenekeuretim-modal.png)
*Açıklama: 215 satır, 205 benzersiz stok kodu, 3.134.665 adet tüp; önceki snapshot karşılaştırması (+91 satır, +1.020.588 adet); SHA256 checksum (918d16ad...); kronolojik sıra analizi ve PostgreSQL'e kaydetme akışı.*

---

## 5. GERİ YAZIM VARSAYIMININ ASKIYA ALINMASI (FAZ 5W)

Önceki aşamada kullanıcının `meltem_teneke` tablosuna geri yazım yapılacağı yönündeki varsayımı, kullanıcının güncel uyarısıyla **askıya alınmıştır**.
- Planlama verilerinin Excel VBA tarafından nereye, ne zaman ve hangi koşullarla yazıldığı Faz 5W öncesinde Excel makroları incelenerek kesinleştirilecektir.
- Bu fazda ve sonraki planlama fazlarında SQL Server ERP tablolarına **kesinlikle hiçbir yazma (`INSERT/UPDATE/DELETE/ALTER/CREATE`) yapılmayacaktır**.

---

## 6. DOĞRULAMA VE ENTEGRASYON TESTİ SONUÇLARI (48/48 PASS — %100)

`tests/test-faz3a1.js` test paketi çalıştırılmış ve 48 testin tamamı başarıyla geçmiştir:

```
========================================================================
TENEKE PLANLAMA - FAZ 3A.1 DOĞRULAMA TESTİ (KAYNAK: alper_tenekeuretim)
Tarih: 06.11.2026 | Kapsam: MikroDesktop_LIDER26.dbo.alper_tenekeuretim
========================================================================

--- TEST 1: Sunucu Sağlığı & Migration 004 ve 005 Doğrulaması ---
[PASS] API /api/health 200 dönüyor
[PASS] Sunucu healthy
[PASS] PostgreSQL veritabanı aktif
[PASS] Migration 004 (production_plan_snapshot) uygulanmış
[PASS] Migration 005 (alper_tenekeuretim kolonları) uygulanmış

--- TEST 2: Kaynak SQL Planı Önizleme (alper_tenekeuretim) ---
[PASS] Plan önizleme HTTP 200 döndü
[PASS] Başarılı yanıt döndü (success: true)
[PASS] Kaynak tablo MikroDesktop_LIDER26.dbo.alper_tenekeuretim
[PASS] Kaynak satır sayısı tam 215
[PASS] Toplam miktar tam 3.134.665 adet
[PASS] Tekil stok sayısı 205
[PASS] Tekrarlanan stok satır sayısı 10
[PASS] SHA256 checksum üretildi (64 karakter)
[PASS] Sıra analizi kronolojik çizelgeyi belirtiyor
[PASS] Tarih aralıkları eksiksiz dolu
[PASS] Önceki snapshot ile karşılaştırma mevcut
[PASS] Karşılaştırma sayısal farkları doğru raporluyor

--- TEST 3: PostgreSQL Snapshot ve Taslak Oluşturma (/api/plan-sync/snapshot) ---
[PASS] Snapshot kaydı HTTP 201 döndü
[PASS] Snapshot ID SNAP-* formatında
[PASS] Snapshot satır sayısı 215
[PASS] Snapshot toplam miktar 3.134.665
[PASS] Taslak oluşturuldu / güncellendi
[PASS] Snapshot PostgreSQL production_plan_snapshots tablosunda doğrulandı
[PASS] Snapshot satırları production_plan_snapshot_items içinde tam 215 adet
[PASS] Snapshot satırlarında start_date birinci sınıf kolon olarak dolu (215 adet)

--- TEST 4: İkinci Senkronizasyon & Mükerrer Koruma ---
[PASS] İkinci snapshot HTTP 201 döndü
[PASS] Aynı checksum için is_duplicate_of_previous = true algılandı

--- TEST 5: Düzenlenen Kullanıcı Taslağını Koruma (is_dirty) ---
[PASS] Snapshot alındı ancak kullanıcı taslağı ezilmedi (preserved: true)
[PASS] Uyarı mesajı kaydedilmemiş değişiklikleri koruduğunu belirtiyor

--- TEST 6: Kullanıcı Sıra Düzenlemesi ve Sürüm Artışı ---
[PASS] Taslak GET HTTP 200 döndü
[PASS] Taslak satır sayısı 215
[PASS] Sıra güncelleme HTTP 200 döndü
[PASS] Taslak sürümü arttı (version = version + 1)
[PASS] Taslak is_dirty = true oldu
[PASS] Yeni 1. sıra elemanı güncellendi

--- TEST 7: Rol Güvenliği (Viewer HTTP 403 Koruması) ---
[PASS] Viewer rolü snapshot isteği HTTP 403 ile reddedildi
[PASS] Hata kodu YETKISIZ_ISLEM
[PASS] Viewer rolü sıra düzenleme isteği HTTP 403 ile reddedildi

--- TEST 8: Faz 2C Atomik Kabul ve Kısmi Aktarım Denetimi ---
[PASS] Önizleme 1 geçerli ve 1 hatalı satır buldu
[PASS] Varsayılan atomik kabul kuralıyla dosya bütünüyle reddedildi (HTTP 400)
[PASS] Hata kodu ATOMIC_IMPORT_REJECTED
[PASS] Açık kısmi aktarım HTTP 200 ile onaylandı
[PASS] Yalnızca 1 geçerli satır kaydedildi
[PASS] 1 hatalı satır skipped olarak raporlandı
[PASS] Rapor atlanan hatalı satır detaylarını içeriyor

--- TEST 9: Sıfır SQL Kaynak Değişikliği Kanıtı ---
[PASS] Kaynak alper_tenekeuretim satır sayısı hala 215 (Değişmedi)
[PASS] Kaynak alper_tenekeuretim toplam miktar hala 3.134.665 (Değişmedi)
[PASS] Kaynak checksum hala aynı (Veri tahrifatı yok)

========================================================================
TEST SONUCU: 48 BAŞARILI, 0 BAŞARISIZ (%100)
========================================================================
```

---

## 7. SONUÇ VE SIRADAKİ ADIM

Kaynak tablonun `MikroDesktop_LIDER26.dbo.alper_tenekeuretim` olarak düzeltilmesiyle birlikte, fabrika tüp üretim hattının gerçek zaman çizelgesi (215 iş, 3.134.665 adet, Kasım 2026 – Aralık 2026 başlama tarihleri) başarıyla PostgreSQL kalıcı hafızasına aktarılmış ve arayüzde dinamik sıralama yönetimine açılmıştır.

**Sıradaki Adım:**  
Kullanıcının talimatı doğrultusunda:  
- **Faz 2D (Tasarım Sistemi & UX Yenileme Pilotu):** Impeccable birincil, UI UX Pro Max yardımcı kılınarak; kurumsal açık tema (Light Theme), profesyonel yoğun veri tabloları ve ergonomik panellerin tek bir tasarım sözleşmesine oturtulması.
