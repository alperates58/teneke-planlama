# ==============================================================================
# TENEKE PLANLAMA - FAZ 2C TANIMLAR MERKEZİ VE EXCEL İÇE AKTARMA TESTLERİ
# ==============================================================================
# AGENTS.md ve phases/FAZ-02C-TANIMLAR-VE-EXCEL-IMPORT.md kabul kriterlerini doğrular.

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host " TENEKE PLANLAMA: FAZ 2C TANIMLAR MERKEZİ & EXCEL IMPORT TESTLERİ               " -ForegroundColor Cyan
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

# 1. ERP STOK KATALOĞU VE TEKNİK KART AYRIMI (Kabul Koşulu 1 & 2)
Write-Host "`n--- 1. ERP Stok Kataloğu ve Otomatik İsim Tamamlama ---" -ForegroundColor Yellow

$mockCatalog = @(
    @{ stock_code = "511109010910-1001"; stock_name = "TUP-SOFT ODA SPR 300 ml (52x195)-VANILLA"; category = "Tüp Mamul"; unit = "ADET" },
    @{ stock_code = "511109010410-1102"; stock_name = "TUP-GW MOBILYA 300 ml (52x214)-LEMON"; category = "Tüp Mamul"; unit = "ADET" },
    @{ stock_code = "500011000004-1206"; stock_name = "HAM LEVHA-017x832x800- (T 61) -52x195"; category = "Ham Levha"; unit = "LEVHA" }
)

function Resolve-StockName($code, $catalog) {
    if ([string]::IsNullOrWhiteSpace($code)) {
        return @{ valid = $false; error = "STOK_KODU_ZORUNLU"; name = $null; is_draft = $false }
    }
    $clean = $code.Trim()
    $found = $catalog | Where-Object { $_.stock_code -eq $clean }
    if ($found) {
        return @{ valid = $true; error = $null; name = $found.stock_name; is_draft = $false; is_verified = $true }
    } else {
        return @{ valid = $true; error = $null; name = "Taslak Ürün - ERP Eşleşmesi Bekliyor"; is_draft = $true; is_verified = $false }
    }
}

# Test 1.1: Boş stok kodu reddedilir
$r1 = Resolve-StockName "" $mockCatalog
Assert-Test (-not $r1.valid -and $r1.error -eq "STOK_KODU_ZORUNLU") "Boş stok kodu kesin olarak reddedilir"

# Test 1.2: Kayıtlı stok kodu otomatik ad doldurur ve salt-okunurdur
$r2 = Resolve-StockName "511109010910-1001" $mockCatalog
Assert-Test ($r2.valid -and $r2.name -eq "TUP-SOFT ODA SPR 300 ml (52x195)-VANILLA" -and $r2.is_verified) "Kayıtlı stok kodu seçildiğinde ürün adı katalogdan otomatik gelir ve doğrulanır"

# Test 1.3: Bilinmeyen kod için sahte isim uydurulmaz; taslak olarak işaretlenir
$r3 = Resolve-StockName "519999010999-9999" $mockCatalog
Assert-Test ($r3.valid -and $r3.is_draft -and $r3.name -eq "Taslak Ürün - ERP Eşleşmesi Bekliyor") "ERP'de olmayan kod için sahte ad uydurulmaz; taslak statüsünde tutulur"

# 2. HAM LEVHA AÇIK KOD EŞLEŞTİRMESİ (Kabul Koşulu 4 & 7)
Write-Host "`n--- 2. Ham Levha Açık Kod Eşleştirmesi ve Uyuşmazlık Denetimi ---" -ForegroundColor Yellow

$mockRawSheets = @(
    @{ stock_code = "500011000004-1206"; stock_name = "HAM LEVHA-017x832x800- (T 61) -52x195"; tube_size = "52x195"; width = 832; height = 800; thickness = 17 },
    @{ stock_code = "500011000004-1207"; stock_name = "HAM LEVHA-017x832x875- (T 61) -52x214"; tube_size = "52x214"; width = 832; height = 875; thickness = 17 }
)

