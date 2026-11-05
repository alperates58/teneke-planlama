# Teneke Planlama — Excel, VBA ve SQL incelemesi
Tarih: 05.11.2026. Kaynak: 2026 PLAN TENEKE v1.1.xlsm ve kullanıcının paylaştığı beş SQL view tanımı.

## İnceleme kapsamı ve sınırı
Dosyanın OOXML yapısı, hücre formülleri, kayıtlı sonuçları, bağlantıları, Power Query M kodu ve OLE içindeki sıkıştırılmış VBA kaynakları okundu. Makrolar çalıştırılmadı, Excel yeniden hesaplanmadı, SQL Server'a bağlanılmadı. Kaynak dosya değiştirilmedi. VBA incelemesi kaynak kod düzeyindedir; Excel'de çalışma testi veya derlenmiş p-code karşılaştırması değildir. Paket içindeki VBA metinleri inceleme içindir; tekrar VBA'ya import edilip çalıştırılacak teslim değildir. Bağlantılardaki kullanıcı adı ve parola maskelenmiştir. Orijinal XLSM bu pakete dahil değildir.

## Dosya envanteri
| Sayfa | Durum | Son kullanılan/biçimlendirilmiş satır | Formül sayısı | İşlev |
|---|---|---:|---:|---|
| KESIK PLAN | Gizli | 20 | 30 | Eski kesik plan taslağı |
| BASKI PLAN | Gizli | 20 | 30 | Eski baskı plan taslağı |
| PLAN | Açık | 231 | 452 | Üretim sırası, kalan miktar, tarihler ve stok lookup |
| KONTROL | Açık | 691 | 0 | Tüketim/üretim hareketleri ve makroyla hesaplanan bakiye |
| İHTİYAÇ | Açık | 213 | 0 | 212 ürün için SQL'den gelen kesik/baskılı netleme |
| Çalışma Tarihleri | Açık | 1949 | 3288 | Takvim ve sağ tarafta reçete lookup |
| Üretim Planı | Açık | 931 | 0 | Basılı üretim formu; yalnız 103 satırda değer var |
| DATA | Açık | 4264 | 8518 | Geçmiş plan/arşiv |
| TENEKE DATA | Açık | 30 | 29 | 29 ebat satırında hız parametreleri |

Son satır sayısı iş kaydı sayısı değildir; biçimlendirme ve formüller dahildir. Tam ölçümler kaynak-inceleme/workbook-findings.json içindedir.

19 VBA modül/sayfa kaynağı çıkarıldı; 9 modülde toplam 16 Sub/Function var. Kalan 10 kaynakta prosedür yok. Altı bağlantı tanımı ve beş Power Query sorgusu var; üç queryTable çalışma sayfalarına bağlı.

## Excel'in gerçek veri akışı
1. SQL tüketim ve üretim planları KONTROL'e gelir.
2. hesaplasırala stok kodu/tarih bazında kümülatif bakiye hesaplar; eksi değer eksikliktir.
3. ürünekle seçili eksikliğin ters işaretini PLAN.Kalan alanına taşır. Dolayısıyla PLAN.Kalan bu akışta zaten mevcut tüp stokuyla netlenmiş olabilir; ham satış talebi değildir.
4. start2, PLAN'ın seçili seri başlangıcından seçili satırına kadar miktarlarını meltem_teneke tablosuna yazar; İHTİYAÇ sorgusunu yeniler.
5. ihtiyaç4 kesik, ihtiyaç5 baskılı stoğu düşer. PLAN'daki lookup formülleri bu sonuçların stok alanlarını getirir.
6. start takvimi hesaplar, üretim planını alper_tenekeuretim'e yazar, KONTROL'ü yeniler ve kümülatif bakiye hesaplar.

Bu nedenle mevcut ihtiyaç4/5 view'lerine yeni uygulamada bir kez daha tüp stoğu düşmek hatalı olabilir. Yeni sözleşme açıkça BRÜT tüp talebi alacak; her stok seviyesi yalnız bir kez düşülecek.

