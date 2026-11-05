# İş kuralları ve açık kararlar

## 1. Amaç ve sınırlar

Satış ve dolum planından doğan teneke tüp ihtiyacını, kullanılabilir stoklarla karşılaştırmak; uygun ürünleri belirlenmiş ham levhalarda baskı için birleştirmek; baskı miktarını ve oluşan eksik/fazlayı hesaplamak; matbaa tedariki ile teneke üretim kapasitesini dolum takvimine bağlamak.

Reçete ilişkisi: **Teneke Tüp → Kesik Levha → Baskılı Levha → Ham Levha**. Fiziksel üretim ters yönde ilerler. Dip/bombe ve ilgili pres malzemeleri de tüp üretiminin malzeme yeterlilik kontrolünde dikkate alınır.

### Kesinleşmiş kararlar

| Kod | Karar |
|---|---|
| K01 | Tüp kodunun kullanacağı ham levha kodu tanımlıdır. Yazılım başka levha ölçüsü önermez. |
| K02 | Levha başına çıkan tüp adedi hazır parametredir. Geometrik sığdırma, kesim payından kapasite türetme ve levha ölçüsü optimizasyonu yapılmaz. |
| K03 | Aynı montaj için çap ve boy eşitliği, tanımlı ham levha uygunluğu ve aynı zemin koşulu aranır. |
| K04 | Varsayılan renk sınırı 6'dır. Ürün renk sayıları toplanmaz; benzersiz renk kodlarının birleşimi sayılır. |
| K05 | Varsayılan minimum baskı 1.250 levhadır. Değer kod içine sabitlenmez; yönetilebilir parametredir. |
| K06 | Ürün kodları, ebatlar, levhalar, renkler, yüzeyler, kapasite, vardiyalar, entegrasyon eşlemeleri ve kurallar yönetim ekranlarından tanımlanır. |
| K07 | 4–8–8 bir örnek dağılımdır. Bütün ebatlara uygulanacak sabit bir dağılım veya tekrar katı değildir. |
| K08 | Kaynak tablodaki “Çeşit” alanının bağlayıcı anlamı henüz kesinleşmedi. Zorunlu tekrar katı veya maksimum çeşit kuralı kendiliğinden çıkarılmaz. |
| K09 | Zemin, vernik, lak ve iç kaplama ayrı özelliklerdir. Birbirinin yerine kullanılmaz. |
| K10 | SQL Server view'ları ve kolon eşlemeleri parametrik olacaktır. SSMS bir yönetim istemcisidir; bağlantı SQL Server'a yapılır. |
| K11 | İhtiyaç verisinin brüt/net kapsamı belirlenir; aynı stok iki kez düşülmez. |
| K12 | Tasarımda ALPER DESIGN OS başlangıçtan uygulanır. Erişilemeyen entegrasyon tamamlanmış sayılmaz. |
| K13 | Geliştirme yerelde Docker ile, kullanım Coolify ortamında olacaktır. Yerel geliştirme sunucusu kalıcı üretim ortamı değildir. |
| K14 | Demo, manuel deneme, uygulanabilir öneri ve onaylı üretim planı birbirinden görünür biçimde ayrılır. |
| K15 | Parametre/algoritma değişikliği onaylı eski planı sessizce değiştirmez. Yeni plan revizyonu oluşturulur. |

“Her şey parametrik” mevcut iş kavramları ve kural türlerinin yönetilebilir olması anlamına gelir. Tamamen yeni bir operasyon veya kural operatörü gerekirse yazılım geliştirmesi gerekebileceği saklanmaz.

### İlk kapsamın dışında

- Serbest geometrik yerleşim, nesting, otomatik kesim yolu ve alternatif levha tasarımı.
- Baskıya hazır grafik/CTP dosyasını otomatik üretmek.
- ERP'ye otomatik üretim, stok hareketi veya muhasebe kaydı yazmak.
- Tedarikçi portalına otomatik sipariş göndermek veya izinsiz e-posta göndermek.
- Yapay zekâya sayısal planlama kararlarını doğrulanmadan bırakmak.


## 14. Açık sorular ve karar zamanı

| Konu | Netleştirilecek karar | Gerekli olduğu faz |
|---|---|---|
| Çeşit/tekrar | Çeşit sütunu üst sınır mı, standart montaj bilgisi mi? Tekrarların izin verilen dağılımları neler? | 2; otomatik hesap öncesi |
| Minimum baskı | Tedarikçi, levha, montaj veya sipariş toplamı bazında mı? Çakışan değerlerde öncelik? | 2 |
| Renk istisnası | Belgede geçen onaylı 6 üstü baskı hâlâ geçerli mi? Varsayılan şu an 6 kesin sınır. | 2–4 |
| Özel lak kuralı | Tüm ürünlere mi, en az bir başka ürüne mi uygulanıyor? | 2 |
| Vernik | Farklı vernikler hangi koşullarda birlikte basılabilir? | 2 |
| Birimler | 17/18 kalınlık gösterimi, kg/levha/adet dönüşümleri | 2–3 |
| İhtiyaç view'ı | Brüt/net, düşülen stoklar/açık işler, sipariş anahtarı ve dolum tarihi | 3 |
| Revizyon | Hangi eski revizyon hangi siparişte kullanılabilir? | 2–3 |
| Fire | Baskı/kesim/tüp kayıp oranı, sabit hazırlık kaybı ve yuvarlama | 2–4 |
| Fazla üretim | PL onayı, kendi marka stok hedefleri ve üst sınırlar | 2–4 |
| Plan ufku | Kaç gün ileri ihtiyaçlar birlikte değerlendirilecek; yakın dönem kilidi? | 3–5 |
| Hatlar | Makas/tüp/pres sayısı, uygun ebatlar, net kapasite ve değişim süreleri | 2–5 |
| Operasyon akışı | Kısmi parti transferi, kalite süresi, nakliye ve tedarikçi terminleri | 5 |
| Onaylar | Roller, yetki sınırları, vekâlet ve istisna politikaları | 2–6 |
| Canlı ortam | Hedef Coolify sunucusu, domain, erişim ve yedek sorumlusu | 7 |

Bu sorular Faz 0–1 ekran geliştirmesini durdurmaz. Etkilenen hesap veya onay akışı, sorusu yanıtlanmadan doğrulanmış kabul edilmez.
