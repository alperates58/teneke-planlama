# FAZ 3B: KADEMELİ İHTİYAÇ MOTORU VE VERİ SÖZLEŞMESİ KANIT RAPORU

**Tarih:** 07 Kasım 2026  
**Başlangıç Git Referansı:** `560a8c2`  
**Uygulanan Faz:** Faz 3B — Doğru Kaynak Sözleşmesi ve Kademeli İhtiyaç Motoru  
**Sonraki Faz Hedefi:** Faz 5A — Tek Tüp Makinesinde Üretim Planı ve Takvim  

---

## 1. YÖNETİCİ ÖZETİ VE HEDEFLERİN GERÇEKLEŞMESİ

Faz 3B kapsamında, fabrikanın gerçek dolum taleplerinden başlayarak ürün ve termin bazında sıralı, tekil ve kademeli stok tahsisi gerçekleştiren **Çok Seviyeli İhtiyaç ve Tahsis Motoru** başarıyla devreye alınmıştır.

Motorun temel çalışma ilkesi:
$$\text{Brüt Dolum Talebi} \xrightarrow{-\text{Tüp Stoğu}} \text{Net Tüp İhtiyacı} \xrightarrow{-\text{Kesik Stoğu}} \text{Net Kesim İhtiyacı} \xrightarrow{-\text{Baskılı Stoğu}} \text{Net Yeni Baskı İhtiyacı}$$

### Temel Çıktılar ve Rakamlar (Canlı Koşu #3)
| Metrik Seviyesi | Kaynak Anlamı | Miktar | Birim |
| :--- | :--- | :--- | :--- |
| **Toplam Dolum Talebi** | Açık brüt dolum iş emirleri | **443** | Talep Satırı |
| **1. Brüt Tüp Dolum Talebi** | Dolumu yapılacak toplam mamul karşılığı tüp | **4.970.843,00** | Adet |
| **Tahsis Edilen Tüp Stok** | Eldeki net ambar stoğundan tüpe ayrılan | **1.216.896,02** | Adet |
| **2. Net Tüp Üretim İhtiyacı** | Tüp üretim hatlarına (`HAT-01/02`) planlanacak | **3.753.947,00** | Adet |
| **Tahsis Edilen Kesik Stok** | Makas ambarındaki kesik levhalardan ayrılan | **621.362,00** | Adet |
| **3. Net Kesim İhtiyacı** | Makas hattına (`MAKAS-01`) kesim emri açılacak | **3.132.585,00** | Adet |
| **Tahsis Edilen Baskılı Stok** | Matbaa ambarındaki baskılı levhalardan ayrılan | **712.960,00** | Adet |
| **4. Net Yeni Baskı İhtiyacı** | **Baskı montajına (Kombinasyon Masasına) aktarılacak** | **2.419.625,00** | Adet |
| **Ham Levha Stoğu Etkisi** | Yeni baskıyı azaltmaz; satın alma gereksinimini etkiler | *Kombinasyon motoru (Faz 4)* | Levha |

---

## 2. KAYNAK VERİ SÖZLEŞMESİ DÜZELTMELERİ

Kullanıcı talimatındaki A, B, C, D ve E maddeleri SQL view katmanında ve PostgreSQL staging şemasında eksiksiz olarak düzeltilmiştir:

### A) Hesaplanmamış Net Değer ve Durum Koruması
- **Önceki Hata:** `getLiveDemands` içinde `brut_tup_ihtiyac` doğrudan `net_quantity` olarak dönüyor ve dashboard henüz motor hesaplamadan brüt miktarı "Net Üretim İhtiyacı" olarak gösteriyordu.
- **Düzeltme:** Motor hesaplama yapana kadar net ihtiyaç alanları `NULL` olarak tutulur. `calculation_status` kolonu (`PENDING`, `CALCULATED`, `UNRESOLVED`, `ERROR`) ile durum şeffafça ifade edilir. Dashboard'da hesaplama tamamlanana kadar "Hesaplanıyor/Bekliyor" durumu gösterilir; brüt miktar asla net ihtiyaç olarak sunulmaz.

