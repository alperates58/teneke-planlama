# TENEKE PLANLAMA — GÜNCEL DURUM VE KANITLI UZLAŞTIRMA RAPORU

**Tarih:** 06 Kasım 2026  
**İnceleme Türü:** Kod, Çalışma Zamanı, Veritabanı, Ağ ve Arayüz Durum Tespiti  
**Raporlayan:** Antigravity  
**Kural Sınırı:** İnceleme ve durum belgelemesidir; uygulama kodu değiştirilmemiş, paket/skill kurulmamış, revert/reset yapılmamış, GitHub'a push ve Coolify deployment gerçekleştirilmemiştir.

---

## 1. YEREL KOD İLE GITHUB KARŞILAŞTIRMASI

| Parametre | Tespit Edilen Değer | Durum / Açıklama |
|---|---|---|
| **Aktif Çalışma Dizini** | `C:\Users\alper\Desktop\PROJELER\KURUMSAL PROJELER\teneke-planlama` | Uygulamada doğrulandı |
| **Git Branch** | `main` | Uygulamada doğrulandı |
| **HEAD Commit SHA** | `3a4155d3f79d8b0a8fad87e0ec427268434f6d83` | Uygulamada doğrulandı (GitHub ile birebir eşleşiyor) |
| **Git Status** | Modified: `docker-compose.yml` (Port 3001 esnekliği) | Uygulamada doğrulandı |
| **Commit Edilmemiş Dosyalar** | `.env` (Yerel port ve ortam ayarı; `.gitignore` kapsamında) | Uygulamada doğrulandı |

### 1.1 Commit Geçmişi Analizi
Git geçmişinde toplam 3 adet commit bulunmaktadır:
1. `17a2f28` (05.11.2026 16:29): *feat: Teneke planlama sistemi Faz 0-2 (Kurallar, montaj motoru, teknik tanimlar, arayuz)*
2. `9c01c45` (05.11.2026 17:16): *docs: TENEKE-FAZ-3 analiz paketi, kademeli ihtiyac kurallari ve Faz 2C-3C yol haritasi entegrasyonu*
3. `3a4155d` (06.11.2026 11:42): *feat(faz-2c): Tanimlar Merkezi, ERP stok katalogu, bagimsiz sozlukler, Excel teknik kart ice aktarma motoru ve Docker entegrasyonu*

### 1.2 "Faz 2B" Durumu ve Revert İzleri
- **Kayıt Çelişkisi:** Git commit ağacında veya etiketlerinde `2B` adında bağımsız bir commit ya da revert commit'i bulunmamaktadır.
- **Belgesel Varlık:** `docs/KARAR-KAYDI.md` ve `docs/referans/2026-11-05-teneke-excel/docs/04-FAZLAR-VE-KABUL.md` belgelerinde Faz 2B'den "kalıcı veri ve ortak kural motoru" olarak söz edilmektedir.
- **Kritik Mimari Kopukluk:** İlk commit'te (`17a2f28`) Dockerfile bir Next.js multi-stage build (`npm run build`, Next.js standalone runner) iken, son commit'te (`3a4155d`) Dockerfile Next.js derlemesini tamamen devre dışı bırakmış; yerine 76 satırlık statik bir Node.js sunucusu (`server.js`) ve `public/app.js` dosyasını koymuştur.
- **Faz 2C Kodunun Gerçek Konumu:** Faz 2C geliştirmesi (`3a4155d`), `src/` klasöründeki React/Next.js kodlarına **tek bir satır dahi eklememiştir**. Faz 2C kapsamındaki tüm mantık (Tanımlar Merkezi, ERP stok kataloğu, sözlükler, TSV text tabanlı içe aktarma) yalnızca `public/app.js` (vanilla JS) içine yazılmıştır.

---

## 2. GERÇEKTEN ÇALIŞAN UYGULAMANIN TESPİTİ

| Başlık | Gerçek Durum | Kanıt Türü / Kaynak | Değerlendirme |
|---|---|---|---|
| **Port 3000** | `game-deals-web-1` konteyneri çalışıyor | `docker ps --filter "name=game-deals"` | Uygulamada doğrulandı (Farklı proje) |
| **Port 3001** | `teneke-planlama-app` konteyneri çalışıyor | `docker ps --filter "name=teneke"` | Uygulamada doğrulandı |
| **Görüntülenen Ekran** | `public/index.html` + `public/app.js` (Vanilla JS SPA) | `Dockerfile`, `server.js` | Uygulamada doğrulandı |
| **Next.js (`src/app`)** | Derlenmiyor, çalışmıyor, sunulmuyor | `node_modules` yok, `Dockerfile` kopyalamıyor | Eksik |
| **Yerel Çalıştırma Scripti** | `run-local.ps1` doğrudan `public/` dizinini sunuyor | `run-local.ps1` satır 19 | Uygulamada doğrulandı |
| **PostgreSQL Bağlantısı** | Konteyner çalışıyor (`db`), uygulama **bağlanmıyor** | `server.js` ve `public/app.js` kod incelemesi | Eksik |

