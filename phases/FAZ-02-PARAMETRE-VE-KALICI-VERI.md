# FAZ 2 — PARAMETRE VE KALICI VERI

Durum: PLANLANDI. Uygulama ve kabul kanıtı henüz yok.

Önce kökteki AGENTS.md dosyasını oku. Bu dosyanın varlığı fazı başlatma yetkisi değildir; aktif fazı STATUS.json ve kullanıcının güncel görevi belirler.

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



## Faz teslimi

Kabul listesini gerçek sonuçlarla işaretle. `docs/FAZ-TESLIM-SABLONU.md` ile rapor oluştur, STATUS.json ve karar kaydını güncelle. Kanıt olmadan tamamlandı yazma. Sonraki fazı otomatik başlatma.