### B) Talep Kimliği ve Reçete Tekilliği Garantisi
- **Talep Kimliği (`demand_key`):** `CONCAT(t.ISNO, '_', u.upl_Guid)` olarak kilitlendi. Aynı iş emrinin (`ISNO`) farklı dolum tarihlerindeki, farklı makinelerdeki veya farklı UPL tüketim satırlarının birbirini ezmesi kesin olarak engellendi. Kararsız `ROW_NUMBER` kullanımından kaçınıldı.
- **Reçete Kimliği (`recete_guid`):** PostgreSQL `erp_recipe_links` tablosunda `recete_guid` UNIQUE yapılarak alternatif reçeteler, revizyonlar veya alt bileşenlerin birbirini ezmesi engellendi.

### C) Senkronizasyon ve Kapsam Dışı Kalan Kayıtlar
- Tam ve başarılı bir ERP senkronizasyonunun sonunda, aktif SQL Server kapsamından çıkan veya ERP tarafında iptal edilen talepler PostgreSQL staging tablosunda silinmez; `status = 'cancelled'`, `is_active = FALSE` ve `cancelled_at = NOW()` olarak pasife alınır.
- Kademeli tahsis motoru yalnızca tek, tutarlı ve en son başarılı veri kümesi (`is_active = TRUE AND status != 'cancelled'`) üzerinde çalışır.

### D) Brüt Talep View Sözleşmesi (`02_AA_tp_vw_TupBrutIhtiyac.sql`)
- **Tüketim Filtresi:** `u.upl_uretim_tuket = 0` (yalnızca tüketim/hammadde satırları) ve `u.upl_iptal = 0` şartı eklendi.
- **Kalan Açık Miktar Mantığı:** `dolum_kalan_miktar = CASE WHEN m.ish_planuretim > ISNULL(m.ish_uret_miktar, 0) THEN (m.ish_planuretim - ISNULL(m.ish_uret_miktar, 0)) ELSE 0 END` ile gerçekleşen dolum miktarları düşülmüştür. Sıfır gerçekleşmede planlanan miktar korunur.
- **Tarih ve Saat Bütünlüğü:** SQL Server'daki `upl_kayittarihi` saati `CONVERT(datetime, ...)` ile korunmuş, `DATE`'e indirilerek saat bilgisinin kaybedilmesi engellenmiştir.
- **Reçete Veri Hatası:** Sıfır veya eksik katsayılı ürünler satırdan silinmez; `has_recipe_error = 1` ve `error_message` ile açık veri uyarısı olarak sunulur.

### E) Stok Sözleşmesi (`04_AA_tp_vw_StokDepo.sql`)
- View modu açıkça `depo_kapsam_modu = 'ONCEDEN_NETLENMIS_KULLANILABILIR_STOK'` olarak tanımlandı.
- `AA_alper_vw_HaricDepolarToplam` (10, 11, 13, 23, 28, 29, 100) hariç ambarları view içinde önceden netlendiği için uygulama katmanında mükerrer ambar düşümü engellendi.
- **Negatif Stok Değeri Koruması:** `ham_net_stok` negatif ERP bakiyelerini birebir korur (örneğin float hassasiyetinden kaynaklı `-0.0000000000513` veya açık sayım bakiyesi). Tahsis motorunda `usable_stock = Math.max(0, ham_net_stok)` alınır, ancak `has_negative_warning = TRUE` bayrağı ile kaynak veri kalitesi şeffafça kullanıcıya raporlanır.

---

## 3. BRÜT TOPLAM MUTABAKATI VE AÇIKLAMASI

