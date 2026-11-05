# Yol haritasına eklenecek fazlar
Bu belge mevcut yol haritasının yerine geçmez; güncel repo STATUS ve karar kaydıyla birleştirilir. Tamamlanmış fazlar yeniden başlatılmaz. Rapor edilen bir test otomatik olarak burada doğrulanmış sayılmaz.

## Faz 2C — Tanımlar merkezi ve teknik veri girişi
Bağımlılık: Mevcut Faz 2/2B veri kalıcılığı ve ortak kural motoru işi tamamlanmış olmalı; mevcut durum repodan okunur.
Kapsam: Tanımlar menüsü; stok ana kartı/teknik kart sahipliği ayrımı; stok koduyla otomatik ad; ham levha FK eşleşmesi; renk/zemin/vernik/lak/iç kaplama CRUD; Excel önizleme/kolon eşleme/import; değişiklik geçmişi; kullanılan kayıtlarda pasife alma.
Kabul: 03 belgesindeki dokuz koşul. SQL gerçek bağlantı olmadan katalog adapter'ı test verisiyle çalışabilir; gerçek entegrasyon diye sunulmaz. Yeni faz teknik kartı oluştururken ebat kapasitesi/yerleşim kuralı uydurmaz.

## Faz 3A — AA_LIDER veri sözleşmesi ve SQL entegrasyonu
Kapsam: IT metadata keşfi; beş temel view sözleşmesi; source DB MikroDesktop_LIDER26 → connection DB AA_LIDER; parametrik bağlantı ve view/kolon eşlemesi; salt okuma; stok depo politikası; brüt/net kaynak anlamı; reçete birim katsayılarının doğrulanması; staging ve atomik snapshot; senkron logları.
Kabul: Yetkili gerçek bağlantıda tüm view ve zorunlu kolonlar doğrulanır; kaynak kayıt anahtarları tekil; başarısız senkron son başarılı snapshot'ı bozmaz; secret response/log'da yok; ERP yazma yok. IT erişimi yoksa erişimle bağımsız işler tamamlanır ve canlı doğrulama “bekliyor” kalır.

## Faz 3B — Çok seviyeli ihtiyaç motoru ve İhtiyaç Havuzu
Kapsam: Tüp → Kesik → Baskılı netleme; birim dönüşümü; stok tahsisi; kaynak izlenebilirliği; ara ihtiyaçlar; yeni kolonlar; ortak stok ve karışık levha korunumu; eksik reçete durumları; kombinasyon aktarımı.
Kabul senaryoları:
- gross 50.000 / tube 10.000 / cutEq 5.000 / printedEq 7.000: tubeProduction 40.000, cutting 35.000, newPrint 28.000.
- gross 5.000 / tube 10.000: üretim, kesim, baskı=0; 5.000 tüp tahsis, 5.000 bakiye.
- gross 10.000 / tube 2.000 / cutEq 9.000: tubeProduction 8.000, cutting/printing=0; kesik tahsis 8.000, bakiye 1.000.
- Aynı tüp için iki talep 8.000+8.000 ve tek stok 10.000: toplam yeni tüp üretim ihtiyacı 6.000; stok iki kez düşülmez.
- Aynı fiziksel baskılı stoğu paylaşan ürünler: işlem/levha miktarı bir kez tüketilir, her çeşide doğru tekrar çıktısı yazılır.
- Native 100 baskılı levha, doğrulanmış aynı çeşit 20 tüp/levha örneğinde 2.000 tüp eşdeğeri. Aynı 20 kapasitenin karışık montajında ürüne 4 tekrar ayrılmışsa yalnız 400 tüp o ürüne aittir; kalan çıktılar diğer varyantlara gider. Bu sayılar test fixture'ıdır, stok birimi varsayımı değildir.
- Eksik reçete, sıfır katsayı, farklı birim, çoklu aktif alternatif: satır görünür, onay engelli.
- Negatif stok uyarısı; stok fazlasında negatif ihtiyaç yok.
- Havuzdan seçimi değiştirince daha önce tahsis edilmiş stok tekrar serbest sanılmaz.

## Faz 3C — Excel/SQL/uygulama mutabakatı
Kapsam: Aynı zamanlı kaynak snapshot'ıyla seçili ürünlerde brüt, tüp, kesik, baskılı, birim, depo ve termin mutabakatı; fark nedeni raporu. Kaydedilmiş eski Excel değerleri güncel canlı stokla karşılaştırılıp fark “hata” sayılmaz.
Kabul: En az 10 temsilî ürün; üç farklı ebat; eksik reçete, bloke depo, çoklu sipariş, stok fazlası, tarihli planlı arz örnekleri. Beklenen sonuçlar uygulama motorunu kopyalayan ikinci kodla değil bağımsız sayısal fixture'larla test edilir. Excel'in hatalı davranışı doğru sonuç diye korunmaz. Mutabakat kaydında tarih, kaynak, birim ve politika sürümü bulunur.

## Mevcut Faz 4 — Kombinasyon motoruna eklenecek bağımlılık
Girdi yalnız yeni baskı net ihtiyacı. Hazır levha kapasitesi, tekrar katı, satır/sütun homojenliği, max6 benzersiz renk, zemin ve özel lak/ürün kuralları korunur. Farklı ham levha önerme/nesting hesabı yok. Montaj görüntüsü onaylı fiziksel şablona göre; bilinmeyen satır/sütun yönü adetten türetilip gerçek diye çizilmez. Minimum baskı fazlası ayrıca görünür. Tanım/kural sürümü hesapla birlikte saklanır.

## Mevcut Faz 5 — Üretim ve kapasite planına eklenecek kapsam
Tüp üretimi, kesim, baskı ve tedarik ihtiyacı ayrı. Makine hızları adet/dakika olarak etiketlenir. Normal/gece/mesai takvimi, molalar, çap/boy hazırlık matrisi parametrik. 40.000 tüp ihtiyacının 28.000'e yanlış düşürülmediği kabul testi zorunlu. Gelecekteki arz geçmiş termin açığını kapatmaz. Ham levha satın alma ihtiyacı baskı işinden ayrılır.

## Mevcut Faz 6 — Form ve izlenebilirlik
Matbaa/ajans sipariş çıktısında doğru stok kodu, ham levha kodu/ölçüsü, basılacak levha, ürün tekrarı/çıktısı, renk ve kaplama, minimum baskı farkı, plan/snapshot/revizyon kimliği. Üretim formunda iç kaplama/lak tanımları doğru ayrı alanlardan alınır; sipariş ve notlar baskı alanında kalır.

## Durum ve hafıza
STATUS.json mevcut şemasına uygun ekleme yapılır; Faz 2C/3A/3B/3C başlangıçta planned/pending. docs/KARAR-KAYDI.md'ye yeni kararlar eklenir. AGENTS.md'ye 05 belgesindeki kurallar aktarılır. Her faz sonunda: yapılanlar, test kanıtı, bekleyen kararlar, sonraki tek faz özeti. Başarılmamış canlı SQL testi “passed” yazılmaz. Bu paket uygulama geliştirmesinin tamamlandığı iddiası taşımaz.
