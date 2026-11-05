# Paket doğrulaması

Tarih: 5 Kasım 2026. Bunlar belge/veri paketi kontrolleridir; henüz uygulama testleri değildir.

- 8 faz dosyası mevcut; her biri kapsam ve kabul koşulları içeriyor.
- 14 ham levha, 18 kapasite, 22 teknik ürün, 20 tarihli plan satırı aktarıldı.
- 2 SOFT montajı; her biri 20 tekrar ve 1.250 levhadan 25.000 teorik tüp.
- Kapasite tablosunda tüp/levha × 1.250 = kaynak tek çeşit miktarı bütün 18 satırda doğrulandı.
- Çeşit × kaynak adet = kaynak tek çeşit miktarı aritmetik olarak doğrulandı; bu eşitlik fiziksel kural yorumu değildir.
- Teknik ürün kodlarında tekrar yok.
- Excel'in 34 dolu hücresi ve Word'ün 47 dolu paragrafı korundu.
- 8 özgün kaynak dosya SHA-256 bilgisiyle korundu.
- Bütün JSON dosyaları ayrıştırılabilir; faz ve doküman yolları mevcut.
- Kaynak eksikleri/alan anlamı belirsizlikleri ayrı kayıtlı; kaynak minimum hücreleri null.
- ZIP bütünlüğü oluşturma sonrasında ayrıca kontrol edilir.
