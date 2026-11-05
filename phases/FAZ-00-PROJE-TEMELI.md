# FAZ 0 — PROJE TEMELI

Durum: PLANLANDI. Uygulama ve kabul kanıtı henüz yok.

Önce kökteki AGENTS.md dosyasını oku. Bu dosyanın varlığı fazı başlatma yetkisi değildir; aktif fazı STATUS.json ve kullanıcının güncel görevi belirler.

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



## Faz teslimi

Kabul listesini gerçek sonuçlarla işaretle. `docs/FAZ-TESLIM-SABLONU.md` ile rapor oluştur, STATUS.json ve karar kaydını güncelle. Kanıt olmadan tamamlandı yazma. Sonraki fazı otomatik başlatma.
