# FAZ 4A: BASKILI İHTİYAÇ HAVUZU VE KOMBİNASYON TAKİBİ RAPORU

**Tarih:** 07 Kasım 2026  
**Referans Commit:** `3eb864d`  
**Uygulanan Migration:** `migrations/010_faz4a_printed_demand_and_combinations.sql`  
**Test Dosyası:** `tests/test-faz4a.js` (40 / 40 BAŞARILI, 0 HATA)  
**Durum:** TAMAMLANDI — KABULE HAZIR

---

## 1. Yönetici Özeti ve Operasyonel Akış

Kullanıcının kesinleştirdiği endüstriyel iş akışı doğrultusunda sistem katmanları net çizgilerle ayrılmıştır:

```
[Dolum / Satış Talepleri]
          │
          ▼
   [İhtiyaç Havuzu] ──(Brüt Talep - Tüp Stok)──► Net Tüp İhtiyacı
          │
          ▼
[Teneke Üretim Planı (Faz 5A)] ──(Tek Hat Çizelgelemesi, Sıralama, Tarihler)
          │
          ▼
 [Kesik & Baskılı Stok Kontrolü] ──(K- ve B- Ambar Stokları Düşümü)
          │
          ▼
[BASKILI İHTİYAÇ HAVUZU (Faz 4A)] ──(Yeni Baskı Gereksinimi & Rezervasyonlar)
          │
          ▼
  [Kombinasyon Masası] ──(Kural Doğrulama & Manuel Montaj Oluşturma)
          │
          ▼
[Baskı Siparişleri (Faz 6)] ──(Matbaa Sipariş Formu & Tedarikçi İletişimi)
```

Bu akışla birlikte:
1. **İhtiyaç Havuzu** artık doğrudan montaj açılan bir ekran değildir; buradaki baskı işlemleri kullanıcıyı **Baskılı İhtiyaç Havuzu**'na yönlendirir.
2. Seçili aktif tüp planının (`DRAFT-DEFAULT`, 215 satır, 3.134.665 adet tüp) malzeme gereksinimleri hesaplanmış ve tüp stoğu **ikinci kez düşülmeden** reçetedeki Kesik (`K-`) ve Baskılı (`B-`) ambar stokları netlenmiştir.

---

## 2. Canlı Plan ve Malzeme İhtiyaç Rakamları

Aktif tüp üretim planı ([MikroDesktop_LIDER26].[dbo].[alper_tenekeuretim] kaynaklı 215 satır) üzerinden yapılan çözümleme ve ambar stok tahsisi sonuçları:

| Gösterge | Miktar | Birim | Açıklama |
| :--- | :---: | :---: | :--- |
| **Toplam Tüp Üretim Planı** | **3.134.665** | ADET | Tek makinede (Faz 5A) üretilecek net tüp miktarı |
| **Kesik Stoktan Karşılanan** | **499.160** | ADET | Ambar stoğundaki `K-` kesik levhaların tüp eşdeğeri |
| **Baskılı Stoktan Karşılanan** | **771.623** | ADET | Ambar stoğundaki `B-` baskılı levhaların tüp eşdeğeri |
| **Net Yeni Baskı İhtiyacı** | **1.863.882** | ADET | Matbaaya verilmesi gereken net tüp eşdeğeri baskı |
| **Başlangıç Kalan Açık İhtiyaç** | **1.863.882** | ADET | Henüz kombinasyon masasında ayrılmamış açık miktar |
| **Tekil Baskılı Stok Kodu** | **205** | KALEM | Havuzdaki benzersiz `B-` baskılı levha kodu sayısı |

> [!IMPORTANT]
> **Mükerrer Stok Düşümü Engellendi**: Tüp üretim planındaki satır miktarları (`quantity`) zaten tüp stoğu düşüldükten sonra kalan üretim ihtiyacı olduğundan, Baskılı İhtiyaç Havuzu tüp stoğunu ikinci kez düşmez; yalnızca `K-` kesik ve `B-` baskılı stoklarını tahsis eder.

