# Veri sözlüğü ve kullanım sınırları

- `source_transcription`: görünür kaynak satırının metin/veri aktarımı; canlı ERP doğrulaması değildir.
- `historical_reference_plan_not_demand`: tarihli üretim planı örneği; açık sipariş veya net ihtiyaç değildir.
- `synthetic_test_only`: gerçek iş verisi olmayan sınama senaryosu.
- `null`: kaynakta bulunmayan veya bilinmeyen değer. Sıfır/uygun/kural yok anlamına gelmez.
- `stock_code`, `short_name`, `consumption_code`: metin; sayıya çevrilmez.
- `units_per_sheet`: hazır kapasite. Ölçülerden yeniden hesaplanmaz. Kapasite = Montaj Grubu Sayısı × Ürün Tekrar Adımı.
- `assembly_group_count`: montaj grubu sayısı (kaynak tablodaki “Çeşit” alanı). Eşit büyüklükteki montaj gruplarının sayısıdır. Bir ürün birden çok grup alabilir.
- `repeat_step`: ürün tekrar adımı (`units_per_sheet / assembly_group_count`). Her ürünün montajdaki tekrar sayısı bu değerin pozitif tam katı olmalıdır.
- `assigned_groups`: ürüne ayrılan grup adedi (`repeats / repeat_step`). Faz 4 kombinasyon motorunun tam sayı karar değişkenidir.
- `variety_source`, `quantity_source`: kaynak tablonun sırasıyla çeşit ve adet alanları. 1.250 levha üzerinden `single_variety_order_quantity_source` ile bağlantılıdır.
- `inside_coating`: iç kaplama alanı (örn. SOFT formundaki “GOLD”, “STANDART”). Lak ve vernikten tamamen bağımsız tutulur.
- `minimum_print_sheets_source`: ham levha görselinde boş. Uygulama varsayılanı defaults.json'dan gelir; kaynak değiştirilmez.
- `thickness_source_value`: 17/18 gösterimi. Normalize mm alanı ayrıca ve doğrulama sonrası oluşturulur.
- `raw_sheet_stock_code_candidate`: açıklama/ebat eşleştirmesi. Teknik kart görselinden doğrudan okunmuş stok kodu değildir.
- `inside` / `outside`: formdaki iç/dış baskı yüzeyi bilgisi. “İçi GOLD” otomatik olarak laklı/laksız alanına çevrilmez.
- `planned_units`: örnek plan miktarı; kapasite veya güncel talep sayılmaz.
- `theoretical_units`: tekrar × levha; fire dahil değildir.
- `colors`: ayrı kanonik renk kodları. CMYK dört ayrı kod olarak tutulur. Spot renk metni aynen korunur.

Uygulamada stok birimleri (adet/levha/kg), tarih anlamları, revizyon, lot, depo, veri kaynağı, son güncelleme ve kaynak kapsamı açık olmalıdır. Alan sahipliği: ERP kod/ad/stok/sipariş kaynakları ile yerel teknik kural/kapasite tanımları birbirini sessizce ezmez.

Plan ekranındaki farklı uzunluktaki tüketim kodları kaynakta nasılsa öyle korunur; örneğin kısa kodlar yanlış sayılmaz. Teknik kartı olmayan plan ürünü için renk/lak/kapasite tahmin edilmez. Ürün adında LAKSIZ geçmesi ayrı teknik kart doğrulamasının yerine konmaz.
