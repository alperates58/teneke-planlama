# Teneke Planlama — Bütünleşik Yol Haritası v2
Tarih: 06.11.2026 (Türkiye). Bu belge eski faz tarihçesini silmeden sonraki uygulama sırasını günceller.

## Güncel başlangıç
Kullanıcının paylaştığı son Antigravity raporu, Faz 2C'de modüler Node backend, PostgreSQL, sunucu oturumları, CRUD, sürüm kontrolü ve gerçek Excel aktarımının yapıldığını; 39 entegrasyon kontrolünün geçtiğini bildiriyor. Bu belge o teslimi referans alır; bu oturumda kaynak kod/testler bağımsız yeniden çalıştırılmadı. Aktif yerel adres localhost:3001; 3000 başka projeye ait. Çalışan UI public/ SPA, backend server/ altında. Pasif src/ Next.js kodu otomatik yeniden devreye alınmayacak. Faz 7'de zorunlu framework taşıması yok; mimari birleştirme ayrı karardır.

Öncelik: Kullanıcı teknik baskı verilerini toplarken mevcut tüp planını içeri almak, tek makine planını uygulamada düzenlemek ve kontrollü biçimde meltem_teneke'ye geri yazmak. Renk/zemin eksikliği tüp planını engellemez; yeni baskı montajı için gerekli teknik uygunluğu etkiler.

## Uygulama sırası
Faz numaraları tarihsel kimliktir; çalışma sırası bağımlılıklara göredir. Bu nedenle 5A üretim planı, 4 baskı kombinasyonundan önce teslim edilir.

| Sıra | Faz | Çıktı | Bağımlılık |
|---:|---|---|---|
| 0 | 0–1 | Proje temeli ve ilk ekranlar; tarihçe korunur | Mevcut |
| 1 | 2 / 2B / 2C | Parametre, kural ve kalıcı veri; son 2C tesliminin hedefli kabul kontrolü | Mevcut |
| 2 | 3A.1 | SQL şeması ve mevcut meltem_teneke planının kayıpsız snapshot'ı | 2C |
| 3 | 2D | Impeccable öncülüğünde İhtiyaç Havuzu pilot tasarımı ve UI sözleşmesi | 2C; 3A.1 ile ayrı dosyalarda paralel yürüyebilir |
| 4 | 3A.2 | Stok kartı, brüt talep, reçete, depo stok ve dış plan senkronizasyonu | 3A.1 |
| 5 | 3B | Tarihli ihtiyaç ve kademeli stok tahsis motoru | 3A.2 |
| 6 | 5A | Tek tüp makinesi, çalışma takvimi ve düzenlenebilir üretim planı | Mevcut plan içeri alınmış; 3B ile ihtiyaç ilişkisi |
| 7 | 5W | Onaylanan planın meltem_teneke'ye kontrollü geri yazımı | 3A.1, 5A ve doğrulanmış yazım sözleşmesi |
| 8 | 3C.1 | Tüp talebi/stok/takvim/plan ve geri yazım mutabakatı | 3B, 5A, 5W |
| 9 | 4 | Teknik verisi tamamlanan ürünlerde yeni baskı kombinasyonu | 3B, gerekli baskı tanımları |
| 10 | 5B + 3C.2 | Baskı/kesim/malzeme tarihleri ile planın birleştirilmesi ve tam mutabakat | 4, 5A |
| 11 | 6 | Matbaa/ajans siparişi, gerçekleşme ve izlenebilirlik | 4, 5B |
| 12 | 7 | Şirket 0101 sunucusunda Coolify yayın ve kabul | İlgili işlevlerin kabulü |

3B'de kesik/baskılı dönüşüm bilgisi eksikse doğrulanmış tüp stok netlemesi ilerler; alt seviye net baskı sonucu “hesaplanamadı” kalır. Eksik katsayı nedeniyle tüp planının tamamı durmaz. Tasarım pilotunun onayı da backend/SQL incelemesini bekletmez. Kullanıcı işlevsel onayları ve tasarım seçimini somut ekranlar üzerinden verir; her alt fazda gereksiz yeniden başlatma izni istenmez.

## Faz 2C — hedefli teslim kontrolü
Fazı bütünüyle yeniden yazma. Rapordaki test 7, bir geçerli ve bir hatalı satırdan geçerli olanın kaydedildiğini söylüyor. Önceki sözleşmede varsayılan bütün importun reddedilmesiydi. Gerçek davranışı kontrol et: varsayılan atomik dosya kabulü; kısmi kayıt ancak açık kullanıcı seçimi ve atlanan satır raporuyla. Transaction kullanılması tek başına bu ürün davranışını kanıtlamaz.
- Teknik kart dışında ham levha, kapasite, sözlük, matbaa/özel kuralların gerçekten DB'de saklandığını ve sunucudan doğrulandığını denetle.
- Auth rolü istemcinin keyfi seçimine güvenmemeli. Yenileme/başka oturum ve servis restart kontrolü, DB referansları ve yarışan güncelleme davranışı sınanmalı.
- 42 katalog kaydı örnek/başlangıç verisidir; canlı ERP senkronu tamamlanmadan canlı diye etiketlenmez.
- 2B geri alındı/tekrar uygulandı geçmişi net kanıt yoksa kullanıcı beyanı olarak korunur; yeni bir 2B yeniden yazımı başlatılmaz.

