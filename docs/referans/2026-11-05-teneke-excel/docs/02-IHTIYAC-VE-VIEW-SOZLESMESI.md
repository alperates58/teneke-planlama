# AA_LIDER entegrasyonu ve kademeli ihtiyaç sözleşmesi
Durum: Tasarım kararı ve uygulama kabul şartı; henüz canlı SQL kurulumu yapılmadı.

## Hesap
Kullanıcının 50.000 örneğinde tüm stoklar kullanılabilir ve tüp eşdeğerindedir:
| Aşama | Giriş | Kullanılan mevcut stok | Sonraki iş ihtiyacı |
|---|---:|---:|---:|
| Hazır tüpten karşıla | 50.000 | 10.000 tüp | 40.000 tüp üretimi |
| Kesikten karşıla | 40.000 | 5.000 tüp eşdeğeri kesik | 35.000 tüp eşdeğeri kesim |
| Baskılıdan karşıla | 35.000 | 7.000 tüp eşdeğeri baskılı | 28.000 tüp eşdeğeri yeni baskı |

Formüller, her seviyenin o talebe tahsis edilebilir stoğu için:
- tubeUsed=min(gross, availableTube)
- tubeProduction=max(0,gross−tubeUsed)
- cutUsed=min(tubeProduction, availableCutTubeEquivalent)
- cuttingRequirement=max(0,tubeProduction−cutUsed)
- printedUsed=min(cuttingRequirement, availablePrintedTubeEquivalent)
- newPrintRequirement=max(0,cuttingRequirement−printedUsed)

Eksi stok sessizce normal stok sayılmayacak; veri uyarısı ve onaylı politika uygulanacak. Stok fazlası eksi ihtiyaç üretmez. Aynı kaynağın farklı siparişlerde tekrar kullanılmasını önleyen rezervasyon/tahsis kaydı tutulur. Formül yalnız tek satırda bağımsız stoğu olan örnek için doğrudan uygulanabilir.

28.000 kombinasyon motoruna giden tüp eşdeğeri ihtiyacıdır; makineye 28.000 tüp planlamak eksiktir. Tüp üretimi 40.000'dir. Fiziksel baskı levhası miktarı daha sonra onaylı kapasite, tekrar katı, montaj ve minimum baskıyla bulunur. Minimum baskı kaynaklı fazla üretim “ihtiyaç” değildir; ayrı fazla üretim alanıdır.

## Birimler ve reçete
Zincir Tüp → Kesik Levha → Baskılı Levha → Ham Levha. Her bağlantıda parent miktarı/birimi, child miktarı/birimi, geçerlilik ve reçete versiyonu gerekir. Dönüşüm kaynak reçeteden doğrulanmalı; kapasite tablosu üretim reçetesinin otomatik yerine geçmez. 7.000 stok fiziksel levha ise doğrudan 7.000 tüp gibi düşülemez.

Her stok kaydı nativeQuantity/nativeUnit, dönüşüm katsayısı, tubeEquivalent, ayrılan miktar ve kalan miktarı gösterecek. Karışık baskılı levha bir fiziksel kaynak ve birden fazla ürün çıktısıdır; her ürüne tam levha kapasitesi verilmez. Montajdaki ürüne ait tekrar adedi kullanılır. Aynı levhanın ürettiği diğer çeşitler ortak işlem çıktıları olarak izlenir; fiziksel levha yalnız bir kez tüketilir. İçeriği/revizyonu bilinmeyen baskılı levha otomatik tahsis edilmez.

Eksik/çoklu/alternatif reçete, sıfır katsayı, uyumsuz birim veya döngü varsa ürün havuzdan kaybolmaz. Hesap durumu “Teknik tanım eksik/karar gerekli” olur; onaylı net sonuç üretilmez.

## Önerilen SQL view'leri
Uygulamanın bağlanacağı DB: **AA_LIDER**. View adları yönetim ekranında değiştirilebilir. Kaynak yıl DB'si ilk kurulumda MikroDesktop_LIDER26. Aynı SQL instance ise açık üç parçalı adla referans; farklı instance erişimi IT tasarımına bağlı. Browser doğrudan SQL'e bağlanmaz.