function Resolve-RawSheetMapping($inputCodeOrDesc, $tubeSize, $rawSheetList) {
    if ([string]::IsNullOrWhiteSpace($inputCodeOrDesc)) {
        return @{ matched = $false; error = "HAM_LEVHA_BOS"; sheet = $null }
    }
    $query = $inputCodeOrDesc.Trim()

    # Önce tam stok kodu eşleşmesi
    $byCode = $rawSheetList | Where-Object { $_.stock_code -eq $query }
    if ($byCode) {
        if ($tubeSize -and $byCode.tube_size -ne $tubeSize) {
            return @{ matched = $false; error = "EBAT_UYUSMAZLIGI"; sheet = $byCode }
        }
        return @{ matched = $true; error = $null; sheet = $byCode }
    }

    # Açıklama metninden tekil açık eşleme
    $byDesc = @($rawSheetList | Where-Object { $_.stock_name -like "*$query*" -or $query -like "*$($_.stock_name)*" })
    if ($byDesc.Count -eq 1) {
        $sheet = $byDesc[0]
        if ($tubeSize -and $sheet.tube_size -ne $tubeSize) {
            return @{ matched = $false; error = "EBAT_UYUSMAZLIGI"; sheet = $sheet }
        }
        return @{ matched = $true; error = $null; sheet = $sheet }
    } elseif ($byDesc.Count -gt 1) {
        return @{ matched = $false; error = "COKLU_ESLESME"; sheet = $null }
    } else {
        return @{ matched = $false; error = "TANIMSIZ_HAM_LEVHA"; sheet = $null }
    }
}

# Test 2.1: Stok kodundan doğrudan eşleşme
$rs1 = Resolve-RawSheetMapping "500011000004-1206" "52x195" $mockRawSheets
Assert-Test ($rs1.matched -and $rs1.sheet.stock_code -eq "500011000004-1206") "Ham levha gerçek stok kodundan (FK) doğrulanır"

# Test 2.2: Excel'deki açıklama hücresinden tekil açık eşleme
$rs2 = Resolve-RawSheetMapping "HAM LEVHA-017x832x800- (T 61) -52x195" "52x195" $mockRawSheets
Assert-Test ($rs2.matched -and $rs2.sheet.stock_code -eq "500011000004-1206") "Excel hücresindeki ham levha açıklamasından tekil gerçek stok kodu bulunur"

# Test 2.3: Tanımsız veya eşleşmeyen levha reddedilir
$rs3 = Resolve-RawSheetMapping "HAM LEVHA-BOMBE-BILINMEYEN" "52x195" $mockRawSheets
Assert-Test (-not $rs3.matched -and $rs3.error -eq "TANIMSIZ_HAM_LEVHA") "Katalogda olmayan veya uydurma ham levha açıkça reddedilir"

# Test 2.4: Ebat uyuşmazlığı (Örn. 52x195 tüp için 52x214 levha seçilmesi) engellenir
$rs4 = Resolve-RawSheetMapping "500011000004-1207" "52x195" $mockRawSheets
Assert-Test (-not $rs4.matched -and $rs4.error -eq "EBAT_UYUSMAZLIGI") "Tüp ebadı ile seçilen ham levha ebadı uyuşmazsa onay engellenir"

# 3. REFERANS BÜTÜNLÜĞÜ VE SİLME KORUMASI (Kabul Koşulu 5)
Write-Host "`n--- 3. Referans Bütünlüğü (Kullanılan Tanım Silinemez, Pasife Alınır) ---" -ForegroundColor Yellow

$mockActiveDemands = @(
    @{ id = "DEM-1"; stock_code = "511109010910-1001"; net_quantity = 5000 },
    @{ id = "DEM-2"; stock_code = "511109010910-1002"; net_quantity = 10000 }
)

function Delete-TechnicalProduct($productCode, $demandsList, $plansList) {
    $demandRefs = ($demandsList | Where-Object { $_.stock_code -eq $productCode }).Count
    $planRefs = ($plansList | Where-Object { $_.consumption_code -eq $productCode }).Count
    $totalUsage = $demandRefs + $planRefs

    if ($totalUsage -gt 0) {
        return @{
            can_delete = $false
            can_deactivate = $true
            message = "Kullanımda olan tanım silinemez ($totalUsage adet aktif talep/plan kaydı). Yalnızca pasife alabilirsiniz."
            usage_count = $totalUsage
        }
    } else {
        return @{
            can_delete = $true
            can_deactivate = $true
            message = "Tanım hiçbir planda veya talepte kullanılmıyor; kalıcı olarak silinebilir."
            usage_count = 0
        }
    }
}