## Faz 3A.1 — Şema keşfi ve mevcut planı koruma
AA_LIDER bağlantısından canlı metadata ve sınırlı SELECT ile meltem_teneke, alper_tenekeuretim, alper_terminler, reçete ve stok kaynaklarını incele. Kullanıcının güncel beyanına göre mevcut aktif plan meltem_teneke'dedir. Eski Excel analizinde farklı tablolar farklı görevlerde kullanılmıştı; karar canlı kolonlar, gerçek kayıtlar ve Excel'in okuma/yazma sorgularıyla doğrulanacak. Kanıtsız tablo adı değiştirilmeyecek.

Keşif: kolon/veri tipi, PK/unique index, sıra kolonu, miktar/tarih anlamı, seri/plan/makine kapsamı, tetikleyici/varsayılanlar, Excel sorgusunun ORDER BY ve yazım yöntemi. Yetkinin teknik olarak SELECT dışını da kapsaması otomatik veri değiştirme yetkisi sayılmaz.

Mevcut plan, sırası/miktarları/tarihleri/notları korunarak PostgreSQL'e değişmez kaynak snapshot'ı ve taslak sürümü olarak alınır. Kaynak checksum/versiyon ile satır kimlikleri tutulur. İlk alım otomatik programlama, sırayı düzeltme veya miktar netleme yapmaz. SQL'in doğal satır sırası yoktur. Açık sıra alanı/ORDER BY yoksa UI mevcut sıranın kesin olduğunu iddia etmez; sıra sözleşmesi çözülene kadar geri yazım engellidir. Otomatik INSERT-ID sırası uydurulmaz.

Kabul: kaynak ve snapshot kayıt/miktar/sıra mutabakatı; sıfır ERP veri değişikliği; belirsizliklerin görünür olması; API üzerinden mevcut planın açılması.

## Faz 3A.2 — ERP veri alımı
Beş temel view sözleşmesi: StokKartlari, TupBrutIhtiyac, ReceteBaglantilari, StokDepo, PlanliTupArz. Önerilen isimler AA_LIDER.dbo.AA_tp_vw_*; ekranın schema/view ve kolon eşlemeleri parametrik. Kaynaklar MikroDesktop_LIDER26 ve doğrulanan AA_LIDER nesneleri. Önceden verilen sorgular ve Excel/VBA metinleri başlangıçtır; miktar/anahtar/birim kolonları tahmin edilmez.

View kurulum SQL'i, önce tanım ve örnek sonuç olarak hazırlanır; yalnız bu projeye ait doğrulanmış nesnelere uygulanır. Başka view'ler körlemesine ALTER edilmez. Kaynak ERP tablolarına entegrasyon senkronu yazmaz. Uygulama sorguları backend'den çalışır.

SQL bağlantı ekranı: enabled, host, port, database, kullanıcı/gizli parola, schema/view adları, kolon eşleme, her veri türü için aralık, timeout, encrypt ve trust certificate, test/önizleme/manüel senkron/son hata. Kaydedilmiş parola API/log/localStorage'a geri verilmez. Staging+atomik snapshot ile yarım senkron mevcut doğru veriyi bozmaz.

Bütün tüp stok kodları gelir; teknik kart eksikleri nedeniyle stok kartı filtrelenmez. Senkron ERP ana alanlarını günceller, yerel renk/lak/zemin/levha ilişkisini ezmez. 172.17.0.6 adresinin gerçekten kurumsal endpoint mi, Docker bridge ile çakışan adres mi olduğu keşifte not edilir; keyfi değiştirilmez. Host erişimi yanında hedef Docker ağından erişim doğrulanır.

## Faz 3B — Talep ve malzeme tahsisi
Talep dolum planının hangi tarihte hangi tüpe ihtiyaç duyduğunu ifade eder. Gelecek üretim mevcut stok değildir. Açılış stoğu bir kez, zamanlı arz yalnız yetiştiği tarihte kullanılır; eski ve yeni plan aynı iş olarak iki kez sayılmaz. Kaynak PLANMIKTAR'ın brüt/açık/gerçekleşme sonrası anlamı doğrulanır.

