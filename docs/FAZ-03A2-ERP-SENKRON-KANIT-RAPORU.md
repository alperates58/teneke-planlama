# FAZ 3A.2 — GERÇEK ERP KATALOG, BRÜT TALEP VE STOK SENKRONU KANIT RAPORU

**Tarih:** 06.11.2026  
**Durum:** Tamamlandı, Doğrulandı, Üretime Hazır  
**Referans Commit:** `14f0fa5` (Faz 2D Tasarım Pilotu)  
**Çalışma URL:** `http://localhost:3001`  

---

## 1. Yönetici Özeti ve Temel Başarımlar

Faz 3A.2 kapsamında, daha önce statik / temsili örneklerle çalışan İhtiyaç Havuzu ve Stok Kataloğu, şirket SQL Server sunucusuna (`AA_LIDER` bağlantı DB'si ve `MikroDesktop_LIDER26` kaynak ERP DB'si) güvenli SSH tüneli üzerinden bağlanmış; **salt okunur 5 sözleşme view'ı** ile PostgreSQL staging katmanına idempotent olarak senkronize edilmiştir.

### Temel Doğrulama Rakamları:
- **Brüt Tüp İhtiyacı:** 443 iş emri / talep satırı, 63 sipariş, 255 tekil tüp kodu, **4.998.757 adet** brüt tüp dolum talebi (Tarih aralığı: 15.10.2024 – 22.02.2027).
- **ERP Stok Kataloğu:** 3.755 stok kartı (`1.245` Teneke Tüp, `1.239` Kesik Levha, `1.232` Baskılı Levha, `22` Ham Levha, `9` Dip, `8` Bombe).
- **Ambar Stok Seviyeleri:** 3.755 kalem; bloke / hariç ambarlar (Depo 10, 11, 13, 23, 28, 29, 100) düşülmüş net kullanılabilir stok. 599 tüp kaleminde toplam **2.306.258 adet** pozitif net kullanılabilir stok.
- **Kademeli Reçete Ağacı:** 8.609 satır reçete bağlantısı (`TÜP` → `KESİK LEVHA` (1:1) → `BASKILI LEVHA` (1:1) → `HAM LEVHA` tüketim katsayısı).
- **Mevcut Tüp Üretim Planı (Faz 3A.1):** `[MikroDesktop_LIDER26].[dbo].[alper_tenekeuretim]` tablosundaki 215 satır, 3.134.665 adet plan verisi, 13 snapshot ve kullanıcının taslağı eksiksiz ve değişmez olarak korunmuştur.
- **Korumalı Yerel Tanımlar:** Kullanıcının Faz 2C'de tanımladığı 27 adet `product_technicals` teknik kartı (renkler, zemin, lak, ham levha bağlantısı) ERP senkronu sırasında ezilmemiş, bağımsızlığı korunmuştur.

---

## 2. Hedefli Düzeltmeler ve Güvenlik Sıkılaştırması

### A) Kimlik Doğrulama ve Yetki Yükseltme Koruması (`server/routes/auth.js`)
- `POST /api/auth/switch-role` üzerinden istemcinin serbestçe `admin` rolü alabilmesi engellenmiştir.
- `ALLOW_DEMO_ROLE_SWITCH` ortam değişkeni varsayılan olarak kapalıdır (`false`). Çağrıldığında `403 ROLE_SWITCH_DISABLED` döner.
- Oturum token'ları öngörülebilir statik dizgilerden çıkarılmış; `crypto.randomBytes(32).toString('hex')` (64 karakterlik kriptografik rastgele token) haline getirilmiştir.
- PostgreSQL `app_users` tablosu oluşturulmuş; kullanıcılar şifre karmalarıyla (`salt:pbkdf2`) doğrulanmaktadır.
- **Güvenlik Testleri:**
  - Kimliksiz istek → `401 OTURUM_GEREKLI` (Doğrulandı).
  - Viewer (`misafir`) rolüyle admin işlemi (`/api/erp/sync`) → `403 YETKISIZ_ISLEM` (Doğrulandı).
  - Admin (`admin`) rolüyle admin işlemi → `200 Başarılı` (Doğrulandı).

### B) Kombinasyon Tezgahı Aktarım Koruması (`public/app.js`)
- İhtiyaç Havuzundaki `net_quantity` değeri, dolum siparişi ile tüp stoğu arasındaki farktır ("Net Tüp Üretim İhtiyacı"). Bu değer kesinlikle "Yeni Baskı İhtiyacı" değildir.
- Gerçek ERP taleplerinin kombinasyon tezgahına (Workbench) doğrudan aktarımı engellenmiştir.
- Kullanıcı gerçek bir ERP talebini aktarmaya çalıştığında:
  > *"KOMBİNASYON AKTARIM KORUMASI (FAZ 3A.2 / FAZ 3B): Gerçek ERP talepleri henüz Faz 3B çok seviyeli stok netleme ve baskı levhası hesabından geçmemiştir. Mevcut miktar 'Net Tüp Üretimi' olup 'Yeni Baskı İhtiyacı' DEĞİLDİR. Montaj tezgahına yalnız hesaplanmış yeni baskı ihtiyacı aktarılabilir."*
  uyarısı verilir ve aktarım bloke edilir.
