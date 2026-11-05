# AGENTS.md'ye eklenecek kalıcı proje kararları
05.11.2026 ek kararlar. Mevcut AGENTS.md silinmez; çatışma varsa kullanıcının en yeni kararı esas alınır.

1. SQL entegrasyon DB'si AA_LIDER; mevcut ERP kaynak DB MikroDesktop_LIDER26. View adları/kolon eşlemeleri parametrik. SQL erişimi backend üzerinden ve salt okunurdur.
2. Excel örneği yalnız sorgu okumuyor; meltem_teneke ve alper_tenekeuretim'e toplu DELETE/INSERT yapan makrolar var. Bu yazma modeli yeni entegrasyona kopyalanmaz.
3. Brüt ihtiyaç, net tüp üretimi, net kesim ve yeni baskı ihtiyacı ayrı kavramlar. 50−10−5−7=28 bin yeni baskı, 40 bin tüp üretimi, 35 bin kesim örneği bağlayıcı kabul senaryosu.
4. Tüp/kesik/baskılı yalnız doğrulanmış birim dönüşümüyle netlenir. Baskılı stok otomatik tüp adedi veya otomatik fiziksel levha sayılmaz. Bir stok bir kez tahsis edilir.
5. Ham levha stoğu baskı ihtiyacını azaltmaz; ham satın alma ihtiyacını azaltır. Planlı arz fiziksel stok değildir.
6. Eksik reçeteli veya eşleşmeyen kart havuzdan düşmez. Teknik hata gösterilir ve ilgili onay engellenir.
7. Tanımlar menüsü ve CRUD gereklidir. Stok kodu zorunlu. Stok kodu girilince ad ERP'den senkronlanan katalogdan gelir. Teknik kart manuel ve Excel importuyla yönetilir.
8. ERP stok ana alanları ve yerel teknik alanların sahipliği ayrıdır. Senkron renk/lak/zemin/levha eşleşmesini ezmez. ERP kaydı silinmez; yerel kullanılmış tanımlar pasife alınır.
9. Ham levha eşleşmesi gerçek stok kodu/FK üzerinden kurulur. Excel'deki “Ham Levha kodu” başlığında ad varsa açık eşleme gerekir. Benzer ada göre sessiz eşleme yok.
10. Zemin, vernik, lak, iç kaplama birbirinden bağımsızdır. Bilinmeyen değer otomatik LAKLI olmaz. Serbest Parametre1 metni onaysız çalıştırılabilir kurala dönüşmez.
11. Levha kapasitesi hazır parametre. Yeni ölçü/alternatif levha/nesting önerilmez. Tekrar katları, satır/sütun ve mevcut onaylı fiziksel şablonlar korunur; yalnız kapasite toplamını tutturmak yeterli değildir.
12. Rapor edilmiş örnek ürün grubu yasakları gerçek fabrika zorunluluğu diye türetilmez; yalnız tanımlı/onaylı kurallar çalışır. 6 renk sınırına kullanıcı tarafından onaylanmamış yönetici istisnası eklenmez.
13. Güncel faz planına 2C Tanımlar, 3A SQL, 3B çok seviyeli ihtiyaç, 3C mutabakat eklenir; 4/5/6 bağımlılıkları güncellenir. Faz numaraları repoda doluysa mevcut kayıtlar ezilmeden açık çapraz referans verilir.
14. ALPER DESIGN OS açık tema korunur. Hesap backend ve UI'da ortak doğrulama mantığıyla tutarlı olmalı; testler aynı algoritmanın kopyasını değil beklenen iş sonucunu kontrol etmeli.
15. Kullanıcı talimatı olmadan GitHub push veya canlı deployment yapılmaz. Bu paketin içe alınması SQL'e gerçek bağlantı/ERP değişikliği yetkisi olarak yorumlanmaz.
