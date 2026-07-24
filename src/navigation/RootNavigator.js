import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet, Platform } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLedger } from '../context/LedgerContext';
import { getTheme } from '../theme/colors';

import DashboardScreen from '../screens/DashboardScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import AddExpenseScreen from '../screens/AddExpenseScreen';
import ScanReceiptScreen from '../screens/ScanReceiptScreen';
import VoiceEntryScreen from '../screens/VoiceEntryScreen';
import HistoryScreen from '../screens/HistoryScreen';
import MoreScreen from '../screens/MoreScreen';
import BudgetScreen from '../screens/BudgetScreen';
import SearchScreen from '../screens/SearchScreen';
import IncomeScreen from '../screens/IncomeScreen';
import GoalsScreen from '../screens/GoalsScreen';
import RecurringScreen from '../screens/RecurringScreen';
import CategoriesScreen from '../screens/CategoriesScreen';
import InsightsScreen from '../screens/InsightsScreen';
import GalleryScreen from '../screens/GalleryScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const MoreStack = createNativeStackNavigator();

function AddTabButton({ onPress }) {
  const { settings } = useLedger();
  const theme = getTheme(settings.darkMode);
  return (
    <TouchableOpacity onPress={onPress} style={[styles.addBtn, { backgroundColor: theme.gold }]} activeOpacity={0.85}>
      <Text style={[styles.addIcon, { color: theme.inkDeep }]}>+</Text>
    </TouchableOpacity>
  );
}

function MoreStackNavigator() {
  const { settings } = useLedger();
  const theme = getTheme(settings.darkMode);
  const screenOptions = {
    headerShown: true,
    headerStyle: { backgroundColor: theme.paper },
    headerTintColor: theme.text,
    headerTitleStyle: { fontWeight: '700' },
    headerShadowVisible: false,
    contentStyle: { backgroundColor: theme.paper },
    animation: Platform.OS === 'android' ? 'slide_from_right' : 'default',
    ...(Platform.OS === 'android' ? { headerBackTitleVisible: false } : {}),
  };

  return (
    <MoreStack.Navigator screenOptions={screenOptions}>
      <MoreStack.Screen name="MoreMenu" component={MoreScreen} options={{ headerShown: false }} />
      <MoreStack.Screen name="Budget" component={BudgetScreen} options={{ title: 'Budget' }} />
      <MoreStack.Screen name="Search" component={SearchScreen} options={{ title: 'Search' }} />
      <MoreStack.Screen name="Income" component={IncomeScreen} options={{ title: 'Income' }} />
      <MoreStack.Screen name="Goals" component={GoalsScreen} options={{ title: 'Goals' }} />
      <MoreStack.Screen name="Recurring" component={RecurringScreen} options={{ title: 'Recurring' }} />
      <MoreStack.Screen name="Categories" component={CategoriesScreen} options={{ title: 'Categories' }} />
      <MoreStack.Screen name="Insights" component={InsightsScreen} options={{ title: 'Insights' }} />
      <MoreStack.Screen name="Gallery" component={GalleryScreen} options={{ title: 'Receipts' }} />
      <MoreStack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
    </MoreStack.Navigator>
  );
}

function MainTabs() {
  const { settings } = useLedger();
  const theme = getTheme(settings.darkMode);
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.tabBar,
          borderTopColor: theme.line,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom + 4,
          paddingTop: 6,
        },
        tabBarActiveTintColor: theme.tabActive,
        tabBarInactiveTintColor: theme.tabInactive,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tab.Screen name="Home" component={DashboardScreen} options={{ tabBarLabel: 'Home', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🏠</Text> }} />
      <Tab.Screen name="Analytics" component={AnalyticsScreen} options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📊</Text> }} />
      <Tab.Screen
        name="Add"
        component={View}
        options={{
          tabBarLabel: '',
          tabBarIcon: () => null,
          tabBarButton: (props) => <AddTabButton onPress={props.onPress} />,
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.getParent()?.navigate('AddExpense');
          },
        })}
      />
      <Tab.Screen name="History" component={HistoryScreen} options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📅</Text> }} />
      <Tab.Screen name="More" component={MoreStackNavigator} options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>☰</Text> }} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { settings } = useLedger();
  const theme = getTheme(settings.darkMode);

  const navTheme = settings.darkMode
    ? { ...DarkTheme, colors: { ...DarkTheme.colors, background: theme.paper, card: theme.paper2, text: theme.text, border: theme.line, primary: theme.gold } }
    : { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: theme.paper, card: theme.paper2, text: theme.text, border: theme.line, primary: theme.ink } };

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.paper } }}>
        <Stack.Screen name="Tabs" component={MainTabs} />
        <Stack.Screen name="AddExpense" component={AddExpenseScreen} options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="ScanReceipt" component={ScanReceiptScreen} options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="VoiceEntry" component={VoiceEntryScreen} options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  addBtn: {
    top: -16,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  addIcon: { fontSize: 30, fontWeight: '300', lineHeight: 32 },
});