- Montaj tezgahında yalnızca açıkça etiketlenmiş `synthetic_demo` kalemlerinin deneme amaçlı aktarımı desteklenmektedir.

### C) Stok Gösterimi ve Tekil Ambar Stoğu (`public/app.js` & `DESIGN.md`)
- Kullanılabilir ambar stoğu pozitif bir fiziksel miktardır. Tablodaki ve çekmecedeki `-1.200` gibi eksi işaretli gösterimler kaldırılmış; pozitif `1.200 adet` formatına getirilmiştir.
- Tahsis motoru (Faz 3B) devrede değilken, aynı tüpün stoğunun birden çok siparişte mükerrer toplanarak yapay / şişirilmiş KPI üretilmesi önlenmiştir.
- Üst çubukta filtrelenen tekil tüplerin tekil ambar stoğu hesaplanmaktadır (`Tekil Stok: 2.306.258`).
- `DESIGN.md` sözleşmesi Bölüm 3.1, 4 ve 5 bu ilkeler doğrultusunda güncellenmiştir.

---

## 3. SQL Server Sözleşme View'ları (`sql/views/`)

Tüm view'lar `AA_LIDER` veritabanında `CREATE OR ALTER VIEW` ile derlenmiş ve test edilmiştir. Kaynak tablolara sıfır yazma ilkesi uygulanmıştır.

| Dosya | View Adı | Kaynak ERP Nesneleri | Satır Sayısı | Açıklama |
|---|---|---|---|---|
| `01_AA_tp_vw_StokKartlari.sql` | `[dbo].[AA_tp_vw_StokKartlari]` | `[MikroDesktop_LIDER26].[dbo].[STOKLAR]` | 3.755 | Tüp, kesik, baskılı, ham levha, bombe ve dip stok kartları |
| `02_AA_tp_vw_TupBrutIhtiyac.sql` | `[dbo].[AA_tp_vw_TupBrutIhtiyac]` | `[alper_terminler]`, `[URETIM_MALZEME_PLANLAMA]`, `[STOKLAR]` | 443 | `(upl_miktar / NULLIF(upl_uret_miktar, 0)) * PLANMIKTAR` formülüyle hesaplanan pozitif brüt dolum talepleri |
| `03_AA_tp_vw_ReceteBaglantilari.sql` | `[dbo].[AA_tp_vw_ReceteBaglantilari]` | `[MikroDesktop_LIDER26].[dbo].[URUN_RECETELERI]`, `[STOKLAR]` | 8.609 | Tüp → Kesik → Baskılı → Ham Levha kademeli reçete bağı ve tüketim oranları |
| `04_AA_tp_vw_StokDepo.sql` | `[dbo].[AA_tp_vw_StokDepo]` | `[STOKLAR]`, `[AA_alper_vw_EldekiMiktar]`, `[AA_alper_vw_HaricDepolarToplam]` | 3.755 | Toplam stok - Bloke/Hariç depolar = Net kullanılabilir stok |
| `05_AA_tp_vw_PlanliTupArz.sql` | `[dbo].[AA_tp_vw_PlanliTupArz]` | `[MikroDesktop_LIDER26].[dbo].[alper_tenekeuretim]` | 215 | Makinede planlanmış aktif tüp üretim arzı (Faz 3A.1 kaynağı) |

---

## 4. PostgreSQL Staging Mimarisi (Migrasyon 006)

PostgreSQL üzerinde aşağıdaki staging ve takip tabloları oluşturulmuştur:
- `app_users`: Kullanıcı kimlikleri, şifre karmaları ve rolleri (`admin`, `planner`, `viewer`).
- `erp_sync_runs`: Senkronizasyon koşu kayıtları, süreleri, kullanıcı ve satır sayıları.
- `erp_gross_demands`: `UNIQUE(is_no, tup_stok_kodu)` kısıtı ile mükerrerlik önlenmiş brüt talepler staging tablosu.
- `erp_stock_levels`: `stock_code PRIMARY KEY` ile fiziksel, bloke ve net kullanılabilir stok tablosu.
- `erp_recipe_links`: `UNIQUE(parent_stock_code, child_stock_code)` ile reçete tüketim oranları tablosu.

