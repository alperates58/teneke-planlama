# FAZ 3 — SQL ENTEGRASYONU

Durum: PLANLANDI. Uygulama ve kabul kanıtı henüz yok.

Önce kökteki AGENTS.md dosyasını oku. Bu dosyanın varlığı fazı başlatma yetkisi değildir; aktif fazı STATUS.json ve kullanıcının güncel görevi belirler.

## 7. Faz 3 — SQL Server entegrasyonu ve ihtiyaç hesabı

### İşler

- 3.1 IT ile bağlantı bilgileri ve yalnız gerekli view'lara okuma yetkisi. Gerçek bağlantı bilgileri henüz verilmedi; uydurulmaz. Kaynak IP kısıtı, şifreli bağlantı ve erişim politikası IT ile belirlenir.
- 3.2 Sunucu/port/veritabanı ve view/kolon eşlemeleri yönetimi. Kimlik bilgileri sunucu tarafında korunur; tarayıcıya veya loglara açık verilmez.
- 3.3 Stok kartı, ihtiyaç, depo/lot/revizyon stokları, reçete ilişkileri ve varsa açık tedarik/iş emirleri için veri sözleşmeleri.
- 3.4 Sipariş satırı anahtarı, tarih, birim, miktar, stok kodu ve veri sahibi doğrulanır. İhtiyaç view'ının hangi stok ve planları zaten düşürdüğü belgelenir.
- 3.5 ERP alanları ile uygulamada yönetilen teknik alanlar ayrılır. Yenileme yerel kuralları veya revizyon açıklamalarını ezmez.
- 3.6 Manuel/zamanlanmış senkronizasyon, son başarılı zaman, hata bilgisi, tekrar deneme ve veri bayatlığı uyarıları.
- 3.7 Tutarlı veri anlık görüntüsü ve mükerrer çalıştırmada kayıt çoğaltmayan aktarım. Yarım kalan aktarım tam başarı diye işaretlenmez.
- 3.8 Brüt/net kapsamına göre netleştirme. Hazır tüp, kesik levha ve baskılı levha ayrı seviyelerde karşılanır; ham levha doğrudan hazır tüp sayılmaz.
- 3.9 Ortak baskılı levha/montaj kaynağını tek kez ayıran rezervasyon ve siparişe bağlama. Aynı stok iki plana tahsis edilmez. Açık tedarik yalnız uygun tarih/durumla değerlendirilir.
- 3.10 Kalite, bloke, revizyon ve tarih koşulları. Kullanılamayan stok miktarı ve gerekçesi görünür olur.
- 3.11 Manuel ihtiyaç düzeltmesi gerekçe ve kullanıcıyla kaydedilir; ERP'den gelen orijinal miktar korunur.

### Kabul

- [ ] Gerçek veride seçilen siparişler ERP ve mevcut ihtiyaç raporuyla uzlaşıyor.
- [ ] Net veri ikinci kez stok düşmüyor; brüt veri tanımlı kuralla netleşiyor.
- [ ] Tekrar aktarım kayıt çoğaltmıyor; bağlantı kesilmesi son başarılı veriyi bozmaz.
- [ ] Revizyonu uygunsuz/bloke stok ihtiyacı karşılamıyor.
- [ ] Bir ortak levha stoğu iki kez tüketilmiyor.
- [ ] İhtiyacın hangi kaynak ve kurallardan oluştuğu satır bazında açıklanabiliyor.
- [ ] ERP'ye yazma işlemi bulunmuyor.



## Faz teslimi

Kabul listesini gerçek sonuçlarla işaretle. `docs/FAZ-TESLIM-SABLONU.md` ile rapor oluştur, STATUS.json ve karar kaydını güncelle. Kanıt olmadan tamamlandı yazma. Sonraki fazı otomatik başlatma.
