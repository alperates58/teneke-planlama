# Kaynaklardan çıkarılan proje bilgisi

Bu metin, kaynak görselleri/Excel/Word dosyasını yeniden yorumlamaya gerek bırakmamak için hazırlanmıştır. Tam veri alanları eşleşen JSON dosyalarındadır. Görünür satırlar aktarılmıştır; ekran dışında kalan satırların varlığı veya içeriği uydurulmamıştır. Teknik isimlerde gereksiz boşluklar düzenlenmiştir; kısaltmalar otomatik açılmamıştır.

## Kaynak kapsamı ve kritik yorumlar

- Ham levha görsellerinde 14 görünür kayıt vardır. Son görsel ek olarak “Minimum Baskı Adeti” başlığı içerir; bütün görünen hücreler boştur. Uygulamanın 1.250 varsayılanı bu hücrelerden okunmuş değildir.
- Teknik kart görselinde 22 görünür kayıt aktarılmıştır. Sağdaki özel parametre alanı görünen satırlarda boştur; “özel kural yoktur” sonucunu kanıtlamaz.
- Teknik kart “Ham Levha kodu” başlığı altında kod değil levha açıklaması gösterir. JSON içindeki gerçek stok kodu adayları ham levha tablosuna açıklama/ebat eşleştirmesidir; ERP kontrolü gerekir.
- Kaynak “Çeşit” sütununun fiziksel kural anlamı belirsizdir. Değerler korunur, algoritma kısıtına otomatik dönüştürülmez.
- Ham levha tablosunda 65×157 vardır fakat kapasite tablosunda yoktur. Kapasite tablosundaki 45×100, 52×90, 52×132, 65×234 ve 65×240 için paylaşılan ham levha tablosunda karşılık görünmüyor. Eksik eşleme işaretlenmeli; benzer levha seçilmemeli.
- Üretim planı görselinde 20 satır vardır. Bunlar ihtiyaç veya vardiya kapasitesi değildir. Makine, vardiya, operasyon süresi ve stok bilgisi görünmüyor.
- Ekranın sağında kesilmiş sütunun içeriği okunamadığı için aktarılmadı. Kaynak veri bu alanda yok kabul edilir, sıfır yapılmaz.
- Sayısal kodlar metin tutulur. Türkçe binlik ayıracı kaldırılarak adet tamsayıları yazıldı.
- Örnek belgeler tarihlidir; güncel canlı talep sayılmaz. Gerçek entegrasyonda güncel veri alınmalıdır.

## 1. Ham levhalar

Kalınlık kaynak değerlerinin birimi doğrulanmış değildir. En/boy teknik referanstır; kapasite hesaplamak için kullanılmaz.

| Kısa isim | Stok kodu | Ebat | Kalınlık kaynak | En | Boy | Kalite |
| --- | --- | --- | --- | --- | --- | --- |
| 90000166 | 500011000004-1103 | 45x140 | 18 | 863 | 866 | T57 |
| 90000167 | 500011000004-1104 | 45x175 | 18 | 863 | 898 | T57 |
| 90000170 | 500011000004-1202 | 52x105 | 17 | 835 | 872 | T61 |
| 90000172 | 500011000004-1204 | 52x161 | 17 | 832 | 827 | T61 |
| 90000173 | 500011000004-1205 | 52x165 | 17 | 832 | 847 | T61 |
| 90000174 | 500011000004-1206 | 52x195 | 17 | 832 | 800 | T61 |
| 90000175 | 500011000004-1207 | 52x214 | 17 | 832 | 875 | T61 |
| 90000176 | 500011000004-1208 | 52x234 | 17 | 832 | 720 | T61 |
| 90000179 | 500011000004-1209 | 65x165 | 17 | 835 | 848 | T61 |
| 90000187 | 500011000004-1406 | 65x270 | 17 | 835 | 827 | T61 |
| 90000219 | 500011000004-1408 | 65x104 | 17 | 835 | 864 | T61 |
| 90000234 | 500011000004-1414 | 65x300 | 18 | 835 | 915 | T61 |
| 90000235 | 500011000004-1415 | 65x195 | 17 | 835 | 798 | T61 |
| 90000217 | 500011000004-1411 | 65x157 | 17 | 835 | 808 | T61 |

