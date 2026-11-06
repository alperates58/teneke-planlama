# Teneke Planlama — Yol Haritası v2
06.11.2026. Kullanıcının yeni kararlarıyla bütün fazların yeniden ele alınması.

Dosyalar:
- 01-ANA-YOL-HARITASI.md: bütün fazlar, bağımlılıklar ve kabul şartları.
- 02-TASARIM-SKILL-PLANI.md: Impeccable/UI UX Pro Max pilotu ve tasarım kabulü.
- 03-AGENTS-VE-KARAR-EKI.md: kalıcı kararlar ve eski salt-okuma kuralına dar istisna.
- 04-ANTIGRAVITY-SIRADAKI-PROMPT.txt: dokümanları birleştirip mevcut planı kayıpsız alma görevini uygulatan prompt.

En önemli değişiklik: tek makine tüp planı ve meltem_teneke'den okuma/geri yazma,
renk/zemin datasını beklemeden öne alınmıştır. ERP stok/reçete senkronu salt okuma
kalır; yalnız doğrulanmış meltem_teneke plan kapsamına kullanıcı Yayınla işlemiyle
kontrollü geri yazım5W'de yapılır. Bu paket şimdi kaynakSQL'e yazma yapmaz.

Önceki analiz ve başlangıç paketlerinin tarihçesi korunur. Çelişen geleceğe yönelik
plan maddelerinde kullanıcının en son talimatını temsil eden bu ekler uygulanır.
2C son teslimi kullanıcı tarafından paylaşılmış rapordur; burada bağımsız kod/test
tekrarı yapılmadı. Paket yeni yol haritasıdır; geliştirme tamamlandı belgesi değildir.
