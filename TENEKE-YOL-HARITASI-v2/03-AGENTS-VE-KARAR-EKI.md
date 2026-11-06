# AGENTS / karar kaydı için v2 ekleri
Mevcut dosyaları silmeden, çelişen eski kuralları açıkça yürürlükten kaldırarak birleştir.

1. Veri erişimi: stok, reçete, talep entegrasyonu SELECT. Kullanıcının 06.11.2026 yeni talebiyle yalnız doğrulanmış meltem_teneke plan kapsamına açık Kaydet/Yayınla işlemiyle kontrollü yazma istisnası vardır. Bu istisna diğer ERP verilerini değiştirme yetkisi değildir.
2. Mevcut aktif plan kullanıcı beyanına göre meltem_teneke'dedir. Önce canlı şema, sıra ve Excel akışı doğrulanır; plan olduğu gibi snapshot alınır. Eski analizdeki tablo rollerinden hareketle mevcut plan silinmez veya yeniden kurgulanmaz.
3. Kullanıcı plan sırasını Excel'deki gibi değiştirebilir. Taslak PG'de; kaynak tablo yalnız fark önizlemesi ve yayın onayıyla güncellenir. Snapshot, eşzamanlı Excel değişikliği koruması ve geri dönüş şarttır.
4. Makine sayısı bir. Mesai/vardiya/mola ve hız/hazırlık parametreleriyle takvim planlama, baskı kombinasyonundan önce çalışabilir. Renk/zemin eksikliği tüp stok kartının senkronunu veya tüp üretim planı taslağını engellemez. Yeni baskı onayı ayrı teknik uygunluk gerektirir.
5. Teknik uygunluk tek boolean değildir: planlama için katalog/ebat/hız, kesim için reçete/malzeme, baskı için renk/zemin/lak/levha/şablon durumları ayrı değerlendirilir. Eksik kayıtlar görünür kalır.
6. 2C son teslimi rapor edildi. 39 PASS bağımsız bu belgede tekrar yürütülmedi. Özellikle hatalı Excel satırlarında varsayılan atomik dosya kabulü ile kısmi aktarım davranışı hedefli kontrol edilecek; bütün faz tekrar yazılmayacak.
7. Faz5 tüp makinesi planı, 5A ve5W olarak öne çekildi. Faz4 baskı motoru ve5B malzeme/operasyon bağlantısı sonraki bağımlılıklardır. Eski numaralar/geçmiş kayıtlar silinmez; uygulama sırası tabloyla belirtilir.
8. Faz2D tasarım pilotu zorunlu takip edilir: birincil Impeccable, yardımcı kurulu UI UX Pro Max, tek tasarım sözleşmesi. Kullanıcının yeni tercihi mevcut ALPER DESIGN OS görünümünü değiştirmeye izin verir; diğer projeleri etkilemez.
9. Aktif UI public/SPA ve modüler Node backend; src/ Next.js pasif. Canlıya geçiş aşamasında zorunlu framework taşıması yapılmaz; bunun kararı ayrı kapsamdır.
10. İki DB arasındaki yayın tek dağıtık transaction sanılmaz. Yayın isteği kimliği ve sonuç uzlaştırması çift yazım/timeout tekrarını güvenli yönetir. SQL satırlarının doğal sırası veya GUID sırası üretim sırası kabul edilmez.
11. Kullanıcı Excel teknik kartlarını sonradan yükleyebilir; stok koduyla ilişkilendirilir, mevcut plan/kimlikler değişmez. ERP senkronu teknik alanları ezmez.
12. Nihai hesap değişmedi: 50−10=40 tüp üretim; 40−5=35 kesim;35−7=28 yeni baskı, uygun tüp eşdeğeriyle. Mevcut plan içeri alınırken bu hesap tekrar uygulanıp miktar değiştirilmez.
