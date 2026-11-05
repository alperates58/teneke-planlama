# FAZ 6 — SIPARIS VE TAKIP

Durum: PLANLANDI. Uygulama ve kabul kanıtı henüz yok.

Önce kökteki AGENTS.md dosyasını oku. Bu dosyanın varlığı fazı başlatma yetkisi değildir; aktif fazı STATUS.json ve kullanıcının güncel görevi belirler.

## 10. Faz 6 — Matbaa siparişi, revizyon ve gerçekleşen takip

### İşler

- 6.1 Kaynak Excel düzeninden PDF/Excel matbaa sipariş formu. Alanlar: montaj no, ürünler ve tekrarlar, iç/dış baskı, renkler, levha ölçüsü ve adedi, sipariş/teslim tarihleri, ürün revizyonları, not, matbaa ve hazırlayan.
- 6.2 Ajans için montaj talebi özeti ve ek dosyalar. Gerçek CTP dosyası ajans/grafik sürecinden gelir; yazılım otomatik CTP ürettiğini iddia etmez.
- 6.3 Ürün tasarım revizyonu, montaj revizyonu, form şablonu revizyonu ve plan revizyonu ayrı alanlardır.
- 6.4 Baskı siparişi akışı: Taslak → Kontrol → Onay bekliyor → Onaylandı → Gönderildi → Kısmi teslim/Teslim edildi → Kapandı. Ret, iptal ve yeniden revizyon yolları tanımlanır.
- 6.5 Onaylanan kayıt/snapshot korunur. Sonraki revizyon eski onay ve formu silmez. “Gönderildi” gerçek kullanıcı işlemi veya doğrulanmış entegrasyon olayı gerektirir; dosya indirmek gönderim değildir.
- 6.6 Tedarikçi termin teyidi, kısmi teslim, fason ham levha stoğu ve ayrılan miktarlar. Fiili ERP hareketiyle uygulama beklentisi uzlaştırılır.
- 6.7 Kalite kabul/bloke, lot/parti/revizyon ilişkisi; kg ve levha/adet birimleri arasında yalnız onaylı dönüşüm kullanılır.
- 6.8 Kesim ve tüp üretiminde gerçekleşen miktar/fire/başlangıç-bitiş. ERP'de kaynak varsa okunur; uygulamadaki manuel kayıt aynı olayla mükerrerleşmez.
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



## Faz teslimi

Kabul listesini gerçek sonuçlarla işaretle. `docs/FAZ-TESLIM-SABLONU.md` ile rapor oluştur, STATUS.json ve karar kaydını güncelle. Kanıt olmadan tamamlandı yazma. Sonraki fazı otomatik başlatma.