## 2. Ebat kapasitesi

| Ebat | Tüp/levha | Çeşit (kaynak) | Adet (kaynak) | Tek çeşit sipariş (kaynak) |
| --- | --- | --- | --- | --- |
| 45x100 | 48 | 8 | 7500 | 60000 |
| 45x140 | 36 | 6 | 7500 | 45000 |
| 45x175 | 30 | 6 | 6250 | 37500 |
| 52x90 | 45 | 9 | 6250 | 56250 |
| 52x105 | 40 | 8 | 6250 | 50000 |
| 52x132 | 30 | 6 | 6250 | 37500 |
| 52x161 | 25 | 5 | 6250 | 31250 |
| 52x165 | 25 | 5 | 6250 | 31250 |
| 52x195 | 20 | 5 | 5000 | 25000 |
| 52x214 | 20 | 5 | 5000 | 25000 |
| 52x234 | 15 | 5 | 3750 | 18750 |
| 65x104 | 32 | 8 | 5000 | 40000 |
| 65x165 | 20 | 5 | 5000 | 25000 |
| 65x195 | 16 | 4 | 5000 | 20000 |
| 65x234 | 12 | 3 | 5000 | 15000 |
| 65x240 | 12 | 3 | 5000 | 15000 |
| 65x270 | 12 | 3 | 5000 | 15000 |
| 65x300 | 12 | 3 | 5000 | 15000 |

Referans 1.250 levhadır. Kaynak notu: 57 çap için Sarten tedarikçisinden siparişe özel minimum istenir.

## 3. Ürün teknik kartları

