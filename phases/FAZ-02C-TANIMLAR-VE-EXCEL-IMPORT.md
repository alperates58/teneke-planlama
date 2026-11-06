# FAZ 2C — TANIMLAR MERKEZİ VE EXCEL TEKNİK KART İÇE AKTARIMI

Durum: TAMAMLANDI VE DOĞRULANDI (39/39 Entegrasyon Testi PASS).
Doğrulama Tarihi: 2026-11-06.
Kalıcılık Katmanı: Node.js Modüler Backend (server/) + PostgreSQL 16.
Doğrulama Raporu: docs/FAZ-02C-TAMAMLANMA-VE-KANIT-RAPORU.md.

Önce kökteki `AGENTS.md`, `STATUS.json` ve `docs/referans/2026-11-05-teneke-excel/docs/03-TANIMLAR-VE-EXCEL-IMPORT.md` dosyasını oku.

## 1. Kapsam ve Amaç

Bu fazın amacı, aerosol teneke tüp üretiminde ihtiyaç duyulan tüm teknik ve operasyonel tanımların tek bir merkezden yönetilmesini sağlamak, ERP ana stok kartı ile yerel teknik kart veri sahipliğini kesin olarak ayırmak ve Excel tabanlı teknik kart listelerinin önizlemeli/kolon eşlemeli içe aktarılmasını sağlamaktır.

## 2. İş Paketleri

### 2.1 Tanımlar Merkezi Modülü ve Menü Mimarisi
- Tanımlar üst menüsü altında alt modüller:
  - Stok Kartları (ERP senkron kataloğu)
  - Tüp Teknik Kartları (Baskı ve montaj özellikleri)
  - Ham Levhalar (Ölçü, kalınlık, tedarikçi)
  - Tüp – Ham Levha Eşleşmeleri (Foreign Key ilişkisi)
  - Ebat / Kapasite / Montaj Şablonları (18 ebat kuralı)
  - Renkler (Pantone ve proses renk kataloğu)
  - Zemin Sözlüğü (EMAYE, METALİK vb.)
  - Vernik Sözlüğü (PARLAK vb.)
  - Lak Durumları (`LAKLI`, `LAKSIZ`, `BILINMIYOR`)
  - İç Kaplama Sözlüğü (GOLD, ŞEFFAF vb.)
  - Ürün Grupları (Oda Spreyi, İnsektisit vb.)
  - Matbaa Yerleşim ve Kombinasyon Kuralları
  - Makine, Hat, Vardiya, Takvim Tanımları
  - Hız (adet/dakika) ve Hazırlık Süreleri
  - Depo Kullanım Politikaları

### 2.2 Veri Sahipliği ve Referans Bütünlüğü (CRUD)
- **ERP Stok Ana Kartı:** Stok kodu, stok adı, kategori ve temel birim ERP senkronunun sahipliğindedir. Uygulama ERP stok kartını silemez/değiştiremez.
- **Teknik Kart:** Renkler, zemin, vernik, lak, iç kaplama ve onaylı ham levha ilişkisi uygulama içinde yönetilir. ERP senkronu bu teknik alanları ezmez.
- **Referans Bütünlüğü:** Kullanımda olan (plan veya montaj geçmişi olan) hiçbir tanım fiziksel olarak silinemez; referans sayısı gösterilerek "Pasife Alma" sunulur. Yalnızca hiç kullanılmamış tanımlar onay ile silinebilir. Değişiklikler kullanıcı, tarih ve eski/yeni değerlerle denetim izine (`audit_logs`) kaydedilir.

### 2.3 Manuel Form ve Otomatik Katalog Doldurma
- Stok kodu girişi zorunludur.
- Kullanıcı stok kodunu yazdığında/seçtiğinde, yerel senkron katalogdan **stok adı otomatik dolar ve ana kart alanı olarak salt okunurdur**.
- Henüz ERP'ye gelmemiş kodlar "ERP Eşleşmesi Bekliyor" taslak durumunda işaretlenir; sisteme sahte ürün adı uydurulmaz.
- Ham levha seçimi gerçek stok kodu (FK) üzerinden yapılır; en, boy, kalınlık birlikte gösterilir. Alternatif levha uydurulmaz.
- Reçete zincirinin ulaştığı ham levha ile teknik eşleşme farklıysa uyuşmazlık açıkça bildirilir ve kombinasyon onayı engellenir.

### 2.4 Excel Teknik Kart İçe Aktarma (Import Engine)
- Şablon indirme, dosya yükleme, dinamik kolon eşleme, veri doğrulama ve önizleme adımları.
- Desteklenen format: `.xlsx` (ve formülsüz `.xlsm`). Makrolar çalıştırılmaz.
- "Ham Levha kodu" başlığı altındaki hücreler isim/açıklama içeriyorsa katalogdan tekil açık eşleme yapılır; belirsiz veya eşleşmeyen satırlar onaylanmaz.
- Güncelleme politikası: Yalnız yeni kayıtlar / Mevcutları güncelle / Tümü.
- Mükerrer satır ve geçersiz kod denetimi.

## 3. Kabul Koşulları

- [x] Stok kodu olmayan manuel veya import satırı kesin olarak reddedilir.
- [x] Kayıtlı stok kodu seçildiğinde ürün adı yerel katalogdan otomatik gelir ve değiştirilemez.
- [x] ERP senkronundan sonra manuel/Excel ile tanımlanmış renk, lak, zemin ve ham levha ilişkileri korunur (ezilmez).
- [x] Ham levha açıklaması katalogdaki gerçek ham levha stok koduna açıkça eşlenir; eşleşmeyen satır içeri alınamaz.
- [x] Kullanılan bir tanım (ör. aktif montajdaki renk veya levha) silinemez, ancak pasife alınabilir.
- [x] Aynı Excel dosyası tekrar içeri aktarıldığında kayıtlar mükerrer olarak çoğalmaz.
- [x] Teknik kart ile reçete ham levhası uyuşmadığında kullanıcı uyarılır ve onay engellenir.
- [x] Tarayıcı yenilendiğinde, oturum değiştiğinde ve servis yeniden başladığında veriler kalıcı kalır.
- [x] Yetkisiz kullanıcılar tanım ekleme/düzenleme/silme işlemi yapamaz.