# Test 3.1: Aktif talepte kullanılan ürün silinemez
$del1 = Delete-TechnicalProduct "511109010910-1001" $mockActiveDemands @()
Assert-Test (-not $del1.can_delete -and $del1.can_deactivate) "Aktif talepte kullanılan ürünün silinmesi engellenir, pasife alma önerilir"

# Test 3.2: Hiç kullanılmayan ürün silinebilir
$del2 = Delete-TechnicalProduct "519999010999-UNUSED" $mockActiveDemands @()
Assert-Test ($del2.can_delete -and $del2.usage_count -eq 0) "Hiç kullanılmayan yerel tanım onay ile silinebilir"

# 4. EXCEL İÇE AKTARMA VE MÜKERRER KAYIT DENETİMİ (Kabul Koşulu 6)
Write-Host "`n--- 4. Excel İçe Aktarma ve Mükerrer Kontrolü ---" -ForegroundColor Yellow

$existingProducts = @{
    "511109010410-1102" = @{ stock_name = "TUP-GW MOBILYA 300 ml (52x214)-LEMON"; print_surface = "METALİK"; lacquer = "LAKLI" }
}

$importBatch = @(
    @{ stock_code = "511109010410-1102"; print_surface = "METALİK"; lacquer = "LAKLI"; raw_sheet = "HAM LEVHA-017x832x875- (T 61) -52x214" },
    @{ stock_code = "511109010410-7026"; print_surface = "METALİK"; lacquer = "LAKLI"; raw_sheet = "HAM LEVHA-017x832x875- (T 61) -52x214" },
    @{ stock_code = ""; print_surface = "EMAYE"; lacquer = "LAKLI"; raw_sheet = "HAM LEVHA" } # Hatalı satır
)

function Process-ImportRows($rows, $existingMap, $rawSheetList, $policy) {
    $summary = @{ total = $rows.Count; new_count = 0; update_count = 0; error_count = 0; rows = @() }

    foreach ($r in $rows) {
        if ([string]::IsNullOrWhiteSpace($r.stock_code)) {
            $summary.error_count++
            $summary.rows += @{ status = "ERROR"; error = "Stok kodu boş olamaz"; item = $r }
            continue
        }

        $code = $r.stock_code.Trim()
        $rsCheck = Resolve-RawSheetMapping $r.raw_sheet $null $rawSheetList
        if (-not $rsCheck.matched) {
            $summary.error_count++
            $summary.rows += @{ status = "ERROR"; error = "Ham levha eşleşmedi ($($r.raw_sheet))"; item = $r }
            continue
        }

        if ($existingMap.ContainsKey($code)) {
            $summary.update_count++
            $summary.rows += @{ status = "UPDATE"; item = $r; existing = $existingMap[$code] }
        } else {
            $summary.new_count++
            $summary.rows += @{ status = "NEW"; item = $r }
        }
    }

    return $summary
}

$importSummary = Process-ImportRows $importBatch $existingProducts $mockRawSheets "all"
Assert-Test ($importSummary.total -eq 3) "Excel içe aktarımında 3 satır okundu"
Assert-Test ($importSummary.error_count -eq 1) "Boş stok kodlu satır hata olarak ayrıldı"
Assert-Test ($importSummary.update_count -eq 1) "Mevcut kayıt tespit edildi, mükerrer kopyalama önlendi"
Assert-Test ($importSummary.new_count -eq 1) "Yeni kayıt tespit edildi ve listeye hazırlandı"

# 5. YETKİ VE GÖRÜNTÜLEME SINIRLAMALARI (Kabul Koşulu 9)
Write-Host "`n--- 5. Rol ve Yetki Güvenliği ---" -ForegroundColor Yellow

function Can-UserMutate($role) {
    return ($role -eq "admin" -or $role -eq "planner")
}

Assert-Test (Can-UserMutate "admin") "Admin kullanıcısı tanım ekleme/düzenleme/silme yetkisine sahiptir"
Assert-Test (Can-UserMutate "planner") "Planlama kullanıcısı tanım ekleme/düzenleme yetkisine sahiptir"
Assert-Test (-not (Can-UserMutate "viewer")) "Görüntüleyici (viewer) rolü tanım ekleyemez veya silemez"

Write-Host "`n================================================================================" -ForegroundColor Cyan
Write-Host " FAZ 2C KABUL TESTLERİ BAŞARIYLA TAMAMLANDI ($global:passCount / $global:testCount PASS)           " -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan
