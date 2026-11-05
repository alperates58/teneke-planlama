-- ============================================================================
-- TENEKE PLANLAMA - FAZ 2 SEED DATA
-- ============================================================================

-- Roller
INSERT INTO user_roles (id, role_name, title, can_edit_parameters, can_edit_rules, can_approve_plans, can_import_excel)
VALUES 
  ('ROLE-ADMIN', 'admin', 'Sistem Yöneticisi', TRUE, TRUE, TRUE, TRUE),
  ('ROLE-PLANNER', 'planner', 'Üretim Planlama Uzmanı', TRUE, FALSE, TRUE, TRUE),
  ('ROLE-VIEWER', 'viewer', 'Görüntüleyici (Salt Okunur)', FALSE, FALSE, FALSE, FALSE)
ON CONFLICT (id) DO NOTHING;

-- Ham Levhalar
INSERT INTO raw_sheets (id, short_name, stock_code, stock_name, thickness_source_value, width_mm, height_mm, grade_source, tube_size, record_kind)
VALUES
  ('RS-01', '90000166', '500011000004-1103', 'HAM LEVHA-018x863x866- (T 57) -45x140', 18, 863, 866, 'T57', '45x140', 'source_transcription'),
  ('RS-02', '90000167', '500011000004-1104', 'HAM LEVHA-018x863x898- (T 57) -45x175', 18, 863, 898, 'T57', '45x175', 'source_transcription'),
  ('RS-03', '90000170', '500011000004-1202', 'HAM LEVHA-017x835x872- (T 61) -52x105', 17, 835, 872, 'T61', '52x105', 'source_transcription'),
  ('RS-04', '90000172', '500011000004-1204', 'HAM LEVHA-017x832x827- (T 61) -52x161', 17, 832, 827, 'T61', '52x161', 'source_transcription'),
  ('RS-05', '90000173', '500011000004-1205', 'HAM LEVHA-017x832x847- (T 61) -52x165', 17, 832, 847, 'T61', '52x165', 'source_transcription'),
  ('RS-06', '90000174', '500011000004-1206', 'HAM LEVHA-017x832x800- (T 61) -52x195', 17, 832, 800, 'T61', '52x195', 'source_transcription'),
  ('RS-07', '90000175', '500011000004-1207', 'HAM LEVHA-017x832x875- (T 61) -52x214', 17, 832, 875, 'T61', '52x214', 'source_transcription'),
  ('RS-08', '90000176', '500011000004-1208', 'HAM LEVHA-017x832x720- (T 61) -52x234', 17, 832, 720, 'T61', '52x234', 'source_transcription'),
  ('RS-09', '90000179', '500011000004-1209', 'HAM LEVHA-017x835x848- (T 61) -65x165', 17, 835, 848, 'T61', '65x165', 'source_transcription'),
  ('RS-10', '90000187', '500011000004-1406', 'HAM LEVHA-017x835x827- (T 61) -65x270', 17, 835, 827, 'T61', '65x270', 'source_transcription'),
  ('RS-11', '90000219', '500011000004-1408', 'HAM LEVHA-017x835x864- (T 61) -65x104', 17, 835, 864, 'T61', '65x104', 'source_transcription'),
  ('RS-12', '90000234', '500011000004-1414', 'HAM LEVHA-018x835x915- (T 61) -65x300', 18, 835, 915, 'T61', '65x300', 'source_transcription'),
  ('RS-13', '90000235', '500011000004-1415', 'HAM LEVHA-017x835x798- (T 61) -65x195', 17, 835, 798, 'T61', '65x195', 'source_transcription'),
  ('RS-14', '90000217', '500011000004-1416', 'HAM LEVHA-017x835x808- (T 61) -65x157', 17, 835, 808, 'T61', '65x157', 'source_transcription')
ON CONFLICT (stock_code) DO NOTHING;

