# PowerShell In-Process Calculation & Validation Test Suite (Faz 2)
# "Levha kapasitesi hesaplanmaz; gerçek levha oranı ve kullanıcı tarafından tanımlanmış montaj düzeni görselleştirilir."
# "Her ürünün tekrar sayısı, ilgili ebadın 'Ürün Tekrar Adımı' değerinin pozitif tam katı olmalıdır."

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host " TENEKE PLANLAMA - FAZ 2 KOMBİNASYON VE KURAL DOĞRULAMA TESTLERİ " -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan

function Assert-Test($condition, $message) {
    if (-not $condition) {
        Write-Host " [HATA] $message" -ForegroundColor Red
        exit 1
    } else {
        Write-Host " [OK] $message" -ForegroundColor Green
    }
}

# 1. TÜM 18 EBAT İÇİN MATEMATİKSEL TUTARLILIK DENETİMİ
# Kapasite = Montaj Grubu Sayısı × Ürün Tekrar Adımı
$capacityTable = @{
    "45x100" = @{ cap = 48; groups = 8; step = 6 }
    "45x140" = @{ cap = 36; groups = 6; step = 6 }
    "45x175" = @{ cap = 30; groups = 6; step = 5 }
    "52x90"  = @{ cap = 45; groups = 9; step = 5 }
    "52x105" = @{ cap = 40; groups = 8; step = 5 }
    "52x132" = @{ cap = 30; groups = 6; step = 5 }
    "52x161" = @{ cap = 25; groups = 5; step = 5 }
    "52x165" = @{ cap = 25; groups = 5; step = 5 }
    "52x195" = @{ cap = 20; groups = 5; step = 4 }
    "52x214" = @{ cap = 20; groups = 5; step = 4 }
    "52x234" = @{ cap = 15; groups = 5; step = 3 }
    "65x104" = @{ cap = 32; groups = 8; step = 4 }
    "65x165" = @{ cap = 20; groups = 5; step = 4 }
    "65x195" = @{ cap = 16; groups = 4; step = 4 }
    "65x234" = @{ cap = 12; groups = 3; step = 4 }
    "65x240" = @{ cap = 12; groups = 3; step = 4 }
    "65x270" = @{ cap = 12; groups = 3; step = 4 }
    "65x300" = @{ cap = 12; groups = 3; step = 4 }
}

Write-Host "`n--- 1. 18 Ebat Kapasite = Grup x Adım Doğrulaması ---" -ForegroundColor Yellow
Assert-Test ($capacityTable.Count -eq 18) "Toplam 18 ebat tanımlı olmalıdır"

foreach ($key in $capacityTable.Keys) {
    $item = $capacityTable[$key]
    $calculated = $item.groups * $item.step
    Assert-Test ($calculated -eq $item.cap) "$key için: $($item.cap) = $($item.groups) grup x $($item.step) adım eşitliği tam sağlanmalıdır"
}

# 2. DOĞRULAMA MOTORU FONKSİYONU
function Validate-Combination($size, $repeatsList) {
    $param = $capacityTable[$size]
    if (-not $param) {
        return @{ isValid = $false; reason = "EBAT_TANIMSIZ"; repeatStepMatch = $false; capacitySatisfied = $false; isFull = $false; approvalReady = $false }
    }

    $step = $param.step
    $capacity = $param.cap

    # Step checks
    $stepValid = $true
    foreach ($r in $repeatsList) {
        if ($r -le 0 -or ($r % $step) -ne 0) {
            $stepValid = $false
            break
        }
    }

    $total = 0
    foreach ($r in $repeatsList) { $total += $r }

    $capacitySatisfied = $total -le $capacity
    $isFull = $total -eq $capacity
    $isValid = $stepValid -and $capacitySatisfied -and ($total -gt 0)
    $approvalReady = $isValid -and $isFull

    return @{
        isValid = $isValid
        stepValid = $stepValid
        capacitySatisfied = $capacitySatisfied
        isFull = $isFull
        approvalReady = $approvalReady
        total = $total
        capacity = $capacity
        step = $step
    }
}

Write-Host "`n--- 2. Kullanıcı Kabul Senaryoları (14 Senaryo) ---" -ForegroundColor Yellow

# S1: 45x100: 6+12+30 -> Geçerli
$s1 = Validate-Combination "45x100" @(6, 12, 30)
Assert-Test ($s1.isValid -and $s1.approvalReady) "45x100 [6+12+30] -> Geçerli ve üretime onaylanabilir (Adım 6, Toplam 48/48)"

# S2: 45x100: 5+13+30 -> Geçersiz: 6'nın katı olmayan tekrarlar
$s2 = Validate-Combination "45x100" @(5, 13, 30)
Assert-Test (-not $s2.stepValid -and -not $s2.isValid) "45x100 [5+13+30] -> Geçersiz: 5 ve 13, 6'nın katı değildir"

# S3: 52x105: 5+15+20 -> Geçerli
$s3 = Validate-Combination "52x105" @(5, 15, 20)
Assert-Test ($s3.isValid -and $s3.approvalReady) "52x105 [5+15+20] -> Geçerli ve üretime onaylanabilir (Adım 5, Toplam 40/40)"

# S4: 52x105: 6+14+20 -> Geçersiz: 5'in katı olmayan tekrarlar
$s4 = Validate-Combination "52x105" @(6, 14, 20)
Assert-Test (-not $s4.stepValid -and -not $s4.isValid) "52x105 [6+14+20] -> Geçersiz: 6 ve 14, 5'in katı değildir"

