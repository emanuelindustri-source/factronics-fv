package com.factronics.fv.ui

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.heading
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.factronics.fv.R
import com.factronics.fv.ui.screens.AboutScreen
import com.factronics.fv.ui.screens.HomeScreen
import com.factronics.fv.ui.screens.ProfileScreen
import com.factronics.fv.ui.screens.SettingsScreen

private data class FVRoute(val route: String, val labelRes: Int, val icon: @Composable () -> Unit)

@Composable
fun FVApp(
    onThemeModeChange: (String) -> Unit,
    onDynamicColorChange: (Boolean) -> Unit,
    onLanguageChange: (String) -> Unit
) {
    val navController = rememberNavController()

    val routes = listOf(
        FVRoute("home", R.string.nav_home) {
            Icon(Icons.Default.Home, contentDescription = null)
        },
        FVRoute("profile", R.string.nav_profile) {
            Icon(Icons.Default.Person, contentDescription = null)
        },
        FVRoute("settings", R.string.nav_settings) {
            Icon(Icons.Default.Settings, contentDescription = null)
        },
        FVRoute("about", R.string.nav_about) {
            Icon(Icons.Default.Info, contentDescription = null)
        }
    )

    Scaffold(
        bottomBar = {
            NavigationBar {
                val backStackEntry by navController.currentBackStackEntryAsState()
                val currentDestination = backStackEntry?.destination
                routes.forEach { item ->
                    val label = stringResource(item.labelRes)
                    val selected = currentDestination?.hierarchy?.any { it.route == item.route } == true
                    NavigationBarItem(
                        selected = selected,
                        onClick = {
                            navController.navigate(item.route) {
                                popUpTo("home") { saveState = true }
                                launchSingleTop = true
                                restoreState = true
                            }
                        },
                        icon = item.icon,
                        label = { Text(label) }
                    )
                }
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = "home",
            modifier = Modifier.padding(innerPadding)
        ) {
            composable("home") { HomeScreen() }
            composable("profile") { ProfileScreen() }
            composable("settings") {
                SettingsScreen(
                    onThemeModeChange = onThemeModeChange,
                    onDynamicColorChange = onDynamicColorChange,
                    onLanguageChange = onLanguageChange
                )
            }
            composable("about") { AboutScreen() }
        }
    }
}