-- Ebat Kapasiteleri (Hazır Parametreler)
-- Kapasite = Montaj Grubu Sayısı × Ürün Tekrar Adımı
INSERT INTO tube_capacities (id, tube_size, units_per_sheet, assembly_group_count, repeat_step, variety_source, quantity_source, single_variety_order_quantity_source, reference_sheet_count, record_kind)
VALUES
  ('CAP-01', '45x100', 48, 8, 6, 8, 7500, 60000, 1250, 'source_transcription'),
  ('CAP-02', '45x140', 36, 6, 6, 6, 7500, 45000, 1250, 'source_transcription'),
  ('CAP-03', '45x175', 30, 6, 5, 6, 6250, 37500, 1250, 'source_transcription'),
  ('CAP-04', '52x90',  45, 9, 5, 9, 6250, 56250, 1250, 'source_transcription'),
  ('CAP-05', '52x105', 40, 8, 5, 8, 6250, 50000, 1250, 'source_transcription'),
  ('CAP-06', '52x132', 30, 6, 5, 6, 6250, 37500, 1250, 'source_transcription'),
  ('CAP-07', '52x161', 25, 5, 5, 5, 6250, 31250, 1250, 'source_transcription'),
  ('CAP-08', '52x165', 25, 5, 5, 5, 6250, 31250, 1250, 'source_transcription'),
  ('CAP-09', '52x195', 20, 5, 4, 5, 5000, 25000, 1250, 'source_transcription'),
  ('CAP-10', '52x214', 20, 5, 4, 5, 5000, 25000, 1250, 'source_transcription'),
  ('CAP-11', '52x234', 15, 5, 3, 5, 3750, 18750, 1250, 'source_transcription'),
  ('CAP-12', '65x104', 32, 8, 4, 8, 5000, 40000, 1250, 'source_transcription'),
  ('CAP-13', '65x165', 20, 5, 4, 5, 5000, 25000, 1250, 'source_transcription'),
  ('CAP-14', '65x195', 16, 4, 4, 4, 5000, 20000, 1250, 'source_transcription'),
  ('CAP-15', '65x234', 12, 3, 4, 3, 5000, 15000, 1250, 'source_transcription'),
  ('CAP-16', '65x240', 12, 3, 4, 3, 5000, 15000, 1250, 'source_transcription'),
  ('CAP-17', '65x270', 12, 3, 4, 3, 5000, 15000, 1250, 'source_transcription'),
  ('CAP-18', '65x300', 12, 3, 4, 3, 5000, 15000, 1250, 'source_transcription')
ON CONFLICT (tube_size) DO UPDATE SET
  assembly_group_count = EXCLUDED.assembly_group_count,
  repeat_step = EXCLUDED.repeat_step;

-- Montaj Görünümü Düzenleri (Sheet Layouts)
-- Yalnız kullanıcı tarafından verilmiş düzenler kaydedilir; tanımlanmamış ebatlar için sahte düzen üretilmez.
INSERT INTO sheet_layouts (id, tube_size, raw_sheet_code, rows, cols, orientation, cell_order, verification_status, margin_mm, gap_mm, notes, record_kind)
VALUES
  ('LAYOUT-52x195', '52x195', '500011000004-1206', 4, 5, 'landscape', 'row_major', 'verified', 12, 4, 'Kullanıcı tanımlı montaj düzeni (4x5 = 20 yuva; SOFT formuyla uyumlu)', 'source_transcription'),
  ('LAYOUT-65x104', '65x104', '500011000004-1408', 4, 8, 'landscape', 'row_major', 'provisional', 10, 4, 'Geçici montaj taslağı (4x8 = 32 yuva; CTP onayı bekleniyor)', 'synthetic_demo')
ON CONFLICT (tube_size, raw_sheet_code) DO NOTHING;

