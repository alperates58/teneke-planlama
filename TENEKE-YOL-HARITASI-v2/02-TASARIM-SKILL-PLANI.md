# Faz 2D — Tasarım becerileri ve arayüz kabulü
Bu iş unutulmayacak: roadmap ve STATUS içinde ayrı teslim olarak izlenecek.

## Araçların rolleri
- Impeccable (https://github.com/pbakaus/impeccable): bu proje için birincil arayüz eleştirisi/iyileştirme ve kalite denetimi aracı. Önce kurulu olup olmadığı ve güncel resmi kurulum talimatı doğrulanır; Antigravity'ye uygun proje kapsamlı kurulum yapılır. Kritik komutların güncel adı kurulu sürümden okunur; eski slash komutları körlemesine kullanılmaz.
- UI UX Pro Max (https://github.com/nextlevelbuilder/ui-ux-pro-max-skill): son rapora göre Antigravity ortamında kurulu. Yoğun operasyon tablosuna uygun tipografi, renk, aralık ve bileşen rehberi için yardımcı kaynak. Kurulu sürümün gerçek SKILL.md'si okunur.
- İki araç aynı anda bağımsız tema üretmez. Tek proje tasarım sözleşmesi otoritedir. Kurulum sürümü/commit'i belgelenir; projeler genelinde kontrolsüz global güncelleme yapılmaz.
- ALPER DESIGN OS adı/eski “koru” metni, kullanıcının beğenmediği tasarımı değiştirilemez kılmaz. Bu projede kullanıcı onaylı yeni görsel dil önceliklidir. ALPER DESIGN OS'nin diğer projeleri veya global deposu bu çalışma kapsamında değiştirilmez. AGENTS.md'nin eski light-theme koruma şartı yeni kararla uyumlu hale getirilir; açık tema tercihi devam eder.

## Pilot
1. Mevcut İhtiyaç Havuzu ve Tanımlar ekranını gözlemle; gerçek aktif UI dosyalarını belirle.
2. Planlamacının sık yaptığı işleri tanımla: termin açığını görme, stok aşamalarını anlama, tüp planına/baskıya aktarma, filtreleme ve satır detayı.
3. Önce Impeccable ile eleştiri ve erişilebilirlik/taşma incelemesi; UI UX Pro Max ile seçilen yaklaşımın bileşen kurallarını destekle.
4. İhtiyaç Havuzu için geri alınabilir tek pilot uygula. Backend sözleşmelerini değiştirmeden UI'ı iyileştir. Henüz hesaplanmayan veri alanına gerçekmiş gibi sayı koyma.
5. Kullanıcıya çalışan pilot ve aynı ekran boyutunda karşılaştırma göster. Beğenilen görünüm DESIGN.md/uygun tek dosyada renk, tipografi, aralık, tablo, form, hata/boş/yükleme durumlarıyla sabitlenir.
6. Pilot onayından sonra Tanımlar, makine planı, kombinasyon ve diğer ekranlara ortak bileşenlerle yay. Her ekranın backend/veri işlevi korunur.

## Görsel yön
Açık renkli kurumsal üretim planlama arayüzü. Normal metinde okunaklı sans; sadece kod/sayı gerektiğinde tabular/mono. Başlık hiyerarşisi, belirgin satır seçimi, sabit ürün kimliği/başlıklar, kontrollü yatay kaydırma ve sütun görünüm ayarı. Sayılar sağa hizalı; birim başlıkta; stok ve ihtiyaç ayrımı net. Aşırı kart yuvalama, dekoratif gradient/cam efekti, sürekli yanıp sönen DB rozeti ve her satırda gereksiz renk karmaşası yok. Emoji yerine tutarlı ikon; durum yalnız renkle ifade edilmez. “FK”, “Schema v2”, framework veya faz adı normal ürün ekranının ana içeriği olmaz; teknik panelde gerektiğinde görünür.

## Kabul
- 1366×768 ve 1920×1080 masaüstünde ana görevler kullanılabilir; daha dar görünümde filtre/detail panel ve tablo kaydırması çalışır.
- Klavye erişimi, görünür focus, hata geri bildirimi ve okunaklı kontrast.
- Gerçekçi uzun stok adı/kodu ve çok basamaklı sayılarda taşma yönetimi.
- Üretim sırası düzenleme/sayısal alanlar görünür ve yanlışlıkla kaydetme engellenmiş.
- Tasarım değişikliği hesap, veri kaydı, seçim ve import işlevlerini bozmuyor.
- Otomasyon “güzel” diyerek kullanıcı görsel kabulü yerine geçmez. Onay bekleyen pilot genel sisteme yayılmaz; bu sırada SQL/backend işleri ilerleyebilir.
