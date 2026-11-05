# FAZ 5 — URETIM PLANLAMA

Durum: PLANLANDI. Uygulama ve kabul kanıtı henüz yok.

Önce kökteki AGENTS.md dosyasını oku. Bu dosyanın varlığı fazı başlatma yetkisi değildir; aktif fazı STATUS.json ve kullanıcının güncel görevi belirler.

## 9. Faz 5 — Teneke üretim planlama

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



## Faz teslimi

Kabul listesini gerçek sonuçlarla işaretle. `docs/FAZ-TESLIM-SABLONU.md` ile rapor oluştur, STATUS.json ve karar kaydını güncelle. Kanıt olmadan tamamlandı yazma. Sonraki fazı otomatik başlatma.