| Kaynak Durumu | Toplam Talep Satırı | Brüt Tüp Dolum Miktarı (Adet) |
| :--- | :--- | :--- |
| **Faz 3A.2 Önceki Snapshot** | 443 | 4.998.757 |
| **Faz 3B Güncel Kaynak Sözleşmesi** | 443 | 4.970.843 |
| **Fark** | **0** | **-27.914** |

### Brüt Farkın Kök Neden Analizi:
1. Kaynak tabloda toplam satır sayısı 443 olarak birebir korunmuştur.
2. 27.914 adetlik fark, `alper_terminler` dolum planındaki bazı iş emirlerinin üretim sahasında fiilen dolumunun yapıldığı (`ISEMRI_MALZEME_DURUMLARI.ish_uret_miktar > 0`) ve 1 iş emrinin tamamlandığı tespit edilmiştir.
3. Faz 3B sözleşmesi gereğince açık dolum ihtiyacı baz alındığından, halihazırda dolumu yapılmış tüpler brüt ihtiyaçtan doğru şekilde düşmüş ve gerçek açık ihtiyaç **4.970.843** adet olarak doğrulanmıştır.

---

## 4. KADEMELİ NETLEME VE STOK TAHSİS MOTORU MANTIĞI

Hesaplama backend'de `server/services/demandAllocationService.js` servisi üzerinden deterministik ve tekrarlanabilir bir `calculation_run` kaydı oluşturarak yürütülür:

### 1. Sıralama Kuralı (Deterministik FIFO)
Stoklar tükenen sınırlı bir kaynak olduğu için arama, filtre veya UI seçimlerinin tahsis dağılımını bozması engellenmiştir:
1. `ihtiyac_tarihi ASC` (En erken dolum terminine öncelik)
2. `dolum_sira ASC` (Makine içi dolum plan sırası)
3. `is_no ASC` (İş emri numarası)
4. `demand_key ASC` (Kararlı tekil anahtar)

### 2. Dört Seviyeli Şelale (Waterfall Allocation)
- **Seviye 1: Teneke Tüp:**
  - $\text{Tahsis Edilen Tüp} = \min(\text{Brüt Talep}, \text{Kullanılabilir Tüp Stok})$
  - $\text{Net Tüp İhtiyacı} = \text{Brüt Talep} - \text{Tahsis Edilen Tüp}$
  - Eldeki stok havuzu tahsis edilen miktar kadar azaltılır.
- **Seviye 2: Kesik Levha:**
  - Reçete zincirinde tüpün geçerli `KESIKLEVHA` bileşeni aranır.
  - $\text{Brüt Kesik İhtiyacı} = \text{Net Tüp İhtiyacı} \times \text{Katsayı (örn. 1.0)}$
  - $\text{Tahsis Edilen Kesik} = \min(\text{Brüt Kesik İhtiyacı}, \text{Kullanılabilir Kesik Stok})$
  - $\text{Net Kesim İhtiyacı} = \text{Brüt Kesik İhtiyacı} - \text{Tahsis Edilen Kesik}$
- **Seviye 3: Baskılı Levha:**
  - Kesik levhanın geçerli reçetesinde `BASKILILEVHA` bileşeni aranır.
  - $\text{Brüt Baskılı İhtiyacı} = \text{Net Kesim İhtiyacı} \times \text{Katsayı (örn. 1.0)}$
  - $\text{Tahsis Edilen Baskılı} = \min(\text{Brüt Baskılı İhtiyacı}, \text{Kullanılabilir Baskılı Stok})$
  - $\text{Net Yeni Baskı İhtiyacı} = \text{Brüt Baskılı İhtiyacı} - \text{Tahsis Edilen Baskılı}$
- **Seviye 4: Ham Levha İlişkisi:**
  - Baskılı levhanın reçetesinden veya teknik kartından ham levha kodu ve kapasite (örn. 20 tüp/levha) çekilir.
  - Tahmini ham levha adedi: $\lceil \text{Net Yeni Baskı İhtiyacı} / \text{Kapasite} \rceil$.
  - **Kesin Kural:** Ham levha stoğu yeni baskı işini azaltmaz; ayrı ham levha satın alma ihtiyacına etki eder.

