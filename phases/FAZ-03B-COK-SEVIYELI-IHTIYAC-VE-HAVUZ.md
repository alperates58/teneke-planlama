# FAZ 3B — ÇOK SEVİYELİ İHTİYAÇ MOTORU VE TALEP HAVUZU (50-10-5-7=28 KURALI)

Durum: PLANLANDI. Analiz ve gereksinim paketi entegre edildi. Aktif geliştirme öncesi hazırlık dokümanıdır.

Önce kökteki `AGENTS.md`, `STATUS.json` ve `docs/referans/2026-11-05-teneke-excel/docs/02-IHTIYAC-VE-VIEW-SOZLESMESI.md` dosyasını oku.

## 1. Kapsam ve Temel İş Kuralı

Aerosol teneke kutu üretiminde ihtiyaç, salt satış/dolum siparişinden ibaret değildir. Kademeli reçete yapısı gereği her stok katmanı sırayla netlenir:
**Tüp (Mamul) → Kesik Levha (Yarı Mamul) → Baskılı Levha (Ortak Kaynak) → Ham Levha (Hammadde)**

### Kesin Kabul Hesap Örneği (50-10-5-7 = 28 Kuralı):
Brüt talep: **50.000 Tüp**
1. **Hazır Mamul Tüp Stokundan Karşıla:**
   - Mevcut Kullanılabilir Tüp Stoğu: `10.000 Tüp`
   - Kalan Net Tüp Üretim İhtiyacı: `40.000 Tüp`
2. **Kesik Levha Stokundan Karşıla:**
   - Mevcut Kullanılabilir Kesik Levha Stoğu: `5.000 Tüp Eşdeğeri`
   - Kalan Net Kesim İhtiyacı: `35.000 Tüp Eşdeğeri`
3. **Baskılı Levha Stokundan Karşıla:**
   - Mevcut Kullanılabilir Baskılı Levha Stoğu: `7.000 Tüp Eşdeğeri`
   - Kalan Yeni Baskı İhtiyacı (Kombinasyona Gidecek): `28.000 Tüp Eşdeğeri`

### Çıktıların Hatlara Yönlendirilmesi:
- **Kombinasyon Masasına / Baskı Planına Aktarılan:** `28.000` (Yeni basılacak net tüp eşdeğeri)
- **Tüp İmalat Hattına Planlanan:** `40.000` (Üretilecek fiziksel tüp miktarı)
- **Makas / Kesim Hattına Planlanan:** `35.000` (Kesilecek levha eşdeğeri)

## 2. Stok Tahsis ve Reçete Kuralları

1. **Tek Seferlik Tahsis (Rezervasyon):** Bir stok kalemi havuz genelinde yalnızca tek bir siparişe tahsis edilir. Aynı 10.000 stok iki farklı sipariş satırında mükerrer düşülemez.
2. **Doğrulanmış Dönüşüm Katsayısı:** Baskılı veya kesik levha stokları doğrudan adet olarak düşülemez; ERP reçetesinden doğrulanmış tüp eşdeğeri katsayısıyla çarpılarak netlenir.
3. **Karışık Baskılı Levha Ayrımı:** Karışık bir montajdan çıkan baskılı levha stoğu varsa, montajdaki ürüne ait tekrar payı kadar tüp eşdeğeri hesaplanır; tüm levha kapasitesi tek ürüne mal edilemez.
4. **Ham Levha Stoğu:** Ham levha stoğu baskı ihtiyacını azaltmaz; ham levha satın alma ihtiyacını azaltır.
5. **Eksik Reçete Koruması:** Reçetesi veya katsayısı eksik ürünler havuzdan silinmez; "Eksik Reçete" teknik uyarısıyla gösterilir ve kombinasyon onayı engellenir.

## 3. Talep Havuzu Ekran Düzeni

Tablo Kolonları:
- `Sipariş / Termin`
- `Tüp Kodu & Adı`
- `Ebat`
- `Brüt Tüp İhtiyacı` (Örn. 50.000)
- `Kullanılabilir Tüp Stok` (Örn. -10.000)
- `Tüp Üretim İhtiyacı` (Örn. 40.000)
- `Kesik Stok (Tüp Eşd.)` (Örn. -5.000)
- `Kesim İhtiyacı (Tüp Eşd.)` (Örn. 35.000)
- `Baskılı Stok (Tüp Eşd.)` (Örn. -7.000)
- `Yeni Baskı Net İhtiyacı` (Örn. 28.000 -> Kombinasyon Masasına giden)
- `Zemin`, `Vernik`, `Lak`, `İç Kaplama`, `Renkler`, `Teknik Durum`

## 4. Kabul Test Senaryoları

- [ ] **Senaryo 1:** 50.000 brüt / 10.000 tüp stok / 5.000 kesik / 7.000 baskılı -> Tüp Üretim: 40.000, Kesim: 35.000, Yeni Baskı: 28.000.
- [ ] **Senaryo 2:** 5.000 brüt / 10.000 tüp stok -> Tüp Üretim: 0, Kesim: 0, Yeni Baskı: 0 (Kalan stok: 5.000).
- [ ] **Senaryo 3:** 10.000 brüt / 2.000 tüp stok / 9.000 kesik -> Tüp Üretim: 8.000, Kesim: 0, Yeni Baskı: 0 (Kalan kesik: 1.000).
- [ ] **Senaryo 4 (Mükerrer Tahsis Engeli):** Aynı ürün için iki talep 8.000 + 8.000 ve tek stok 10.000 -> Toplam yeni üretim ihtiyacı 6.000 olmalı; stok iki kez düşülmemeli.
- [ ] **Senaryo 5 (Eksik Reçete):** Reçetesi bulunmayan tüp satırı havuzda kalır, ancak üretime onaylanamaz.
