import React from 'react';
import { StatusBar, Platform, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Provider as PaperProvider, MD3DarkTheme, MD3LightTheme } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { AppStoreProvider, useAppStore } from './store/AppStore';
import { darkTheme, lightTheme } from './utils/theme';

import HomeScreen from './screens/HomeScreen';
import HistoryScreen from './screens/HistoryScreen';
import DebtsScreen from './screens/DebtsScreen';
import StatsScreen from './screens/StatsScreen';
import SettingsScreen from './screens/SettingsScreen';

const Tab = createBottomTabNavigator();

// Кастомная тема для Paper (темная)
const paperDarkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: darkTheme.primary,
    background: darkTheme.background,
    surface: darkTheme.surface,
    error: darkTheme.error,
    text: darkTheme.text,
  },
};

// Кастомная тема для Paper (светлая)
const paperLightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: lightTheme.primary,
    background: lightTheme.background,
    surface: lightTheme.surface,
    error: lightTheme.error,
    text: lightTheme.text,
  },
};

// Компонент навигации (внутри провайдера стора)
function AppNavigator() {
  const { theme: themeMode } = useAppStore();
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;
  const paperTheme = themeMode === 'dark' ? paperDarkTheme : paperLightTheme;

  return (
    <PaperProvider theme={paperTheme}>
      <StatusBar
        barStyle={themeMode === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={theme.background}
        translucent={false}
      />
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarStyle: {
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: theme.surface,
              borderTopColor: theme.border,
              borderTopWidth: 1,
              height: Platform.OS === 'ios' ? 85 : 65,
              paddingBottom: Platform.OS === 'ios' ? 20 : 10,
              paddingTop: 8,
              elevation: 8,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
            },
            tabBarActiveTintColor: theme.primary,
            tabBarInactiveTintColor: theme.textTertiary,
            tabBarLabelStyle: {
              fontSize: 11,
              fontWeight: '600',
            },
            tabBarIcon: ({ focused, color, size }) => {
              let iconName;

              if (route.name === 'Заказ') {
                iconName = focused ? 'add-circle' : 'add-circle-outline';
              } else if (route.name === 'История') {
                iconName = focused ? 'list' : 'list-outline';
              } else if (route.name === 'Долги') {
                iconName = focused ? 'wallet' : 'wallet-outline';
              } else if (route.name === 'Статистика') {
                iconName = focused ? 'stats-chart' : 'stats-chart-outline';
              } else if (route.name === 'Настройки') {
                iconName = focused ? 'settings' : 'settings-outline';
              }

              return <Ionicons name={iconName} size={size} color={color} />;
            },
          })}
        >
          <Tab.Screen name="Заказ" component={HomeScreen} />
          <Tab.Screen name="История" component={HistoryScreen} />
          <Tab.Screen name="Долги" component={DebtsScreen} />
          <Tab.Screen name="Статистика" component={StatsScreen} />
          <Tab.Screen name="Настройки" component={SettingsScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
}

// Главный компонент приложения
export default function App() {
  return (
    <SafeAreaProvider>
      <AppStoreProvider>
        <AppNavigator />
      </AppStoreProvider>
    </SafeAreaProvider>
  );
}