## VBA prosedürleri
| Modül/prosedür | Davranış | Yeni uygulamaya aktarılacak karar |
|---|---|---|
| Module1.start | Takvim → SQL'e üretim yaz → KONTROL yenile → hesaplasırala | İş akışı ayrı servis adımları ve durum takibi |
| Module1.once_hedefleri_sqle_yaz | alper_tenekeuretim tablosunun tamamını DELETE eder; seçili serinin başlangıcından boş ürün koduna kadar INSERT | ERP'ye toplu sil/yaz taşınmayacak. Plan uygulama DB'sinde saklanacak |
| SqlText/SqlNum/SqlDate/ToDouble | Metin, sayı ve tarih SQL metnine hazırlanır | Yeni sistemde parametreli sorgu, decimal ve typed date |
| Module2.start2 | Ara tabloya yazıp İHTİYAÇ sorgusunu yeniler | Salt okunur senkronizasyon + uygulamada hesap |
| once_hedefleri_sqle_yaz2 | meltem_teneke'nin tamamını DELETE eder; seri başlangıcından seçili satıra PLAN.Kalan ekler | Kullanıcıların birbirinin ara hesabını ezdiği global tablo yerine plan/snapshot kimliği |
| kontrolhesap.hesaplasırala | Ebat, kod, tarih, cins sıralaması; ilk satır stok+hareket, sonrakiler önceki bakiye+hareket; Round(...,0) | Zaman bazlı stok projeksiyonu; açılış stoğu bir kez; ondalığı erken yuvarlama yok |
| ürünekle | KONTROL.Kalan Stok × -1 PLAN.Kalan olur, Seri=S1; geriye giderek sipariş son üç hanesini İş Kod'a toplar | Tam sipariş/satır kimlikleri; negatif olmayan ihtiyaç; tekrar ekleme koruması |
| zaman.PlanlamaTarihleriHesapla | Dakikalık üretim, mola/takvim, çap-boy değişim hazırlığı | Parametrik vardiya ve geçiş matrisi |
| Boyama.PlanBoya | Ebat/çap gruplarına renk/kenarlık | Görsel gruplama, iş kuralı değil |
| DATAYAAKTAR.DatayaAktar | Seçili PLAN satırlarını DATA'ya konumsal kopyalar, PLAN'dan siler | Alan adına göre arşiv, işlem geçmişi ve geri alınabilir durum değişimi |
| ÜretimPlanı.Üretimplanıı | Seçilenlerden basılı plan üretir, ebata göre boşluk koyar | Sürümlemeli çıktı, tüm gerekli kolonlar |
| kesyapıştır.ÜrünKes/ÜrünYapıştır | Satır kes ve ekle | Kimlikleri koruyan sıralama işlemi |

Module1'in yazma döngüsü seri sonuna göre değil ilk boş ürün koduna göre biter; sonraki serileri de taşıyabilir. Module2'nin seçili satır sınırı farklıdır. Aktif sayfa/Selection bağımlılıkları, genel tablo silme ve işlem bütünlüğü eksikleri çok kullanıcılı uygulamaya aynen taşınmamalı.

## Takvim ve kapasite ayrıntıları
Normal mesai 07:30–17:30. Molalar 09:15–09:30, 12:00–12:30, 15:15–15:30; akşam molaları 19:30–19:45, 21:30–22:00, 23:30–23:45. VARDİYA 07:30–ertesi gün 01:30; VARDİYA1 17:30–ertesi gün 01:30. MESAİ, 17:30'a takvimin F sütunundaki saat eklenerek hesaplanır. Bunlar mevcut kodun davranışıdır, yeni sisteme değişmez fabrika kuralı olarak gömülmeyecek.

TENEKE DATA.H başlığı “Normal Vardiya Dk” fakat formül G/(E*60): sonuç **adet/dakika**. Örnek 100.000 / (9×60) = 185,185 adet/dakika. Kişi sayısı formülde kullanılmıyor. Üretim hızı ve bir levhadan çıkan tüp adedi ayrı parametrelerdir.

