# FAZ 3A — AA_LIDER SQL SÖZLEŞMESİ VE SALT-OKUNUR ENTEGRASYON

Durum: PLANLANDI. Analiz ve gereksinim paketi entegre edildi. Aktif geliştirme öncesi hazırlık dokümanıdır.

Önce kökteki `AGENTS.md`, `STATUS.json` ve `docs/referans/2026-11-05-teneke-excel/docs/02-IHTIYAC-VE-VIEW-SOZLESMESI.md` dosyasını oku.

## 1. Kapsam ve İlkeler

Bu fazın amacı, uygulamanın Microsoft SQL Server üzerinde bulunan `AA_LIDER` veritabanı (kaynak ERP: `MikroDesktop_LIDER26`) ile kuracağı güvenli, salt-okunur ve parametrik entegrasyon altyapısını kurmaktır.

### Temel Güvenlik ve Mimari İlkeleri:
1. **ERP Salt-Okuma İlkesi:** Uygulama ERP veritabanına ASLA `INSERT`, `UPDATE` veya `DELETE` yapmaz. Eski Excel makrolarındaki `meltem_teneke` ve `alper_tenekeuretim` tablolarını silme/yazma alışkanlığı tamamen terk edilmiştir.
2. **Parametrik View ve Kolon Eşlemesi:** View isimleri ve kolon adları Entegrasyon ekranında yönetilebilir ve yapılandırılabilirdir.
3. **Staging ve Atomik Snapshot:** SQL'den okunan veriler önce staging alanına alınır; eksik/hatalı sorgu son başarılı veriyi yarım bırakmaz.
4. **Kimlik Bilgisi Güvenliği:** SQL bağlantı parolaları sunucu tarafında şifreli saklanır; frontend'e, loglara veya localStorage'a kesinlikle gönderilmez.
5. **Keşif SQL'i:** `docs/referans/2026-11-05-teneke-excel/sql/01-METADATA-KESIF.sql` dosyası IT departmanının incelemesi ve kolon doğrulaması içindir; uygulama tarafından çalıştırılmaz.

## 2. Temel SQL View Sözleşmesi

| Önerilen View Adı | Satır Düzeyi | Zorunlu Alanlar / Amacı |
|---|---|---|
| `dbo.AA_tp_vw_StokKartlari` | Stok kodu başına 1 satır | `stock_code`, `stock_name`, `category`, `base_unit`, `short_name`, `dimension`, `source_db` |
| `dbo.AA_tp_vw_TupBrutIhtiyac` | Benzersiz talep / sipariş satırı | `demand_line_id`, `order_no`, `work_order`, `main_product_code`, `tube_code`, `required_at`, `gross_tube_qty`, `machine`, `source_type`, `quantity_basis='GROSS'` |
| `dbo.AA_tp_vw_ReceteBaglantilari` | Reçete versiyonu + parent/child satırı | `recipe_id`, `recipe_line_id`, `parent_code`, `child_code`, `parent_qty`, `parent_unit`, `child_qty`, `child_unit`, `valid_from`, `valid_to`, `status` |
| `dbo.AA_tp_vw_StokDepo` | Stok kodu + depo (+ izlenen lot) | `stock_code`, `warehouse_code`, `quantity`, `unit`, `is_blocked`, `is_quality_approved` |
| `dbo.AA_tp_vw_PlanliTupArz` | Dış kaynak plan satırı | `supply_line_id`, `tube_code`, `remaining_qty`, `completion_at`, `status`, `source_system` |

## 3. Depo ve Reçete Doğrulama Politikası

- **Depo Politikası:** `StokDepo` görünümünde tüm depolar filtrelenmeden okunur; planlamada hangi depoların (örn. Depo 10, hammadde, üretim ambarı) kullanılabilir sayılacağı sistem ayarlarında yönetilir.
- **Reçete Katsayıları:** Tüp → Kesik Levha → Baskılı Levha zincirindeki birim dönüşümleri ve katsayılar ERP reçetesinden doğrulanır; varsayımla tüp adedi levha adedine eşitlenemez.
- **Tarih Standartları:** ISO_WEEK ve ISO yıl kullanılır.

## 4. Kabul Koşulları

- [x] Sunucu ve ağ topolojisi doğrulandı (06.11.2026): `lider-server2` -> `172.17.0.6:1433` TCP ve kimlik doğrulama testi başarılı.
- [ ] Yetkili SQL bağlantısında 5 temel view ve zorunlu kolonların varlığı başarıyla test edilir.
- [ ] Bağlantı ve senkronizasyon logları tutulur; hata durumunda son başarılı snapshot korunur.
- [ ] ERP veritabanına hiçbir yazma (`INSERT/UPDATE/DELETE`) yapılmadığı denetlenir.
- [ ] Kullanıcı parolası hiçbir şekilde istemciye veya loglara sızdırılmaz.
- [ ] Canlı IT erişimi olmadan "SQL bağlandı" şeklinde sahte yeşil durum üretilmez; açıkça "IT onayı bekleniyor" olarak raporlanır.

## 5. Doğrulanmış Ağ ve Sunucu Topolojisi (06.11.2026 Bağlantı Testi)

| Parametre | Doğrulanan Değer | Açıklama |
|---|---|---|
| **Uygulama Dağıtım Sunucusu (Host)** | `lider-server2` | Yerel IP: `192.168.70.2`, Dış Erişim: `95.3.44.150:2222` (SSH). Uygulama burada Docker/Node olarak koşacaktır. |
| **SQL Server Ana Makine (Host)** | `172.17.0.6` | Yerel ağdaki gerçek Microsoft SQL Server makinesidir. |
| **SQL Server Portu** | `1433` | TCP portu açık ve `lider-server2` üzerinden doğrudan erişilebilir (`Connection succeeded`). |
| **SQL Kullanıcı Adı** | `planlama` | Salt-okunur (`SELECT`) erişim yetkili kullanıcı. Şifre güvenli `.env` (`DB_PASSWORD`) içinde tutulur. |
| **Hedef Bağlantı Veritabanı** | `AA_LIDER` | Planlama sorguları ve view'lerinin bulunduğu veritabanı. |
| **Kaynak ERP Veritabanı** | `MikroDesktop_LIDER26` | ERP stok ve hareket ana veritabanı. |
| **Bağlantı Doğrulama Durumu** | **BAŞARILI (`CONNECTED_OK`)** | 06.11.2026 tarihinde hem yerel istemciden hem `lider-server2` sunucusundan TCP ve auth düzeyinde başarıyla doğrulandı. |
| **Mevcut / Keşfedilen View'lar** | `dbo.AA_alper_vw_URETIM_MALZEME_PLANLAMA_TUMYILLAR`, `dbo.AA_alper_vw_STOKLAR_TUMYILLAR`, `dbo.AA_alper_vw_DEPOLAR_TUMYILLAR`, `dbo.AA_alper_vw_ISEMIRLERI_TUMYILLAR`, `dbo.AA_alper_vw_SIPARISLER_TUMYILLAR`, `dbo.AA_alper_vw_EldekiMiktar`, `dbo.ZDB_LIDER_RECETELER`, `dbo.EE_Planlama_PlanTablosu` vb. | Mevcut SQL ortamında planlamaya hazır görünümler mevcuttur. |
| **Sunucu Dağıtım Notu** | `docker` grubu izni | `lider-server2` üzerinde `alper` kullanıcısının container işlemlerini yönetebilmesi için `sudo usermod -aG docker alper` tanımlanmalıdır. |

