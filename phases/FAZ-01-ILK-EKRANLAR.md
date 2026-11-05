# FAZ 1 — ILK EKRANLAR

Durum: PLANLANDI. Uygulama ve kabul kanıtı henüz yok.

Önce kökteki AGENTS.md dosyasını oku. Bu dosyanın varlığı fazı başlatma yetkisi değildir; aktif fazı STATUS.json ve kullanıcının güncel görevi belirler.

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



## Faz teslimi

Kabul listesini gerçek sonuçlarla işaretle. `docs/FAZ-TESLIM-SABLONU.md` ile rapor oluştur, STATUS.json ve karar kaydını güncelle. Kanıt olmadan tamamlandı yazma. Sonraki fazı otomatik başlatma.