### 3. Ortak Bileşen Tekil Tahsisi ve İzolasyon
- Bir stok kodunun kullanılabilir havuzu havuz genelinde yalnızca bir kez tahsis edilir.
- Farklı ürünlerin fazla stokları diğer ürünlerin ihtiyacını asla kapatmaz.
- Fazla stok asla negatif net ihtiyaç üretmez (Net en az 0'dır).

---

## 5. MEVCUT ÜRETİM PLANIYLA (`alper_tenekeuretim`) İLİŞKİ VE TERMİN AÇIĞI

- Esas kaynak `[MikroDesktop_LIDER26].[dbo].[alper_tenekeuretim]` tablosundaki 215 satırlık plan snapshot'ı ve kullanıcının taslak sıralaması kayıpsız korunmuştur.
- **Planlı Arz $\neq$ Fiziksel Stok:** Planlı üretim eldeki ambar stoğu sayılmaz; makinede tamamlanacağı tarihte arz haline gelecektir.
- **İki Ayrı Sonuç Sunumu:**
  1. Mevcut fiziksel stoktan sonra toplam tüp üretim gereksinimi: **3.753.947 adet**.
  2. Mevcut plandaki arz (`planned_cover_quantity`) düşüldükten sonraki ilave planlama gereksinimi: **`additional_planning_needed`**.
- **Termin Açığı Denetimi:** Dolum iş emrinin termin tarihi (`due_date`), plandaki en erken bitiş tarihinden (`plan_earliest_finish`) önce ise sistem satırı `is_schedule_delayed = TRUE` ve `delay_days` ile termin açığı olarak işaretler.

---

## 6. CANLI 10 GERÇEK ERP ÜRÜNÜ MUTABAKAT TABLOSU

PostgreSQL üzerinde çalışan Run #3 sonuçlarından ilk 10 talep satırının birebir dökümü:

| # | Sipariş No | Tüp Stok Kodu | Brüt Talep | Tüp Stok Tahsis | Net Tüp | Kesik Stok Kodu | Net Kesim | Baskılı Stok Kodu | Net Yeni Baskı | Onaylı Ham Levha | Durum |
| :---: | :--- | :--- | :---: | :---: | :---: | :--- | :---: | :--- | :---: | :--- | :---: |
| 1 | IP-205277 | 512032011410-5476 | 8.700 | 8.700 | **0** | Reçetede Yok | **0** | Reçetede Yok | **0** | Tanımsız | CALCULATED |
| 2 | IP-206190 | 512032011410-5475 | 12.000 | 226 | **11.774** | 512032011411-5475 | **11.774** | 512032001411-5475 | **11.774** | 500011000004-1205 | CALCULATED |
| 3 | IP-206190 | 512032011410-5476 | 3.446 | 3.081 | **365** | 512032011411-5476 | **365** | 512032001411-5476 | **365** | 500011000004-1205 | CALCULATED |
| 4 | IP-206190 | 512032011410-5476 | 12.000 | 0 | **12.000** | 512032011411-5476 | **12.000** | 512032001411-5476 | **12.000** | 500011000004-1205 | CALCULATED |
| 5 | IP-206190 | 512032011410-5477 | 12.000 | 1.834 | **10.166** | 512032011411-5477 | **10.166** | 512032001411-5477 | **10.166** | 500011000004-1205 | CALCULATED |
| 6 | IP-206190 | 512032011410-5477 | 12.000 | 0 | **12.000** | 512032011411-5477 | **12.000** | 512032001411-5477 | **12.000** | 500011000004-1205 | CALCULATED |
| 7 | IP-206191 | 512031011610-8214 | 9.214 | 9.214 | **0** | Reçetede Yok | **0** | Reçetede Yok | **0** | Tanımsız | CALCULATED |
| 8 | IP-206206 | 511290003 | 36.480 | 34.918 | **1.562** | 511290004 | **1.562** | 511290005 | **0** | 500011000004-1415 | CALCULATED |
| 9 | IP-206232 | 512011011610-8213 | 24.000 | 24.000 | **0** | Reçetede Yok | **0** | Reçetede Yok | **0** | Tanımsız | CALCULATED |
| 10 | IP-206232 | 512011011610-8214 | 16.200 | 16.200 | **0** | Reçetede Yok | **0** | Reçetede Yok | **0** | Tanımsız | CALCULATED |

### Tablo Analizi ve Önemli Bulgular:
- **Satır 1, 7, 9, 10:** Eldeki tüp stoku dolum talebini tamamen karşılamakta, Net Tüp İhtiyacı 0 olmaktadır. Alt seviyeye sıfır ihtiyaç aktarılmıştır.
- **Satır 3 ve 4:** Aynı `512032011410-5476` tüp kodu farklı iş emri/satırlarında yer almaktadır. Satır 3 eldeki kalan 3.081 stoğu tüketmiş, Satır 4'e stok kalmadığı için 12.000 adedin tamamı net tüp, net kesim ve net yeni baskı olarak hesaplanmıştır (Tekil tahsis ispatı).
- **Satır 8 (`511290003`):** 36.480 brüt talepten 34.918 tüp stoku düşülmüş, 1.562 net kesim ihtiyacı doğmuştur. Baskılı levha ambarında (`511290005`) yeterli stok bulunduğu için 1.562 adet baskılı stoktan karşılanmış ve **Net Yeni Baskı İhtiyacı tam 0'a inmiştir!** Bu ürün için yeni matbaa baskısına gerek kalmamıştır.

---

## 7. OTOMATİK TEST SÜİTİ SONUÇLARI (`tests/test-faz3b.js`)

Test süiti 10 ana senaryoda 38 adet doğrulamayı başarıyla tamamlamıştır:

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

--- TEST 3: Stok İzolasyonu (Farklı Ürünlerin Stokları Birbirini Azaltamaz) ---
  [PASS] Ürün X'in net ihtiyacı 0 olmalı
  [PASS] Ürün X'in 15.000 fazla stoğu kalmalı
  [PASS] Ürün Y'nin tahsis edilen stoğu 0 olmalı
  [PASS] Ürün Y'nin net ihtiyacı Ürün X'in fazla stoğundan etkilenmeden 10.000 kalmalı

--- TEST 4: Sınır Değerler: Sıfır Stok, Fazla Stok, Negatif Kaynak Stok ---
  [PASS] Sıfır stokta net ihtiyaç brüt miktara eşit olmalı (5.000)
  [PASS] Fazla stok negatif ihtiyaç üretmez (Net: 0)
  [PASS] Negatif kaynak stok tahsis edilebilir miktar olarak 0 alınmalı
  [PASS] Negatif stok bayrağı true olmalı
  [PASS] Negatif stok net ihtiyacı azaltamaz, net talep tam 5.000 kalmalı

--- TEST 5: Ortak Alt Bileşen (Kesik/Baskılı) Tekil Tahsis Mantığı ---
  [PASS] Talep 1 ortak kesikten 10.000 adet almalı
  [PASS] Talep 1 net kesim ihtiyacı 0 olmalı
  [PASS] Talep 2 ortak kesikten kalan 5.000 adedi almalı
  [PASS] Talep 2 net kesim ihtiyacı 5.000 olmalı
  [PASS] Ortak kesik havuzu 0'a inmeli, mükerrer tahsis engellenmeli

--- TEST 6: Eksik/Sıfır Katsayı ve Reçete Hatalarında Satır Korunumu ---
  [PASS] Eksik katsayıda hesap durumu UNRESOLVED olmalı
  [PASS] Çözümlenememe gerekçesi açıkça belirtilmeli
  [PASS] Eksik reçetede sahte sıfır yerine NULL korunmalı

--- TEST 7: demand_key ile Çoklu Plan Satırı Korunumu ---
  [PASS] Aynı iş no'nun farklı dolum satırları farklı demand_key üretmeli
  [PASS] demand_key upl_Guid bileşenini içermeli

--- TEST 8: Geç Gelen Üretim Planı ve Termin Açığı Mantığı ---
  [PASS] Dolum termininden sonra biten plan gecikmeli olarak işaretlenmeli
  [PASS] Gecikme süresi 10 gün olarak hesaplanmalı (Hesaplanan: 10)

--- TEST 9: String/Number Güvenliği ve Geçersiz Giriş Ayrımı ---
  [PASS] Geçerli string sayıya doğru çevrilmeli
  [PASS] Geçersiz string sessizce 0'a değil NaN'a dönmeli
  [PASS] Null değer null korunmalı

--- TEST 10: Canlı Veritabanı ve Hesaplama Koşusu Mutabakatı (10 Gerçek Ürün) ---
  [PASS] PostgreSQL calculation_runs tablosunda en az bir başarılı koşu bulunmalı
  [PASS] En az 10 satır tahsis edilmiş talep dönmeli (Dönen: 443)

================================================================
TEST SONUCU: 38 BAŞARILI, 0 BAŞARISIZ
================================================================
```

---

## 8. EKRAN VE ARAYÜZ (WORKBENCH) DOĞRULAMASI

1. **Overview 5 Seviyeli Kademeli KPI Çubuğu:**
   - Brüt Talep, Tekil Tüp Stoğu, Net Tüp Üretimi, Net Kesim İhtiyacı ve Net Yeni Baskı İhtiyacı yan yana 5 seviyeli olarak gösterilmiştir.
   - "Tahsisi Yeniden Çalıştır" butonu eklenmiştir.
2. **İhtiyaç Havuzu Tablosu (`renderDemands`):**
   - Brüt Talep, Tüp Stok/Tahsis, Net Tüp, Net Kesim, Yeni Baskı ve Hesap Durumu kolonları eklenmiştir.
   - Hesap Durumu filtresi (`Tümü`, `Hesaplandı`, `Çözümlenemedi`, `Veri Hatası`) entegre edilmiştir.
3. **Slide-Over Detay Çekmecesi (`renderDemandDetailDrawer`):**
   - 4 Aşamalı Reçete ve Stok Şelalesi kartı eklenmiştir.
   - Mevcut Tüp Üretim Planı (`alper_tenekeuretim`), planlanan miktar, ilave ihtiyaç ve termin gecikme uyarıları netleştirilmiştir.
4. **Kombinasyona Aktarım Koruması (`transferSelectedDemandsToWorkbench`):**
   - Yalnızca `calculation_status === 'CALCULATED'` ve `net_print_quantity > 0` olan talepler kombinasyona aktarılabilir.
   - Yeni baskı ihtiyacı 0 olan talepler uyarılır ("Stok yeterlidir, yeni baskıya gerek yoktur").
   - Renk veya zemin teknik tanımı eksik olan ürünlerin baskı montajına aktarımı açıkça engellenir ve Tanımlar Merkezi'ne yönlendirilir (Tasarım pilotu kuralları korunmuştur).

---

## 9. SONUÇ VE SONRAKİ FAZ

Faz 3B hedefi olan **Kademeli İhtiyaç Motoru ve Doğru Kaynak Sözleşmesi** eksiksiz olarak tamamlanmıştır.
ERP tablolarına hiçbir yazma (`INSERT/UPDATE/DELETE`) yapılmamış, `alper_tenekeuretim` tüp üretim planı ve snapshot geçmişi kayıpsız korunmuştur.

**Sıradaki İş:**
- **Faz 5A: Tek Makine Takvimi ve Üretim Çizelgelemesi** (Net tüp ihtiyacı `3.753.947` adet üzerinden tüp gövde üretim hattı çizelgelemesi).
