package com.factronics.fv.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.size
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.unit.dp

/**
 * Ilustración vectorial y decorativa de la festividad (F1.3).
 * Sin material de Videojet/Factronics, sin animaciones ni sonidos.
 */
@Composable
fun FestivityArt(id: String, modifier: Modifier = Modifier) {
    if (id == "none") return
    val accent = MaterialTheme.colorScheme.tertiary
    val detail = MaterialTheme.colorScheme.onTertiary

    Canvas(modifier = modifier.size(72.dp)) {
        val w = size.width
        val h = size.height

        fun star(cx: Float, cy: Float, outer: Float, inner: Float) {
            val path = Path()
            for (index in 0 until 10) {
                val angle = Math.toRadians((-90 + index * 36).toDouble())
                val radius = if (index % 2 == 0) outer else inner
                val x = cx + (radius * Math.cos(angle)).toFloat()
                val y = cy + (radius * Math.sin(angle)).toFloat()
                if (index == 0) path.moveTo(x, y) else path.lineTo(x, y)
            }
            path.close()
            drawPath(path, color = accent)
        }

        fun heart(cx: Float, cy: Float, radius: Float) {
            val path = Path().apply {
                moveTo(cx, cy + radius)
                cubicTo(
                    cx - radius * 2.2f, cy - radius * 0.4f,
                    cx - radius * 0.8f, cy - radius * 1.8f,
                    cx, cy - radius * 0.7f
                )
                cubicTo(
                    cx + radius * 0.8f, cy - radius * 1.8f,
                    cx + radius * 2.2f, cy - radius * 0.4f,
                    cx, cy + radius
                )
                close()
            }
            drawPath(path, color = accent)
        }

        when (id) {
            "christmas" -> {
                val tree = Path().apply {
                    moveTo(w * 0.50f, h * 0.12f)
                    lineTo(w * 0.78f, h * 0.52f)
                    lineTo(w * 0.62f, h * 0.52f)
                    lineTo(w * 0.86f, h * 0.78f)
                    lineTo(w * 0.56f, h * 0.78f)
                    lineTo(w * 0.56f, h * 0.90f)
                    lineTo(w * 0.44f, h * 0.90f)
                    lineTo(w * 0.44f, h * 0.78f)
                    lineTo(w * 0.14f, h * 0.78f)
                    lineTo(w * 0.38f, h * 0.52f)
                    lineTo(w * 0.22f, h * 0.52f)
                    close()
                }
                drawPath(tree, color = accent)
                star(w * 0.50f, h * 0.11f, w * 0.10f, w * 0.04f)
                drawCircle(detail, radius = w * 0.035f, center = Offset(w * 0.42f, h * 0.42f))
                drawCircle(detail, radius = w * 0.035f, center = Offset(w * 0.58f, h * 0.58f))
                drawCircle(detail, radius = w * 0.035f, center = Offset(w * 0.46f, h * 0.70f))
            }
            "epiphany", "fathersDay" -> {
                star(w * 0.5f, h * 0.48f, w * 0.34f, w * 0.15f)
                drawCircle(accent, radius = w * 0.05f, center = Offset(w * 0.18f, h * 0.82f))
                drawCircle(accent, radius = w * 0.06f, center = Offset(w * 0.84f, h * 0.80f))
            }
            "valentine", "mothersDay" -> {
                heart(w * 0.5f, h * 0.52f, w * 0.26f)
                star(w * 0.80f, h * 0.24f, w * 0.12f, w * 0.05f)
            }
            "carnival", "childrensDay" -> {
                drawCircle(accent, radius = w * 0.10f, center = Offset(w * 0.28f, h * 0.30f))
                drawCircle(accent, radius = w * 0.07f, center = Offset(w * 0.74f, h * 0.24f))
                drawCircle(accent, radius = w * 0.12f, center = Offset(w * 0.70f, h * 0.68f))
                drawCircle(detail, radius = w * 0.05f, center = Offset(w * 0.38f, h * 0.78f))
                drawRect(
                    color = accent,
                    topLeft = Offset(w * 0.16f, h * 0.58f),
                    size = Size(w * 0.12f, w * 0.12f)
                )
            }
            "halloween" -> {
                drawOval(
                    color = accent,
                    topLeft = Offset(w * 0.18f, h * 0.30f),
                    size = Size(w * 0.64f, h * 0.52f)
                )
                drawCircle(detail, radius = w * 0.06f, center = Offset(w * 0.38f, h * 0.50f))
                drawCircle(detail, radius = w * 0.06f, center = Offset(w * 0.62f, h * 0.50f))
                drawLine(
                    detail,
                    Offset(w * 0.36f, h * 0.68f),
                    Offset(w * 0.64f, h * 0.68f),
                    strokeWidth = w * 0.06f
                )
            }
            "independence" -> {
                drawRect(accent, topLeft = Offset(w * 0.16f, h * 0.22f), size = Size(w * 0.68f, h * 0.14f))
                drawRect(
                    color = androidx.compose.ui.graphics.Color(0xFF10314F),
                    topLeft = Offset(w * 0.16f, h * 0.38f),
                    size = Size(w * 0.68f, h * 0.14f)
                )
                drawRect(
                    color = androidx.compose.ui.graphics.Color(0xFFB3261E),
                    topLeft = Offset(w * 0.16f, h * 0.54f),
                    size = Size(w * 0.68f, h * 0.14f)
                )
                star(w * 0.5f, h * 0.45f, w * 0.14f, w * 0.06f)
                drawCircle(accent, radius = w * 0.04f, center = Offset(w * 0.16f, h * 0.82f))
                drawCircle(accent, radius = w * 0.04f, center = Offset(w * 0.84f, h * 0.82f))
            }
        }
    }
}