Çap değişiminde hedef çap 45 ise 480 dk, diğer çaplarda 180 dk; boy değişiminde 60 dk hazırlık süresi kodda sabit. I sütunundaki Ayar Süresi bu hesapta okunmuyor. Tarih hesabı miktarı dakikada hız kadar azaltır; çalışma dışını 30 dakika, molayı 15/30 dakika atlar. Mola ortasından başlanırsa mola bitişine atlamak yerine tam mola süresi eklenmesi fazladan süre üretebilir. Takvim tarihi bulunamazsa Find sonucunun Nothing kontrolü yok; hız yok/sıfır ise hata veya ilerlemeyen hesap riski vardır. Yeni motor aralık esaslı, gece taşmasını ve sınır anlarını test eden motor olmalı.

## Bağlantılar
- Satislar_Yici_PL: SQLOLEDB; MikroDesktop_LIDER26; URUN_RECETELERI + STOKLAR sorgusu TENEKETUP kategorisindeki reçete bileşenlerini getirir. Çalışma Tarihleri!I:N alanına bağlıdır (connection 1). Reçete miktar/birim katsayılarını getirmez.
- AA_alper_planktenekee, AA_alper_tenekeihtiyaç5 ve kopyası, AA_emre_plantenekee ve kopyası: Sql.Databases üzerinden aynı kaynak DB'ye giden 5 M sorgusu.
- KONTROL queryTable connection 6; İHTİYAÇ queryTable connection 3. Altı bağlantının tamamının aktif bir tablo olduğu varsayılmamalı.
- Excel ve VBA içinde kayıtlı SQL kimlik bilgisi var. Dağıtılan kaynak metinlerde maskelendi; yeni projeye credential kopyalanmayacak. Mevcut paylaşılan dosyadaki parolanın IT tarafından değiştirilmesi uygundur.

## Hücre / veri kontrolleri
- İHTİYAÇ'ta 212 satır / 212 benzersiz tüp var. Kaydedilmiş değerlerde kesik ihtiyaç=max(0,tüp ihtiyaç−kesik stok) ve baskılı ihtiyaç=max(0,kesik ihtiyaç−baskılı stok) kontrolü **212/212** uyumlu. Bu, canlı SQL veya stok birimlerinin doğrulandığı anlamına gelmez.
- Bu kaydedilmiş örneklemde farklı tüplerin paylaştığı kesik veya baskılı stok kodu görülmedi. Gerçek sistemde ortak kaynak olamayacağı sonucu çıkarılamaz.
- PLAN.L lookup İHTİYAÇ B:G 6. kolon → kesik stok. PLAN.M B:Z 10. kolon → baskılı stok. Aktif PLAN'ın bu iki kolon eşlemesi doğru.
- Gizli KESIK PLAN/BASKI PLAN J sütununda B:J aralığından 10. kolon isteniyor; aralık 9 kolon. IFERROR hatayı boş gösteriyor. Bu hata aktif PLAN.M formülünde yok.
- PLAN'da Plana Eklenen Tarih alanı bulunuyor, DATA başlıklarında bulunmuyor. Konumsal kopyalama sütun kayması riski taşıyor; bütün arşivin bozulduğu iddia edilmez.
- Üretim formu makrosu İÇİ kolonunu bulsa da doldurmuyor; PrintArea B:G, mevcut H Sipariş No/I Not alanlarını dışarıda bırakıyor.
- Bozuk #REF! tanımlı adlar/baskı alanları mevcut; yeni şablona taşınmamalı.
- KONTROL örneği 511450017: 12.874 stok − 16.000 tüketim = −3.126; sonraki tarihli 18.014 üretim sonrası 14.888. Geç gelen üretim önceki termin açığını ortadan kaldırmaz.

