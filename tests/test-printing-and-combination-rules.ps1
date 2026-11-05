# ==============================================================================
# TENEKE PLANLAMA - MATBAA YERLEŞİM VE PARAMETRİK LAK/KOMBİNASYON KURALLARI TESTLERİ
# ==============================================================================

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host " TENEKE PLANLAMA: MATBAA YERLEŞİM & PARAMETRİK KOMBİNASYON KURAL TESTLERİ       " -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan

$global:testCount = 0
$global:passCount = 0

function Assert-Test($condition, $description, $details = "") {
    $global:testCount++
    if ($condition) {
        $global:passCount++
        Write-Host " [PASS] $description" -ForegroundColor Green
        if ($details) {
            Write-Host "        $details" -ForegroundColor DarkGray
        }
    } else {
        Write-Host " [FAIL] $description" -ForegroundColor Red
        if ($details) {
            Write-Host "        HATA: $details" -ForegroundColor Yellow
        }
        exit 1
    }
}

# ------------------------------------------------------------------------------
# 1. MATBAA YERLEŞİM KURAL ÇÖZÜMLEME TESTLERİ (Rule Resolution)
# ------------------------------------------------------------------------------
Write-Host "`n--- 1. Matbaa Yerleşim Kural Çözümleme Testleri (Öncelik ve İstisnalar) ---" -ForegroundColor Yellow

$rules = @(
    @{ id = "R1"; code = "KRL-MAT-01"; rule_type = "SAME_VARIANT_PER_ROW"; diameter = 45; height = 100; tube_size = "45x100"; priority = 10; is_active = $true },
    @{ id = "R2"; code = "KRL-MAT-02"; rule_type = "SAME_VARIANT_PER_ROW"; diameter = 52; height = 105; tube_size = "52x105"; priority = 10; is_active = $true },
    @{ id = "R3"; code = "KRL-MAT-03"; rule_type = "SAME_VARIANT_PER_ROW"; diameter = 65; height = $null; tube_size = "65x*"; priority = 20; is_active = $true },
    @{ id = "R4"; code = "KRL-MAT-04"; rule_type = "SAME_VARIANT_PER_COLUMN"; diameter = $null; height = $null; tube_size = "DEFAULT"; priority = 100; is_active = $true }
)

function Resolve-PrintingRule($tubeSize, $d, $h, $ruleList) {
    $active = $ruleList | Where-Object { $_.is_active } | Sort-Object { $_.priority }
    foreach ($r in $active) {
        if ($r.tube_size -eq $tubeSize) { return $r }
        if ($r.diameter -and $r.height -and $r.diameter -eq $d -and $r.height -eq $h) { return $r }
        if ($r.diameter -and -not $r.height -and $r.diameter -eq $d) { return $r }
        if ($r.tube_size -eq "DEFAULT") { return $r }
    }
    return $null
}

# Test 1.1: 45x100 istisnası -> SAME_VARIANT_PER_ROW
$r45x100 = Resolve-PrintingRule "45x100" 45 100 $rules
Assert-Test ($r45x100.rule_type -eq "SAME_VARIANT_PER_ROW" -and $r45x100.code -eq "KRL-MAT-01") "45x100 -> SATIR bazında tek çeşit kuralına çözümlenmeli"

# Test 1.2: 52x105 istisnası -> SAME_VARIANT_PER_ROW
$r52x105 = Resolve-PrintingRule "52x105" 52 105 $rules
Assert-Test ($r52x105.rule_type -eq "SAME_VARIANT_PER_ROW" -and $r52x105.code -eq "KRL-MAT-02") "52x105 -> SATIR bazında tek çeşit kuralına çözümlenmeli"

# Test 1.3: Tüm Çap 65mm ürünler (boydan bağımsız) -> SAME_VARIANT_PER_ROW
$sizes65 = @("65x104", "65x165", "65x195", "65x234", "65x240", "65x270", "65x300", "65x157")
foreach ($sz in $sizes65) {
    $r65 = Resolve-PrintingRule $sz 65 0 $rules
    Assert-Test ($r65.rule_type -eq "SAME_VARIANT_PER_ROW" -and $r65.code -eq "KRL-MAT-03") "$sz (Çap 65mm) -> SATIR bazında tek çeşit kuralına çözümlenmeli"
}