---

## 3. Ekran ve Menü Ayrımı (Frontend Mimarisi)

Arayüzde sol menü ve gezinme hiyerarşisi tam olarak ayrılmıştır:
- **İhtiyaç Havuzu (`demands`)**: Dolum taleplerinin tüp seviyesinde izlenmesi ve brüt/net tüp dengesi. "Kombinasyona Aktar" butonu kullanıcıyı bilgilendirerek doğrudan Baskılı İhtiyaç Havuzu'na yönlendirir.
- **Teneke Üretim Planı (`production`)**: Tek tüp hattının çalışma takvimi, sıra yönetimi, hazırlık süreleri ve başlangıç/bitiş tarihleri.
- **BASKILI İHTİYAÇ HAVUZU (`print_demands`)**: 
  - Kapsam filtreleri: **Aktif Tüp Planı (215 Kalem)** ve **Plansız Brüt Talepler**.
  - Durum filtreleri: `Tümü`, `WAITING` (Bekliyor), `RESERVED` (Taslakta), `PARTIAL` (Kısmi), `COMPLETED` (Tamamlandı), `NEEDS_REVIEW` (İnceleme Gerekli).
  - Görünüm Seçenekleri: Detaylı Satır Görünümü ve **Baskılı Koda Göre Gruplu Görünüm**.
  - Detaylı Tablo: 15 operasyonel kolon, anlık açık miktar, ilişkili tüp plan satırı, termin/ihtiyaç tarihi (makine başlangıç saatine bağlı), teknik kontrol rozetleri ve detay çekmecesi.
  - Çoklu seçim ile **"Kombinasyon Masasına Aktar"** aksiyonu.
- **Kombinasyon Masası (`workbench`)**: 
  - Baskılı havuzdan aktarılan kalemlerle montaj oluşturma.
  - 18 ebat için kapasite, montaj grubu sayısı ve ürün tekrar adımı kurallarının backend doğrulaması.
  - Renk (maksimum 6 benzersiz), lak, zemin ve ham levha kurallarının denetimi.
  - **"Taslak Olarak Kaydet & Rezerve Et"** butonu: Havuzdaki açık miktarları rezerve eder (`allocated_to_draft`).
  - **"Kayıtlı Baskı Kombinasyonları"** paneli: Taslakları onaylama (`confirm`) veya iptal etme (`cancel`) aksiyonları.
- **Baskı Siparişleri**: Faz 6 çıktısı olarak rezerve tutulmuş, arayüzde sahte "tamamlandı" durumu verilmemiştir.

---

## 4. Veritabanı Mimarisi ve Eşzamanlılık Koruması (Migration 010)

PostgreSQL üzerinde 4 yeni tablo ve indeksleri devreye alınmıştır:

1. `printed_sheet_demands`:
   - Her plan satırı veya bağımsız talep için tüp eşdeğeri baskılı levha ihtiyacı.
   - Alanlar: `net_printed_demand`, `allocated_to_draft`, `covered_by_confirmed`, `remaining_open_demand`, `status`, `material_due_date`.
2. `sheet_combinations`:
   - Montaj tanımı: `combination_no` (`KMB-YYYYMM-XXXX`), `tube_size`, `raw_sheet_code`, `total_sheet_capacity`, `printed_sheets_count`, `total_tube_output`, `status` (`DRAFT`, `CONFIRMED`, `CANCELLED`).
3. `sheet_combination_items`:
   - Montajdaki her ürünün grup sayısı, tekrar adedi, toplam çıktısı, ihtiyaçtan karşılanan miktarı ve minimum baskı fazlalığı.
4. `print_demand_reservations`:
   - İhtiyaç ile montaj arasındaki çok-çok ilişkiyi yöneten rezervasyon defteri.

