/**
-- ============================================================================
-- FAZ 5A: TEK MAKİNE ÜRETİM ÇİZELGELEME MOTORU (SCHEDULING ENGINE)
-- Dosya: server/services/schedulingEngine.js
-- Tarih: 07.11.2026
-- İlke: Tek tüp gövde üretim makinesi esastır. Ebat bazında hız (adet/dk),
--       çalışma takvimi, vardiyalar, molalar ve çap/boy hazırlık sürelerine
--       göre deterministik ve hassas başlangıç/bitiş hesabı yapar.
--       Fabrika takvimi Europe/Istanbul (UTC+3) bazında işletilir.
-- ============================================================================
*/

// Türkiye / Europe/Istanbul saat dilimi sabiti (UTC+3)
const TR_OFFSET_MS = 3 * 60 * 60 * 1000;

/**
 * Yardımcı: 'HH:MM' veya 'HH:MM:SS' dizesini gün içi dakikaya çevirir
 */
function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const parts = String(timeStr).split(':');
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

/**
 * Yardımcı: Gün içi dakikayı 'HH:MM:SS' dizesine çevirir
 */
function minutesToTime(totalMin) {
  let m = Math.floor(totalMin) % (24 * 60);
  if (m < 0) m += 24 * 60;
  const hours = Math.floor(m / 60);
  const mins = m % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:00`;
}

/**
 * Date nesnesinin Europe/Istanbul (UTC+3) yerel bileşenlerini döner
 * Container/Sunucu saat diliminden (UTC, Windows vb.) bağımsızdır.
 */
function getTRComponents(date) {
  const d = date instanceof Date ? date : new Date(date);
  const trDate = new Date(d.getTime() + TR_OFFSET_MS);
  return {
    year: trDate.getUTCFullYear(),
    month: trDate.getUTCMonth(),
    date: trDate.getUTCDate(),
    dayOfWeek: trDate.getUTCDay(), // 0 = Pazar, 1 = Pazartesi, ..., 6 = Cumartesi
    hours: trDate.getUTCHours(),
    minutes: trDate.getUTCMinutes(),
    seconds: trDate.getUTCSeconds(),
    dateStr: `${trDate.getUTCFullYear()}-${String(trDate.getUTCMonth() + 1).padStart(2, '0')}-${String(trDate.getUTCDate()).padStart(2, '0')}`,
    totalMinutesInDay: trDate.getUTCHours() * 60 + trDate.getUTCMinutes() + trDate.getUTCSeconds() / 60
  };
}

/**
 * Europe/Istanbul (UTC+3) yerel zamanında belirtilen tarih/saatten Date nesnesi üretir
 */
function makeTRDate(year, monthIndex, day, hours, minutes, seconds = 0) {
  return new Date(Date.UTC(year, monthIndex, day, hours - 3, minutes, seconds, 0));
}

/**
 * Belirli bir tarihteki net çalışma aralıklarını hesaplar
 * Gece taşması (örn. 07:30 - ertesi gün 01:30) ve molaları hassas ayıklar.
 * Day tipleri (Excel Çalışma Tarihleri uyumlu):
 *   - 'ÇALIŞACAK' / 'WORKING' / 'NORMAL': 07:30 - 17:30
 *   - 'VARDİYA' / 'SHIFT': 07:30 - ertesi gün 01:30 (gece yarısına kadar bugün, kalanı yarın sabah)
 *   - 'VARDİYA1': 17:30 - ertesi gün 01:30 (akşam vardiyası)
 *   - 'MESAİ' / 'OVERTIME': 07:30 - (17:30 + overtime_hours)
 *   - 'TATİL' / 'HOLIDAY' / 'MAINTENANCE': Çalışma yok
 */
function getDailyWorkingIntervals(dateStr, config = {}, breaks = [], exceptionsMap = new Map()) {
  const exc = exceptionsMap.get(dateStr);

  // Tarih nesnesinden günün haftasını bul
  const [y, m, d] = dateStr.split('-').map(Number);
  const tempDate = makeTRDate(y, m - 1, d, 12, 0);
  const dayOfWeek = tempDate.getUTCDay(); // 0 = Sun, 6 = Sat

  // Önceki takvim gününü bul (UTC+3 Europe/Istanbul bazında)
  const prevDateObj = new Date(tempDate.getTime() - 24 * 60 * 60 * 1000);
  const prevYear = prevDateObj.getUTCFullYear();
  const prevMonth = String(prevDateObj.getUTCMonth() + 1).padStart(2, '0');
  const prevDay = String(prevDateObj.getUTCDate()).padStart(2, '0');
  const prevDateStr = `${prevYear}-${prevMonth}-${prevDay}`;

  // Önceki günün vardiya tanımını kontrol et (Otomatik gün kontrolü yerine gerçek vardiya tanımına bağlıdır)
  let prevHadNightShift = false;
  const prevExc = exceptionsMap.get(prevDateStr);
  if (prevExc) {
    const prevType = (prevExc.day_type || '').toUpperCase().trim();
    if (prevType === 'VARDİYA' || prevType === 'VARDİYA1' || prevType === 'SHIFT') {
      prevHadNightShift = true;
    }
  } else {
    // Özel istisna girilmemişse takvim yapılandırmasındaki varsayılan kurala bakılır
    // (Pazar gününden Pazartesi sabahına vardiya taşmaz; hafta içi vardiya açıksa taşar)
    const prevDayOfWeek = prevDateObj.getUTCDay();
    const isWeekday = prevDayOfWeek >= 1 && prevDayOfWeek <= 5;
    const defaultShiftActive = config.has_shift !== false && 
      (config.default_day_type === 'VARDİYA' || config.default_day_type === 'SHIFT' || !config.default_day_type);
    if (defaultShiftActive && isWeekday) {
      prevHadNightShift = true;
    }
  }

  let dayType = 'WORKING';
  let startMinutes = timeToMinutes(config.work_start_time || '07:30');
  let endMinutes = timeToMinutes(config.work_end_time || '17:30');
  let shiftEndMinutes = timeToMinutes(config.shift_end_time || '01:30');
  let isDayWorking = true;

  if (exc) {
    dayType = (exc.day_type || 'WORKING').toUpperCase().trim();
    if (dayType === 'HOLIDAY' || dayType === 'MAINTENANCE' || dayType === 'TATİL' || dayType === '') {
      isDayWorking = false;
    } else if (dayType === 'VARDİYA' || dayType === 'SHIFT') {
      startMinutes = exc.start_time ? timeToMinutes(exc.start_time) : timeToMinutes(config.work_start_time || '07:30');
      endMinutes = 24 * 60; // Gece yarısına kadar
    } else if (dayType === 'VARDİYA1') {
      startMinutes = exc.start_time ? timeToMinutes(exc.start_time) : timeToMinutes(config.work_end_time || '17:30');
      endMinutes = 24 * 60;
    } else if (dayType === 'MESAİ' || dayType === 'OVERTIME') {
      startMinutes = exc.start_time ? timeToMinutes(exc.start_time) : timeToMinutes(config.work_start_time || '07:30');
      const otHours = parseFloat(exc.overtime_hours) || 0;
      endMinutes = timeToMinutes(config.work_end_time || '17:30') + Math.round(otHours * 60);
    } else if (dayType === 'ÇALIŞACAK' || dayType === 'WORKING' || dayType === 'NORMAL') {
      startMinutes = exc.start_time ? timeToMinutes(exc.start_time) : timeToMinutes(config.work_start_time || '07:30');
      endMinutes = exc.end_time ? timeToMinutes(exc.end_time) : timeToMinutes(config.work_end_time || '17:30');
    }
  } else {
    // İstisna yoksa takvim yapılandırmasından oku
    if (dayOfWeek === 0) {
      // Pazar günü: varsayılan holiday
      const sunType = (config.sunday_day_type || 'HOLIDAY').toUpperCase();
      if (sunType === 'HOLIDAY' || sunType === 'TATİL') {
        isDayWorking = false;
      }
    } else if (dayOfWeek === 6) {
      // Cumartesi: yapılandırmadaki Cumartesi bitiş saati (varsayılan 13:00 veya config değeri)
      const satType = (config.saturday_day_type || 'WORKING').toUpperCase();
      if (satType === 'HOLIDAY' || satType === 'TATİL') {
        isDayWorking = false;
      } else {
        startMinutes = timeToMinutes(config.work_start_time || '07:30');
        endMinutes = timeToMinutes(config.saturday_end_time || '13:00');
      }
    } else {
      // Hafta içi (Pazartesi - Cuma)
      const defType = (config.default_day_type || 'VARDİYA').toUpperCase();
      if (defType === 'VARDİYA' || defType === 'SHIFT') {
        if (config.has_shift !== false) {
          endMinutes = 24 * 60;
        }
      }
    }
  }

  // Eğer gün tatil/kapalı olarak işaretlenmişse hiç çalışma aralığı üretilmez
  if (!isDayWorking) {
    return [];
  }

  // Molaları ayıkla
  const rawBreaks = breaks.filter(b => b.is_active !== false).map(b => {
    let bStart = timeToMinutes(b.start_time);
    let bEnd = timeToMinutes(b.end_time);
    return { name: b.break_name, start: bStart, end: bEnd };
  });

  const intervals = [];

  // Önceki günden sarkan gece vardiyası kuyruğu (SADECE önceki gün gerçek bir vardiya içeriyorsa!)
  if (prevHadNightShift) {
    let nightCursor = 0;
    const earlyBreaks = rawBreaks.filter(b => b.start < shiftEndMinutes && b.end > 0).sort((a, b) => a.start - b.start);
    for (const b of earlyBreaks) {
      if (b.start > nightCursor) {
        intervals.push({
          start: nightCursor,
          end: Math.min(b.start, shiftEndMinutes),
          duration: Math.min(b.start, shiftEndMinutes) - nightCursor
        });
      }
      nightCursor = Math.max(nightCursor, b.end);
    }
    if (nightCursor < shiftEndMinutes) {
      intervals.push({
        start: nightCursor,
        end: shiftEndMinutes,
        duration: shiftEndMinutes - nightCursor
      });
    }
  }

  // Bugün çalışma varsa gün içi aralıkları ekle
  if (isDayWorking && startMinutes < endMinutes) {
    const activeBreaks = rawBreaks.filter(b => b.start >= startMinutes && b.start < endMinutes);
    activeBreaks.sort((a, b) => a.start - b.start);

    let cursor = startMinutes;
    for (const b of activeBreaks) {
      if (b.end <= cursor) continue;
      if (b.start >= endMinutes) break;

      if (b.start > cursor) {
        intervals.push({
          start: cursor,
          end: Math.min(b.start, endMinutes),
          duration: Math.min(b.start, endMinutes) - cursor
        });
      }
      cursor = Math.max(cursor, b.end);
    }

    if (cursor < endMinutes) {
      intervals.push({
        start: cursor,
        end: endMinutes,
        duration: endMinutes - cursor
      });
    }
  }

  return intervals.filter(i => i.duration > 0);
}

/**
 * Çap ve boy bilgilerini tube_size stringinden ayrıştırır (Örn: '52x195' -> { diameter: 52, height: 195 })
 */
function parseTubeSize(sizeStr) {
  if (!sizeStr) return { diameter: 0, height: 0 };
  const parts = String(sizeStr).toLowerCase().replace('ø', '').split('x');
  const diameter = parseInt(parts[0], 10) || 0;
  const height = parseInt(parts[1], 10) || 0;
  return { diameter, height };
}

/**
 * İki ürün arasındaki çap ve boy değişimine göre hazırlık süresini döner
 * Excel kuralı (zaman.vba):
 * - Hedef çap 45 ise: 480 dakika (8 saat)
 * - Diğer çap değişimleri: 180 dakika (3 saat)
 * - Yalnız boy değişimi: 60 dakika (1 saat)
 * - Aynı ebat: 0 dakika
 */
function calculateSetupMinutes(prevTubeSize, currentTubeSize, setupRules = []) {
  if (!prevTubeSize || !currentTubeSize) return 0;
  if (prevTubeSize === currentTubeSize) return 0;

  const prev = parseTubeSize(prevTubeSize);
  const curr = parseTubeSize(currentTubeSize);

  // Çap değişimi var mı?
  if (prev.diameter !== curr.diameter) {
    if (curr.diameter === 45) {
      const r = setupRules.find(x => x.change_type === 'DIAMETER_TO_45');
      return r ? r.setup_duration_minutes : 480;
    } else {
      const r = setupRules.find(x => x.change_type === 'DIAMETER_OTHER');
      return r ? r.setup_duration_minutes : 180;
    }
  }

  // Yalnız boy değişimi
  if (prev.height !== curr.height) {
    const r = setupRules.find(x => x.change_type === 'HEIGHT_ONLY');
    return r ? r.setup_duration_minutes : 60;
  }

  return 0;
}

/**
 * Belirli bir başlangıç anından itibaren takvim üzerinde belirtilen dakika kadar ilerler
 * Mola ortasına denk gelindiğinde yalnızca kalan mola süresi kadar beklenir.
 */
function walkCalendarTime(startDateTime, durationMinutes, config, breaks, exceptionsMap, isSetup = false) {
  if (durationMinutes <= 0 && isSetup) return new Date(startDateTime);

  // Setup ayarı takvimden bağımsız mı? ('ANYTIME' ise doğrudan wall-clock dakika eklenir)
  if (isSetup && config.setup_calendar_mode === 'ANYTIME') {
    return new Date(new Date(startDateTime).getTime() + durationMinutes * 60000);
  }

  let remaining = durationMinutes;
  let currentDt = new Date(startDateTime);
  let daysSearched = 0;
  const MAX_DAYS = 365;

  while (daysSearched < MAX_DAYS) {
    const tr = getTRComponents(currentDt);
    const intervals = getDailyWorkingIntervals(tr.dateStr, config, breaks, exceptionsMap);

    if (intervals.length === 0) {
      // Tatil veya çalışma olmayan gün: Ertesi gün başlangıcına (00:00) atla
      currentDt = makeTRDate(tr.year, tr.month, tr.date + 1, 0, 0, 0);
      daysSearched++;
      continue;
    }

    const currentMinutesInDay = tr.totalMinutesInDay;

    // Eğer şu an günün son çalışma vaktini geçtiyse, ertesi güne atla (00:00)
    const lastIntervalEnd = intervals[intervals.length - 1].end;
    if (currentMinutesInDay >= lastIntervalEnd) {
      currentDt = makeTRDate(tr.year, tr.month, tr.date + 1, 0, 0, 0);
      daysSearched++;
      continue;
    }

    // Günün aralıklarında ilerle
    for (const interval of intervals) {
      const curTR = getTRComponents(currentDt);
      const curMin = curTR.totalMinutesInDay;

      if (interval.end <= curMin) {
        continue;
      }

      const effectiveStart = Math.max(interval.start, curMin);
      const availableInInterval = interval.end - effectiveStart;

      if (availableInInterval <= 0) continue;

      if (curMin < effectiveStart) {
        // Mola veya çalışma dışı bekleme: İmleci aralık başına çek
        const diffMin = effectiveStart - curMin;
        currentDt = new Date(currentDt.getTime() + Math.round(diffMin * 60000));
      }

      if (remaining <= 0) {
        // durationMinutes 0 ise sadece çalışma anına hizalanmış olduk
        return currentDt;
      }

      if (remaining <= availableInInterval) {
        // Kalan süre bu aralıkta tamamen bitiyor
        currentDt = new Date(currentDt.getTime() + Math.round(remaining * 60000));
        remaining = 0;
        return currentDt;
      } else {
        // Kalan süre bu aralığı aşıyor, aralığı tüket ve devam et
        currentDt = new Date(currentDt.getTime() + Math.round(availableInInterval * 60000));
        remaining -= availableInInterval;
      }
    }

    if (remaining > 0) {
      // Gün bitti, ertesi güne geç (00:00)
      currentDt = makeTRDate(tr.year, tr.month, tr.date + 1, 0, 0, 0);
      daysSearched++;
    }
  }

  if (remaining > 0) {
    throw new Error(`Takvim ufkunda (${MAX_DAYS} gün) yeterli çalışma zamanı bulunamadı. İş tamamlanamadı.`);
  }

  return currentDt;
}

/**
 * Ana Çizelgeleme Fonksiyonu (Tek Makine Sıralı Çizelgeleme Çekirdeği)
 */
function scheduleProductionPlanPure({
  items = [],
  scheduleStartTime,
  config = {},
  breaks = [],
  exceptions = [],
  speedMap = new Map(),
  setupRules = []
}) {
  if (!items || items.length === 0) {
    return {
      scheduledItems: [],
      totalSetupMinutes: 0,
      totalWorkingMinutes: 0,
      delayedCount: 0,
      collisionCount: 0
    };
  }

  const exceptionsMap = new Map();
  exceptions.forEach(e => {
    const dStr = typeof e.exception_date === 'string' ? e.exception_date.substring(0, 10) : new Date(e.exception_date).toISOString().substring(0, 10);
    exceptionsMap.set(dStr, e);
  });

  const speeds = speedMap instanceof Map ? speedMap : new Map(Object.entries(speedMap));

  let currentCursor = scheduleStartTime ? new Date(scheduleStartTime) : new Date();

  // İlk başlangıç zamanı çalışma aralığı dışındaysa veya mola ortasındaysa aralık başına ayarla
  currentCursor = walkCalendarTime(currentCursor, 0, config, breaks, exceptionsMap, false);

  const scheduledItems = [];
  let totalSetupMinutes = 0;
  let totalWorkingMinutes = 0;
  let delayedCount = 0;
  let collisionCount = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const prevItem = i > 0 ? items[i - 1] : null;

    const tubeSize = item.tube_size || '52x195';
    const quantity = Number(item.quantity) || 0;

    // 1. Ebat Hızı (adet/dakika) - Eksik hızda açık hata kuralı!
    const speedPerMinute = speeds.get(tubeSize) || speeds.get(tubeSize.toLowerCase());
    if (!speedPerMinute || speedPerMinute <= 0) {
      const err = new Error(`EBAT_HIZ_TANIMI_YOK: [${tubeSize}] ebadı için geçerli bir üretim hızı (adet/dk) tanımlanmamış.`);
      err.code = 'EBAT_HIZ_TANIMI_YOK';
      throw err;
    }

    // 2. Hazırlık Süresi (Setup Time)
    let setupMinutes = 0;
    if (prevItem) {
      setupMinutes = calculateSetupMinutes(prevItem.tube_size, tubeSize, setupRules);
    }
    totalSetupMinutes += setupMinutes;

    // 3. Hazırlık süresi kadar takvimde ilerle
    let itemStartDate = currentCursor;
    if (setupMinutes > 0) {
      itemStartDate = walkCalendarTime(currentCursor, setupMinutes, config, breaks, exceptionsMap, true);
    }

    // 4. Kilitli Başlangıç Kontrolü (is_start_locked)
    let isCollision = false;
    let collisionReason = null;
    if (item.is_start_locked && item.start_date) {
      const lockedStart = new Date(item.start_date);
      if (itemStartDate.getTime() > lockedStart.getTime()) {
        isCollision = true;
        collisionReason = `Önceki işler kilitli başlangıç saatini (${lockedStart.toISOString().substring(0, 16)}) aşıyor.`;
        collisionCount++;
      } else if (itemStartDate.getTime() < lockedStart.getTime()) {
        itemStartDate = lockedStart;
      }
    }

    // 5. Net Üretim Süresi (dakika)
    const productionMinutes = quantity > 0 ? (quantity / speedPerMinute) : 0;
    totalWorkingMinutes += productionMinutes;

    // 6. Üretim süresi kadar takvimde ilerle -> Bitiş Tarihi
    const itemEndDate = walkCalendarTime(itemStartDate, productionMinutes, config, breaks, exceptionsMap, false);

    // 7. Termin Denetimi (Dolum Termin Tarihi ile Karşılaştırma)
    let isDelayed = false;
    let delayDays = 0;
    if (item.due_date) {
      const dueDate = new Date(item.due_date);
      if (itemEndDate.getTime() > dueDate.getTime()) {
        isDelayed = true;
        delayDays = Math.ceil((itemEndDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        delayedCount++;
      }
    }

    scheduledItems.push({
      ...item,
      sequence_order: i + 1,
      source_start_date: item.source_start_date || item.start_date,
      source_end_date: item.source_end_date || item.end_date,
      suggested_start_date: itemStartDate.toISOString(),
      suggested_end_date: itemEndDate.toISOString(),
      setup_duration_minutes: setupMinutes,
      production_duration_minutes: Math.round(productionMinutes * 100) / 100,
      speed_units_per_minute: speedPerMinute,
      is_delayed: isDelayed,
      delay_days: delayDays,
      is_collision: isCollision,
      collision_reason: collisionReason,
      source_diff_minutes: item.source_end_date
        ? Math.round((itemEndDate.getTime() - new Date(item.source_end_date).getTime()) / 60000)
        : 0
    });

    currentCursor = itemEndDate;
  }

  return {
    scheduledItems,
    totalSetupMinutes,
    totalWorkingMinutes: Math.round(totalWorkingMinutes * 100) / 100,
    totalDurationHours: Math.round(((totalSetupMinutes + totalWorkingMinutes) / 60) * 100) / 100,
    delayedCount,
    collisionCount,
    scheduleFinishTime: currentCursor.toISOString()
  };
}

module.exports = {
  timeToMinutes,
  minutesToTime,
  getTRComponents,
  makeTRDate,
  getDailyWorkingIntervals,
  parseTubeSize,
  calculateSetupMinutes,
  walkCalendarTime,
  scheduleProductionPlanPure
};