50.000 brüt, 10.000 tüp stoğu → 40.000 tüp üretimi; 5.000 tüp eşdeğeri kesik → 35.000 kesim; 7.000 tüp eşdeğeri baskılı → 28.000 yeni baskı. Bunlar üç ayrı iş miktarıdır. Fiziksel levha stoku doğrulanmış reçete katsayısıyla tüp eşdeğerine çevrilir; karışık montajın tüm kapasitesi her çeşide ayrı verilmez. Ortak kaynak bir kez tahsis edilir. Ham stoğu baskı işini değil satın alınacak ham miktarını azaltır.

Havuz: brüt, tüp stok/tahsis, tüp üretim ihtiyacı, kesik stok/tahsis, kesim ihtiyacı, baskılı stok/tahsis, yeni baskı ihtiyacı, termin ve teknik durum. Detayda yerel birim, katsayı, depo, kaynak tarih ve snapshot görülür. Eksi stok/eksik reçete/çoklu alternatif satırdan kaybolmaz. Sayısal örnek ve çoklu sipariş/ortak stok testleri zorunlu.

## Faz 5A — Tek makinede tüp planı
Tek tüp üretim makinesi. İleride genişleyebilen makine tanımı olabilir, fakat birden fazla hat kapasitesi uydurulmaz. Mevcut sırayı koru; kullanıcı sürükle-bırak, yukarı/aşağı, çoklu satır taşıma ile değiştirir. Sabitlenmiş satır/başlangıç ve gerçekleşmiş işler otomatik oynatılmaz. Öncelikle termin ve manuel sıra; hazırlık azaltma önerileri ayrı senaryodur.

Ebat bazında hız adet/dakika; vardiya takvimi, mesai, hafta sonu/tatil, molalar ve çap/boy geçiş hazırlığı parametrik. Excel'in 07:30–17:30, gece 01:30 ve diğer süreleri mevcut örnek ayardır; kodda değişmez kural değildir. Excel'deki “Normal Vardiya Dk” kolonunun gerçek birimi adet/dakikadır. MESAİ bitişi kullanıcı tanımına dayanır; belirsizse 20:00 veya başka saat varsayılmaz.

Plan oluşturma/düzenleme/senaryo karşılaştırma uygulama DB'sinde. Kullanıcı sıra değiştirince yalnız etkilenen ileri bölüm takvimle yeniden hesaplanır; önizleme sunulur. Excel son üç hane sipariş notu yerine gerçek sipariş/satır ilişkisi korunur. Takvim sınırları, gece taşması, mola ortası ve hazırlıklar test edilir. Geç gelen arz geçmiş termin açığını kapatmaz. Eksik baskı bilgisi tüp planını engellemez; doğrulanmamış malzeme hazır tarihi planı “malzeme teyidi bekliyor” yapar, kesin uygulanabilir diye sunulmaz.

## Faz 5W — meltem_teneke geri yazımı
Kullanıcı yetkisi: Uygulamada düzenlenen plan kullanıcı tarafından kaydedildiğinde meltem_teneke'ye geri yazılabilir. Bu, önceki genel salt okuma ilkesinin dar kapsamlı istisnasıdır. Diğer stok/reçete/ERP tablolarına yazma yetkisi değildir.

Önkoşul: AA_LIDER.dbo.meltem_teneke gerçek hedef/kapsam ve Excel okuma-yazma sırası doğrulanmış olacak. PostgreSQL taslağı düzenlenirken SQL'e arka planda otomatik yazılmaz. Kaydet/Yayınla öncesi eski-yeni sıra, miktar, tarih, eklenecek/silinecek satırlar gösterilir. Silme, plan kapsamından satır çıkarma anlamında yalnız görünür fark içinde yapılabilir; tablonun bütün kayıtlarını kontrolsüz DELETE etmek kapsam dışıdır.

SQL tarafında kaynak sürümü/hash karşılaştırma, transaction ve uygun kilitleme ile Excel'in arada yaptığı değişiklik korunur. Çakışmada 409 ve yeniden karşılaştırma; sessiz son yazan kazanır yok. Eşzamanlı Excel istemcisi transaction sonrasında tekrar plan yazabiliyorsa bu risk yalnız hash ile bitmez; ortak kullanım/yayın sahipliği ve yeniden uzlaştırma açık tasarlanır.

Plan kapsamını tutarlı biçimde yedekle; kaynak değişmez snapshot, geri dönüş SQL/işlemi ve kimlik bilgisi kaydı. Kaynakta order alanı yoksa Excel'i de kapsayan açık schema/query uyarlaması hazırla; kapsam onaylanmadan kaynak tabloya gizli kolon ekleme. En az gerekli yetkili yazma yolu, tercihen sınırlandırılmış prosedür; uygulamada genel SQL konsolu yok. Yetkisiz kullanıcı reddedilir.