### Rezervasyon Mantığı ve Minimum Baskı Fazlası Ayrımı:
- **Taslak (DRAFT)**: Açık ihtiyaçtan rezerve edilir $\rightarrow$ `allocated_to_draft` artar, `remaining_open_demand` düşer.
- **Onay (CONFIRMED)**: Taslak kesinleşir $\rightarrow$ `allocated_to_draft` sıfırlanır, `covered_by_confirmed` artar, durum `COMPLETED` veya `PARTIAL` olur.
- **İptal (CANCELLED)**: Montaj iptal edilir $\rightarrow$ rezervasyon miktarları serbest kalır, havuzdaki ihtiyaç tekrar açığa döner.
- **Minimum Baskı Fazlası Ayrımı**: Montaj çıktısı ($\text{Tekrar} \times \text{Levha}$) ihtiyaçtan büyük olduğunda (örneğin 1.250 levha alt sınırından ötürü), aradaki fark `overproduction_quantity` olarak ayrı tutulur; ihtiyacı karşılanan miktar gerçek talep sınırını aşmaz.
- **Kilit Koruması (Concurrency Protection)**: `combinationService.createDraftCombination` işleminde ihtiyaç kayıtları `SELECT ... FOR UPDATE` ile kilitlenir; eşzamanlı iki işlemde aynı ihtiyacın mükerrer rezerve edilmesi engellenir.

---

## 5. Kabul Testleri Sonuçları (`tests/test-faz4a.js`)

Yazılan kapsamlı test süiti ile 10 ana senaryoda 40 kabul kontrolü çalıştırılmış ve **sıfır hata** ile tamamlanmıştır:

```
================================================================
FAZ 4A: BASKILI İHTİYAÇ HAVUZU VE KOMBİNASYON TAKİBİ TESTLERİ
================================================================

--- TEST 10: Canlı Aktif Plan Verisiyle Baskılı Havuz Bütünlüğü ---
  [PASS] Plandan baskılı havuz senkronizasyonu başarılı olmalı
  [PASS] 215 adet tüp planı satırı eşit sayıda baskılı ihtiyaca dönüşmeli (Bulunan: 215)
  [PASS] Havuz başarıyla okunmalı
  [PASS] Toplam tüp üretimi tam 3.134.665 olmalı (Bulunan: 3134665)
  [PASS] Kesikten karşılanan 499.160 olmalı (Bulunan: 499160)
  [PASS] Baskılı stoktan karşılanan 771.623 olmalı (Bulunan: 771623)
  [PASS] Net yeni baskı ihtiyacı tam 1.863.882 olmalı (Bulunan: 1863882)
  [PASS] Başlangıçta kalan açık ihtiyaç tam 1.863.882 olmalı (Bulunan: 1863882)

--- TEST 1: 10.000 İhtiyaç -> 6.000 Karşılandı -> 4.000 Açık ---
  [PASS] Kombinasyon 1 taslağı oluşturulmalı
  [PASS] Kombinasyon 1 tam 6.000 ihtiyaç karşılamalı (Bulunan: 6000)
  [PASS] Taslağa ayrılan miktar 6.000 olmalı
  [PASS] Kalan açık miktar 4.000 olmalı (Bulunan: 4000.00)
  [PASS] Durum PARTIAL olmalı (Bulunan: PARTIAL)

--- TEST 2: Bir İhtiyacın İki Kombinasyonla Tamamlanması ---
  [PASS] Kombinasyon 2 taslağı oluşturulmalı
  [PASS] Toplam taslağa ayrılan tam 10.000 olmalı (Bulunan: 10000.00)
  [PASS] Kalan açık miktar 0 olmalı (Bulunan: 0.00)
  [PASS] Tamamen taslağa ayrılınca RESERVED olmalı (Bulunan: RESERVED)
  [PASS] Onay sonrası taslağa ayrılan 0 olmalı
  [PASS] Onay sonrası karşılanan tam 10.000 olmalı
  [PASS] Onaylanıp tamamlanınca COMPLETED olmalı (Bulunan: COMPLETED)

--- TEST 3: Bir Kombinasyonun Birden Fazla İhtiyacı Karşılaması ---
  [PASS] Çoklu ürün kombinasyonu oluşturulmalı
  [PASS] Toplam 24.000 ihtiyaç karşılanmalı (Bulunan: 24000)
  [PASS] Talep C kalan açık 3.000 olmalı
  [PASS] Talep D kalan açık 3.000 olmalı

--- TEST 4: Minimum Baskı Fazlasının Ayrı Kalması ---
  [PASS] İhtiyaçtan karşılanan tam 10.000 olmalı (Bulunan: 10000)
  [PASS] Minimum baskı fazlası tam 5.000 olmalı (Bulunan: 5000)
  [PASS] Toplam montaj çıktısı 15.000 olmalı (Bulunan: 15000)

--- TEST 5: İptalde Miktarın Geri Açılması ---
  [PASS] İptal öncesi açık miktar 0 olmalı
  [PASS] İptal sonrası açık miktar 10.000'e geri dönmeli (Bulunan: 10000.00)
  [PASS] İptal sonrası taslağa ayrılan 0 olmalı
  [PASS] İptal sonrası durum WAITING olmalı (Bulunan: WAITING)

--- TEST 6: Eşzamanlı İki Rezervasyonun Açığı Aşmaması (Korumalı Kilit) ---
  [PASS] Doğru hata mesajı üretildi: Talep ... zaten tamamen karşılanmıştır (Kalan Açık: 0).
  [PASS] Açığı kalmayan talebin ikinci kez taslağa ayrılması engellendi

--- TEST 7: Yeniden Hesaplamanın Mükerrer İhtiyaç Üretmemesi ---
  [PASS] Yeniden senkron kayıt sayısını değiştirmemeli (Önce: 215, Sonra: 215)

--- TEST 8: Onaylı Kombinasyonun Plan Değişikliğinde Korunup Uyarılması ---
  [PASS] İhtiyaç onaylı miktarın altına düşünce NEEDS_REVIEW olmalı
  [PASS] İnceleme nedeni açıkça belirtilmeli
  [PASS] Onaylı kombinasyon miktarı silinmeden korunmalı

--- TEST 9: Restart Sonrası Kayıt ve İlişkilerin Korunması ---
  [PASS] Kombinasyon listesi başarıyla çekilmeli
  [PASS] Kayıtlı kombinasyonlar mevcut olmalı
  [PASS] Kalıcı rezervasyon kayıtları bulunmalı

================================================================
TEST SONUCU: 40 BAŞARILI, 0 BAŞARISIZ
================================================================
```

