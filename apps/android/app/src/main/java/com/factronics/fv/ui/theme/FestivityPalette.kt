package com.factronics.fv.ui.theme

import androidx.compose.ui.graphics.Color
import java.util.Locale
import kotlin.math.roundToInt

/**
 * Paletas de festividades (F1.3). Los valores hex deben coincidir con
 * packages/shared-fixtures/theme/palettes.json y con la PWA.
 * Solo se usan para acentos y contenedores; fondos, superficies y texto no cambian.
 */
data class FestivityColorSet(
    val accentHex: String,
    val onAccentHex: String,
    val accentSoftHex: String,
    val onAccentSoftHex: String
) {
    val accent: Color get() = parseHex(accentHex)
    val onAccent: Color get() = parseHex(onAccentHex)
    val accentSoft: Color get() = parseHex(accentSoftHex)
    val onAccentSoft: Color get() = parseHex(onAccentSoftHex)
}

data class FestivityThemeColors(
    val light: FestivityColorSet,
    val dark: FestivityColorSet
) {
    fun forDark(dark: Boolean): FestivityColorSet = if (dark) this.dark else this.light
}

private fun parseHex(value: String): Color =
    Color(0xFF000000L or value.removePrefix("#").toLong(16))

fun colorToHex(color: Color): String {
    val red = (color.red * 255f).roundToInt()
    val green = (color.green * 255f).roundToInt()
    val blue = (color.blue * 255f).roundToInt()
    return String.format(Locale.US, "#%02X%02X%02X", red, green, blue)
}

object FestivityPalette {

    val colors: Map<String, FestivityThemeColors> = mapOf(
        "christmas" to FestivityThemeColors(
            light = FestivityColorSet("#B3261E", "#FFFFFF", "#FFDAD6", "#410002"),
            dark = FestivityColorSet("#FFB4AB", "#0B2237", "#5C1A17", "#FFDAD6")
        ),
        "epiphany" to FestivityThemeColors(
            light = FestivityColorSet("#8A5A00", "#FFFFFF", "#FFE8B3", "#3D2A00"),
            dark = FestivityColorSet("#FFD166", "#0B2237", "#5A4300", "#FFE8B3")
        ),
        "valentine" to FestivityThemeColors(
            light = FestivityColorSet("#AD1457", "#FFFFFF", "#FFD9E2", "#3E001D"),
            dark = FestivityColorSet("#FFB1C8", "#0B2237", "#6B0030", "#FFD9E2")
        ),
        "carnival" to FestivityThemeColors(
            light = FestivityColorSet("#6A1B9A", "#FFFFFF", "#F3D9FF", "#2A0A3D"),
            dark = FestivityColorSet("#E7B9FF", "#0B2237", "#4A1A6B", "#F3D9FF")
        ),
        "mothersDay" to FestivityThemeColors(
            light = FestivityColorSet("#A3115C", "#FFFFFF", "#FFD9E2", "#3E001D"),
            dark = FestivityColorSet("#FFB1C8", "#0B2237", "#6B0030", "#FFD9E2")
        ),
        "fathersDay" to FestivityThemeColors(
            light = FestivityColorSet("#0D47A1", "#FFFFFF", "#D6E3FF", "#001B3F"),
            dark = FestivityColorSet("#A8C7FA", "#0B2237", "#00306B", "#D6E3FF")
        ),
        "childrensDay" to FestivityThemeColors(
            light = FestivityColorSet("#B54708", "#FFFFFF", "#FFDCC2", "#3A1A00"),
            dark = FestivityColorSet("#FFB77A", "#0B2237", "#6B2A00", "#FFDCC2")
        ),
        "halloween" to FestivityThemeColors(
            light = FestivityColorSet("#B45309", "#FFFFFF", "#FFDDB8", "#3A1A00"),
            dark = FestivityColorSet("#FFB86B", "#0B2237", "#6B3300", "#FFDDB8")
        ),
        "independence" to FestivityThemeColors(
            light = FestivityColorSet("#F2C200", "#0B2237", "#FFF1B8", "#3A2F00"),
            dark = FestivityColorSet("#F2C200", "#0B2237", "#5A4A00", "#FFF1B8")
        )
    )

    fun forId(id: String, dark: Boolean): FestivityColorSet? =
        colors[id]?.forDark(dark)
}