| Stok kodu | Stok adı | Ebat | Zemin | Vernik | Lak | Renkler |
| --- | --- | --- | --- | --- | --- | --- |
| 511109010410-1102 | TUP-GW MOBILYA 300 ml (52x214)-LEMON | 52x214 | METALİK | KISMİ | LAKLI | C, M, Y, K, 1225C |
| 511109010410-7026 | TUP-GW MOBILYA CIL. 300 ml (52x214)-LEMON SCENT | 52x214 | METALİK | KISMİ | LAKLI | C, M, Y, K, 1225C |
| 511109010410-7025 | TUP-GW MOBILYA CIL. 300 ml (52x214)-NATURAL SCENT | 52x214 | METALİK | KISMİ | LAKLI | C, M, Y, K, 1225C |
| 511109010410-7024 | TUP-GW MOBILYA CIL. 300 ml (52x214)-POTPORI SCENT | 52x214 | METALİK | KISMİ | LAKLI | C, M, Y, K, 1225C |
| 511115011310-7458 | TUP-GW ODA SPR-500 ml (65x195)-CHRISTMAS EDITION | 65x195 | EMAYE | PARLAK | LAKLI | C, M, Y, K, 7621C, 364C |
| 511109010910-7284 | TUP-GW-MS ODA ALKOL-400 ml (52x234)-CITRUS FEST | 52x234 | EMAYE | PARLAK | LAKLI | C, M, Y, K, 368C, 357C |
| 511109010910-7285 | TUP-GW-MS ODA ALKOL-400 ml (52x234)-ELEGANT AMBER | 52x234 | EMAYE | PARLAK | LAKLI | C, M, Y, K, 368C, 357C |
| 511109010910-7283 | TUP-GW-MS ODA ALKOL-400 ml (52x234)-J.CHERRY BLO. | 52x234 | EMAYE | PARLAK | LAKLI | C, M, Y, K, 368C, 357C |
| 511109010910-4634 | TUP-GW-MS SDCM ALKOL B.-400 ml (52x234)-BUBBLE GUM | 52x234 | EMAYE | PARLAK | LAKLI | C, M, Y, K, 368C, 357C |
| 511109010910-4640 | TUP-GW-MS ODA ALKOL-400 ml (52x234)-ORANGE | 52x234 | EMAYE | PARLAK | LAKLI | C, M, Y, K, 368C, 357C |
| 511109010910-4630 | TUP-GW-MS ODA ALKOL-400 ml (52x234)-ROSE&PEARL | 52x234 | EMAYE | PARLAK | LAKLI | C, M, Y, K, 368C, 357C |
| 511109010910-4631 | TUP-GW-MS ODA ALKOL-400 ml (52x234)-S.BERRY | 52x234 | EMAYE | PARLAK | LAKLI | C, M, Y, K, 368C, 357C |
| 511109010910-4641 | TUP-GW-MS ODA ALKOL-400 ml (52x234)-TOBACCO | 52x234 | EMAYE | PARLAK | LAKLI | C, M, Y, K, 368C, 357C |
| 511109010910-4625 | TUP-GW-MS ODA ALKOL-400 ml (52x234)-ANTI TABAC | 52x234 | EMAYE | PARLAK | LAKLI | C, M, Y, K, 368C, 357C |
| 511109010910-4620 | TUP-GW-MS ODA ALKOL-400 ml (52x234)-JASMIN&COT. | 52x234 | EMAYE | PARLAK | LAKLI | C, M, Y, K, 368C, 357C |
| 511109010910-4632 | TUP-GW-MS ODA ALKOL-400 ml (52x234)-LILAC&LOTUS | 52x234 | EMAYE | PARLAK | LAKLI | C, M, Y, K, 368C, 357C |
| 511109010910-4623 | TUP-GW-MS ODA ALKOL-400 ml (52x234)-LIME&ORANGE | 52x234 | EMAYE | PARLAK | LAKLI | C, M, Y, K, 368C, 357C |
| 511109010910-4624 | TUP-GW-MS ODA ALKOL-400 ml (52x234)-M.FRAN OCEA | 52x234 | EMAYE | PARLAK | LAKLI | C, M, Y, K, 368C, 357C |
| 511109010910-4629 | TUP-GW-MS ODA ALKOL-400 ml (52x234)-MOSS&SPRING | 52x234 | EMAYE | PARLAK | LAKLI | C, M, Y, K, 368C, 357C |
| 511109010910-4628 | TUP-GW-MS ODA ALKOL-400 ml (52x234)-TUTTI FRUTTI | 52x234 | EMAYE | PARLAK | LAKLI | C, M, Y, K, 368C, 357C |
| 511109010910-4633 | TUP-GW-MS ODA ALKOL-400 ml (52x234)-LAVENDER&CHOM | 52x234 | EMAYE | PARLAK | LAKLI | C, M, Y, K, 368C, 357C |
| 511109010910-4635 | TUP-GW-MS ODA ALKOL-400 ml (52x234)-MOUNTAIN LAKE | 52x234 | EMAYE | PARLAK | LAKLI | C, M, Y, K, 368C, 357C |

## 4. Mevcut üretim planı referansı

