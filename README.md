# Teneke Planlama — Başlangıç Paketi v1.0

Tarih: 5 Kasım 2026. Bu paket tüm fazların planını ve sağlanan kaynakların okunabilir bilgi karşılığını içerir. Henüz geliştirilmiş uygulama değildir.

## Kullanım

1. ZIP'i ayrı bir proje klasörüne çıkar.
2. Antigravity'de AGENTS.md dosyasının bulunduğu klasörü çalışma alanı olarak aç. Mevcut kod varsa onu silme; bu dosyaları uygun biçimde birleştir.
3. BASLATMA-PROMPTU.txt içindeki kısa metni Antigravity'ye ver.
4. Antigravity önce Faz 0 ve Faz 1'i uygulasın; sonraki fazlar ilgili kabul sonrası başlatılır.

## İçindekiler

- AGENTS.md: kesin kurallar, süreç bilgisi ve uygulama sınırları.
- phases/: Faz 0–7 için sekiz ayrı kapsam/kabul dosyası.
- docs/: ana yol haritası, kaynaklardan çıkarılmış tüm bilgi, Word tam metni, ekran sözleşmesi, açık kararlar ve teslim şablonu.
- data/: 14 ham levha, 18 kapasite, 22 teknik ürün ve 20 plan satırı; SOFT baskı formu, tam Excel hücre dökümü ve temsili renk testleri.
- sources/originals/: kullanıcının sağladığı 8 kaynak dosyanın değiştirilmemiş kopyaları.
- STATUS.json: uygulama ilerleme durumu; başlangıçta bütün fazlar planlandı.
- SOURCE-MANIFEST.json ve PACKAGE-MANIFEST.json: kaynak eşlemeleri ve dosya bütünlüğü bilgileri.
- VALIDATION.md: paket kontrolleri; yazılım testi sonucu değildir.

## Bilgi kaybını önleme

Bu klasörü projenin belgeleri olarak sakla. AGENTS.md kökte kalsın. Her faz sonunda STATUS.json, karar kaydı ve teslim raporu güncellensin. Yeni sohbet/geliştirme oturumunda bu dosyalar okunarak devam edilsin. Proje daha sonra Git'e alındığında teknik belgeler de sürüm kontrolüne dahil edilsin; bu paket kendi başına uzak repository veya otomatik yedek oluşturmaz.

Ekran görüntülerinin yalnız görünen satırları aktarılmıştır; eksik alanlar tahmin edilmemiştir. Kaynaklar ve özel ticari veriler içerdiği için herkese açık repository'ye otomatik yayımlanmamalıdır.
