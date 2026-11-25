package com.factronics.fv.ui.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import com.factronics.fv.data.FestivityEngine

private val LightColors = lightColorScheme(
    primary = FVNavy,
    onPrimary = Color.White,
    primaryContainer = FVAmberSoft,
    onPrimaryContainer = FVNavyDeep,
    secondary = FVTeal,
    onSecondary = Color.White,
    secondaryContainer = FVAmberSoft,
    onSecondaryContainer = FVNavyDeep,
    tertiary = FVAmber,
    onTertiary = FVNavyDeep,
    background = FVBackgroundLight,
    onBackground = FVTextLight,
    surface = FVSurfaceLight,
    onSurface = FVTextLight,
    surfaceVariant = FVSurfaceVariantLight,
    onSurfaceVariant = FVOnSurfaceVariantLight,
    surfaceContainer = FVSurfaceContainerLight,
    surfaceContainerLow = FVSurfaceLight,
    surfaceContainerHigh = FVSurfaceVariantLight,
    surfaceContainerHighest = FVSurfaceVariantLight,
    error = FVRed,
    onError = Color.White
)

private val DarkColors = darkColorScheme(
    primary = FVAmber,
    onPrimary = FVNavyDeep,
    primaryContainer = FVNavy,
    onPrimaryContainer = FVAmberSoft,
    secondary = Color(0xFF7FC4E8),
    onSecondary = FVNavyDeep,
    secondaryContainer = Color(0xFF2C4052),
    onSecondaryContainer = FVAmberSoft,
    tertiary = FVAmberSoft,
    onTertiary = FVNavyDeep,
    background = FVBackgroundDark,
    onBackground = FVTextDark,
    surface = FVSurfaceDark,
    onSurface = FVTextDark,
    surfaceVariant = FVSurfaceVariantDark,
    onSurfaceVariant = FVOnSurfaceVariantDark,
    surfaceContainer = FVSurfaceContainerDark,
    surfaceContainerLow = FVSurfaceDark,
    surfaceContainerHigh = FVSurfaceVariantDark,
    surfaceContainerHighest = FVSurfaceVariantDark,
    error = Color(0xFFF2B8B5),
    onError = FVNavyDeep
)

/**
 * Tema F&V. [themeMode]: "system" | "light" | "dark".
 * [dynamicColor]: Material You solo en Android 12+ (si está activo).
 * [festivityId]: acento/ilustración festiva; "none" usa el tema base.
 */
@Composable
fun FVTheme(
    themeMode: String = "system",
    dynamicColor: Boolean = true,
    festivityId: String = FestivityEngine.NONE,
    content: @Composable () -> Unit
) {
    val darkTheme = when (themeMode) {
        "light" -> false
        "dark" -> true
        else -> isSystemInDarkTheme()
    }

    val context = LocalContext.current
    val baseScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S ->
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        darkTheme -> DarkColors
        else -> LightColors
    }

    val festivity = FestivityPalette.forId(festivityId, darkTheme)
    val colorScheme = if (festivity == null) {
        baseScheme
    } else {
        baseScheme.copy(
            tertiary = festivity.accent,
            onTertiary = festivity.onAccent,
            secondaryContainer = if (darkTheme) festivity.accent else festivity.accentSoft,
            onSecondaryContainer = if (darkTheme) festivity.onAccent else festivity.onAccentSoft
        )
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = FVTypography,
        content = content
    )
}
