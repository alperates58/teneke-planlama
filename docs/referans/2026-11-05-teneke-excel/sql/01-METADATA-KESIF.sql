/* Teneke Planlama — 05.11.2026
   IT incelemesi için salt okuma metadata sorguları. Bu dosya burada çalıştırılmadı.
   CREATE/ALTER/INSERT/UPDATE/DELETE yok. Uygulama bağlantısı AA_LIDER olacaktır.
   İki DB'nin aynı instance üzerinde varlığı ve metadata okuma yetkisi gereklidir.
   definition=NULL: nesne eksik, yetki yok veya şifreli olabilir; boş SQL sayılmaz.
   Çıktı paylaşılmadan önce olası kimlik bilgileri IT tarafından maskelenmeli.
*/
SELECT name, state_desc FROM sys.databases
WHERE name IN (N'AA_LIDER', N'MikroDesktop_LIDER26');

-- Kaynak tablo/view kolonları ve veri tipleri; reçete miktar alanlarını tahmin etme.
SELECT N'MikroDesktop_LIDER26' AS database_name, s.name AS schema_name,
       o.name AS object_name, o.type_desc, c.column_id, c.name AS column_name,
       ty.name AS data_type, c.max_length, c.precision, c.scale, c.is_nullable
FROM MikroDesktop_LIDER26.sys.objects o
JOIN MikroDesktop_LIDER26.sys.schemas s ON s.schema_id=o.schema_id
JOIN MikroDesktop_LIDER26.sys.columns c ON c.object_id=o.object_id
JOIN MikroDesktop_LIDER26.sys.types ty ON ty.user_type_id=c.user_type_id
WHERE s.name=N'dbo' AND o.name IN
 (N'STOKLAR',N'URUN_RECETELERI',N'URETIM_MALZEME_PLANLAMA',N'STOK_HAREKETLERI',
  N'alper_terminler',N'alper_tenekeuretim',N'meltem_teneke',N'AA_alper_rec_seviye1')
ORDER BY o.name,c.column_id;

-- Tekil/primary key kolonları: kalıcı talep ve reçete satır kimliğini belirle.
SELECT o.name AS object_name, i.name AS index_name, i.is_primary_key,
       i.is_unique, ic.key_ordinal, c.name AS column_name
FROM MikroDesktop_LIDER26.sys.objects o
JOIN MikroDesktop_LIDER26.sys.schemas s ON s.schema_id=o.schema_id
JOIN MikroDesktop_LIDER26.sys.indexes i ON i.object_id=o.object_id
JOIN MikroDesktop_LIDER26.sys.index_columns ic ON ic.object_id=i.object_id AND ic.index_id=i.index_id
JOIN MikroDesktop_LIDER26.sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id
WHERE s.name=N'dbo' AND i.is_unique=1 AND ic.key_ordinal>0 AND o.name IN
 (N'URUN_RECETELERI',N'URETIM_MALZEME_PLANLAMA',N'alper_terminler',
  N'alper_tenekeuretim',N'meltem_teneke',N'STOKLAR')
ORDER BY o.name,i.name,ic.key_ordinal;

-- Eski view/function'ların tam tanımları.
SELECT N'MikroDesktop_LIDER26' AS database_name,s.name AS schema_name,
       o.name AS object_name,o.type_desc,m.definition
FROM MikroDesktop_LIDER26.sys.objects o
JOIN MikroDesktop_LIDER26.sys.schemas s ON s.schema_id=o.schema_id
LEFT JOIN MikroDesktop_LIDER26.sys.sql_modules m ON m.object_id=o.object_id
WHERE s.name=N'dbo' AND o.name IN
 (N'AA_alper_rec_seviye1',N'fn_EldekiMiktar',N'fn_DepodakiMiktar',
  N'AA_alper_tenekeihtiyaç4',N'AA_alper_tenekeihtiyaç5',N'AA_emre_plantenekee',
  N'AA_alper_planktüptüketim',N'AA_alper_planktüpüretim',N'AA_alper_planktenekee',N'alper_terminler');

SELECT N'AA_LIDER' AS database_name,s.name AS schema_name,o.name AS object_name,
       o.type_desc,m.definition
FROM AA_LIDER.sys.objects o
JOIN AA_LIDER.sys.schemas s ON s.schema_id=o.schema_id
LEFT JOIN AA_LIDER.sys.sql_modules m ON m.object_id=o.object_id
WHERE s.name=N'dbo' AND o.name IN
 (N'AA_alper_vw_EldekiMiktar',N'AA_alper_vw_HaricDepolarToplam');

SELECT N'AA_LIDER' AS database_name,s.name AS schema_name,o.name AS object_name,
       c.column_id,c.name AS column_name,ty.name AS data_type,c.precision,c.scale
FROM AA_LIDER.sys.objects o
JOIN AA_LIDER.sys.schemas s ON s.schema_id=o.schema_id
JOIN AA_LIDER.sys.columns c ON c.object_id=o.object_id
JOIN AA_LIDER.sys.types ty ON ty.user_type_id=c.user_type_id
WHERE s.name=N'dbo' AND o.name IN
 (N'AA_alper_vw_EldekiMiktar',N'AA_alper_vw_HaricDepolarToplam')
ORDER BY o.name,c.column_id;

-- Cross-database bağımlılık teşhisi.
SELECT o.name AS referencing_object, d.referenced_server_name,
       d.referenced_database_name,d.referenced_schema_name,d.referenced_entity_name
FROM MikroDesktop_LIDER26.sys.sql_expression_dependencies d
JOIN MikroDesktop_LIDER26.sys.objects o ON o.object_id=d.referencing_id
WHERE o.name IN
 (N'AA_alper_rec_seviye1',N'AA_alper_tenekeihtiyaç4',N'AA_alper_tenekeihtiyaç5',
  N'AA_emre_plantenekee',N'AA_alper_planktüptüketim',N'AA_alper_planktüpüretim');
