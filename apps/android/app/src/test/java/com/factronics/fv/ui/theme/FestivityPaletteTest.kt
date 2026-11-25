package com.factronics.fv.ui.theme

import androidx.compose.ui.graphics.Color
import com.factronics.fv.data.FestivityEngine
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File
import kotlin.math.max
import kotlin.math.min
import kotlin.math.pow

/**
 * Gate F1.3: contraste AA de todas las festividades y paridad exacta con
 * packages/shared-fixtures/theme/palettes.json.
 */
class FestivityPaletteTest {

    private val palettes: JSONObject by lazy {
        JSONObject(File("../../../packages/shared-fixtures/theme/palettes.json").readText())
    }

    private fun luminance(hex: String): Double {
        val value = hex.removePrefix("#")
        val channels = listOf(0, 2, 4).map {
            value.substring(it, it + 2).toInt(16) / 255.0
        }
        val linear = channels.map { channel ->
            if (channel <= 0.03928) channel / 12.92 else ((channel + 0.055) / 1.055).pow(2.4)
        }
        return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]
    }

    private fun contrast(foreground: String, background: String): Double {
        val first = luminance(foreground)
        val second = luminance(background)
        return (max(first, second) + 0.05) / (min(first, second) + 0.05)
    }

    private fun assertAA(foreground: String, background: String, label: String) {
        val ratio = contrast(foreground, background)
        assertTrue("$label = ${"%.2f".format(ratio)}", ratio >= 4.5)
    }

    @Test
    fun `paletas Android coinciden con el archivo compartido`() {
        val festivities = palettes.getJSONObject("festivities")
        for (id in FestivityEngine.ids) {
            val shared = festivities.getJSONObject(id)
            val android = FestivityPalette.colors.getValue(id)
            val light = shared.getJSONObject("light")
            val dark = shared.getJSONObject("dark")
            assertEquals("$id light accent", light.getString("accent"), android.light.accentHex)
            assertEquals("$id light onAccent", light.getString("onAccent"), android.light.onAccentHex)
            assertEquals("$id light soft", light.getString("accentSoft"), android.light.accentSoftHex)
            assertEquals("$id light onSoft", light.getString("onAccentSoft"), android.light.onAccentSoftHex)
            assertEquals("$id dark accent", dark.getString("accent"), android.dark.accentHex)
            assertEquals("$id dark onAccent", dark.getString("onAccent"), android.dark.onAccentHex)
            assertEquals("$id dark soft", dark.getString("accentSoft"), android.dark.accentSoftHex)
            assertEquals("$id dark onSoft", dark.getString("onAccentSoft"), android.dark.onAccentSoftHex)
        }
    }

    @Test
    fun `contraste AA en todas las festividades`() {
        for (id in FestivityEngine.ids) {
            val colors = FestivityPalette.colors.getValue(id)
            assertAA(colors.light.onAccentHex, colors.light.accentHex, "$id light acento")
            assertAA(colors.light.onAccentSoftHex, colors.light.accentSoftHex, "$id light suave")
            assertAA(colors.dark.onAccentHex, colors.dark.accentHex, "$id dark acento")
            assertAA(colors.dark.onAccentSoftHex, colors.dark.accentSoftHex, "$id dark suave")
        }
    }

    @Test
    fun `contraste AA del tema base`() {
        assertAA(colorToHex(FVTextLight), colorToHex(FVBackgroundLight), "claro fondo")
        assertAA(colorToHex(FVTextLight), colorToHex(FVSurfaceLight), "claro superficie")
        assertAA(colorToHex(Color.White), colorToHex(FVNavy), "claro primario")
        assertAA(colorToHex(FVNavyDeep), colorToHex(FVAmber), "claro acento")
        assertAA(colorToHex(Color.White), colorToHex(FVRed), "claro error")

        assertAA(colorToHex(FVTextDark), colorToHex(FVBackgroundDark), "oscuro fondo")
        assertAA(colorToHex(FVTextDark), colorToHex(FVSurfaceDark), "oscuro superficie")
        assertAA(colorToHex(FVNavyDeep), colorToHex(FVAmber), "oscuro primario")
        assertAA(colorToHex(FVNavyDeep), colorToHex(FVAmberSoft), "oscuro acento")
    }
}
