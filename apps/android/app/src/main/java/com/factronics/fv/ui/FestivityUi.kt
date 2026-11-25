package com.factronics.fv.ui

import com.factronics.fv.R
import com.factronics.fv.data.FestivityEngine

/** Nombres y opciones de festividades para la UI (F1.3). */
object FestivityUi {

    val overrideIds: List<String> =
        listOf(FestivityEngine.AUTO, FestivityEngine.NONE) + FestivityEngine.ids

    fun nameRes(id: String): Int = when (id) {
        "christmas" -> R.string.festivity_christmas
        "epiphany" -> R.string.festivity_epiphany
        "valentine" -> R.string.festivity_valentine
        "carnival" -> R.string.festivity_carnival
        "mothersDay" -> R.string.festivity_mothers_day
        "fathersDay" -> R.string.festivity_fathers_day
        "childrensDay" -> R.string.festivity_childrens_day
        "halloween" -> R.string.festivity_halloween
        "independence" -> R.string.festivity_independence
        else -> R.string.festivity_none
    }
}
