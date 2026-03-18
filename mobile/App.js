import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Text } from 'react-native';
import QuestionnaireScreen from './src/screens/QuestionnaireScreen';
import SubmissionsScreen from './src/screens/SubmissionsScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color }) => {
            const icons = {
              Questionario: focused ? '📋' : '📄',
              Storico: focused ? '📊' : '📉',
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
      </Tab.Navigator>
    </NavigationContainer>
  );
}