# Test 1.4: Standart Ebatlar -> SAME_VARIANT_PER_COLUMN (Varsayılan Kural)
$stdSizes = @("52x195", "52x214", "52x234", "45x140", "45x175", "52x90", "52x132", "52x161", "52x165")
foreach ($sz in $stdSizes) {
    $parts = $sz.Split('x')
    $rStd = Resolve-PrintingRule $sz ([int]$parts[0]) ([int]$parts[1]) $rules
    Assert-Test ($rStd.rule_type -eq "SAME_VARIANT_PER_COLUMN" -and $rStd.code -eq "KRL-MAT-04") "$sz -> Varsayılan SÜTUN bazında tek çeşit kuralına çözümlenmeli"
}

# ------------------------------------------------------------------------------
# 2. IZGARA HOMOJENLİĞİ VE YERLEŞİM DOĞRULAMA TESTLERİ (Grid Validation)
# ------------------------------------------------------------------------------
Write-Host "`n--- 2. Izgara Homojenliği ve Yerleşim Doğrulama Testleri ---" -ForegroundColor Yellow

function Validate-Grid($rows, $cols, $items, $ruleType) {
    # Initialize grid
    $grid = New-Object 'string[,]' $rows, $cols
    $repeatIndex = 0
    $currentItemIdx = 0
    $currentRepeatsLeft = if ($items.Count -gt 0) { $items[0].repeats } else { 0 }

    # Fill grid column-major or row-major
    if ($ruleType -eq "SAME_VARIANT_PER_COLUMN") {
        for ($c = 0; $c -lt $cols; $c++) {
            for ($r = 0; $r -lt $rows; $r++) {
                while ($currentItemIdx -lt $items.Count -and $currentRepeatsLeft -le 0) {
                    $currentItemIdx++
                    if ($currentItemIdx -lt $items.Count) {
                        $currentRepeatsLeft = $items[$currentItemIdx].repeats
                    }
                }
                if ($currentItemIdx -lt $items.Count -and $currentRepeatsLeft -gt 0) {
                    $grid[$r, $c] = $items[$currentItemIdx].variantKey
                    $currentRepeatsLeft--
                } else {
                    $grid[$r, $c] = $null
                }
            }
        }
    } else {
        # SAME_VARIANT_PER_ROW
        for ($r = 0; $r -lt $rows; $r++) {
            for ($c = 0; $c -lt $cols; $c++) {
                while ($currentItemIdx -lt $items.Count -and $currentRepeatsLeft -le 0) {
                    $currentItemIdx++
                    if ($currentItemIdx -lt $items.Count) {
                        $currentRepeatsLeft = $items[$currentItemIdx].repeats
                    }
                }
                if ($currentItemIdx -lt $items.Count -and $currentRepeatsLeft -gt 0) {
                    $grid[$r, $c] = $items[$currentItemIdx].variantKey
                    $currentRepeatsLeft--
                } else {
                    $grid[$r, $c] = $null
                }
            }
        }
    }

    # Verify homogeneity
    $violatedCols = @()
    $violatedRows = @()
    if ($ruleType -eq "SAME_VARIANT_PER_COLUMN") {
        for ($c = 0; $c -lt $cols; $c++) {
            $distinct = @{}
            for ($r = 0; $r -lt $rows; $r++) {
                $v = $grid[$r, $c]
                if ($v) { $distinct[$v] = $true }
            }
            if ($distinct.Keys.Count -gt 1) { $violatedCols += $c }
        }
    } else {
        for ($r = 0; $r -lt $rows; $r++) {
            $distinct = @{}
            for ($c = 0; $c -lt $cols; $c++) {
                $v = $grid[$r, $c]
                if ($v) { $distinct[$v] = $true }
            }
            if ($distinct.Keys.Count -gt 1) { $violatedRows += $r }
        }
    }

    $isValid = ($violatedCols.Count -eq 0) -and ($violatedRows.Count -eq 0)
    return @{ isValid = $isValid; violatedCols = $violatedCols; violatedRows = $violatedRows }
}

# Test 2.1: 52x195 4+8+8 (4 rows x 5 cols, SAME_VARIANT_PER_COLUMN) -> GEÇERLİ
$grid52_ok = Validate-Grid 4 5 @(
    @{ variantKey = "PROD-1"; repeats = 4 },
    @{ variantKey = "PROD-2"; repeats = 8 },
    @{ variantKey = "PROD-3"; repeats = 8 }
) "SAME_VARIANT_PER_COLUMN"
Assert-Test ($grid52_ok.isValid) "52x195 [4+8+8] Sütun bazında homojen yerleşim tam sağlandı"