-- Temel Kural Modeli
INSERT INTO business_rules (id, code, title, scope, condition_field, operator, parameter_value, rule_type, priority, is_active, description, record_kind)
VALUES
  ('RULE-001', 'KRL-RENK-01', 'Maksimum Benzersiz Renk Sınırı (Varsayılan 6)', 'combination', 'colors', 'max_count', '6', 'strict_block', 1, TRUE, 'Montajdaki tüm ürünlerin benzersiz renk kodlarının birleşimi varsayılan en fazla 6 olabilir.', 'source_transcription'),
  ('RULE-002', 'KRL-EBAT-01', 'Aynı Ebat Koşulu (Çap x Boy)', 'combination', 'tube_size', 'all_same', 'tube_size', 'strict_block', 1, TRUE, 'Aynı montaja girecek tüm teneke tüpler aynı çap ve boyda olmalıdır.', 'source_transcription'),
  ('RULE-003', 'KRL-ZEMIN-01', 'Aynı Zemin Koşulu (Baskı Yüzeyi)', 'combination', 'print_surface', 'all_same', 'print_surface', 'strict_block', 2, TRUE, 'Metalik ve emaye gibi farklı zeminlere sahip ürünler aynı montajda birleştirilemez.', 'source_transcription'),
  ('RULE-004', 'KRL-LEVHA-01', 'Tanımlı Ham Levha Uygunluğu', 'combination', 'raw_sheet_code', 'equals', 'raw_sheet_code', 'strict_block', 2, TRUE, 'Ürünün teknik kartında tanımlanmış ham levha kodu ile montaj levha kodu birebir uyuşmalıdır.', 'source_transcription'),
  ('RULE-005', 'KRL-MIN-01', 'Minimum Baskı Miktarı (1.250 Levha)', 'combination', 'sheet_count', 'min_threshold', '1250', 'requires_approval', 3, TRUE, 'Varsayılan minimum baskı 1.250 levhadır. Altındaki işler için onay veya tamamlama gerekir.', 'source_transcription'),
  ('RULE-006', 'KRL-LAK-01', 'Özel Lak Operatörü: Yalnız Laksızlarla', 'combination', 'lacquer', 'only_unlacquered', 'LAKSIZ', 'strict_block', 4, FALSE, 'Laksız ürünler yalnız laksız ürünlerle basılabilir (taslak kural).', 'synthetic_demo'),
  ('RULE-007', 'KRL-LAK-02', 'Özel Lak Operatörü: En Az Bir Başka Laklı Ürün', 'combination', 'lacquer', 'at_least_one_lacquered', 'LAKLI', 'requires_approval', 5, FALSE, 'Laklı ürün montajında en az bir başka laklı ürün bulunmalıdır (taslak kural).', 'synthetic_demo')
ON CONFLICT (code) DO NOTHING;

-- Hat ve Makineler
INSERT INTO production_lines (id, code, name, line_type, supported_tube_sizes, shifts_per_day, working_hours_per_shift, speed_units_per_hour, setup_time_hours, waste_rate_percent, capacity_type, is_active, record_kind)
VALUES
  ('LINE-MAKAS-01', 'MAKAS-01', 'Hat 01 - Çiftli Otomatik Makas', 'shearing', ARRAY['52x195', '52x214', '52x234', '65x104', '65x165', '65x195'], 3, 7.5, 4500, 1.5, 0.5, 'net', TRUE, 'synthetic_demo'),
  ('LINE-TUP-01', 'HAT-01', 'Tüp Gövde Üretim Hattı 1 (Otomatik)', 'tube_body', ARRAY['52x195', '52x214', '65x104', '65x195'], 3, 7.5, 12000, 2.0, 1.2, 'net', TRUE, 'synthetic_demo'),
  ('LINE-TUP-02', 'HAT-02', 'Tüp Gövde Üretim Hattı 2 (Hızlı)', 'tube_body', ARRAY['45x140', '45x175', '52x105', '52x161', '52x165', '52x234'], 3, 7.5, 10000, 2.5, 1.5, 'net', TRUE, 'synthetic_demo')
ON CONFLICT (code) DO NOTHING;