| Hafta | Bitiş | Tüketim kodu | Tüketim adı | Ebat | Üretilecek miktar |
| --- | --- | --- | --- | --- | --- |
| 2026-45-Hafta | 2026-11-03 | 512031011610-1007 | TUP-ROOMSTAR YEDEK SPR 300 ml (65x104)-BAHAR TAZELIGI-YENI | 65x104 | 60160 |
| 2026-45-Hafta | 2026-11-04 | 512031011610-1009 | TUP-ROOMSTAR YEDEK SPR 300 ml (65x104)-PUDRA ETKISI-YENI | 65x104 | 40000 |
| 2026-45-Hafta | 2026-11-04 | 512031011610-1008 | TUP-ROOMSTAR YEDEK SPR 300 ml (65x104)-MASAL BAHCE-YENI | 65x104 | 54080 |
| 2026-45-Hafta | 2026-11-05 | 512011011610-8211 | TUP-RITM YEDEK SPR 300 ml (65x104)-LAVANDER DREAM | 65x104 | 16000 |
| 2026-45-Hafta | 2026-11-05 | 512011011610-8212 | TUP-RITM YEDEK SPR 300 ml (65x104)-ROSY GARDEN | 65x104 | 16000 |
| 2026-45-Hafta | 2026-11-05 | 512011011610-8213 | TUP-RITM YEDEK SPR 300 ml (65x104)-WHITE FLOWERS | 65x104 | 16000 |
| 2026-45-Hafta | 2026-11-05 | 512011011610-8214 | TUP-RITM YEDEK SPR 300 ml (65x104)-SPRING FRESH | 65x104 | 16000 |
| 2026-45-Hafta | 2026-11-05 | 512011011610-8215 | TUP-RITM YEDEK SPR 300 ml (65x104)-SPICY | 65x104 | 16000 |
| 2026-45-Hafta | 2026-11-05 | 512082011610-1001 | TUP-EBRU YEDEK SPR 300 ml (65x104)-LAVANTA BAHCESI | 65x104 | 25000 |
| 2026-45-Hafta | 2026-11-06 | 512082011610-1003 | TUP-EBRU YEDEK SPR 300 ml (65x104)-OKYANUS FERAH | 65x104 | 25000 |
| 2026-45-Hafta | 2026-11-06 | 511121010410-5004 | TUP-NEWO FIRIN&IZGARA TEMIZLEYICI KOPUK 500 ml (65x195)-LIMON-LAKSIZ | 65x195 | 5032 |
| 2026-45-Hafta | 2026-11-06 | 511121010410-5003 | TUP-NEWO CAM TEMIZLEYICI KOPUK 500 ml (65x195)-LAKSIZ | 65x195 | 10000 |
| 2026-45-Hafta | 2026-11-06 | 511121010410-5005 | TUP-NEWO TUVALET TEMIZLEYICI KOPUK 500 ml (65x195)-LIMON-LAKSIZ | 65x195 | 10000 |
| 2026-45-Hafta | 2026-11-06 | 511280019 | TUP-PAKZONE FIRIN TEMIZLEYICI 500 ml (65x195)-LAKSIZ-LIMON | 65x195 | 25120 |
| 2026-46-Hafta | 2026-11-09 | 512380003 | TUP-DOMOL OVEN CLEANER 500 ml (65x195)-LAKSIZ-AL | 65x195 | 60000 |
| 2026-46-Hafta | 2026-11-10 | 511121010410-5002 | TUP-DOMOL CAM TEMIZ. 500 ml (65x195)-LAKSIZ | 65x195 | 150080 |
| 2026-46-Hafta | 2026-11-11 | 511290003 | TUP-DOMOL WC AKTIF TEMIZ. 750ml (65x195)-LAKSIZ-AL-LIMON | 65x195 | 52320 |
| 2026-46-Hafta | 2026-11-11 | 511121010410-6013 | TUP-DOMOL WC AKTIF TEMIZ. 750ml (65x195)-LAKSIZ-SAF TEMIZLIK | 65x195 | 40000 |
| 2026-46-Hafta | 2026-11-12 | 511121010410-1006 | TUP-DOMOL OVEN CLEANER 500 ml (65x195)-LAKSIZ | 65x195 | 130560 |
| 2026-46-Hafta | 2026-11-13 | 511109011610-1501 | TUP-GW-MS YEDEK SPR 250 ml (65x104)-MOSS&SPRING | 65x104 | 12000 |

## 5. SOFT matbaa baskı siparişi

| Montaj | Dağılım | Levha | Teorik tüp | Sipariş | Teslim |
| --- | --- | --- | --- | --- | --- |
| 1 | VANILLA×4, OCEANIC×8, LAVENDER×8 | 1250 | 25000 | 2026-10-30 | 2026-11-06 |
| 2 | CITRUS×4, ANTİTÜTÜN×8, ROSE×8 | 1250 | 25000 | 2026-10-30 | 2026-11-06 |

Her iki satır: 52×195, 0.17×832×800 levha, içi GOLD, dışı EMAYE, CMYK, SOFT revizyon 08. Matbaa KONTENSAN; hazırlayan kaynakta Hazel ASLAN. Form No ÜR F21; yayın 06.12.2013; form revizyon 01, tarih 14.04.2014. Ürün revizyonu 08 ile form revizyonu 01 karıştırılmaz. CTP montajının gönderileceği notu var; grafik dosyası bu pakette yoktur.

Excel'in IV4 ve IV5 hücrelerinde sırasıyla 93908 ve 93909 bulunuyor. Alan anlamı bilinmiyor; sipariş/iş emri kimliği olarak otomatik kullanılmaz. Tam hücre dökümü data/source-workbook-cells.json içinde.