### Idempotency (Çift Koşu) Testi:
`POST /api/erp/sync` uç noktası arka arkaya 2 kez çalıştırılmıştır:
- Koşu #1 Süre: 8.2 sn — 443 talep, 3.755 stok, 8.609 reçete eklendi.
- Koşu #2 Süre: 8.0 sn — 443 talep, 3.755 stok, 8.609 reçete güncellendi.
- PostgreSQL satır sayımı: `erp_gross_demands = 443`, `erp_stock_levels = 3755`, `erp_recipe_links = 8609`. Sıfır mükerrer satır, tam veri bütünlüğü!

---

## 5. Otomatik Doğrulama Testleri (15/15 Geçti)

`server/test-auth-and-sync.js` test paketi çalıştırılmış ve tüm kriterler doğrulanmıştır:

```text
========================================================
FAZ 3A.2 ENTEGRASYON VE GÜVENLİK DOĞRULAMA TESTLERİ
========================================================

[PASS] 1. switch-role yetki yükseltmesi varsayılan olarak kapalıdır (403 ROLE_SWITCH_DISABLED)
[PASS] 2. Kimliksiz kullanıcı sync yapamaz (401 OTURUM_GEREKLI)
[PASS] 3. Misafir (viewer) başarıyla oturum açar ve rastgele token alır
[PASS] 4. Viewer rolü admin yetkisi gerektiren sync işlemini çalıştıramaz (403 YETKISIZ_ISLEM)
[PASS] 5. Admin kullanıcısı oturum açar ve yetkileri tamdır
[PASS] 6. Beş sözleşme view'ı (AA_tp_vw_*) AA_LIDER üzerinde doğrulanmıştır
[PASS] 7. Önizleme motoru 443 talep satırını ve 4.998.757 brüt tüp ihtiyacını teyit eder
[PASS] 8. Admin yetkisiyle ERP senkronizasyonu hatasız çalışır
[PASS] 9. erp_gross_demands tablosunda tam 443 satır staging yapılmıştır (mükerrerlik yok)
[PASS] 10. erp_stock_levels tablosunda tam 3.755 stok seviyesi saklanmaktadır
[PASS] 11. erp_recipe_links tablosunda 8.609 reçete bağı mevcuttur
[PASS] 12. product_technicals tablosundaki 27 adet yerel teknik kart korunmuştur (ezilmemiştir)
[PASS] 13. Faz 3A.1 alper_tenekeuretim snapshot ve taslakları korunmuştur
[PASS] 14. Kullanılabilir ambar stoklarında negatif değer yoktur (usable_stock >= 0)
[PASS] 15. GET /api/erp/demands canlı ERP verilerini ve doğru record_kind etiketini döner

========================================================
TEST SONUCU: 15 GEÇTİ, 0 KALDI (Toplam 15)
========================================================
```

---

## 6. Arayüz ve Görsel Doğrulama

Tarayıcı üzerinden doğrulanmış ekran görüntüleri `screenshots/` klasörüne kaydedilmiştir:
1. `screenshots/faz3a2-ihtiyac-havuzu-live-demands.png`: 443 kalem gerçek talep, pozitif ambar stokları, tekil stok KPI'ı, "Hesaplanmadı" rozetleri ve canlı/demo geçiş butonları.
2. `screenshots/faz3a2-drawer-positive-stock.png`: Detay çekmecesinde `11.781 adet` pozitif ambar stoku ve devredışı bırakılmış "Baskı Hesabı Bekleniyor (Faz 3B)" butonu.
3. `screenshots/faz3a2-ihtiyac-havuzu-demo-mode.png`: Kullanıcının tek tıkla geçiş yapabildiği 11 kalemlik temsili demo senaryo modu.
4. `screenshots/faz3a2-sql-entegrasyonu-dashboard.png`: Gerçek SQL Server ve PostgreSQL bağlantı kartları, 5 sözleşme view'ı tablosu, senkronizasyon çalıştırma butonu ve koşu geçmişi.

---

## 7. Sonraki Adım: Faz 3B

Faz 3A.2 ile brüt dolum talepleri ve ambar stokları güvenli şekilde staging'e alınmıştır.  
Sıradaki adım **Faz 3B (Çok Seviyeli İhtiyaç Motoru ve Netleme)** olacaktır:
- 1. Seviye: Brüt İhtiyaç – Tüp Ambar Stok = Net Tüp Üretim Hedefi
- 2. Seviye: Net Tüp – Kesik Levha Eşdeğer Stok = Net Kesim İhtiyacı
- 3. Seviye: Net Kesim – Baskılı Levha Eşdeğer Stok = **Yeni Baskı İhtiyacı (Montaj Motoruna Gidecek Nihai Miktar)**
- 4. Seviye: Ham Levha Stok Kontrolü ve Satın Alma Sinyali