# Test 2.2: 52x195 5+7+8 (Toplam 20 ama adım dışı ve sütun kirleten) -> GEÇERSİZ
$grid52_fail = Validate-Grid 4 5 @(
    @{ variantKey = "PROD-1"; repeats = 5 },
    @{ variantKey = "PROD-2"; repeats = 7 },
    @{ variantKey = "PROD-3"; repeats = 8 }
) "SAME_VARIANT_PER_COLUMN"
Assert-Test (-not $grid52_fail.isValid) "52x195 [5+7+8] Sütun homojenliği bozuldu, kural ihlali tespit edildi"

# Test 2.3: 45x100 6+12+30 (8 rows x 6 cols, SAME_VARIANT_PER_ROW) -> GEÇERLİ
$grid45_ok = Validate-Grid 8 6 @(
    @{ variantKey = "P45-1"; repeats = 6 },
    @{ variantKey = "P45-2"; repeats = 12 },
    @{ variantKey = "P45-3"; repeats = 30 }
) "SAME_VARIANT_PER_ROW"
Assert-Test ($grid45_ok.isValid) "45x100 [6+12+30] Satır bazında homojen yerleşim tam sağlandı"

# Test 2.4: 45x100 5+13+30 (Adım dışı satır kuralı ihlali) -> GEÇERSİZ
$grid45_fail = Validate-Grid 8 6 @(
    @{ variantKey = "P45-1"; repeats = 5 },
    @{ variantKey = "P45-2"; repeats = 13 },
    @{ variantKey = "P45-3"; repeats = 30 }
) "SAME_VARIANT_PER_ROW"
Assert-Test (-not $grid45_fail.isValid) "45x100 [5+13+30] Satır homojenliği bozuldu, kural ihlali tespit edildi"

# Test 2.5: Çap 65mm (65x104) 8+8+16 (8 rows x 4 cols, SAME_VARIANT_PER_ROW) -> GEÇERLİ
$grid65_ok = Validate-Grid 8 4 @(
    @{ variantKey = "P65-1"; repeats = 8 },
    @{ variantKey = "P65-2"; repeats = 8 },
    @{ variantKey = "P65-3"; repeats = 16 }
) "SAME_VARIANT_PER_ROW"
Assert-Test ($grid65_ok.isValid) "65x104 [8+8+16] Çap 65mm Satır İstisnası başarıyla doğrulandı"

# Test 2.6: Kesin variantKey (Stok Kodu / İş Emri) Ayrımı: Aynı görünen isim, farklı stok kodları sütunu paylaşamaz
$gridVariantDist = Validate-Grid 4 5 @(
    @{ variantKey = "511109010910-9001"; repeats = 4 },
    @{ variantKey = "511109010910-9002"; repeats = 4 },
    @{ variantKey = "511109010910-9003"; repeats = 12 }
) "SAME_VARIANT_PER_COLUMN"
Assert-Test ($gridVariantDist.isValid) "Aynı isimli fakat farklı stok kodlu ürünler kesin variantKey ile bağımsız sütunlara atandı"

# ------------------------------------------------------------------------------
# 3. PARAMETRİK LAK VE KOMBİNASYON KURALLARI TESTLERİ
# ------------------------------------------------------------------------------
Write-Host "`n--- 3. Parametrik Lak ve Ürün Kombinasyon Kuralları Testleri ---" -ForegroundColor Yellow

$combinationRules = @(
    @{ id = "C1"; code = "KRL-LAK-YASAK"; name = "Laklı ve Laksız Karışımı Açık Yasağı"; rule_type = "FORBID_MIXED_LACQUER"; target_type = "GLOBAL"; priority = 10; is_active = $true },
    @{ id = "C2"; code = "KRL-LAKSIZ-TEK"; name = "Laksız Ürünler Yalnız Laksızlarla"; rule_type = "ONLY_WITH_UNLACQUERED"; target_type = "LACQUER_STATUS"; target_lacquer_status = "LAKSIZ"; priority = 20; is_active = $true },
    @{ id = "C3"; code = "KRL-LAKLI-TEK"; name = "Laklı Ürünler Yalnız Laklılarla"; rule_type = "ONLY_WITH_LACQUERED"; target_type = "LACQUER_STATUS"; target_lacquer_status = "LAKLI"; priority = 20; is_active = $true },
    @{ id = "C4"; code = "KRL-SOLO-OZEL"; name = "Özel Seri Tek Başına Montaj Kuralı"; rule_type = "EXCLUSIVE_SOLO_ONLY"; target_type = "PRODUCT"; target_product_code = "519999010001"; priority = 5; is_active = $true },
    @{ id = "C5"; code = "KRL-CAPRAZ-KORUMA"; name = "Çapraz Bulaşma Koruma Yasağı"; rule_type = "FORBIDDEN_WITH_PRODUCTS"; target_type = "PRODUCT"; target_product_code = "511109010910-1001"; param_product_codes = @("511121010410-5004"); priority = 15; is_active = $true }
)

