package com.factronics.fv.data

import java.time.DayOfWeek
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.temporal.TemporalAdjusters

/**
 * Motor de festividades (F1.3). Mismas reglas que la PWA (festivities.ts).
 * Las fechas se calculan con la zona horaria del dispositivo; las fijas están
 * declaradas y las móviles usan algoritmos documentados (Pascua, enésimo día).
 */
object FestivityEngine {

    const val NONE = "none"
    const val AUTO = "auto"

    val ids = listOf(
        "christmas",
        "epiphany",
        "valentine",
        "carnival",
        "mothersDay",
        "fathersDay",
        "childrensDay",
        "halloween",
        "independence"
    )

    private val priority = mapOf(
        "childrensDay" to 10,
        "fathersDay" to 20,
        "mothersDay" to 30,
        "epiphany" to 40,
        "christmas" to 50,
        "independence" to 60,
        "halloween" to 70,
        "valentine" to 80,
        "carnival" to 90
    )

    private val venezuelaOnly = setOf("mothersDay", "fathersDay", "childrensDay", "independence")

    fun resolve(
        instant: Instant,
        zoneId: ZoneId,
        country: String,
        enabled: Boolean,
        sober: Boolean,
        override: String
    ): String {
        if (!enabled || sober) return NONE
        if (override != AUTO && override != NONE) {
            if (ids.contains(override)) return override
        } else if (override == NONE) {
            return NONE
        }

        val date = instant.atZone(zoneId).toLocalDate()
        val year = date.year
        val active = mutableListOf<String>()
        val countryCode = country.uppercase()

        fun allowed(id: String) = !venezuelaOnly.contains(id) || countryCode == "VE"
        fun inWindow(start: LocalDate, days: Long) =
            !date.isBefore(start) && date.isBefore(start.plusDays(days))

        if (allowed("christmas") && inWindow(LocalDate.of(year, 12, 15), 11)) active += "christmas"
        if (allowed("epiphany") && inWindow(LocalDate.of(year, 1, 5), 2)) active += "epiphany"
        if (allowed("valentine") && inWindow(LocalDate.of(year, 2, 7), 8)) active += "valentine"
        if (allowed("halloween") && inWindow(LocalDate.of(year, 10, 25), 7)) active += "halloween"
        if (allowed("independence") && inWindow(LocalDate.of(year, 7, 5), 1)) active += "independence"

        val easter = easterSunday(year)
        if (allowed("carnival") && inWindow(easter.minusDays(50), 4)) active += "carnival"

        if (allowed("mothersDay") && date == nthWeekday(year, 5, 2, DayOfWeek.SUNDAY)) {
            active += "mothersDay"
        }
        if (allowed("fathersDay") && date == nthWeekday(year, 6, 3, DayOfWeek.SUNDAY)) {
            active += "fathersDay"
        }
        if (allowed("childrensDay") && date == nthWeekday(year, 7, 3, DayOfWeek.SUNDAY)) {
            active += "childrensDay"
        }

        return active.maxByOrNull { priority[it] ?: 0 } ?: NONE
    }

    /** Pascua gregoriana (Meeus/Jones/Butcher). */
    fun easterSunday(year: Int): LocalDate {
        val a = year % 19
        val b = year / 100
        val c = year % 100
        val d = b / 4
        val e = b % 4
        val f = (b + 8) / 25
        val g = (b - f + 1) / 3
        val h = (19 * a + b - d - g + 15) % 30
        val i = c / 4
        val k = c % 4
        val l = (32 + 2 * e + 2 * i - h - k) % 7
        val m = (a + 11 * h + 22 * l) / 451
        val month = (h + l - 7 * m + 114) / 31
        val day = ((h + l - 7 * m + 114) % 31) + 1
        return LocalDate.of(year, month, day)
    }

    fun nthWeekday(year: Int, month: Int, nth: Int, day: DayOfWeek): LocalDate =
        LocalDate.of(year, month, 1)
            .with(TemporalAdjusters.dayOfWeekInMonth(nth, day))
}
