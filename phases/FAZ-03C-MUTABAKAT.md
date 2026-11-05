# FAZ 3C — EXCEL / SQL / UYGULAMA MUTABAKATI

Durum: PLANLANDI. Analiz ve gereksinim paketi entegre edildi. Aktif geliştirme öncesi hazırlık dokümanıdır.

Önce kökteki `AGENTS.md`, `STATUS.json` ve `docs/referans/2026-11-05-teneke-excel/docs/04-FAZLAR-VE-KABUL.md` dosyasını oku.

## 1. Kapsam ve Amaç

Bu fazın amacı, mevcut Excel (`2026 PLAN TENEKE v1.1.xlsm`) tabloları, `AA_LIDER` SQL Server view'leri ve yeni web uygulaması arasındaki stok, talep, netleme ve reçete hesaplarının tam mutabakatını sağlamaktır.

## 2. Mutabakat İlkeleri

1. **Zaman Uyumu:** Eski Excel'de kaydedilmiş statik bir değer ile canlı veritabanındaki anlık stok karşılaştırılıp fark çıktığında bu durum "hata" olarak nitelendirilmez; aynı anlık snapshot alınarak karşılaştırma yapılır.
2. **Excel Hatalarının Korunmaması:** Excel'de tespit edilen formül hataları (örn. aralık dışı lookup formülleri, hatalı tarih hesapları veya mola kaymaları) yeni uygulamaya "doğru kural" olarak kopyalanmaz; düzeltilmiş iş kuralı referans alınır.
3. **Fark Raporlama:** Herhangi bir uyuşmazlıkta farkın kaynağı (depo politikası farkı, birim yuvarlama, reçete versiyonu vb.) raporda açıkça belirtilir.

## 3. Kabul Testi Kapsamı

- En az 10 temsilî ürün üzerinden mutabakat doğrulaması.
- En az 3 farklı ebat (örn. 52x195, 65x104, 45x100).
- Eksik reçete, bloke depo, çoklu sipariş, stok fazlası ve tarihli planlı arz senaryolarının test edilmesi.
- Bağımsız test fixture'ları ile sayısal kontrol yapılması.