function Normalize-Lacquer($val) {
    if (-not $val) { return "BILINMIYOR" }
    $s = $val.ToString().Trim().ToUpper()
    if ($s.StartsWith("LAKLI")) { return "LAKLI" }
    if ($s.StartsWith("LAKSIZ")) { return "LAKSIZ" }
    return "BILINMIYOR"
}

function Evaluate-MultiProductCombination($products, $rulesList) {
    $active = $rulesList | Where-Object { $_.is_active } | Sort-Object { $_.priority }
    $reasons = @()
    $conflicts = @()

    # Conflict check
    $forbidMixed = $active | Where-Object { $_.rule_type -eq "FORBID_MIXED_LACQUER" }
    $allowMixed = $active | Where-Object { $_.rule_type -eq "ALLOW_MIXED_LACQUER" }
    if ($forbidMixed -and $allowMixed) {
        $conflicts += "Kural Çakışması: Açık yasak ($($forbidMixed.code)), izin kuralından ($($allowMixed.code)) önce uygulandı."
    }

    # Solo rule check
    if ($products.Count -gt 1) {
        foreach ($p in $products) {
            $code = if ($p.stock_code) { $p.stock_code } else { $p.stockCode }
            $solo = $active | Where-Object { $_.rule_type -eq "EXCLUSIVE_SOLO_ONLY" -and $_.target_product_code -eq $code }
            if ($solo) {
                $reasons += "Ürün $code solo kuralına tabidir; başka ürünle birleştirilemez."
            }
        }
    }

    # Unknown lacquer check
    foreach ($p in $products) {
        $code = if ($p.stock_code) { $p.stock_code } else { $p.stockCode }
        $st = Normalize-Lacquer $p.lacquer
        if ($st -eq "BILINMIYOR") {
            $reasons += "Ürün $code lak durumu BELİRTİLMEMİŞ/BİLİNMİYOR. Güvenlik gereği otomatik laklı/laksız sayılamaz."
        }
    }

    # Mixed lacquer check
    $lacquerSet = @{}
    foreach ($p in $products) {
        $st = Normalize-Lacquer $p.lacquer
        if ($st -ne "BILINMIYOR") { $lacquerSet[$st] = $true }
    }
    if ($lacquerSet["LAKLI"] -and $lacquerSet["LAKSIZ"]) {
        if ($forbidMixed) {
            $reasons += "Lak Uyuşmazlığı: Montajda hem LAKLI hem LAKSIZ ürünler var. Açık yasak kuralı gereği aynı levhada birleştirilemez."
        } elseif (-not $allowMixed) {
            $reasons += "Lak Uyuşmazlığı: Lak karışım izni yok."
        }
    }

    # Pairwise forbidden check
    for ($i = 0; $i -lt $products.Count; $i++) {
        for ($j = $i + 1; $j -lt $products.Count; $j++) {
            $pA = $products[$i]
            $pB = $products[$j]
            $codeA = if ($pA.stock_code) { $pA.stock_code } else { $pA.stockCode }
            $codeB = if ($pB.stock_code) { $pB.stock_code } else { $pB.stockCode }

            $forbidPair = $active | Where-Object {
                $_.rule_type -eq "FORBIDDEN_WITH_PRODUCTS" -and (
                    ($_.target_product_code -eq $codeA -and $_.param_product_codes -contains $codeB) -or
                    ($_.target_product_code -eq $codeB -and $_.param_product_codes -contains $codeA)
                )
            }
            if ($forbidPair) {
                $reasons += "Yasaklı Çift: $codeA ile $codeB aynı levhada birleştirilemez."
            }
        }
    }

    $isCompatible = $reasons.Count -eq 0
    return @{ isCompatible = $isCompatible; reasons = $reasons; conflicts = $conflicts }
}