Ayrıca regresyon süitleri çalıştırılmış:
- **Faz 5A Testleri (`tests/test-faz5a.js`)**: 21 / 21 BAŞARILI
- **Faz 3B Testleri (`tests/test-faz3b.js`)**: 65 / 65 BAŞARILI

---

## 6. Yol Haritası ve Faz Ayrımı Güncellemesi

Kullanıcı gereksinimleri ve mimari ayrım doğrultusunda Faz 4 ve Faz 6 yol haritası netleştirilmiştir:

- **Faz 4A (Tamamlanan)**: Baskılı İhtiyaç Havuzu, ambar stok tahsisi, kalıcı rezervasyon modeli, kural denetimi, manuel kombinasyon taslağı, onay/iptal akışı.
- **Faz 4B (Sıradaki Faz)**: Otomatik Kombinasyon Optimizasyonu (Aynı ebat, ham levha, zemin ve renk uyumlu açık ihtiyaçları minimum levha fire ve minimum artık baskı ile gruplayan sezgisel/matematiksel algoritma).
- **Faz 5B**: Çizelgelenmiş tüp planı başlangıç saatlerine göre malzeme temin terminleri ve gecikme uyarıları.
- **Faz 6**: Matbaa Sipariş Formu çıktısı (onaylı kombinasyonların PDF/baskı sipariş formatına dönüştürülmesi).
- **Faz 5W**: ERP geri yazım hedefi (fiziksel hedef tam doğrulanana kadar kaynak SQL Server'a kesinlikle yazma yapılmaz).