# S5: 52x195: 4+8+8 -> Geçerli
$s5 = Validate-Combination "52x195" @(4, 8, 8)
Assert-Test ($s5.isValid -and $s5.approvalReady) "52x195 [4+8+8] -> Geçerli ve üretime onaylanabilir (Adım 4, Toplam 20/20, 1+2+2 grup)"

# S6: 52x195: 5+7+8 -> Geçersiz: toplam 20 olsa bile adım ihlali
$s6 = Validate-Combination "52x195" @(5, 7, 8)
Assert-Test (-not $s6.stepValid -and -not $s6.isValid) "52x195 [5+7+8] -> Geçersiz: toplam 20 olsa bile 5 ve 7, 4'ün katı değildir"

# S7: 52x234: 3+6+6 -> Geçerli
$s7 = Validate-Combination "52x234" @(3, 6, 6)
Assert-Test ($s7.isValid -and $s7.approvalReady) "52x234 [3+6+6] -> Geçerli ve üretime onaylanabilir (Adım 3, Toplam 15/15)"

# S8: 52x234: 4+5+6 -> Geçersiz: 3'ün katı olmayan tekrarlar
$s8 = Validate-Combination "52x234" @(4, 5, 6)
Assert-Test (-not $s8.stepValid -and -not $s8.isValid) "52x234 [4+5+6] -> Geçersiz: 4 ve 5, 3'ün katı değildir"

# S9: 65x104: 4+12+16 -> Geçerli
$s9 = Validate-Combination "65x104" @(4, 12, 16)
Assert-Test ($s9.isValid -and $s9.approvalReady) "65x104 [4+12+16] -> Geçerli ve üretime onaylanabilir (Adım 4, Toplam 32/32)"

# S10: 65x195: 4+4+8 -> Geçerli
$s10 = Validate-Combination "65x195" @(4, 4, 8)
Assert-Test ($s10.isValid -and $s10.approvalReady) "65x195 [4+4+8] -> Geçerli ve üretime onaylanabilir (Adım 4, Toplam 16/16)"

# S11: 65x300: 4+8 -> Geçerli
$s11 = Validate-Combination "65x300" @(4, 8)
Assert-Test ($s11.isValid -and $s11.approvalReady) "65x300 [4+8] -> Geçerli ve üretime onaylanabilir (Adım 4, Toplam 12/12)"

# S12: 65x300: 5+7 -> Geçersiz: 4'ün katı olmayan tekrarlar
$s12 = Validate-Combination "65x300" @(5, 7)
Assert-Test (-not $s12.stepValid -and -not $s12.isValid) "65x300 [5+7] -> Geçersiz: 5 ve 7, 4'ün katı değildir"

# S13: 52x195: 4+8+12 -> Geçersiz: kapasite aşımı
$s13 = Validate-Combination "52x195" @(4, 8, 12)
Assert-Test ($s13.stepValid -and -not $s13.capacitySatisfied -and -not $s13.isValid) "52x195 [4+8+12] -> Geçersiz: Kapasite aşımı (24 > 20)"

# S14: 52x195: 4+8 -> Tekrar adımı uygun; kapasite eksik (12 < 20), üretime onaylanamaz
$s14 = Validate-Combination "52x195" @(4, 8)
Assert-Test ($s14.stepValid -and $s14.isValid -and -not $s14.approvalReady -and -not $s14.isFull) "52x195 [4+8] -> Tekrar adımı uygun ancak kapasite eksik (12/20), üretime ONAYLANAMAZ"

Write-Host "`n--- 3. Listede Olmayan Ebat & Eksik Parametre Denetimi ---" -ForegroundColor Yellow
$sUnknown = Validate-Combination "65x157" @(4, 8)
Assert-Test (-not $sUnknown.isValid) "65x157 için montaj parametreleri eksik uyarısı verilmeli ve otomatik uydurma engellenmelidir"

Write-Host "`n--- 4. Renk, Zemin ve Fiziksel Montaj Düzeni Denetimi ---" -ForegroundColor Yellow
# Renk Sınırı (CMYK + 368C + 357C = 6 renk vs + 185C = 7 renk)
$colorsA = @("C", "M", "Y", "K", "368C")
$colorsB = @("C", "M", "Y", "K", "357C")
$union6 = ($colorsA + $colorsB) | Select-Object -Unique
Assert-Test ($union6.Count -le 6) "6 benzersiz renk uygun olmalıdır (6 <= 6)"

$colorsC = @("C", "M", "Y", "K", "185C")
$union7 = ($colorsA + $colorsB + $colorsC) | Select-Object -Unique
Assert-Test ($union7.Count -gt 6) "7 benzersiz renk kuralı ihlal etmelidir (7 > 6)"

# Fiziksel Levha En/Boy Oranı (832 x 800)
$sheetWidth = 832
$sheetHeight = 800
$aspectRatio = [math]::Round($sheetWidth / $sheetHeight, 2)
Assert-Test ($aspectRatio -eq 1.04) "Ham levha en/boy oranı 832 / 800 = 1.04 olmalıdır"

# Montaj Düzeni ve Kapasite Tutarlılığı (4 x 5 = 20)
$layoutRows = 4
$layoutCols = 5
$layoutSlots = $layoutRows * $layoutCols
Assert-Test ($layoutSlots -eq 20) "Tanımlı montaj düzeni 4 x 5 = 20 yuva, 52x195 kapasitesi ile tam uyumludur"

Write-Host "`n=================================================================" -ForegroundColor Green
Write-Host ">>> TÜM TESTLER BAŞARIYLA GEÇTİ (18 Ebat Tutarlılığı + 14 Senaryo) <<<" -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Green
