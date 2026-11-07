# TENEKE PLANLAMA — ANA YOL HARİTASI

Sürüm: 1.0  
Tarih: 5 Kasım 2026  
Proje sahibi: Alper Ateş  
Geliştirme: Antigravity, yerel Docker  
Hedef çalışma ortamı: Coolify üzerinde Docker  
Belge durumu: Faz planı hazır; yazılım fazlarının tamamlandığı henüz doğrulanmadı.  
İlk uygulama kapsamı: Faz 0 ve Faz 1.

Bu belge projenin kapsamını, kesinleşen kararlarını, açık sorularını, ekranlarını ve faz kabul koşullarını birlikte korur. Antigravity projesinde `docs/TENEKE-PLANLAMA-ANA-YOL-HARITASI.md` olarak saklanması önerilir. Sonraki geliştirmelerde güncel belge esas alınır; değişiklikler karar kaydına eklenir.

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
| K16 | Levha kapasitesi hesaplanmaz; gerçek levha oranı ve kullanıcı tarafından tanımlanmış montaj düzeni görselleştirilir. |

“Her şey parametrik” mevcut iş kavramları ve kural türlerinin yönetilebilir olması anlamına gelir. Tamamen yeni bir operasyon veya kural operatörü gerekirse yazılım geliştirmesi gerekebileceği saklanmaz.

### İlk kapsamın dışında

- Serbest geometrik yerleşim, nesting, otomatik kesim yolu ve alternatif levha tasarımı.
- Baskıya hazır grafik/CTP dosyasını otomatik üretmek.
- ERP'ye otomatik üretim, stok hareketi veya muhasebe kaydı yazmak.
- Tedarikçi portalına otomatik sipariş göndermek veya izinsiz e-posta göndermek.
- Yapay zekâya sayısal planlama kararlarını doğrulanmadan bırakmak.

## 2. Kaynaklar ve doğrulanmış örnekler

Kaynak dosyalar:

- [Teneke kutu üretim süreci](https://chatgpt.com/library?file_id=libfile_fb2dcd89be708191a8b8427f205a48f8&account_id=personal): operasyonlar, revizyon, kalite, PL fazla üretim onayı, fason stok ve pres ilişkileri.
- [SOFT matbaa sipariş formu](https://chatgpt.com/library?file_id=libfile_2a1e9b17fbb48191adff9541f0fdb018&account_id=personal): iki montaj, levha miktarı, ürün tekrarları ve form alanları.
- [Ham levha parametreleri](https://chatgpt.com/library?file_id=libfile_08eb983ba0288191811afda0cb9dd84f&account_id=personal): kodlar, ölçüler ve minimum baskı alanı.
- [Ebat/kapasite tablosu](https://chatgpt.com/library?file_id=libfile_0365857c2fbc8191ac212fa5833a2ef8&account_id=personal): hazır kapasite değerleri.
- [Ürün teknik parametreleri](https://chatgpt.com/library?file_id=libfile_c63d3bd80d6081919c404963407eeb8b&account_id=personal): tüp, ham levha, zemin, vernik, lak ve renkler.
- [Mevcut teneke üretim planı](https://chatgpt.com/library?file_id=libfile_14fff94904848191a9641ca5732afe5e&account_id=personal): tarih, hafta, tüp kodu, ebat ve üretim miktarı.

Kullanıcının son açıklamaları kaynak belgelerle çelişirse son açıklamalar esas alınır. Bağlantılar arşiv referansıdır; Antigravity'nin erişemediği kaynakların dosya kopyaları ayrıca projeye eklenir. Bu belge erişilebilir kaynakların yerini almış sayılmaz.

### Referans kapasite tablosu

Aşağıdaki değerler sağlanan görselden aktarılmıştır. “Çeşit” ve “Adet” başlıklarının operasyonel anlamı Faz 2'de netleştirilir; bu tablodan fiziksel yerleşim kuralı türetilmez. Adet sütunları 1.250 levha için kaynak değerlerdir.

| Ebat | Tüp/levha | Kaynak çeşit | Kaynak adet | Kaynak tek çeşit sipariş miktarı |
|---|---:|---:|---:|---:|
| 45×100 | 48 | 8 | 7.500 | 60.000 |
| 45×140 | 36 | 6 | 7.500 | 45.000 |
| 45×175 | 30 | 6 | 6.250 | 37.500 |
| 52×90 | 45 | 9 | 6.250 | 56.250 |
| 52×105 | 40 | 8 | 6.250 | 50.000 |
| 52×132 | 30 | 6 | 6.250 | 37.500 |
| 52×161 | 25 | 5 | 6.250 | 31.250 |
| 52×165 | 25 | 5 | 6.250 | 31.250 |
| 52×195 | 20 | 5 | 5.000 | 25.000 |
| 52×214 | 20 | 5 | 5.000 | 25.000 |
| 52×234 | 15 | 5 | 3.750 | 18.750 |
| 65×104 | 32 | 8 | 5.000 | 40.000 |
| 65×165 | 20 | 5 | 5.000 | 25.000 |
| 65×195 | 16 | 4 | 5.000 | 20.000 |
| 65×234 | 12 | 3 | 5.000 | 15.000 |
| 65×240 | 12 | 3 | 5.000 | 15.000 |
| 65×270 | 12 | 3 | 5.000 | 15.000 |
| 65×300 | 12 | 3 | 5.000 | 15.000 |

Kaynak notu: 57 çap tüpler rutinde Sarten'de yaptırılıyor; sipariş özelinde tedarikçiden minimum adet isteniyor. Bu gruba yukarıdaki varsayılan kapasite/minimumlar otomatik uygulanmaz.

### SOFT referans hesabı

52×195; ham levha formda 0,17×832×800; 20 tüp/levha; 1.250 levha:

| Ürün | Tekrar/levha | Teorik tüp adedi |
|---|---:|---:|
| Vanilla | 4 | 5.000 |
| Oceanic | 8 | 10.000 |
| Lavender | 8 | 10.000 |
| Toplam | 20 | 25.000 |

İkinci montaj: Citrus×4, Antitütün×8, Rose×8. Formda içi GOLD, dışı EMAYE, CMYK, SOFT revizyon 08 ve CTP montajının gönderileceğine dair not var. Bu değerler yalnız bu kaynak örneğe aittir; başka ürünlere varsayılan yapılmaz.

Kalınlık tablosundaki “17/18” gösterimi ile formdaki “0,17” arasındaki birim/dönüşüm doğrulanmalıdır. “17 mm” şeklinde otomatik yorumlanmaz. Gövde ve baskı fireleri yukarıdaki teorik çıktılara dahil değildir.

## 3. Faz özeti ve bağımlılıklar

| Faz | Amaç | Ana teslim | Bağımlılık | Başlangıç durumu |
|---|---|---|---|---|
| 0 | Teknik ve tasarım temeli | Docker'da açılan uygulama | Yok | Planlandı |
| 1 | İlk ekranlar | İşleyen demo arayüz | 0 | Planlandı |
| 2 | Parametreler ve kalıcı veri | PostgreSQL, kurallar, temel roller | 1 | Planlandı |
| 3 | Gerçek veri entegrasyonu | View eşlemeleri ve ihtiyaç havuzu | 2 | Planlandı |
| 4 | Kombinasyon hesabı | Açıklanabilir öneriler | 2–3; kritik iş soruları | Planlandı |
| 5 | Üretim çizelgesi | Malzeme ve kapasiteye uygun takvim | 4; kapasite verileri | Planlandı |
| 6 | Sipariş ve operasyon takibi | Form, onay, teslimat, gerçekleşen | 4–5 | Planlandı |
| 7 | Kabul ve canlıya geçiş | Coolify'da işletilebilir sürüm | 0–6 | Planlandı |

Bu belge bütün fazları planlar; bütün fazları bir kerede uygulama talimatı değildir. İlk geliştirme Faz 0–1 ile başlar. Tamamlanma, yalnız kod yazılmasıyla değil ilgili kabul koşulları ve kanıtlarla kaydedilir.

## 4. Faz 0 — Proje temeli

### İşler

- 0.1 Mevcut çalışma klasörü, repository, Docker servisleri ve portlar incelenir; diğer projeler korunur.
- 0.2 Next.js, React ve TypeScript uygulaması kurulur. Bağımlılık sürümleri uygulama anında doğrulanır ve kilit dosyasıyla sabitlenir.
- 0.3 Dockerfile, Compose, örnek ortam dosyası, sağlık kontrolü ve kısa çalıştırma dokümanı oluşturulur. Gizli değerler repoya yazılmaz.
- 0.4 ALPER DESIGN OS mevcut kaynağından entegre edilir. Erişim yoksa bağımlılık açık kaydedilir; tamamlandı denmez.
- 0.5 Türkçe uygulama kabuğu, sol menü, üst araçlar, sayfa başlıkları, durum etiketleri, form ve tablo bileşenleri hazırlanır.
- 0.6 Domain modelleri, servis/veri erişim sözleşmeleri ve demo veri adaptörü ayrılır.
- 0.7 Türkiye saat dilimi, tarih gösterimi, adet/levha/birim ayrımı belirlenir. Tarih-only ihtiyaç günleri gereksiz UTC kaymasıyla değiştirilmez.
- 0.8 Yol haritası, karar kaydı ve faz durum dosyası proje içine konur.

### Kabul

- [ ] Temiz kurulumdan belgelenmiş komutla uygulama açılıyor.
- [ ] Docker yeniden başlatması başka projeleri etkilemiyor.
- [ ] Derleme ve TypeScript kontrolü başarılı.
- [ ] Masaüstü ve mobil gezinme çalışıyor.
- [ ] Tasarım sistemi entegrasyonunun durumu kanıtlı.
- [ ] Gerçek ERP veya üretim bağlantısı varmış gibi gösterilmiyor.

## 5. Faz 1 — İlk ekranlar ve demo akışı

### 1.1 Planlama özeti

Açık ihtiyaç, baskı bekleyen işler, eksik teknik veriler ve temsili termin riskleri. Kartlar aynı veri kümesinden türetilir; tıklama filtreli listeyi açar. Büyük dekoratif kartlar yerine planlamaya dönük bilgi yoğunluğu hedeflenir.

### 1.2 İhtiyaç havuzu

Sipariş/referans, tüp kodu/adı, çap–boy, ihtiyaç tarihi, brüt ihtiyaç, kullanılabilir tüp stoğu, net ihtiyaç, ham levha, zemin, renkler ve tanım durumu. Arama, çoklu filtre, sıralama, satır seçimi, detay paneli ve kombinasyon alanına aktarım çalışır. Demo brüt/net hesabının kapsamı açık gösterilir; çok seviyeli netleştirme yapılmış sayılmaz.

### 1.3 Teknik tanımlar

Sekmeler: tüp kartları, ham levhalar, ebat/üretim parametreleri, renkler, zemin/vernik/lak. Demo ekleme/düzenleme, zorunlu alanlar, kod tekrarı ve sayı kontrolleri. Düzenlemeler sayfa yenilemesinden sonra korunur; demo sıfırlama eylemi bulunur. Kaynak örnekler ile temsili kayıtlar ayrılır.

### 1.4 Kombinasyon çalışma alanı

Seçili ürünler; belirlenmiş ham levha; hazır tüp/levha kapasitesi; minimum baskı; renk birleşimi ve temel uygunluk kontrolleri. Manuel tekrar/levha adedi girişiyle teorik çıktı ve ihtiyaç farkı hesaplanır. Tekrarlar toplamı kapasiteyi aşamaz; boş kapasite görünürdür. “Manuel deneme — optimizasyon uygulanmadı” etiketi zorunludur. Fiziksel uygunluğu belirsiz dağılım onaylı üretim planı sayılmaz. Şematik ürün dağılımı gösterilebilir; ölçülü kesim yerleşimi gibi sunulmaz.

### 1.5 Teneke üretim planı

Liste ve haftalık takvim aynı demo işleri gösterir. Hat/makine, tarih, vardiya, ürün, miktar ve malzeme durumu. Detay ve demo tarih/hat değişikliği çalışır. Kapasite ve termin optimizasyonunun henüz uygulanmadığı açık görünür.

### 1.6 Entegrasyon ekranı

Sunucu, port, veritabanı, kullanıcı, view tanımları, kolon eşleme önizlemesi, brüt/net ihtiyaç seçimi. Gerçek bağlantı ve parola kaydı bu fazda yoktur. Test düğmesi sahte başarı üretmez; sonraki faz açıklamasıyla pasif olabilir.

### Kabul

- [ ] Tüm menüler, filtreler, detaylar ve demo düzenlemeleri çalışıyor.
- [ ] SOFT 4–8–8 örneği 5.000/10.000/10.000 sonucunu veriyor.
- [ ] 6 renk birleşimi geçiyor; 7 renk sınır ihlali gösteriyor.
- [ ] Eksik tanım ve minimum baskı altındaki denemeler görünür.
- [ ] Veri sayıları ekranlar arasında tutarlı.
- [ ] Yerel URL, ekran görüntüleri ve kısa tarayıcı doğrulaması teslim edildi.
- [ ] Ekran tasarımı kullanıcı incelemesine sunuldu; Faz 2'ye geçiş ayrıca kaydedildi.

## 6. Faz 2 — Kalıcı veri, parametre ve kural yönetimi

### İşler

- 2.1 PostgreSQL, migration ve kontrollü örnek veri kurulumu. Veriler container yenilenmesiyle kaybolmaz. Demo ve gerçek ortam ayrımı yapılır.
- 2.2 Tüp, ham levha, ebat kapasitesi, renk kataloğu, müşteri/marka, revizyon ve yüzey tanımları kalıcı hale getirilir. Kaynak kodlar metin olarak saklanır; baştaki sıfırlar korunur.
- 2.3 Parametre birimleri ve geçerlilik tarihleri tanımlanır. Kaynak değer ile normalize değer gerektiğinde birlikte tutulur.
- 2.4 Tekrar dağılımına ilişkin gerçek kısıtlar ve “Çeşit” alanının anlamı kullanıcıyla netleştirilir. Bu tamamlanmadan otomatik dağılım üretime uygun sayılmaz.
- 2.5 Kural modeli: kapsam, koşul, sonuç, kesin engel/onay/tercih türü, öncelik, geçerlilik ve açıklama. Çelişen kurallar kullanıcıya gösterilir.
- 2.6 Özel ürün için “hepsi laklı olmalı”, “en az bir başka laklı ürün bulunmalı”, “yalnız laksızlarla” gibi anlamlar ayrı operatörlerle ifade edilir; serbest açıklama tek başına çalışan kural değildir.
- 2.7 Makine/hat, vardiya, çalışma günü, mola, mesai, bakım, hız, ayar süresi ve fire tanımları oluşturulur. Kapasite değerinin net mi teorik mi olduğu saklanır.
- 2.8 Kullanılabilir depo, bloke/kalite durumu, revizyon uygunluğu, emniyet stoğu ve fazla üretim politika alanları.
- 2.9 Temel kullanıcı/rol ve değişiklik kayıtları: yönetici, planlama, görüntüleme; onay yetkileri iş akışına hazırlanır.
- 2.10 Excel içe aktarma: önizleme, kolon eşleme, hata listesi, mükerrer kontrolü ve onaylı kayıt. Sessiz veri kaybı veya otomatik kritik alan uydurma yapılmaz.

### Kabul

- [ ] Kayıtlar yeniden başlatmadan sonra korunuyor; migration temiz ortamda çalışıyor.
- [ ] Referans kapasite tablosu doğru aktarılmış ve birimler görünür.
- [ ] İlişkili kayıt silme/pasife alma geçmiş planları bozmuyor.
- [ ] Yetkisiz kullanıcı kritik parametre değiştiremiyor.
- [ ] Değişiklik yapan, zaman ve eski/yeni değer izleniyor.
- [ ] Kural kapsamı ve çatışmaları örneklerle doğrulandı.
- [ ] Tekrar kısıtları, minimum baskı kapsamı ve renk istisnası kararları kayıtlı.

## 6.1. Faz 2C — Tanımlar Merkezi ve Excel Teknik Kart İçe Aktarımı (05.11.2026 Ek Kapsam)

### İşler
- 2C.1 Tanımlar ana menüsü ve alt modülleri: Stok Kartları (ERP Kataloğu), Teknik Kartlar, Ham Levhalar, Tüp-Ham Levha Eşleşmeleri, Ebat/Kapasite Şablonları, Renkler, Zeminler, Vernikler, Lak Durumları, İç Kaplamalar, Ürün Grupları, Matbaa Kuralları, Hat/Makine/Takvim/Hız parametreleri.
- 2C.2 Veri sahipliği ayrımı: ERP stok ana kartı alanları (kod, ad, kategori, birim) ERP senkronunun kontrolündedir ve değiştirilemez. Teknik kart alanları (renk, zemin, lak, vernik, iç kaplama, onaylı ham levha) yerel olarak yönetilir ve ERP senkronu bu teknik alanları ezmez.
- 2C.3 Manuel formda stok kodu zorunludur; girildiğinde yerel senkron katalogdan stok adı otomatik dolar ve salt-okunurdur.
- 2C.4 Ham levha seçimi gerçek stok kodu (FK) ile bağlanır; alternatif levha uydurulmaz. Teknik kart ham levhası ile reçete ham levhası uyuşmazsa açık uyarı verilir ve onay engellenir.
- 2C.5 Excel teknik kart importu (.xlsx / formülsüz .xlsm): şablon indirme, dosya yükleme, dinamik kolon eşleme, doğrulama, önizleme ve güncelleme politikası. "Ham Levha kodu" kolonundaki isimler gerçek stok koduna açık eşlenir; eşleşmeyen satırlar içeri alınmaz.
- 2C.6 Referans bütünlüğü: Kullanımda olan tanımlar silinemez, pasife alınır. Değişiklikler audit_logs tablosuna yazılır.

### Kabul
- [ ] Stok kodu olmayan manuel/import satırı reddedilir.
- [ ] Stok kodu girilince ad senkron katalogdan otomatik gelir ve değiştirilemez.
- [ ] ERP senkronu manuel/Excel ile girilmiş teknik özellikleri ezmez.
- [ ] Ham levha açıklaması katalogdaki gerçek ham stok koduna açıkça eşlenir; belirsiz satır onaylanmaz.
- [ ] Kullanılan tanım silinemez, pasife alınır; geçmiş plan korunur.

## 7. Faz 3 — SQL Server Entegrasyonu, Çok Seviyeli İhtiyaç ve Mutabakat

### 7.1. Faz 3A — AA_LIDER SQL Sözleşmesi ve Salt-Okunur Entegrasyon
- SQL bağlantı veritabanı: `AA_LIDER`; kaynak ERP veritabanı: `MikroDesktop_LIDER26`.
- **Doğrulanmış Ağ Topolojisi (06.11.2026):**
  - Uygulama Dağıtım Sunucusu: `lider-server2` (Yerel IP: `192.168.70.2`, Dış IP: `95.3.44.150:2222`).
  - SQL Server Host: `172.17.0.6:1433` (TCP erişimi ve kimlik doğrulama `planlama` kullanıcısı ile test edilip onaylandı).
- ERP'ye hiçbir tabloya (`meltem_teneke`, `alper_tenekeuretim` vb.) yazma veya silme yapılmaz; bağlantı kesinlikle salt-okunurdur (`SELECT`).
- 5 temel view sözleşmesi ve parametrik kolon eşlemesi: `AA_tp_vw_StokKartlari`, `AA_tp_vw_TupBrutIhtiyac`, `AA_tp_vw_ReceteBaglantilari`, `AA_tp_vw_StokDepo`, `AA_tp_vw_PlanliTupArz`.
- Staging ve atomik snapshot: Hatalı/yarım sorgu son başarılı veriyi bozmaz.
- Kimlik bilgileri şifreli olarak sunucuda (`.env` -> `DB_PASSWORD`) tutulur; istemciye veya loglara aktarılmaz.

### 7.2. Faz 3B — Çok Seviyeli İhtiyaç Motoru ve Havuz (50-10-5-7=28 Kuralı)
- Kademeli stok netleme formülü:
  - `Hazır Tüp Stoğu Karşılama:` 50.000 brüt - 10.000 tüp stok = 40.000 tüp üretim ihtiyacı.
  - `Kesik Levha Stoğu Karşılama:` 40.000 tüp üretim - 5.000 tüp eşdeğeri kesik = 35.000 kesim ihtiyacı.
  - `Baskılı Levha Stoğu Karşılama:` 35.000 kesim - 7.000 tüp eşdeğeri baskılı = 28.000 yeni baskı ihtiyacı.
- Çıktıların hatlara yönlendirilmesi: Kombinasyon masasına 28.000 tüp eşdeğeri baskı ihtiyacı aktarılır; tüp imalat hattına 40.000 tüp planlanır; kesim hattına 35.000 tüp eşdeğeri planlanır.
- Tek seferlik tahsis (rezervasyon): Bir stok kalemi havuzda yalnız tek bir siparişe tahsis edilir; mükerrer stok düşümü engellenir.
- Doğrulanmış birim ve reçete katsayıları kullanılır. Karışık baskılı levhada ürüne ait tekrar payı kadar tüp eşdeğeri ayrılır.
- Ham levha stoğu yeni baskı ihtiyacını azaltmaz; ham levha satın alma ihtiyacını azaltır.
- Eksik reçeteli ürünler havuzda teknik uyarıyla kalır; onay engellenir.

### 7.3. Faz 3C — Excel / SQL / Uygulama Mutabakatı
- Canlı snapshot ile Excel ve SQL sonuçları arasında 10 temsilî ürün ve 3 ebat üzerinden sayısal mutabakat.
- Excel formül hataları yeni sisteme taşınmaz; mutabakat farklarının nedenleri (depo, birim, yuvarlama) açıkça raporlanır.

### Kabul
- [ ] 50.000 brüt / 10.000 tüp / 5.000 kesik / 7.000 baskılı stok kabul testi tam sonuç verir: 40.000 tüp üretim, 35.000 kesim, 28.000 yeni baskı.
- [ ] Aynı stok iki siparişe mükerrer tahsis edilemez.
- [ ] ERP'ye yazma işlemi kesinlikle bulunmaz.
- [ ] Eksik reçeteli veya eşleşmeyen kayıt havuzda görünür, onay engellenir.
- [ ] SQL bağlantısı veya senkron kesildiğinde son başarılı snapshot korunur.

## 8. Faz 4 — Kombinasyon ve baskı miktarı motoru

**Girdi Bağımlılığı:** Faz 3B'den gelen "Yeni Baskı Net İhtiyacı" (Örn: 50.000 brüt - 10.000 tüp - 5.000 kesik - 7.000 baskılı = 28.000 tüp eşdeğeri). Faz 4 motoruna 40.000 değil, net 28.000 yeni baskı ihtiyacı girdi olarak verilir.

### İşler

- 4.1 Uygun ürün grupları: aynı çap/boy, tanımlı ham levha, zemin; ayrıca doğrulanmış vernik/lak/revizyon/özel kurallar.
- 4.2 Benzersiz renk kodlarıyla 6 renk varsayılan sınırı. İsim benzerliğinden renk eşdeğerliği çıkarılmaz; eşdeğerlik varsa katalogda açık tanımlanır.
- 4.3 Hazır tüp/levha kapasitesi altında tamsayı tekrar dağılımı ve baskı levha miktarı. Geometrik hesap veya alternatif levha önerisi yoktur.
- 4.4 Fiziksel dağılıma ilişkin onaylanmış tekrar kuralları kullanılır. Belirsiz kısıt bulunan ürün için yalnız manuel/taslak senaryo üretilebilir.
- 4.5 Minimum baskı, izin verilen boş kapasite, fire, fazla üretim ve siparişin montajlar arasında bölünebilmesi politikaları.
- 4.6 Minimum altında kalan 500 levhalık ihtiyaç için gerçek ihtiyaç, 1.250'ye tamamlama sonucu, fazlalık ve eşleşme seçenekleri gösterilir. Otomatik sipariş veya onaysız fazla üretim yapılmaz.
- 4.7 PL ve kendi marka politikaları: PL fazlası için tanımlı onay; kendi markasında izin verilen stok hedefi ve tüketim bilgisiyle tamamlama. Talep olmayan ürünler sınırsız üretilmez.
- 4.8 Öncelik sırası: kesin kurallar → termin/karşılanan ihtiyaç → fazla üretim → montaj/baskı maliyeti. Kullanıcıca değiştirilebilir tercihler açık gösterilir. Güvenilir maliyet yoksa para cinsinden sahte tasarruf hesaplanmaz.
- 4.9 Alternatif öneriler, karşılanamayan ihtiyaçlar ve nedenler. Birden çok montajın aynı ihtiyacı gereksiz karşılaması engellenir.
- 4.10 Arka plan işi, ilerleme, iptal, süre sınırı ve sonuç kaydı. Aday çözüm ile optimal olduğu kanıtlanan çözüm ayrılır; zaman aşımı “çözüm yok” diye yorumlanmaz.
- 4.11 Her çalıştırmada veri anlık görüntüsü, parametre/kural sürümü ve algoritma ayarları saklanır. Manuel kilitlenen atamalar yeniden hesapta korunur veya açık çatışma verir.
- 4.12 Sonuç üretime aktarılmadan önce ayrı doğrulayıcıyla kapasite, renk, minimum, ihtiyaç ve kurallar tekrar kontrol edilir.

### Hesap sözleşmesi

- Teorik ürün adedi = ürünün montajdaki tekrar sayısı × basılan levha adedi.
- Net kullanılabilir çıktı = operasyon bazında tanımlanmış kayıplardan sonraki çıktı; yuvarlama açık ve tutarlı olmalıdır.
- İhtiyaç/fazla farkı aynı birimde ve aynı revizyon kapsamında hesaplanır.
- Onaylı baskı siparişi miktarı, ihtiyaç değişince kendiliğinden değiştirilmez.

### Kabul

- [ ] SOFT referans hesabı doğru.
- [ ] Ortak CMYK + iki farklı Pantone 6 renk; üçüncü farklı Pantone 7 renk olarak bulunuyor.
- [ ] Farklı ebat/zemin/uygunsuz ham levha kesin engel.
- [ ] Minimum altı, eşleşmeyen ve fazla üretim senaryoları açık raporlanıyor.
- [ ] Eksik kural verisiyle sahte “üretime uygun” sonuç çıkmıyor.
- [ ] Manuel değişiklikler yeniden doğrulanıyor.
- [ ] İptal, yeniden başlatma ve süre sınırı sonuçları dürüst biçimde gösteriliyor.
- [ ] En az bir gerçek ebat ve ardından farklı kapasitedeki ebatla planlamacı kabulü alındı.

## 9. Faz 5 — Teneke üretim planlama

**Girdi Bağımlılığı:** Faz 3B'den gelen "Net Tüp Üretim İhtiyacı" (Örn: 40.000 tüp) ve "Kesim İhtiyacı" (35.000 tüp eşdeğeri). Tüp imalat hattına 28.000 değil, 40.000 tüp planlanır.

### İşler

- 5.1 Makas ve tüp üretim hatları için kapasite, uygun ebat, vardiya ve çalışma takvimi.
- 5.2 Sıra bağımlı çap/boy/ürün değişim süreleri; mola, bakım, mesai ve ek vardiya. Net kapasitede zaten düşülen duruş yeniden düşülmez.
- 5.3 Matbaa termin, nakliye, kalite serbest bırakma, kesim ve tüp üretimi öncelik ilişkileri. Negatif veya imkânsız tarih yerine gecikme nedeni üretilir.
- 5.4 Dolum ihtiyaç tarihinden gerekli tarihleri hesaplama ve gerçek kapasitede ileri doğrulama.
- 5.5 Kısmi parti transferiyle kesim/tüp üretiminin örtüşmesine izin verilip verilmediği parametrik hale getirilir.
- 5.6 Dip/bombe/pres malzemeleri için stok ve tarih yeterlilik kontrolü. İlk sürümde ayrıntılı pres çizelgesi yerine yetersizlik ve gerekli tarih gösterilebilir; bu sınır açık tutulur.
- 5.7 Liste, haftalık takvim ve Gantt; sürükleyerek taşıma, miktar bölme, sabitleme ve çatışma gösterimi.
- 5.8 Yakın dönem plan kilidi. Yeniden planlama başlamış ve onaylı işleri izinsiz oynatmaz.
- 5.9 Kombinasyon planının kapasiteye etkisi değerlendirilir. Daha az levhalı ama geç kalan öneri tek başına “en iyi” sayılmaz. Alternatif montaj/mesai/termin senaryoları karşılaştırılır.
- 5.10 Plan revizyonu, malzeme rezervasyonu ve aynı anda düzenlemede çakışma yönetimi.

### Kabul

- [ ] Aynı makineye kapasiteyi aşan eşzamanlı işler atanamıyor.
- [ ] Malzeme gelmeden/kalite onayı olmadan üretim uygun gösterilmiyor.
- [ ] Ayar, bakım ve vardiya dışı zamanlar dikkate alınıyor.
- [ ] Geciken dolum ihtiyacında neden ve miktar görünür.
- [ ] Mesai senaryosu plan ve kapasiteye tutarlı yansıyor.
- [ ] Sabitlenmiş/başlamış işler yeniden hesaplamada korunuyor.
- [ ] Gerçek bir haftanın planı planlamacıyla karşılaştırılıp doğrulandı.

## 10. Faz 6 — Matbaa siparişi, revizyon ve gerçekleşen takip

**Çıktı Bağımlılığı:** Faz 2C teknik tanımları, Faz 4 montaj ve levha adetleri, Faz 5 termin ve parti takvimi. Formda iç kaplama, lak, zemin ve revizyon kimlikleri tam olarak yer alır.
- 6.9 Kalan miktarların yeniden planlamaya dönmesi; kapatılan işlerde rezervasyonların doğru serbest bırakılması.
- 6.10 Raporlar: termin uyumu, plan/gerçekleşen, fazla üretim, baskı miktarı, revizyon nedeniyle kullanılamayan stok.
- 6.11 Süreç belgesindeki son 6 aylık tüketim ortalamasına dayalı ham levha tedarik önerisi ayrı görünüm olarak hazırlanır. Gerçek hesap penceresi ve stok politikası parametriktir; tüp planı için otomatik başka levha önermez ve satın alma siparişi kendiliğinden açmaz.

### Kabul

- [ ] Kaynak forma yakın, okunabilir ve miktarları planla aynı çıktı alınabiliyor.
- [ ] Ürün ve montaj revizyonları karışmıyor; eski form tekrar erişilebilir.
- [ ] Yetkisiz kullanıcı onay veremiyor; PL fazla üretim onayı izleniyor.
- [ ] Kısmi teslim, kalite bloke ve gerçekleşen üretim kalan ihtiyaca doğru yansıyor.
- [ ] Gerçekleşen miktar çift kaydedilmiyor; plan/gerçek farkı izlenebiliyor.
- [ ] Otomatik e-posta/ERP yazımı açık yetki olmadan devreye alınmıyor.

## 11. Faz 7 — Kabul, sağlamlaştırma ve Coolify

### İşler

- 7.1 Kritik akışların uçtan uca testleri: ihtiyaç → kombinasyon → plan → onay → form → kısmi teslim → üretim → kapanış.
- 7.2 Gerçekçi veri hacminde tablo, senkronizasyon ve çözüm süresi ölçümü. Hedefler veri hacmi öğrenildikten sonra belirlenir; kanıtsız süre garantisi verilmez.
- 7.3 Rol/yetki matrisi, oturum, gizli değerler, dış bağlantılar ve kayıtların son kontrolü.
- 7.4 PostgreSQL ve dosya ekleri için yedekleme, geri yükleme denemesi, saklama ve izleme.
- 7.5 Coolify proje/ortamı, container kaynakları, kalıcı diskler, healthcheck, loglar, HTTPS/domain ve SQL Server çıkış erişimi. Hedef sunucu/domain kullanıcı tarafından belirlenir; şirket ve kişisel sunucular karıştırılmaz.
- 7.6 Demo verisi ile üretim verisi ayrılır; ilk canlı veri yüklemesi ve uzlaştırması yapılır.
- 7.7 Sürüm/migration ve geri dönüş planı. Uygulama geri alma işleminin DB migration'ını otomatik geri alacağı varsayılmaz.
- 7.8 Kullanıcı rehberi, günlük operasyon kontrolü, hata giderme ve sorumlular.
- 7.9 Pilot kullanım, bulunan sorunların kapanması ve canlı kabul kaydı.

### Kabul

- [ ] Yerel geliştirme ortamı kapalıyken uygulama Coolify'da çalışıyor.
- [ ] Kalıcı veri container yenilemesinde korunuyor.
- [ ] Yedekten geri yükleme gerçekten denendi.
- [ ] Gerçek kullanıcı rolleri ve SQL erişimi doğrulandı.
- [ ] İş açısından kritik bütün kabul senaryoları geçti.
- [ ] Canlıya alınan sürüm, migration ve geri dönüş adımları kayıtlı.

## 12. Ekran envanteri

| Ekran | İlk görünüm | Gerçek işlevin tamamlanması |
|---|---|---|
| Planlama özeti | Faz 1 | Faz 3–6 verileriyle |
| İhtiyaç havuzu ve detay | Faz 1 | Faz 3 |
| Tüp/ham levha/ebat tanımları | Faz 1 | Faz 2 |
| Renk/yüzey/revizyon tanımları | Faz 1 | Faz 2 |
| Kural yönetimi | Faz 2 | Faz 4 uygulamasıyla |
| Makine/vardiya/kapasite takvimi | Faz 2 | Faz 5 |
| Entegrasyon ve eşleme | Faz 1 | Faz 3 |
| Senkronizasyon/veri kalite sorunları | Faz 3 | Faz 3 |
| Kombinasyon çalışma alanı | Faz 1 | Faz 4 |
| Alternatifler ve hesap açıklaması | Faz 4 | Faz 4–5 |
| Üretim planı liste/takvim/Gantt | Faz 1 | Faz 5 |
| Onay merkezi | Faz 4 temel ihtiyaç | Faz 6 |
| Matbaa siparişleri ve formlar | Faz 6 | Faz 6 |
| Teslimat/kalite/gerçekleşen | Faz 6 | Faz 6 |
| Fason stok ve ham levha ihtiyaç raporu | Faz 6 | Faz 6 |
| Kullanıcı/rol/değişiklik kayıtları | Faz 2 | Faz 7 sağlamlaştırması |

## 13. Veri modeli ve teknik sorumluluklar

Önerilen temel teknoloji: Next.js/React/TypeScript arayüz ve uygulama; PostgreSQL kalıcı veri; Faz 4'te değerlendirilip doğrulanacak Python/OR-Tools optimizasyon çalışanı. Hesap arka planda çalışır ve iş durumu kalıcı tutulur. Ayrı kuyruk altyapısı ihtiyaçla gerekçelendirilir; başlangıçta gereksiz servis sayısı oluşturulmaz.

Temel varlık grupları:

- Ürün/tüp, ürün revizyonu, ham levha, ebat kapasitesi ve teknik özellikler.
- Renk, ürün-renk ilişkisi, kurallar ve kural sürümleri.
- Kaynak bağlantı/eşleme, aktarım çalıştırması, veri snapshot'ı ve hata kayıtları.
- Sipariş/ihtiyaç, stok lotu, depo durumu, rezervasyon ve kaynak tahsisi.
- Montaj, montaj ürün satırları, baskı miktarı, çözüm çalıştırması ve alternatifler.
- Makine, takvim, vardiya, kapasite, ayar geçişi ve üretim işi.
- Baskı siparişi, onay, teslimat, kalite, gerçekleşen, ek dosya ve form sürümü.
- Kullanıcı, rol ve değişiklik kaydı.

Montaj birden çok tüp çeşidi üretebildiği için baskılı levha ilişkisi yalnız tek ürünlü basit reçete zinciri olarak modellenmez. Montajın ortak girdisi ve ürün bazlı çıktıları birlikte izlenir.

Faz 2'den itibaren kritik kayıtlar yalnız tarayıcıda tutulmaz. PostgreSQL uygulama kaynağıdır; SQL Server yetkilendirilmiş ERP veri kaynağıdır. Veriyi hangi sistemin yönettiği alan bazında bellidir.

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

## 15. Antigravity çalışma ve teslim sözleşmesi

1. Bu belgeyi ve erişilebilir kaynakları oku. Kullanıcının son düzeltmeleri önceki önerilerden üstündür.
2. Yalnız verilen fazı uygula. İlk görev Faz 0 ve Faz 1'dir; bu belge sonraki fazları otomatik başlatma yetkisi değildir.
3. Mevcut repository ve çalışma durumunu incele; tamamlanmış işi gereksiz yeniden yazma.
4. Kullanıcının belirlediği levha/kapasite yaklaşımını değiştirme; geometrik sığdırma geliştirme.
5. Gerçek işlem olmayan ekranlara sahte başarı ekleme. Demo ve belirsizlikleri görünür tut.
6. Gerekli iş bilgisi yoksa ilgili bağımlılığı kaydet; bağımsız ekran ve altyapı işlerini sürdür.
7. Testleri yapılan değişikliğin gerçek riskine göre seç. Hesap motorunda anlamlı sabit örnekler, sınırlar ve stok çift sayım testleri kullan.
8. Her faz sonunda ilgili kabul listesi, çalıştırma bilgisi, kontrol sonuçları, bilinen sınırlar ve sonraki adım teslim edilir.
9. Bu belgedeki faz durumları kanıt olmadan “tamamlandı” yapılmaz.
10. İlk yerel geliştirme görevi kapsamında push, uzak deployment veya başka sisteme veri yazımı yapılmaz. İleride kullanıcı verdiğinde ilgili kapsamda uygulanır.

### Her faz için başlatma metinleri

**Faz 0–1:** “Ana yol haritasını oku ve Faz 0 ile Faz 1'i uygula. Yerel Docker'da çalıştır, demo akışlarını tarayıcıda doğrula. Ekranları ve kabul sonuçlarını teslim et; Faz 2'ye geçme.”

**Faz 2:** “Faz 0–1'in mevcut durumunu incele. Faz 2 kapsamındaki kalıcı veri, parametre, kurallar ve temel yetkileri uygula. Açık iş sorularını varsayımla kapatma. Kabul sonuçlarını ve migration bilgisini teslim et.”

**Faz 3:** “Faz 3 veri sözleşmeleri ve parametrik SQL Server entegrasyonunu uygula. Sağlanan gerçek bağlantı ve view'larla salt okunur aktarımı doğrula. Brüt/net kapsamını ve stok tahsislerini uzlaştır.”

**Faz 4:** “Kesinleşmiş kurallarla Faz 4 kombinasyon motorunu uygula. Geometri veya alternatif levha geliştirme. Referans ve sınır senaryolarını çalıştır; uygulanabilir/optimal/belirsiz sonuçları ayır.”

**Faz 5:** “Faz 5 makas ve tüp üretim planını gerçek takvim/kapasiteyle uygula. Malzeme, kalite, ayar ve dolum terminini birlikte kontrol et. Kilitli işleri koru; gerçek bir hafta ile doğrula.”

**Faz 6:** “Faz 6 sipariş formu, revizyon, onay, teslimat ve gerçekleşen takibini uygula. Kaynak Excel düzenini koru; kayıtlar arasında izlenebilirliği ve kısmi işlem senaryolarını doğrula.”

**Faz 7:** “Faz 7 kabul ve işletim hazırlığını tamamla. Kullanıcının belirlediği hedef Coolify ortamı ve dağıtım kapsamına uy. Yedekten dönüş, veri uzlaştırma ve kritik uçtan uca test sonuçlarıyla teslim et.”

### Faz teslim kaydı şablonu

```text
Faz:
Durum: Planlandı / Devam ediyor / İncelemede / Tamamlandı / Engelli
Tamamlanan işler:
Kabul koşulları ve kanıtları:
Test/derleme sonucu:
Çalışan yerel veya yetkilendirilmiş hedef URL:
Commit (varsa):
Migration/veri değişikliği:
Bilinen sınırlamalar:
Açık kararlar:
Sonraki adım:
Güncelleme tarihi:
```

## 16. Karar ve değişiklik kaydı

| Tarih | Sürüm | Kayıt |
|---|---|---|
| 05.11.2026 | 1.0 | Faz 0–7, ekranlar, iş kuralları, açık sorular ve kabul koşulları bir araya getirildi. |
| 05.11.2026 | 1.0 | Kullanıcının kesin düzeltmesi: kapasite hazır parametredir; levhaya sığdırma ve farklı ham levha önerisi kapsam dışıdır. |
| 05.11.2026 | 1.0 | Antigravity ve yerel Docker geliştirme ortamı; Coolify hedef çalışma ortamı olarak kaydedildi. |
| 05.11.2026 | 1.0 | Mevcut durum: plan hazır; faz uygulamalarının başladığı veya tamamlandığına dair doğrulama yok. |

Gelecek güncellemelerde kararın tarihi, gerekçesi, etkilediği faz ve eski davranış kaydedilir. Yeni sohbet veya yeni geliştirme oturumunda bu dosya ve son faz teslim kaydı birlikte kullanılır.


---

## 12. Bütünleşik Yol Haritası v2 Sıralaması ve Faz 3A.1 (06.11.2026 Güncellemesi)

Kullanıcının 06.11.2026 tarihli yeni kararları doğrultusunda, faz tarihçesi korunarak uygulama sırası yeniden düzenlenmiştir:

| Sıra | Faz | Çıktı | Bağımlılık | Durum |
|---:|---|---|---|---|
| 0 | 0–1 | Proje temeli ve ilk ekranlar; tarihçe korunur | Mevcut | Tamamlandı |
| 1 | 2 / 2B / 2C | Parametre, kural ve kalıcı veri; son 2C tesliminin hedefli kabul kontrolü | Mevcut | Tamamlandı |
| 2 | 3A.1 | SQL şeması ve mevcut meltem_teneke planının kayıpsız snapshot'ı | 2C | **Aktif Uygulama** |
| 3 | 2D | Impeccable öncülüğünde İhtiyaç Havuzu pilot tasarımı ve UI sözleşmesi | 2C; 3A.1 ile paralel | Planlandı |
| 4 | 3A.2 | Stok kartı, brüt talep, reçete, depo stok ve dış plan senkronizasyonu | 3A.1 | Planlandı |
| 5 | 3B | Tarihli ihtiyaç ve kademeli stok tahsis motoru | 3A.2 | Planlandı |
| 6 | 5A | Tek tüp makinesi, çalışma takvimi ve düzenlenebilir üretim planı | 3A.1, 3B | Planlandı |
| 7 | 5W | Onaylanan planın meltem_teneke'ye kontrollü geri yazımı (Dar istisna) | 3A.1, 5A | Planlandı |
| 8 | 3C.1 | Tüp talebi/stok/takvim/plan ve geri yazım mutabakatı | 3B, 5A, 5W | Planlandı |
| 9 | 4 | Teknik verisi tamamlanan ürünlerde yeni baskı kombinasyonu | 3B, baskı tanımları | Planlandı |
| 10 | 5B + 3C.2 | Baskı/kesim/malzeme tarihleri ile planın birleştirilmesi ve tam mutabakat | 4, 5A | Planlandı |
| 11 | 6 | Matbaa/ajans siparişi, gerçekleşme ve izlenebilirlik | 4, 5B | Planlandı |
| 12 | 7 | Şirket 0101 sunucusunda Coolify yayın ve kabul | İlgili işlevler | Planlandı |

### 12.1. Faz 3A.1 Kapsamı ve Kabul Koşulları
- **Hedef:** `AA_LIDER.dbo.meltem_teneke` tablosundaki aktif üretim planını (124 kayıt, 2.114.077 adet) hiçbir veri kaybı, sıra tahrifatı veya otomatik programlama olmadan PostgreSQL'e değişmez kaynak snapshot'ı ve düzenlenebilir taslak olarak aktarmak.
- **SQL Salt-Okuma:** `172.17.0.6` SQL Server'a kesinlikle INSERT, UPDATE, DELETE veya ALTER uygulanmaz.
- **Güvenli Ağ:** SQL Server'a doğrudan ulaşılamadığında şirket sunucusu `lider-server` (0101) üzerinden güvenli SSH tüneli/ağ geçidi kullanılır.
- **Çift Senkron Koruması:** Tekrar senkronizasyon yapıldığında mükerrer iş türetilmez; yeni snapshot versiyonu oluşturulur ve kullanıcının üzerinde çalıştığı taslak korunur.
