# FAZ 4 — KOMBINASYON MOTORU

Durum: PLANLANDI. Uygulama ve kabul kanıtı henüz yok.

Önce kökteki AGENTS.md dosyasını oku. Bu dosyanın varlığı fazı başlatma yetkisi değildir; aktif fazı STATUS.json ve kullanıcının güncel görevi belirler.

## 8. Faz 4 — Kombinasyon ve baskı miktarı motoru

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



## Faz teslimi

Kabul listesini gerçek sonuçlarla işaretle. `docs/FAZ-TESLIM-SABLONU.md` ile rapor oluştur, STATUS.json ve karar kaydını güncelle. Kanıt olmadan tamamlandı yazma. Sonraki fazı otomatik başlatma.
