# Tanımlar menüsü, stok kartları ve teknik veri girişi
Kullanıcının 05.11.2026 ek talebi. Faz 2C ve Faz 3A bağlantı kapsamına eklenir.

## Menü
Tanımlar üst menüsünde: Stok Kartları; Tüp Teknik Kartları; Ham Levhalar; Tüp–Levha Eşleşmeleri; Ebat/Kapasite/Montaj Şablonları; Renkler; Zeminler; Vernikler; Lak Durumları; İç Kaplamalar; Ürün Grupları; Matbaa/Yerleşim/Kombinasyon Kuralları; Makine/Hat/Vardiya/Takvim; Hız ve Hazırlık Süreleri; Depo Kullanım Politikaları; Matbaa/Tedarikçi ve Minimum Baskı Parametreleri. Fazı gelmemiş ekranlar çalışıyor gibi gösterilmez, yol haritasında izlenir.

Tüm yönetilebilir tanımlarda ekle, düzenle, kaldır/pasife al ve uygun durumda sil işlemi olmalı. Kullanılan tanım fiziksel silinemez; referans sayısı ve ilgili kayıtlar gösterilir, pasife alma sunulur. Hiç kullanılmamış yerel tanım onayla silinebilir. Değişiklik kullanıcı/tarih/eski-yeni değer bilgisiyle kaydedilir.

## Veri sahipliği
- Stok ana kartı: ERP entegrasyonu stok kodu/ad/kategori/birim gibi ana alanların sahibidir. Uygulama ERP stok kartını silmez/değiştirmez.
- Teknik kart: stok koduna bağlı renkler, zemin, vernik, lak, iç kaplama, onaylı levha, özel kurallar uygulama tarafından yönetilir; manuel veya Excel importuyla güncellenebilir.
- ERP senkronu teknik alanları ezmez. ERP adı değişirse gösterilen ad güncellenir; renk/levha eşleşmeleri korunur. Ad üzerinden kimlik/eşleştirme yapılmaz.
- Henüz ERP'ye gelmeyen stok kodu teknik taslak olarak kaydedilebilir fakat “ERP eşleşmesi bekliyor” durumundadır; geçerli üretim/onaylı kombinasyon kaydı sayılmaz. Sistemin ürün adını uydurmasına izin verilmez.
- Stok kodu zorunlu, metin tipinde, baştaki sıfır ve tire korunur. Dış boşluk temizlenebilir; kod karakterleri keyfi değiştirilemez. Tekil kod + kaynak sistem kapsamı ve versiyon politikası açık tanımlanır.

## Manuel form
Kullanıcı stok kodunu yazar/seçer. Entegrasyonla alınmış yerel stok kataloğunda aranır, **stok adı otomatik dolar ve ana kart alanı olarak salt okunurdur**. Kod yoksa eşleşmedi mesajı ve taslak durumu; yanlış ürüne otomatik benzer-ad eşleştirmesi yok. Her tuşta ERP sorgulamak yerine yerel senkron katalog kullanılır.

Ham levha alanı sistemde kayıtlı ham levha stok kodundan seçilir; kod, ad, en, boy, kalınlık birlikte görünür. Bu seçim gerçek ilişkidir (foreign key), açıklama metni değildir. Mevcut onaylı levha dışında alternatif ölçü önerilmez. Tüp ölçüsü/kapasite/kural uyumu denetlenir. Eksik ham kart ayrıca Tanımlar'dan tamamlanır. Reçete zincirinin ulaştığı ham levha ile teknik eşleşme farklıysa açıklamalı uyuşmazlık ve onay engeli oluşur.

Bir tüp için ilk sürümde bir aktif onaylı ham levha eşleşmesi esas alınır. Çoklu alternatif gerekiyorsa revizyon/geçerlilik/seçim açık tasarlanır; algoritma kendiliğinden levha değiştirmez. Planlar kullandıkları teknik kart ve kural versiyonunu saklar; güncelleme geçmiş onayı sessiz değiştirmez.

