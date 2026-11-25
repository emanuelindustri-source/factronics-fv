package com.factronics.fv.data

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Test
import java.io.File
import java.time.DayOfWeek
import java.time.Instant
import java.time.ZoneId

/**
 * Gate F1.3: fixtures compartidos con la PWA (26 casos), Pascua y enésimo día.
 */
class FestivityEngineTest {

    private val fixtures: JSONObject by lazy {
        JSONObject(File("../../../packages/shared-fixtures/theme/festivities-fixtures.json").readText())
    }

    @Test
    fun `casos compartidos con la PWA`() {
        val cases = fixtures.getJSONArray("cases")
        for (index in 0 until cases.length()) {
            val case = cases.getJSONObject(index)
            val expected = case.getString("expected")
            val result = FestivityEngine.resolve(
                instant = Instant.parse(case.getString("instant")),
                zoneId = ZoneId.of(case.getString("zone")),
                country = case.getString("country"),
                enabled = case.optBoolean("enabled", true),
                sober = case.optBoolean("sober", false),
                override = case.optString("override", FestivityEngine.AUTO)
            )
            assertEquals(case.getString("name"), expected, result)
        }
    }

    @Test
    fun `Pascua conocida 2024-2028`() {
        assertEquals("2024-03-31", FestivityEngine.easterSunday(2024).toString())
        assertEquals("2025-04-20", FestivityEngine.easterSunday(2025).toString())
        assertEquals("2026-04-05", FestivityEngine.easterSunday(2026).toString())
        assertEquals("2027-03-28", FestivityEngine.easterSunday(2027).toString())
        assertEquals("2028-04-16", FestivityEngine.easterSunday(2028).toString())
    }

    @Test
    fun `enesimo domingo del mes`() {
        assertEquals(
            "2026-05-10",
            FestivityEngine.nthWeekday(2026, 5, 2, DayOfWeek.SUNDAY).toString()
        )
        assertEquals(
            "2026-06-21",
            FestivityEngine.nthWeekday(2026, 6, 3, DayOfWeek.SUNDAY).toString()
        )
        assertEquals(
            "2026-07-19",
            FestivityEngine.nthWeekday(2026, 7, 3, DayOfWeek.SUNDAY).toString()
        )
    }

    @Test
    fun `modo sobrio y desactivado suprimen la festividad`() {
        val christmas = Instant.parse("2026-12-25T15:00:00Z")
        assertEquals(
            FestivityEngine.NONE,
            FestivityEngine.resolve(christmas, ZoneId.of("America/Caracas"), "VE", true, true, "auto")
        )
        assertEquals(
            FestivityEngine.NONE,
            FestivityEngine.resolve(christmas, ZoneId.of("America/Caracas"), "VE", false, false, "auto")
        )
    }
}