### 2.1 Ekranların Kullandığı Gerçek Veri Kaynakları

| Ekran | UI Yolu | Gerçek Veri Kaynağı | Kalıcılık Yöntemi | Çoklu Oturum Paylaşımı |
|---|---|---|---|---|
| **Planlama Özeti** | `/` (Dashboard) | Sabit JS Dizileri (`INITIAL_DEMANDS`, `INITIAL_RAW_SHEETS`) | `localStorage` | **YOK** (Oturuma özel) |
| **İhtiyaç Havuzu** | Modül: Talep Havuzu | `public/app.js` içindeki gömülü mock veriler | `localStorage.getItem('tp_demands_v2')` | **YOK** |
| **Kombinasyon Masası** | Modül: Montaj Masası | İstemci belleği + `localStorage` | `localStorage` | **YOK** |
| **Teknik Tanımlar** | Modül: Tanımlar Merkezi | `public/app.js` gömülü diziler | `localStorage.getItem('tp_technical_products_v2')` | **YOK** |
| **Üretim Planı** | Modül: Üretim Planı | Sabit referans dizisi | `localStorage.getItem('tp_plans_v2')` | **YOK** |
| **Entegrasyon** | Modül: Entegrasyon | Sabit mock UI gösterimi | Bellek içi | **YOK** |

### 2.2 Veritabanı ve Backend Gerçekliği
- `server.js` dosyası 76 satırdan ibarettir. Yalnızca `/api/health` statik JSON yanıtı vermekte, haricinde `public/` altındaki statik dosyaları sunmaktadır.
- Projede **HİÇBİR BACKEND CRUD ENDPOINT'İ YOKTUR**.
- Ne `server.js` ne de `public/app.js` PostgreSQL'e veya SQL Server'a bağlanmaktadır (`pg`, `mysql`, `mssql`, `prisma`, `typeorm` sürücüsü içermemektedir).
- PostgreSQL konteyneri (`teneke-planlama-db`) 5432 portunda sağlıklı çalışmakta ve 12 adet başlangıç tablosunu barındırmaktadır; ancak web uygulaması bu konteynere **sıfır byte** okuma/yazma yapmaktadır.

---

## 3. FAZ 2C'NİN GERÇEK AKIŞ ÜZERİNDEN KONTROLÜ