# Test 3.1: Laklı + Laklı -> GEÇERLİ
$pLakli1 = @{ stock_code = "511109010910-1001"; lacquer = "LAKLI" }
$pLakli2 = @{ stock_code = "511109010910-1002"; lacquer = "LAKLI" }
$t31 = Evaluate-MultiProductCombination @($pLakli1, $pLakli2) $combinationRules
Assert-Test ($t31.isCompatible) "Laklı + Laklı -> Geçerli kombinasyon"

# Test 3.2: Laksız + Laksız -> GEÇERLİ
$pLaksiz1 = @{ stock_code = "511109010910-7284"; lacquer = "LAKSIZ" }
$pLaksiz2 = @{ stock_code = "511109010910-7285"; lacquer = "LAKSIZ" }
$t32 = Evaluate-MultiProductCombination @($pLaksiz1, $pLaksiz2) $combinationRules
Assert-Test ($t32.isCompatible) "Laksız + Laksız -> Geçerli kombinasyon"

# Test 3.3: Laklı + Laksız -> GEÇERSİZ (FORBID_MIXED_LACQUER açık yasağı)
$t33 = Evaluate-MultiProductCombination @($pLakli1, $pLaksiz1) $combinationRules
Assert-Test (-not $t33.isCompatible) "Laklı + Laksız -> Açık yasak gereği engellendi"

# Test 3.4: Bilinmeyen Lak Durumu (BELİRTİLMEMİŞ) -> Otomatik varsayım yok, RED
$pBilinmeyen = @{ stock_code = "511109010910-9999"; lacquer = "BELİRTİLMEMİŞ" }
$t34 = Evaluate-MultiProductCombination @($pLakli1, $pBilinmeyen) $combinationRules
Assert-Test (-not $t34.isCompatible) "Bilinmeyen lak durumu otomatik laklı/laksız sayılmadı; montaj reddedildi"

# Test 3.5: Yasaklı Ürün Çifti (Oda Spreyi 1001 + Fırın Temizleyici 5004) -> GEÇERSİZ
$pFirin = @{ stock_code = "511121010410-5004"; lacquer = "LAKLI" }
$t35 = Evaluate-MultiProductCombination @($pLakli1, $pFirin) $combinationRules
Assert-Test (-not $t35.isCompatible) "Yasaklı ürün çifti (Oda spreyi + Fırın temizleyici) kural uyarınca engellendi"

# Test 3.6: Kural Çakışması (ALLOW vs FORBID) -> Açık Yasak Kazanır + Çakışma Uyarısı
$rulesWithConflict = $combinationRules + @(
    @{ id = "C6"; code = "KRL-LAK-IZIN"; name = "Lak İzni"; rule_type = "ALLOW_MIXED_LACQUER"; target_type = "GLOBAL"; priority = 12; is_active = $true }
)
$t36 = Evaluate-MultiProductCombination @($pLakli1, $pLaksiz1) $rulesWithConflict
Assert-Test (-not $t36.isCompatible -and $t36.conflicts.Count -gt 0) "Kural çakışmasında açık yasak öncelikli tutuldu ve kullanıcıya çakışma bildirildi"

# Test 3.7: Solo Üretim Kuralı (EXCLUSIVE_SOLO_ONLY) -> Başka ürünle birleşemez
$pSolo = @{ stock_code = "519999010001"; lacquer = "LAKLI" }
$t37 = Evaluate-MultiProductCombination @($pSolo, $pLakli2) $combinationRules
Assert-Test (-not $t37.isCompatible) "Solo kuralına sahip ürünün başka ürünle montaja girmesi engellendi"

# Test 3.8: Üçlü Kombinasyon (Tüm ürünlerin karşılıklı ve lak uyumu)
$pLakli3 = @{ stock_code = "511109010910-1003"; lacquer = "LAKLI" }
$t38_ok = Evaluate-MultiProductCombination @($pLakli1, $pLakli2, $pLakli3) $combinationRules
Assert-Test ($t38_ok.isCompatible) "3'lü kombinasyonda tüm ürünlerin birlikte uyumluluğu doğrulandı"

$t38_fail = Evaluate-MultiProductCombination @($pLakli1, $pLakli2, $pLaksiz1) $combinationRules
Assert-Test (-not $t38_fail.isCompatible) "3'lü kombinasyonda tek bir laksız ürünün bulunması montajı geçersiz kıldı"