## Excel içe aktar
Kullanıcının tablosuna uyumlu eşleme:
| Excel başlığı | Hedef / davranış |
|---|---|
| Stok Kodu | Zorunlu teknik kart anahtarı; ERP katalog eşlemesi |
| Stok İsmi | Önizleme/karşılaştırma; ERP adını değiştirmez |
| Ham Levha kodu | Gerçek ham stok kodu ile ilişki; mevcut Excel hücresinde ad varsa açık eşleme gerekir |
| Boy ve Çap, Çap, Boy | Teknik ölçüler; birleşik alan ve ayrı alanlar çelişirse hata |
| Baskı Yüzeyi | Zemin sözlüğü |
| Vernik | Ayrı vernik sözlüğü |
| Lak | LAKLI/LAKSIZ/BILINMIYOR; boş değer laklı kabul edilmez |
| İç Kaplama (yeni opsiyonel kolon) | Lak/vernikten bağımsız sözlük |
| Renk1…Renk6 | Sırası korunabilen, tekrarları giderilmiş renk ilişkileri; katalog kodları |
| Parametre 1 | Özel kural eşleme; serbest metin kendiliğinden çalıştırılabilir kural değildir |

Önemli: Görselde “Ham Levha kodu” altında HAM LEVHA-017x832x847... gibi **isim/açıklamalar** var. Başlık kod olsa da hücre içeriği kod sayılmayacak. Katalogdan tekil açık eşleme önizlenir; birden çok eşleşme/hiç eşleşme kullanıcı düzeltmeden içeri alınmaz. İsim yalnız eşleme yardımıdır; kaydedilen ilişki ham stok kodudur.

İçe aktar akışı: Şablon indir → dosya seç → kolon eşle → doğrulama/önizleme → yeni/güncellenecek/değişmeyen/hatalı satır özeti → onay → işlem kimliği ve sonuç raporu. Stok kodu boş satır reddedilir. Dosya içi aynı kodun çelişkili tekrarları sessizce son satırla ezilmez. Excel'de bilimsel gösterimle bozulmuş kod güvenilir biçimde geri kurulamaz; hata verilir.

Güncelleme politikası seçilir: yalnız yeni kayıtlar / var olanları güncelle / ikisi. Varsayılan boş hücre mevcut alanı silmez; alan temizleme ayrı açık seçenek olmalı. Renk listesinde birleştirme/değiştirme politikası önizlemede açık. Bilinmeyen renk/zemin/levha sözlüğe sessiz eklenmez; kullanıcı tanım oluşturur veya düzeltir. Hatalı satır varsa varsayılan bütün import uygulanmaz; kısmi import seçeneği eklenirse açık seçim ve atlanan satır raporu gerekir.

Makrolar veya Excel formülleri çalıştırılmaz. Teknik şablon .xlsx olmalı; .xlsm alınırsa yalnız hücre verileri okunur. Dosya boyutu/satır limiti uygulanır. Aynı dosyayı yeniden yüklemek mükerrer kayıt üretmez. Değişiklikler kalıcı uygulama DB'sine yazılır; yalnız localStorage yeterli değil.

## Kabul koşulları
1. Stok kodu olmayan manuel/import satırı reddedilir.
2. Kayıtlı kod seçilince adı otomatik gelir; örneğin bilinen kod farklı bir stok ismiyle eşleştirilemez.
3. ERP senkronundan sonra manuel/Excel renk, lak ve ham levha ilişkisi korunur.
4. Ham levha açıklamasından eşleşmeyen/çoklu eşleşen satır onaylanmaz.
5. Kullanılan tanım silinmez; pasife alınır. Geçmiş plan korunur.
6. Aynı Excel ikinci kez işlendiğinde kayıt sayısı şişmez; değişiklik önizlemesi doğru olur.
7. Reçete ham kodu ile manuel eşleşme çelişirse kullanıcı görür; otomatik alternatif levha seçilmez.
8. Tarayıcı yenileme, başka oturum ve servis restart sonrası veri kalır.
9. İzinli kullanıcı tanımları yönetir; görüntüleme yetkisi olan kullanıcı mutation endpoint'lerini çalıştıramaz.