## 6. Word belgesindeki operasyon akışı

1. Planlama dolum programını kurar; mevcut Excel ihtiyaç verir. Yeni revizyon veya eski tüpün kullanılamaması durumunda manuel düzeltme olabilir.
2. Teneke depo stoğu esas alınır; üretim deposunda anlamlı tüp görünürse fiziki kontrol ve sistem düzeltmesi sonrası ihtiyaç yeniden belirlenir.
3. Sipariş açıklamasında RPT/revize ayrımı yapılır. Eski belgede notsuz sipariş RPT; bu politika yeni uygulamada doğrulanacak karardır.
4. Minimum baskı sonucu PL malzeme kalacaksa satıştan miktar değişimi istenir, mümkün değilse satış yöneticisi onayı alınır. Kendi markasında çok tüketilen veya az stoklu ürünler montaja eklenebilir.
5. Yeni ürünün ebat/vernik/zemin/renk bilgisi grafik dosyasından gelir; sonradan sistemde teknik kart olarak doğrulanır.
6. Zemin metalik veya emaye; montajdaki zeminler aynı olmalı. Renkler CMYK/Pantone. Eski belgede 6 üstü genel müdür onayıyla mümkün; güncel kullanıcı açıklamasında sınır 6. Şu an 6 üstüne izin verilmez; bu fark açık karar listesinde tutulur.
7. Vernik parlak, mat veya kısmi parlak/mat olabilir. Birlikte basılma uyumu kaynakta tam açıklanmıyor.
8. Matbaa formu tedarikçiye iletilir; dolum tarihine göre tüp programı yapılır, tedarikçi teslim teyidi ve sevkiyat planlanır. Baskılı levhayı alan araçla fason depoya ham levha sevki olabilir.
9. Mal kabul balyaları indirir, kg tartar, teslim formuna işler ve takip numarası verir. İrsaliyeye göre stok girişi yapılır; mevcut Nitrojen iş emirleri operasyon ekranına aktarılır.
10. Stok önce kalite deposuna düşer. Kontrol/onay ve kabul etiketi sonrası üretime uygun olur.
11. Makas ve tüp makineleri dolum takvimine ve ebatlara göre, ayar değişimini azaltarak planlanır. Yetişmiyorsa mesai/vardiya, matbaa ve pres programları değiştirilir.
12. Makas personeli onaylı levhayı keser, iş emri üretim girişini ve etiketi yapar. Tüp makinesi yarı mamul parti numaralarıyla işe başlar.
13. İstif operatörü palet tamamlanınca aynı iş emrinden üretim girişi ve etiket yapar. Günlük çeşit/miktarlar kaydedilir. Forklift paleti depoya, dolum talebine göre dolum alanına taşır.
14. Ay sonunda son 6 aylık üretim ortalaması ve mevcut stokla ham levha satın alma ihtiyacı belirlenir. SAT, fiyat ve üst yönetim onayı sonrası tedarikçi portalından sipariş verilir.
15. Dip ve üst kapaklar preslerde stoklu üretilir; pres kapasitesi/durumu tüp planını etkiler. Kapak levhaları da matbaa ve stok kabul sürecinden geçer.
16. Lak, sıvı conta (kaynakta “lıkıt conta”), ara karton, tel bakır, palet ve çerçeve stokları manuel takip edilip satın alma talebi açılır.
17. Sayımda ad/adet/lot ve gerekli ürünlerde revizyon yazılır. Kullanılamayan eski revizyonlar bloke depoya alınır.
18. Dip, bombe, laklı/kesik/ham levha yarı mamul depoyla; tüpler teneke depoyla karşılaştırılır. Büyük farklar yeniden sayılır. Tüp sayımında dolum alanı boşaltılıp üretim deposundaki tüpler teneke depoya aktarılır. Fason ham levha stoğu tedarikçide ayrıca sayılır.

Tam orijinal paragraf metni `SUREC-BELGESI-TAM-METIN.md` içinde. Mevcut Nitrojen/ERP operasyonlarının tarif edilmesi, yeni uygulamanın bu sistemlere yazma yetkisi olduğu anlamına gelmez.