-- Matbaa Yerleşim Kuralları (Varsayılan ve İstisnalar)
INSERT INTO printing_press_rules (id, code, name, rule_type, applies_to_diameter, applies_to_height, applies_to_tube_size, priority, is_active, description, is_system_default)
VALUES
  ('RULE-PRINT-45-100', 'KRL-MAT-01', '45×100 Satır Bazında Tek Çeşit (İstisna)', 'SAME_VARIANT_PER_ROW', 45, 100, '45x100', 10, TRUE, '45×100 ebadındaki levhada her satır kendi içinde tek bir ürün çeşidinden oluşmalıdır.', TRUE),
  ('RULE-PRINT-52-105', 'KRL-MAT-02', '52×105 Satır Bazında Tek Çeşit (İstisna)', 'SAME_VARIANT_PER_ROW', 52, 105, '52x105', 10, TRUE, '52×105 ebadındaki levhada her satır kendi içinde tek bir ürün çeşidinden oluşmalıdır.', TRUE),
  ('RULE-PRINT-65-ALL', 'KRL-MAT-03', 'Çap 65 mm Satır Bazında Tek Çeşit (Boydan Bağımsız İstisna)', 'SAME_VARIANT_PER_ROW', 65, NULL, '65x*', 20, TRUE, 'Çapı 65 mm olan tüm kutularda (65×104, 65×165, 65×195, 65×234, 65×240, 65×270, 65×300 vb.) her satır kendi içinde tek çeşitten oluşmalıdır.', TRUE),
  ('RULE-PRINT-DEFAULT', 'KRL-MAT-04', 'Varsayılan Sütun Bazında Tek Çeşit Kuralı', 'SAME_VARIANT_PER_COLUMN', NULL, NULL, 'DEFAULT', 100, TRUE, 'İstisnalar dışındaki tüm ebatlarda (örn. 52×195, 52×214, 52×234, 45×140) her sütun kendi içinde tek bir ürün çeşidinden oluşmalıdır.', TRUE)
ON CONFLICT (code) DO NOTHING;

-- Parametrik Lak ve Ürün Kombinasyon Kuralları
INSERT INTO product_combination_rules (id, code, name, rule_type, target_type, target_product_code, target_product_group, target_tube_size, target_lacquer_status, param_product_codes, param_product_groups, priority, is_active, description, is_system_default)
VALUES
  ('RULE-KMB-01', 'KRL-LAK-YASAK', 'Laklı ve Laksız Karışımı Açık Yasağı (Varsayılan)', 'FORBID_MIXED_LACQUER', 'GLOBAL', NULL, NULL, NULL, NULL, NULL, NULL, 10, TRUE, 'Fırın kurutma ve vernik/lak hat farklılığı nedeniyle laklı ve laksız ürünler kesinlikle aynı levhada birleştirilemez.', TRUE),
  ('RULE-KMB-02', 'KRL-LAKSIZ-TEK', 'Laksız Ürünler Yalnız Laksızlarla Kombine Edilebilir', 'ONLY_WITH_UNLACQUERED', 'LACQUER_STATUS', NULL, NULL, NULL, 'LAKSIZ', NULL, NULL, 20, TRUE, 'Laksız olarak tanımlanmış ürünlerin montajında yer alacak diğer tüm ürünler de laksız olmalıdır.', TRUE),
  ('RULE-KMB-03', 'KRL-LAKLI-TEK', 'Laklı Ürünler Yalnız Laklılarla Kombine Edilebilir', 'ONLY_WITH_LACQUERED', 'LACQUER_STATUS', NULL, NULL, NULL, 'LAKLI', NULL, NULL, 20, TRUE, 'Laklı olarak tanımlanmış ürünlerin montajında yer alacak diğer tüm ürünler de laklı olmalıdır.', TRUE),
  ('RULE-KMB-04', 'KRL-SOLO-OZEL', 'Özel Seri Tek Başına Montaj Kuralı (Örnek Solo İş)', 'EXCLUSIVE_SOLO_ONLY', 'PRODUCT', '519999010001', NULL, NULL, NULL, NULL, NULL, 5, FALSE, 'Bu ürün hassas formülasyona veya özel kalite kontrol şartına sahiptir; başka hiçbir ürünle birleştirilemez, tek başına basılır.', FALSE),
  ('RULE-KMB-05', 'KRL-CAPRAZ-KORUMA', 'Çapraz Bulaşma Koruma Yasağı (Oda Spreyi & Fırın Temizleyici)', 'FORBIDDEN_WITH_PRODUCTS', 'PRODUCT', '511109010910-1001', NULL, NULL, NULL, ARRAY['511121010410-5004'], NULL, 15, FALSE, 'Koku ve kimyasal bulaşma riski nedeniyle oda spreyi ile fırın temizleyici formülasyonları aynı levhada basılamaz.', FALSE)
ON CONFLICT (code) DO NOTHING;