| Kabul Kriteri | Gerçek Akış Kontrolü | Kanıt / Dosya Yolu | Durum |
|---|---|---|---|
| **Tanımlar Menüsü & Alt Ekranlar** | Menüde "Teknik Tanımlar & Parametreler" sekmesi mevcut; alt modüller tab olarak açılıyor | `public/app.js#L4010-L4030` | Uygulamada doğrulandı |
| **Zorunlu Stok Kodu & Otomatik Ad** | Stok kodu boş bırakılamaz; kod girilince `state.stockCatalog` üzerinden isim otomatik dolar | `public/app.js#L3590-L3609` | Uygulamada doğrulandı |
| **Bilinmeyen Kod Taslak İşareti** | ERP kataloğunda olmayan koda sahte ad uydurulmaz; "Taslak Ürün - ERP Eşleşmesi Bekliyor" yazar | `public/app.js#L3605` | Uygulamada doğrulandı |
| **Ham Levha FK Eşleşmesi** | Boy/çap ebadına göre uyumlu ham levha listelenir; uyumsuz seçimde kullanıcı uyarılır | `public/app.js#L3670-L3676` | Uygulamada doğrulandı |
| **Ekleme / Düzenleme / Silme** | Form üzerinden ekleme/güncelleme çalışıyor; `localStorage`'a yazılıyor | `public/app.js#L3681-L3698` | Uygulamada doğrulandı |
| **Referans Bütünlüğü (Pasife Alma)** | Talep, plan veya montajda referansı olan kartın fiziksel silinmesi engellenir; pasife alma sunulur | `public/app.js#L3716-L3728` | Uygulamada doğrulandı |
| **Gerçek .xlsx Yükleme** | Binary `.xlsx` dosya ayrıştırıcı (SheetJS vb.) **YOKTUR**. Yalnızca `textarea` içine TSV/CSV metin yapıştırma vardır | `public/app.js#L3790-L3825` | **Kısmen var (Yalnızca metin yapıştırma)** |
| **İndirilen Şablon** | Şablon indirme butonu `.csv` formatında UTF-8 metin indirir (`Teneke_Teknik_Kart_Sablonu.csv`) | `public/app.js#L3761-L3773` | Uygulamada doğrulandı |
| **Kolon Eşleme ve Önizleme** | Yapıştırılan metin tablolara bölünerek 4 adımlı modalda kolon eşleme ve önizleme gösterilir | `public/app.js#L3800-L3830` | Uygulamada doğrulandı |
| **Çoklu Tarayıcı Oturumu** | Bir tarayıcıda eklenen/silinen kart diğer tarayıcıda veya gizli sekmede **GÖRÜNMEZ** | `localStorage` mimarisi | **Eksik** |
| **ERP Kataloğu Niteliği** | Canlı ERP senkronizasyonu değildir; kaynak belgelerden üretilmiş 42 satırlık sabit JS dizisidir | `public/app.js#L258-L340` | **Yalnız belge/örnek** |
| **Yetki Kontrolü** | Sunucu taraflı yetki kontrolü yoktur; istemci tarafında basit `currentRole === 'viewer'` kontrolü yapılır | `public/app.js#L3551` | **Kısmen var (Yalnızca arayüz)** |
| **Testlerin Doğası** | `tests/test-faz-2c-definitions-and-import.ps1` ve `tests/run-tests.ps1`, uygulama kodunu değil, PowerShell içinde yazılmış mock scriptleri test etmektedir | `tests/*.ps1` incelemesi | **Yalnız belge/örnek** |

---

## 4. ŞİRKET SUNUCUSU VE SQL SERVER ERİŞİM KANITLARI

| İnceleme Konusu | Parametre | Kanıt / Canlı Sonuç | Durum |
|---|---|---|---|
| **Hedef Sunucu Bağlantısı** | SSH Alias: `lider-server` (`95.3.44.150:2222`, user: `alper`) | `ssh lider-server hostname` -> `0101` (Ubuntu 26.04.1 LTS) | Uygulamada doğrulandı |
| **Coolify Kurulumu** | `lider-server` üzerinde Coolify devrede (`127.0.0.1:8000`, Traefik reverse proxy) | `ps aux` çıktıları, Traefik port 80/443 | Uygulamada doğrulandı |
| **Teneke Planlama Coolify Kaynağı** | Coolify üzerinde Teneke Planlama projesi/servisi | Henüz bir proje, resource veya servis oluşturulmamış | **Eksik** |
| **Canlı Domain** | Teneke Planlama için ayrılmış domain/FQDN | Belgelerde ve sunucuda tanımlı domain yok | **Eksik** |
| **SQL Server Ağ Erişimi** | `lider-server` -> `172.17.0.6:1433` | `nc -zv -w 2 172.17.0.6 1433` -> `Connection succeeded!` | Uygulamada doğrulandı |
| **SQL Server Kimlik Doğrulama** | Kullanıcı: `planlama` (şirket sunucusu üzerinden) | Doğrudan pytds bağlantısı ile doğrulandı | Uygulamada doğrulandı |
| **SQL Sunucu Adı & Sürüm** | `ErpSunucusu01` | `Microsoft SQL Server 2022 (RTM) - 16.0.1000.6 (X64)` | Uygulamada doğrulandı |
| **Bağlantı Veritabanı (`AA_LIDER`)** | 38 adet ilgili tablo/view tespit edildi | `meltem_teneke`, `alper_tenekeuretim`, `alper_terminler`, `AA_alper_vw_EldekiMiktar`, `AA_alper_vw_HaricDepolarToplam` mevcut | Uygulamada doğrulandı |
| **Faz 3A Önerilen View'leri** | `AA_tp_vw_StokKartlari`, `AA_tp_vw_TupBrutIhtiyac` vb. | Henüz DB'de oluşturulmamış (Faz 3A hazırlık safhasında) | **Yalnız belge/örnek** |
| **Kaynak ERP DB (`MikroDesktop_LIDER26`)** | Doğrudan salt-okunur SELECT testi | 2.408 tablo listelendi; `STOKLAR` tablosundan 3 adet gerçek `TENEKETUP` kaydı başarıyla okundu | Uygulamada doğrulandı |