PG ve SQL Server iki ayrı DB: tek bir transaction ikisini otomatik atomik yapmaz. Yayın isteği/idempotency kimliği, pending/succeeded/failed/unknown durumu ve read-back uzlaştırması gerekir. SQL commit oldu, PG yanıt alamadı senaryosunda ikinci kez kayıt basılmamalı. Normal retry ve geri alma karşı taraftaki yeni Excel değişikliklerini ezmemeli. Canlı ilk yazım yalnız hedefli test ve kullanıcıya gösterilen somut plan onayı sonrası; bu yol haritası şimdi canlı yazım komutu değildir.

Kabul: sıra korunumu, Excel değişikliği çakışması, hata halinde rollback, timeout sonrası tekil yayın, read-back doğrulaması, yetki ve geri dönüş testi. Canlı planı bozacak otomatik test çalıştırılmaz.

## Faz 3C.1 / 3C.2 — Mutabakat
3C.1: Aynı snapshot'ta tüp talebi, açılış stok, planlı arz ve günlük bakiye; sıra/miktar/tarih takvimi; yayın read-back. En az 10 temsilî ürün ve gece/mesai/hazırlık örnekleri.
3C.2: Kesik/baskılı birim dönüşümü, ortak montaj kaynakları ve yeni baskı; kaynak Excel ile farkların açıklaması. Farklı tarihteki eski Excel cache'i güncel stokla aynı olmak zorunda değildir. Excel'in tespit edilen hataları beklenen davranış diye korunmaz.

## Faz 4 — Baskı kombinasyonu
Teknik kartı hazır ürünleri kullan; eksikleri tamamlanacaklar listesinde tut. Girdi yeni baskı net ihtiyacıdır, tüp üretim ihtiyacı değildir. Kapasite hazır parametre; alternatif levha/nesting yok. Ürün tekrarı adımın katı; satır/sütun homojenliği, aynı ebat/zemin/ham levha, max6 benzersiz renk, minimum1.250 levha varsayılanı ve parametrik özel kurallar birlikte doğrulanır. Örnek 52x195 4+8+8 uygun, 5+7+8 geçersiz.

Fiziksel görüntü kayıtlı levha oranı ve onaylı şablondan gelir. Kapasiteden keyfi 2x10 düzen türetilmez. Eksik şablon fiziksel uygun sayılmaz. Fazla üretim, minimum baskı altı ve çözüm yok gerekçeleri görünür. ALLOW/FORBID gibi kurallarda kapsam ve çift yönlü kontrol korunur; ürün gruplarına kullanıcı tanımlamamış yasak türetilmez. Parametre/kural revizyonu hesapla saklanır. Kullanıcıya onaylı en iyi çözüm diye sunmak için hedefler, arama sınırı ve sonuç kalitesi açık olmalı.

## Faz 5B — Malzeme ve operasyon bağlantısı
Matbaa termin/sevkiyat/kalite, kesim ve tüp üretimi tarihleri ilişkilendirilir. Fiziksel stok, planlı gelecek arz ve satın alma ayrılır. Hazır kesik/baskılı ürün yeni baskı beklemeden uygun operasyona gider. Lot/revizyon/kalite serbestliği korunur. Malzeme eksikliği alternatif senaryo üretir; onaylı mevcut sıra sessiz değiştirilmez.

## Faz 6 — Sipariş ve takip
Matbaa ve ajans için Excel/PDF sipariş çıktısı: plan/montaj/revizyon, stok kod/adları, ham levha ölçüsü/kalınlık, renkler, zemin/vernik/lak/iç kaplama, ürün tekrar/çıktıları, levha miktarı, min baskı farkı, termin ve notlar. Onay/revizyon/gönderim/mal kabul/kalite/kesim/tüp gerçekleşmesi izlenir; başka sistemdeki gerçek kayıt yetkileri ayrıca sınırlandırılır. Gönderim düğmesi açık kullanıcı işlemi gerektirir.

## Faz 7 — Coolify ve işletim
Hedef şirket lider-server / hostname0101; kişisel alperserver değil. Coolify'da ayrı proje/resource, internal PG, kalıcı volume, migration job, gizli değişkenler, backup/restore ve health/readiness. Domain kullanıcıdan alınır; uydurulmaz. Host ve uygulama konteyneri SQL bağlantısı ayrı doğrulanır. Statik varsayılan DB şifreleri kaldırılır, PG public port açılmaz. SQL okuma ve plan yazma yetkileri ayrı kapsamda yönetilir. UI tasarımını veya framework'ü yayın anında yeniden yazma.

Planlama çekirdeğinin erken şirket sunucusu önizlemesi gerekirse ayrı staging resource olarak alınabilir; final kabulü tamamlanmış sayılmaz. Kullanıcının GitHub push/deploy iş akışı Antigravity üzerinden yürür; bu belge şimdi bir canlı deployment işlemi gerçekleştirmez.
