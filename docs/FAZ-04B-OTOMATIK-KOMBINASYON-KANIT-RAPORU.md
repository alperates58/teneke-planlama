# FAZ 4B: OTOMATİK KOMBİNASYON ÖNERİ MOTORU KANIT RAPORU

**Tarih:** 07 Kasım 2026  
**Referans:** Faz 4A (`93a40c6`)  
**Uygulanan Migration:** `migrations/011_faz4b_combination_proposals.sql`  
**Test Dosyası:** `tests/test-faz4b.js` (44 / 44 BAŞARILI, 0 HATA)  
**Toplam Regresyon Doğrulaması:** 170 / 170 BAŞARILI  
**Durum:** TAMAMLANDI — KABULE HAZIR

---

## 1. Yönetici Özeti ve Mimari Akış

Kullanıcının Faz 4B talimatı doğrultusunda, **Baskılı İhtiyaç Havuzu**'ndaki açık miktarlardan (`remaining_open_quantity > 0`) 18 ebat kurallarına ve fabrika kısıtlarına uygun **Otomatik Kombinasyon Öneri Motoru** (`combinationProposalService.js`) geliştirilmiş ve Faz 4A kilitli rezervasyon ve onay mekanizmasına bağlanmıştır.

```
[Baskılı İhtiyaç Havuzu (Faz 4A)] ──(Açık Miktarlar & Kapsam Seçimi)
              │
              ▼
[Otomatik Öneri Motoru (Faz 4B)] ──(Tamsayı Grup Bölüntüleri: r_i = g_i × Adım)
   ├─ Dinamik DB Kuralları (Ebat Kapasitesi, 6 Renk, Min 1.250 Levha, Lak/Zemin)
   ├─ "Öneriye Alınamayanlar" (Eksik teknik kart veya kısıt engellerinin dürüst raporu)
   ├─ Kalıcı Öneri Koşusu (combination_proposal_runs & combination_proposals)
   └─ Çoklu Senaryo & Puanlama (Termin Adherence, Min Fazla Üretim, Şablon Bonusu)
              │
              ▼ (Kullanıcı Seçimi: "Taslağa Al & Rezerve Et")
[Faz 4A Kilitli Rezervasyon] ──(SELECT ... FOR UPDATE, Idempotency, 409 Çakışma Koruması)
              │
              ▼
[Kombinasyon Masası / Onay] ──(sheet_combinations DRAFT -> CONFIRMED)
              │
              ▼
[Baskı Siparişleri (Faz 6)] ──(Matbaa Sipariş Formuna Hazır Veri - Henüz Gönderilmedi)
```

---

## 2. Faz 4A Devir Kontrolleri ve Dinamik DB Kuralları

