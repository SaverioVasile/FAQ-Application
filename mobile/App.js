import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Text } from 'react-native';
import QuestionnaireScreen from './src/screens/QuestionnaireScreen';
import SubmissionsScreen from './src/screens/SubmissionsScreen';
import AdminScreen from './src/screens/AdminScreen';
import DebugOverlay from './src/components/DebugOverlay';
import { API_BASE_URL, API_TARGET } from './src/config';
import { addDebugLog } from './src/services/debugLog';
import { fetchMailConfig } from './src/services/api';

const Tab = createBottomTabNavigator();

export default function App() {
  const [sesAdminAvailable, setSesAdminAvailable] = useState(false);

  useEffect(() => {
    addDebugLog('API config selected', { target: API_TARGET, url: API_BASE_URL });

    fetchMailConfig()
      .then((config) => {
        const available = Boolean(config?.sesAdminAvailable);
        setSesAdminAvailable(available);
        addDebugLog('Mail config loaded', {
          provider: config?.mailProvider,
          enabled: config?.mailEnabled,
          sesAdminAvailable: available,
        });
      })
      .catch((err) => {
        addDebugLog('Mail config error', { message: err?.message || 'unknown' });
        setSesAdminAvailable(false);
      });
  }, []);

  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused }) => {
            const icons = {
              Questionario: focused ? '📋' : '📄',
              Storico: focused ? '📊' : '📉',
              Admin: focused ? '🔧' : '⚙️',
            };
            return <Text style={{ fontSize: 20 }}>{icons[route.name]}</Text>;
          },
          tabBarActiveTintColor: '#4f46e5',
          tabBarInactiveTintColor: '#94a3b8',
          tabBarStyle: { paddingBottom: 4 },
          headerStyle: { backgroundColor: '#4f46e5' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700' },
        })}
      >
        <Tab.Screen
          name="Questionario"
          component={QuestionnaireScreen}
          options={{ title: 'Questionario FAQ' }}
        />
        <Tab.Screen
          name="Storico"
          component={SubmissionsScreen}
          options={{ title: 'Storico' }}
        />
        {sesAdminAvailable && (
          <Tab.Screen
            name="Admin"
            component={AdminScreen}
            options={{ title: 'Admin' }}
          />
        )}
      </Tab.Navigator>
      <DebugOverlay />
    </NavigationContainer>
  );
}