> [!NOTE]
> Güvenlik kuralı gereği hiçbir parola, connection string, token veya özel anahtar bu rapora yazılmamıştır. Sunucuda test için oluşturulan geçici kontrol betiği test bitiminde kalıcı iz bırakmadan silinmiştir.

---

## 5. ARAYÜZ VE TASARIM DURUMU

Playwright tarayıcı otomasyonu ile çalışan konteyner (`http://localhost:3001`) üzerinden güncel ekranlar incelenmiş ve ekran görüntüleri alınmıştır.

### 5.1 Ekran Görüntüleri Envanteri
1. **Planlama Özeti (Dashboard):** [screenshot-01-dashboard.png](file:///C:/Users/alper/.gemini/antigravity/brain/28a894d7-469a-4d6b-9629-f6769aa62472/screenshot-01-dashboard.png)  
   ![Planlama Özeti](/C:/Users/alper/.gemini/antigravity/brain/28a894d7-469a-4d6b-9629-f6769aa62472/screenshot-01-dashboard.png)
2. **İhtiyaç Havuzu:** [screenshot-02-ihtiyac-havuzu.png](file:///C:/Users/alper/.gemini/antigravity/brain/28a894d7-469a-4d6b-9629-f6769aa62472/screenshot-02-ihtiyac-havuzu.png)  
   ![İhtiyaç Havuzu](/C:/Users/alper/.gemini/antigravity/brain/28a894d7-469a-4d6b-9629-f6769aa62472/screenshot-02-ihtiyac-havuzu.png)
3. **Kombinasyon Masası:** [screenshot-03-kombinasyon.png](file:///C:/Users/alper/.gemini/antigravity/brain/28a894d7-469a-4d6b-9629-f6769aa62472/screenshot-03-kombinasyon.png)  
   ![Kombinasyon Masası](/C:/Users/alper/.gemini/antigravity/brain/28a894d7-469a-4d6b-9629-f6769aa62472/screenshot-03-kombinasyon.png)
4. **Teknik Tanımlar:** [screenshot-04-teknik-tanimlar.png](file:///C:/Users/alper/.gemini/antigravity/brain/28a894d7-469a-4d6b-9629-f6769aa62472/screenshot-04-teknik-tanimlar.png)  
   ![Teknik Tanımlar](/C:/Users/alper/.gemini/antigravity/brain/28a894d7-469a-4d6b-9629-f6769aa62472/screenshot-04-teknik-tanimlar.png)
5. **Excel İçe Aktarma Modalı:** [screenshot-05-excel-import.png](file:///C:/Users/alper/.gemini/antigravity/brain/28a894d7-469a-4d6b-9629-f6769aa62472/screenshot-05-excel-import.png)  
   ![Excel İçe Aktarma Modalı](/C:/Users/alper/.gemini/antigravity/brain/28a894d7-469a-4d6b-9629-f6769aa62472/screenshot-05-excel-import.png)

### 5.2 Tasarım ve Kullanılabilirlik Değerlendirmesi
- **Tipografi:** Varsayılan sans-serif (`Inter`) ve monospace fontlar kullanılmış. Kart başlıkları ve metinler okunaklı ancak yoğun veri içeren tablolarda satır hiyerarşisi zayıf kalıyor.
- **Tablo Okunabilirliği:** Tablolar sabit başlık yapısına sahip; durum etiketleri (badge) renkli ve belirgin. Ancak sayısal veriler (stok adetleri, ihtiyaç miktarları) her sütunda sağa yaslı değil; bazı sayısal alanlar ortalanmış veya sola yaslanmış durumda.
- **Formlar ve Menü:** Sol navigasyon menüsü temiz ve anlaşılır. Teknik tanımlar formunda stok kodundan otomatik tamamlama akıcı çalışıyor.
- **Excel İçe Aktarma:** Modal arayüzü dosya yükleme (`<input type="file">` / drag-and-drop dropzone) yerine bir `textarea` içeriyor. Kullanıcıdan Excel'den kopyalayıp buraya yapıştırması bekleniyor. Gerçek bir Excel dosyası seçme akışı mevcut değil.
- **Skill Durumu:**
  - `ui-ux-pro-max`: Kurulu (`C:\Users\alper\.gemini\config\skills\ui-ux-pro-max`).
  - `Impeccable`: Kurulu değil.
- **Sonraki Tasarım Önerisi:** Yeni tasarım çalışmasında doğrudan tüm sisteme müdahale etmek yerine, `ui-ux-pro-max` tasarım rehberliği ile **İhtiyaç Havuzu** üzerinde tek ekranlık bir pilot çalışma yapılması; yoğun veri kullanan, açık renkli (Light Theme), kurumsal planlama standartlarında tipografi ve tablo yapısının kilitlenmesi önerilir.

---

## 6. SENTEZ VE KARAR ÖZETİ

### A) Yerel / GitHub Farkı ve Esas Alınacak Commit
- **Esas Alınacak Commit:** `3a4155d3f79d8b0a8fad87e0ec427268434f6d83` (origin/main ile yerel repo HEAD aynı commit'tedir).
- **Yerel Fark:** Yalnızca `docker-compose.yml` içinde host portunun `3001` olarak yapılandırılması ve `.env` dosyasıdır. Kod tarafında commit edilmemiş değişiklik yoktur.

### B) Fazların Gerçek Durumu ve Belge Çelişkileri
- `STATUS.json` dosyasında Faz 0, 1, 2 ve 2C "completed" işaretlenmiştir.
- Ancak bu "tamamlanma" durumu **yalnızca istemci tarafında (localStorage ve mock JS)** geçerlidir.
- Faz 2C'de geliştirildiği iddia edilen yetenekler `src/` klasöründeki React/Next.js uygulamasına hiç girmemiş, doğrudan `public/app.js` içine tek parça vanilla JS olarak yazılmıştır.
- Test scriptleri (`tests/*.ps1`) uygulamanın kodunu değil, kendi içlerindeki PowerShell mock fonksiyonlarını test etmiştir.

### C) Backend ve Kalıcılık Eksikleri
- Uygulamanın bir backend API katmanı yoktur (`server.js` yalnızca statik dosya sunmaktadır).
- PostgreSQL konteyneri çalışmakta ancak uygulama tarafından hiçbir şekilde kullanılmamaktadır.
- Veriler sunucuya veya merkezi bir veritabanına yazılmamakta, tarayıcıların `localStorage` belleğinde hapsolmaktadır. Farklı kullanıcılar veya sekmeler aynı veriyi görememektedir.

### D) Faz 2C'de Kalan İşler
1. Gerçek binary `.xlsx` dosya yükleme ve okuma yeteneği (SheetJS vb.) eklenmeli (şu anda sadece textarea'ya TSV yapıştırma var).
2. Tanımlar ve teknik kart verilerinin `localStorage` yerine gerçek PostgreSQL veritabanına kalıcı olarak yazılması (CRUD API).
3. ERP stok kataloğunun sabit JS dizisi yerine gerçek SQL Server / staging tablosundan beslenmesi.
4. Sunucu taraflı rol/yetki denetimi.

### E) lider-server / Coolify / SQL Erişim Kanıtları
- `lider-server` (hostname `0101`, Ubuntu 26.04) SSH erişimi tam yetkili ve aktiftir.
- Sunucu üzerinden şirket SQL sunucusuna (`172.17.0.6:1433`) ağ erişimi başarıyla doğrulanmıştır.
- `planlama` kullanıcısı ile `AA_LIDER` veritabanına doğrudan pytds bağlantısı yapılmış; `meltem_teneke`, `alper_tenekeuretim` ve 36 adet view/tablo doğrulanmıştır.
- Kaynak ERP veritabanı `MikroDesktop_LIDER26` salt-okunur olarak sorgulanmış ve gerçek `TENEKETUP` kayıtları listelenmiştir.

### F) Eksik Bilgiler
1. Coolify üzerinde Teneke Planlama projesinin hangi domain adı (FQDN) ile yayınlanacağı.
2. Faz 3A için önerilen `dbo.AA_tp_vw_*` view'lerinin şirket IT departmanı tarafından `AA_LIDER` veritabanında ne zaman oluşturulacağı.
3. Mimari karar: Uygulama `public/app.js` (Vanilla JS SPA + Node static) olarak mı devam edecek, yoksa `src/` içindeki Next.js React yapısına geri mi taşınacak?

### G) Önerilen Sıradaki Tek İş
**Sıradaki Tek İş:** `server.js` üzerine PostgreSQL bağlantısını ekleyerek ve Tanımlar Merkezi için gerçek REST API uç noktalarını (`/api/definitions/...`) oluşturarak, `public/app.js` içindeki Tanımlar Merkezi CRUD operasyonlarını `localStorage`'dan çıkarıp **çalışan PostgreSQL veritabanına kalıcı hale getirmek** (Faz 2C kalıcılık açığını kapatmak).
