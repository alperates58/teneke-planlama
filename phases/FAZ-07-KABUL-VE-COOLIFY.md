# FAZ 7 — KABUL VE COOLIFY

Durum: PLANLANDI. Uygulama ve kabul kanıtı henüz yok.

Önce kökteki AGENTS.md dosyasını oku. Bu dosyanın varlığı fazı başlatma yetkisi değildir; aktif fazı STATUS.json ve kullanıcının güncel görevi belirler.

## 11. Faz 7 — Kabul, sağlamlaştırma ve Coolify

### İşler

- 7.1 Kritik akışların uçtan uca testleri: ihtiyaç → kombinasyon → plan → onay → form → kısmi teslim → üretim → kapanış.
- 7.2 Gerçekçi veri hacminde tablo, senkronizasyon ve çözüm süresi ölçümü. Hedefler veri hacmi öğrenildikten sonra belirlenir; kanıtsız süre garantisi verilmez.
- 7.3 Rol/yetki matrisi, oturum, gizli değerler, dış bağlantılar ve kayıtların son kontrolü.
- 7.4 PostgreSQL ve dosya ekleri için yedekleme, geri yükleme denemesi, saklama ve izleme.
- 7.5 Coolify proje/ortamı, container kaynakları, kalıcı diskler, healthcheck, loglar, HTTPS/domain ve SQL Server çıkış erişimi. Hedef sunucu: `lider-server2` (İç IP: `192.168.70.2`, Dış IP: `95.3.44.150:2222`, SQL hedefi: `172.17.0.6:1433`). Kullanıcı grubuna `sudo usermod -aG docker alper` tanımlanır.
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



## Faz teslimi

Kabul listesini gerçek sonuçlarla işaretle. `docs/FAZ-TESLIM-SABLONU.md` ile rapor oluştur, STATUS.json ve karar kaydını güncelle. Kanıt olmadan tamamlandı yazma. Sonraki fazı otomatik başlatma.