| Önerilen view | Satır düzeyi | Zorunlu alanlar / amacı |
|---|---|---|
| dbo.AA_tp_vw_StokKartlari | stok kodu başına 1 | stock_code, stock_name, category, base_unit, short_name, dimension, source_db; aktiflik kaynağı doğrulanacak |
| dbo.AA_tp_vw_TupBrutIhtiyac | benzersiz talep/plan satırı + tüp bileşeni | demand_line_id, order_no, work_order, main_product_code, tube_code, required_at, gross_tube_qty, machine, source_type, quantity_basis=GROSS |
| dbo.AA_tp_vw_ReceteBaglantilari | reçete versiyonu + parent/child satırı | recipe_id, recipe_line_id, parent_code, child_code, parent_qty/unit, child_qty/unit, valid_from/to, alternative/status |
| dbo.AA_tp_vw_StokDepo | stok kodu + depo (+ izlenen lot) | stock_code, warehouse_code, quantity, unit; rezerv/bloke ayrı kaynaksa alanı ve anlamı açık |
| dbo.AA_tp_vw_PlanliTupArz | dış kaynak plan satırı | supply_line_id, tube_code, remaining_qty, completion_at, status, source_system |
| dbo.AA_tp_vw_TupReceteKontrol | tüp + reçete yolu / hata | Opsiyonel teşhis: kesik/baskılı/ham kodları, yol kimliği, eksik/çoklu eşleşme durumu; nihai stok netleme view'i değildir |

StokDepo içinde depo filtrelenmeden okunması hedeflenir; kullanıcı hangi depoların kullanılacağını tanımlayabilir. Sadece toplam-stok kaynağı sunulursa zaten düşülmüş depoların tekrar düşülmemesi için alternatif sözleşme açıkça işaretlenir. View satırında güvenilir updated_at yoksa uygulamanın fetched_at zamanı kullanılır ve bunun kaynak güncelleme tarihi olmadığı belirtilir.

Kaynak ID kolonları henüz görülmedi; ROW_NUMBER üzerinden değişken kalıcı kimlik uydurulmayacak. AA_alper_rec_seviye1 sadece kod/ad veriyorsa miktarları kaynak URUN_RECETELERI şemasından ayrıca doğrulamak gerekir. Stok kartının sto_birim* gibi kolon adları metadata gelmeden varsayılmaz.

## Stok tahsisi ve zaman
- Önce kaynakları staging/snapshot alanına al; eksik parti son başarılı verinin üzerine yarım yazılmasın.
- Açık talepleri termin → öncelik → kararlı satır kimliğiyle sırala; tüm havuzda stok bir kez dağıtılsın. Seçilmiş satırların her seferinde bütün stoğu yeniden tüketmesi engellensin.
- Sipariş toplamı ile stok toplamı farklı düzeyde; ekranda tekrarlanan stok toplanmaz.
- Fiziksel stok ile gelecekte tamamlanacak planlı arz ayrı görünür. Planlı arz ancak ilgili tarihe yetişiyorsa projeksiyona alınır; “mevcut stok” kolonu değildir.
- Eski Excel üretim planı ile uygulamanın oluşturduğu plan aynı işi temsil ediyorsa eşleştir/deduplicate et; kaynak geçiş politikası kaydedilsin.
- Üretim deposu toplam kullanılabilir stok içindeyse tekrar eklenmez. Depo 10 ve HaricDepolarToplam eşit kabul edilmez.
- Ham levha stoğu yeni baskı işini azaltmaz; yeni baskı için satın alınacak ham levhayı azaltır. Ayrı tedarik hesabıdır.

## İhtiyaç Havuzu
Ana görünüm ürün bazında özet, açılan satırda sipariş/termin bazında tahsis detayı:
Sipariş/Termin | Tüp Kodu & Adı | Ebat | Brüt Tüp İhtiyacı | Kullanılabilir Tüp Stok | Tüp Üretim İhtiyacı | Kesik Stok (Tüp Eşd.) | Kesim İhtiyacı (Tüp Eşd.) | Baskılı Stok (Tüp Eşd.) | Yeni Baskı Net İhtiyacı (Tüp Eşd.) | Zemin | İç Kaplama | Lak | Renkler | Teknik Durum.

Stok kolonları pozitif miktar gösterir. Tooltip/detayda fiziksel stok, depo, birim, dönüşüm, ayrılan ve kalan açıklanır. Yer yetmezse ara ihtiyaç kolonları kullanıcı görünüm ayarıyla daraltılabilir; hesap kaybolmaz. “Kombinasyona Aktar” yeni baskı netini; tüp planı tüp üretim ihtiyacını alır. Zemin, vernik, lak ve iç kaplama bağımsızdır.

## Entegrasyon ekranı
SQL senkronizasyon etkin; host, port, DB=AA_LIDER, kullanıcı, maskeli parola; her veri türü için schema/view adı, kolon eşleme, ayrı senkron aralığı; timeout, encrypt ve trust server certificate alanları. Örnek görseldeki host/şifre/view adları gerçek varsayılan yapılmaz. Kayıtlı parola geri dönmez; boş parola “mevcudu koru” anlamında açık belirtilir. Bağlantı testi, view/kolon testi, sınırlı önizleme, manuel senkron, son başarılı tarih ve hata. SQL identifier'ları güvenli doğrulanır; serbest SQL çalıştırma ekranı yapılmaz. Sırlar sunucu tarafında saklanır, log/browser/localStorage'a yazılmaz. Salt okuma kullanıcısı; ERP'ye DELETE/INSERT yok.