## Kullanıcının verdiği SQL'lerin değerlendirilmesi
### AA_alper_tenekeihtiyaç4
meltem_teneke.HEDEFMIK toplamı ile başlar; tüp reçetesinden KESIKLEVHA getirir; toplam stok−10 numaralı depo stoğunu düşer. Tüp stoğu burada düşülmez; önceki makro akışında zaten netlenmiş olabilir. Birim katsayısı yok. Reçete join'i çoğalırsa SUM da çoğalabilir. DISTINCT bunun çözümü değildir.
### AA_alper_tenekeihtiyaç5
İhtiyaç4'ten kesik reçetesine geçer, BASKILILEVHA stokunu aynı yöntemle düşer. Tüp/kesik/baskılı aynı birimdeymiş gibi işlem yapar. Kaynak birimler ve katsayılar incelenmeden levha adetlerini tüp adedinden doğrudan çıkarmak onaylanamaz.
### Her iki ihtiyaç view'inde
LEFT JOIN sonrası WHERE s.sto_kategori_kodu filtreleri eşleşmeyen reçeteleri sonuçtan düşürür. Yeni havuzda böyle ürünler görünür kalmalı ve “Eksik reçete” işareti almalı. Stok politikası yalnız depo 10 düşülerek belirlenmiş; tüketim view'inin HaricDepolarToplam politikasıyla aynı olduğu kanıtlanmış değil.
### AA_alper_planktüptüketim
alper_terminler + URETIM_MALZEME_PLANLAMA: upl_miktar/upl_uret_miktar × PLANMIKTAR × −1. TENEKETUP, A1/A2/A3/JEL/FASON ve tüketim satırları filtrelenmiş. Brüt talep sözleşmesi bu veriyi pozitif miktara dönüştürmeli, fakat plan miktarının açık/kalan miktar mı olduğu ve gerçekleşmiş tüketimin düşülüp düşülmediği doğrulanmalı. İş emri başına çoklu plan satırı ve reçete satırı çoğalması kontrol edilmeli. Sıfır payda NULL üretir, sessizce sıfır ihtiyaç olmamalı.
### AA_alper_planktüpüretim
alper_tenekeuretim.ADET planlı arz; tarih [Bitiş Tarih]. Bu gerçekleşmiş stok değildir. Makrodaki TARIH alias'ı [Üretim Tarihi]'nden gelir; iki tarih anlamı farklıdır. Uygulama planlarıyla eski Excel planlarının birlikte okunması aynı arzı iki kez saymamalı.
### AA_emre_plantenekee
UNION ALL SELECT * kolon sırasına bağımlıdır. Yeni sözleşmede isimli kolonlar, aynı decimal/date veri tipleri, nullable kimlikler ve hareket türü açık olmalı. Üretim tarafında sayısal alanlara '' vermek kaldırılmalı.
### Ortak konular
Toplam Stok satır bazında tekrar eder; SUM edilmez. Üretim Depo, toplam kullanılabilir stok içindeyse yeniden eklenmez. ISO_WEEK ile YEAR(date) yılbaşında farklı yıl verebilir; ISO hafta yılı kullanılmalı. NOLOCK kirli/kararsız okumaya izin verir; tutarlı stok anı için IT ile snapshot/uygun izolasyon ve senkronizasyon stratejisi belirlenmeli. FLOAT yerine uygun hassasiyetli decimal kullanılmalı. Fonksiyonların stok kodu başına tekrar çağrılması yerine tekil kod/depo bazında toplulaştırılmış kaynak tercih edilmeli; gerçek performans yürütme planıyla ölçülür.

## Eksik teknik kaynaklar
AA_alper_rec_seviye1, AA_alper_vw_EldekiMiktar, AA_alper_vw_HaricDepolarToplam, fn_EldekiMiktar, fn_DepodakiMiktar tanımları; reçete miktar/birim kolonları; alper_terminler ve kaynak plan tablolarının anahtarları; stok birimleri ve depo politikası. SQL keşif dosyası bunları IT'den almak içindir. Bu bilgiler olmadan üretime hazır son reçete/net ihtiyaç SQL'i uydurulmadı.

Microsoft başvuru kaynakları:
- https://learn.microsoft.com/en-us/openspecs/office_file_formats/ms-ovba/492124cc-5afc-48c8-b439-b42ad7087a7b
- https://learn.microsoft.com/en-us/sql/t-sql/functions/datepart-transact-sql
- https://learn.microsoft.com/en-us/sql/t-sql/queries/hints-transact-sql-table