# ------------------------------------------------------------------------------
# 4. OPTİMİZASYON VE BİRLİKTE ÇALIŞMA DOĞRULAMASI
# ------------------------------------------------------------------------------
Write-Host "`n--- 4. Optimizasyon Arama ve Kuralların Birlikte Çalışma Doğrulaması ---" -ForegroundColor Yellow

# Senaryo: 52x195 için aday havuzunda hem laklı hem laksız hem de yasaklı ürünler var
# Optimizasyon motoru yalnızca uyumlu olanları seçmeli, elenenleri red sebebiyle kaydetmeli.
$candidates = @(
    @{ productId = "1"; stockCode = "511109010910-1001"; stockName = "Vanilla"; tubeSize = "52x195"; lacquer = "LAKLI"; printSurface = "EMAYE" },
    @{ productId = "2"; stockCode = "511109010910-1002"; stockName = "Oceanic"; tubeSize = "52x195"; lacquer = "LAKLI"; printSurface = "EMAYE" },
    @{ productId = "3"; stockCode = "511121010410-5004"; stockName = "Firin"; tubeSize = "52x195"; lacquer = "LAKLI"; printSurface = "EMAYE" },
    @{ productId = "4"; stockCode = "511109010910-3005"; stockName = "Laksiz"; tubeSize = "52x195"; lacquer = "LAKSIZ"; printSurface = "EMAYE" }
)

# Test 4.1: Vanilla (1) + Oceanic (2) -> İkisi de Laklı, Yasak yok -> UYGUN
$eval12 = Evaluate-MultiProductCombination @($candidates[0], $candidates[1]) $combinationRules
$grid12 = Validate-Grid 4 5 @(@{ variantKey = "1"; repeats = 8 }, @{ variantKey = "2"; repeats = 12 }) "SAME_VARIANT_PER_COLUMN"
Assert-Test ($eval12.isCompatible -and $grid12.isValid) "Vanilla + Oceanic: Hem lak uyumu hem sütun yerleşimi tam sağlandı -> Onaylanabilir"

# Test 4.2: Vanilla (1) + Firin (3) -> Yasaklı Çift -> ELENDİ
$eval13 = Evaluate-MultiProductCombination @($candidates[0], $candidates[2]) $combinationRules
Assert-Test (-not $eval13.isCompatible) "Vanilla + Firin: Optimizasyon sırasında çapraz bulaşma yasağı ile elendi"

# Test 4.3: Vanilla (1) + Laksiz (4) -> Lak Karışımı -> ELENDİ
$eval14 = Evaluate-MultiProductCombination @($candidates[0], $candidates[3]) $combinationRules
Assert-Test (-not $eval14.isCompatible) "Vanilla + Laksiz: Optimizasyon sırasında fırın/lak uyumsuzluğu ile elendi"

# Test 4.4: Çap 65mm Satır İstisnası + Lak Uyumu Birlikte Çalışma
$p65_1 = @{ stock_code = "512031011610-1007"; lacquer = "LAKLI" }
$p65_2 = @{ stock_code = "512031011610-1008"; lacquer = "LAKLI" }
$eval65 = Evaluate-MultiProductCombination @($p65_1, $p65_2) $combinationRules
$grid65 = Validate-Grid 8 4 @(@{ variantKey = "1"; repeats = 16 }, @{ variantKey = "2"; repeats = 16 }) "SAME_VARIANT_PER_ROW"
Assert-Test ($eval65.isCompatible -and $grid65.isValid) "Çap 65mm için SATIR yerleşimi ve LAK uyumu birlikte başarıyla çalıştı"

# Test 4.5: Uygun montaj bulunamaması durumu (Bütün adaylar elenirse açık ret)
$impossiblePool = @($candidates[0], $candidates[3]) # Yalnızca 1 laklı ve 1 laksız
$impossibleEval = Evaluate-MultiProductCombination $impossiblePool $combinationRules
Assert-Test (-not $impossibleEval.isCompatible) "İmkânsız kombinasyon havuzunda sistem sahte montaj üretmedi; 'Uygun Çözüm Yok' verdi"

Write-Host "`n================================================================================" -ForegroundColor Cyan
Write-Host " TEST SONUCU: $global:passCount / $global:testCount TEST BAŞARIYLA TAMAMLANDI (100% PASS)     " -ForegroundColor Green
Write-Host "================================================================================" -ForegroundColor Cyan