1. **Dinamik Parametre Bağlantısı ([`combinationService.js`](file:///c:/Users/alper.ates.LIDER/Desktop/teneke-planlama/server/services/combinationService.js)):**
   - Eski statik `CAPACITY_RULES` kodu yerine `getRuleContext()` servisi oluşturuldu.
   - Kapasite ve tekrar adımları doğrudan `tube_capacities` tablosundan, renk sınırları `business_rules` tablosundan (varsayılan 6 renk), lak kuralları `product_combination_rules` tablosundan (`FORBID_MIXED_LACQUER`, `ONLY_WITH_UNLACQUERED`, `ONLY_WITH_LACQUERED`), matbaa yerleşim kuralları `printing_press_rules` tablosundan ve kalıp şablonları `sheet_layouts` tablosundan dinamik olarak okunmaktadır.
   - UI ve backend aynı dinamik veri sürümünü (`versionTimestamp`) kullanır.
2. **Defter ve Stok Ayrımı:**
   - Fiziksel kesik/baskılı stok tahsisi (`erp_stock_levels`) ile kombinasyon rezervasyonu (`print_demand_reservations`) kesin olarak iki ayrı defterdir. Aynı malzeme iki aktif işe mükerrer bağlanamaz.
3. **Mevcut Planın ve Rezervasyonların Korunumu:**
   - Havuz yeniden hesaplandığında taslak rezervasyonlar (`allocated_to_draft`) ve onaylı karşılamalar (`covered_by_confirmed`) silinmez; ihtiyaç miktarı onaylı kombinasyonun altına düşerse silmek yerine `NEEDS_REVIEW` uyarısıyla koruma altına alınır.

---

## 3. Öneri Motoru Algoritması ve Kısıtlar

Motor, tamsayı bölüntü optimizasyonu (integer partition) ve sezgisel skorlama kullanarak aday montajlar üretir:

1. **Tamsayı Tekrar Adımı Kuralı:**
   - Her ebat için levha kapasitesi $C$, tekrar adımı $s$ ve montaj grubu sayısı $G = C / s$.
   - Her ürünün montajdaki tekrar sayısı $r_i = g_i \times s$ ($g_i \in \mathbb{Z}^+, \sum g_i = G$).
   - Örneğin 52x195 için ($C=20, s=4, G=5$):
     * $4 + 8 + 8 = 20$ (Grup: $1 + 2 + 2 = 5$) $\rightarrow$ **GEÇERLİ**.
     * $5 + 7 + 8 = 20$ $\rightarrow$ **GEÇERSİZ** (5 ve 7, 4'ün tam katı değildir, motor anında reddeder).
2. **Renk Sınırı:**
   - Montajdaki ürünlerin benzersiz renk kodlarının birleşimi dinamik kural üst sınırını (en fazla 6) aşamaz. 7 renk içeren montajlar elenir.
3. **Zemin ve Lak Uyumu:**
   - Farklı zeminler (EMAYE ile METALİK) aynı montajda birleştirilmez.
   - `FORBID_MIXED_LACQUER` kuralı devredeyken LAKLI ve LAKSIZ ürünler aynı montajda birleşemez.
4. **Minimum Baskı (1.250 Levha) ve Fazla Üretim İzolasyonu:**
   - Her ürünün montaj çıktısı $O_i = r_i \times S$ ($S \ge 1.250$).
   - Karşılanan İhtiyaç $A_i = \min(D_i, O_i)$.
   - Fazla Üretim $P_i = \max(0, O_i - A_i)$.
   - Fazla üretim miktarı talep karşılamasına veya fiziksel ambar stoklarına gizlice eklenmez; `overproduction_quantity` olarak şeffafça izole edilir.
5. **Çoklu Kaynak İhtiyaç Eşleme (FIFO Dağıtım):**
   - Aynı baskılı ürünün havuzda birden fazla plan veya dolum satırı varsa, motor toplam açık ihtiyacı montajda değerlendirir; ancak rezervasyon anında en erken terminli satırdan başlayarak FIFO sırasıyla her kaynak satırına miktar bağını korur.

---

## 4. Gerçek Havuz Analizi ve "Öneriye Alınamayanlar" (Exclusion) Raporu

AGENTS.md kuralı gereğince (*"Eksik teknik tanımı uygun sayma. Hesabı engelleyen eksikliği açıkça göster."*), motor eksik verili kayıtları sessizce silmez veya varsayımla doldurmaz:

### Canlı Havuz Tarama Sonuçları (215 Satırlık Aktif Tüp Planı):
- **Toplam Açık İhtiyaç Kalemi:** 130
- **Eksik Teknik Tanımlı (Dışlanan):** 130
- **Doğrudan Üretime Uygun (Katı Kural):** 0
- **Arama Sonucu Durumu:** `DATA_INSUFFICIENT`

### Dışlama Nedenleri Dağılımı:
1. `HAM_LEVHA_TANIMSIZ`: Ürünün ERP veya teknik kartında onaylı ham levha bağlantısı bulunmuyor (ERP stok kataloğu eşlemesi bekleniyor).
2. `EKSIK_TEKNIK_KART`: Renk kodları veya baskı yüzeyi (metalik/emaye) tanımlanmamış (Tanımlar Merkezi'nden teknik kart bekleniyor).
3. `INCELEME_GEREKLI`: İhtiyaç miktarı mevcut onaylı montajların altına düşmüş olan kayıtlar.

> [!NOTE]
> **Simülasyon Modu:** Kullanıcı teknik kartları henüz girilmemiş ürünlerle deneme yapmak istediğinde arayüzden **"Teknik Kart Simülasyonu (CMYK)"** seçeneğini işaretleyebilir. Bu modda 52x195 ebadı için 4 çeşit ürünün $8+4+4+4 = 20$ tam kapasite doldurduğu ve 144.528 adet açık ihtiyacı karşıladığı 3 geçerli öneri başarıyla üretilmektedir.

---

## 5. Eşzamanlılık Koruması ve Idempotency (Taslağa Al & Rezerve Et)

1. **İki Aşamalı Kilit:**
   - Öneri üretildiğinde havuz rezerve edilmez; alternatif öneriler aynı açık ihtiyaçları bağımsız senaryolar olarak kullanabilir.
   - Kullanıcı bir öneri için **"Taslağa Al & Rezerve Et"** dediğinde:
     * İlgili açık talepler `SELECT ... FOR UPDATE` ile kilitlenir.
     * Kalan açık miktar kontrol edilir (`curOpen >= requiredQty`).
     * Başka bir kullanıcı veya işlem arada miktarı düşürdüyse işlem iptal edilir ve açıklayıcı **HTTP 409 (`CONFLICT_DEMAND_CHANGED`)** çakışma hatası fırlatılır.
2. **Idempotency:**
   - Aynı öneri butona çift tıklama veya tekrar gönderme durumunda ikinci bir kombinasyon açmaz; mevcut taslak kaydını döner (`alreadyApplied: true`).
3. **İptalde Açığa İade:**
   - Taslak iptal edildiğinde (`cancelCombination`), rezerve edilen miktarlar havuzdaki açığa eksiksiz iade edilir ve talep durumu `WAITING` olarak güncellenir.

---

## 6. Kabul Testleri Sonuçları (`tests/test-faz4b.js`)

Yazılan 11 test senaryosu ve 44 kabul kontrolü %100 başarıyla tamamlanmıştır:

```
================================================================
FAZ 4B: OTOMATİK KOMBİNASYON ÖNERİ MOTORU VE TEST SÜİTİ
================================================================

--- TEST 1: 52x195 Tekrar Dağılımı (4+8+8 Geçerli, 5+7+8 Geçersiz) ---
  [PASS] 4+8+8 dağılımı (toplam 20, 4 adımının katları) geçerli olmalı
  [PASS] 4+8+8 tam kapasite (20/20) doldurmalı
  [PASS] 5+7+8 dağılımı toplam 20 olsa dahi 4 adımının katı olmadığı için geçersiz olmalı
  [PASS] Hata mesajı tekrar adımı kuralını belirtmeli
  [PASS] Eksik kapasite (4+8=12/20) hata değil uyarı üretmeli
  [PASS] Eksik kapasite uyarısı üretilmeli
  [PASS] Kapasite aşımı (24 > 20) kesin hata üretmeli
  [PASS] Kapasite aşımı hatası üretilmeli

--- TEST 2: Renk Sınırı Kontrolü (6 Renk Geçerli, 7 Renk İhlal) ---
  [PASS] Toplam 6 benzersiz renk (CMYK + 368C + 357C) geçerli olmalı
  [PASS] Benzersiz renk sayısı tam 6 olmalı
  [PASS] 7 benzersiz renk (CMYK + 368C + 357C + 185C) engellenmeli
  [PASS] 7 renk aşım hatası üretilmeli

--- TEST 3: Ebat, Zemin ve Özel Lak Kuralı İhlalleri ---
  [PASS] Farklı ebatlar (52x195 ile 52x165) aynı montajda birleştirilemez
  [PASS] Ebat uyuşmazlığı hatası üretilmeli
  [PASS] Farklı zemin türleri (EMAYE ve METALİK) aynı montajda birleştirilemez
  [PASS] KRL-LAK-YASAK kuralı gereği Laklı ve Laksız ürünler birleştirilemez
  [PASS] Lak kuralı açık hata üretmeli

--- TEST 4: Minimum Baskı (1.250 Levha) ve Fazla Üretim İzolasyonu ---
  [PASS] İhtiyaçtan karşılanan miktar gerçek talep sınırında (2.000) kalmalı
  [PASS] Minimum baskı fazlası tam 3.000 (5.000 - 2.000) olarak izole edilmeli
  [PASS] Toplam montaj çıktısı 5.000 olmalı

--- TEST 5: Bir İhtiyacın İki Montajda Kısmi Karşılanması ---
  [PASS] Taslak 1 sonrası ayrılan 10.000 olmalı
  [PASS] Taslak 1 sonrası kalan açık 15.000 olmalı
  [PASS] Durum PARTIAL olmalı
  [PASS] Taslak 2 sonrası toplam ayrılan 20.000 olmalı
  [PASS] Taslak 2 sonrası kalan açık 5.000 olmalı

--- TEST 6: Otomatik Öneri ve FIFO Dağıtımı ---
  [PASS] Öneri motoru başarıyla çalışmalı
  [PASS] En az bir geçerli montaj önerisi üretilmeli
  [PASS] Öneri ebadı 52x195 olmalı
  [PASS] Montaj tam 20 göz doldurmalı (Tam Kapasite)
  [PASS] Çoklu ürün kombinasyonu oluşturulmalı

--- TEST 7: Eşzamanlılık ve 409 Çakışma Koruması ---
  [PASS] Kullanıcı 1 öneriyi başarıyla taslağa almalı
  [PASS] Aynı öneri tekrar uygulandığında mükerrer kayıt açılmayıp idempotency korunmalı

--- TEST 8: İptal ve Açık Miktarın İadesi ---
  [PASS] Öneriden üretilen taslak kombinasyon başarıyla iptal edilmeli
  [PASS] İptal sonrası ayrılan miktar 0 olmalı
  [PASS] İptal sonrası kalan açık 4.000 olarak geri dönmeli
  [PASS] İptal sonrası durum WAITING olmalı

--- TEST 9: Zaman Aşımı İzolasyonu ---
  [PASS] Zaman aşımında status SEARCH_LIMIT_REACHED olmalı ve crash etmemeli
  [PASS] Zaman aşımında dahi o ana kadar bulunan adaylar dizi olarak dönmeli

--- TEST 10: Canlı Plan ve Mevcut Kombinasyonların Korunması ---
  [PASS] Canlı tüp planından üretilen 215 kalem eksiksiz korunmalı
  [PASS] Önceki fazlardan kalan kombinasyonlar kayıpsız korunmalı

--- TEST 11: Gerçek Havuz Analizi ve Dürüst Eksiklik Raporu ---
  [PASS] Canlı havuz taraması başarıyla tamamlanmalı
  [PASS] Teknik kartı tanımlanmamış ürünler sessizce elenmeyip excluded listesinde raporlanmalı
  [PASS] Dışlanan her kalemin açık reasonCode değeri olmalı
  [PASS] Dışlanan her kalemin gerekçesi açık raporda yer almalı

================================================================
TEST SONUCU: 44 BAŞARILI, 0 BAŞARISIZ (Toplam: 44)
================================================================
```

### Regresyon Test Süitleri:
- **Faz 4A Testleri (`tests/test-faz4a.js`):** 40 / 40 BAŞARILI
- **Faz 5A Testleri (`tests/test-faz5a.js`):** 21 / 21 BAŞARILI
- **Faz 3B Testleri (`tests/test-faz3b.js`):** 65 / 65 BAŞARILI
- **Tüm Süitler Toplamı:** **170 / 170 BAŞARILI**

---

## 7. Faz 6 (Sipariş Formu) ve Faz 5B Yol Haritası Entegrasyonu

1. **Faz 6 Matbaa Sipariş Formu:**
   - Onaylanan kombinasyonlar (`CONFIRMED`) Faz 6'da matbaa sipariş formuna hazır kayıt olarak aktarılır.
   - Henüz form basılmadıysa veya matbaaya iletilmediyse sistem arayüzünde yanıltıcı "Gönderildi" durumu gösterilmez.
2. **Faz 5B Malzeme Tarihleri Bağlantısı:**
   - Kombinasyonların basılma ve teslim terminleri, Faz 5A tüp makinesinin başlangıç saatlerine (`material_due_date`) bağlı kalmaya devam eder.
3. **Kaynak Güvenliği:**
   - SQL Server ERP veritabanına kesinlikle hiçbir yazma/silme yapılmamıştır (`SELECT` yetkisi korunmuştur).
