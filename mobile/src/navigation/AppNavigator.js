import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { useAppData } from '../context/AppContext';

import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import RepairsScreen from '../screens/RepairsScreen';
import RepairDetailScreen from '../screens/RepairDetailScreen';
import NewRepairScreen from '../screens/NewRepairScreen';
import ReporterDashboardScreen from '../screens/ReporterDashboardScreen';
import MyRepairsScreen from '../screens/MyRepairsScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const tabScreenOptions = {
  tabBarActiveTintColor: Colors.primary,
  tabBarInactiveTintColor: Colors.muted,
  tabBarStyle: { backgroundColor: '#fff', borderTopColor: Colors.line },
  headerStyle: { backgroundColor: Colors.primary },
  headerTintColor: '#fff',
  headerTitleStyle: { fontWeight: '700' },
};

function AdminTabs({ user, onLogout }) {
  const { data } = useAppData();
  const pendingCount = data.repairs.filter(r => ['new', 'assess'].includes(r.status)).length;

  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen
        name="Dashboard"
        options={{ title: 'แดชบอร์ด', tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size} color={color} /> }}
      >
        {props => <DashboardScreen {...props} user={user} />}
      </Tab.Screen>
      <Tab.Screen
        name="Repairs"
        options={{
          title: 'รายการแจ้งซ่อม',
          tabBarIcon: ({ color, size }) => <Ionicons name="list-outline" size={size} color={color} />,
          tabBarBadge: pendingCount > 0 ? pendingCount : undefined,
        }}
      >
        {props => <RepairsScreen {...props} user={user} />}
      </Tab.Screen>
      <Tab.Screen
        name="Profile"
        options={{ title: 'โปรไฟล์', tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} /> }}
      >
        {props => <ProfileScreen {...props} user={user} onLogout={onLogout} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

function ReporterTabs({ user, onLogout }) {
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen
        name="RDashboard"
        options={{ title: 'แดชบอร์ด', tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size} color={color} /> }}
      >
        {props => <ReporterDashboardScreen {...props} user={user} />}
      </Tab.Screen>
      <Tab.Screen
        name="NewRepair"
        options={{ title: 'แจ้งซ่อมใหม่', tabBarIcon: ({ color, size }) => <Ionicons name="add-circle-outline" size={size} color={color} /> }}
      >
        {props => <NewRepairScreen {...props} user={user} />}
      </Tab.Screen>
      <Tab.Screen
        name="MyRepairs"
        options={{ title: 'ติดตามสถานะ', tabBarIcon: ({ color, size }) => <Ionicons name="clipboard-outline" size={size} color={color} /> }}
      >
        {props => <MyRepairsScreen {...props} user={user} />}
      </Tab.Screen>
      <Tab.Screen
        name="Profile"
        options={{ title: 'โปรไฟล์', tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} /> }}
      >
        {props => <ProfileScreen {...props} user={user} onLogout={onLogout} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export default function AppNavigator({ user, onLogin, onLogout }) {
  const isReporter = !!user && (user.role === 'Reporter' || user.role === 'Engineer');

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        <Stack.Screen name="Login">
          {props => <LoginScreen {...props} onLogin={onLogin} />}
        </Stack.Screen>
      ) : isReporter ? (
        <>
          <Stack.Screen name="ReporterMain">
            {props => <ReporterTabs {...props} user={user} onLogout={onLogout} />}
          </Stack.Screen>
          <Stack.Screen
            name="RepairDetail"
            component={RepairDetailScreen}
            options={{ headerShown: true, title: 'รายละเอียดใบแจ้งซ่อม', headerStyle: { backgroundColor: Colors.primary }, headerTintColor: '#fff' }}
          />
        </>
      ) : (
        <>
          <Stack.Screen name="AdminMain">
            {props => <AdminTabs {...props} user={user} onLogout={onLogout} />}
          </Stack.Screen>
          <Stack.Screen
            name="RepairDetail"
            component={RepairDetailScreen}
            options={{ headerShown: true, title: 'รายละเอียดใบแจ้งซ่อม', headerStyle: { backgroundColor: Colors.primary }, headerTintColor: '#fff' }}
          />
          <Stack.Screen
            name="CreateRepair"
            options={{ headerShown: true, title: 'แจ้งซ่อมใหม่', headerStyle: { backgroundColor: Colors.primary }, headerTintColor: '#fff' }}
          >
            {props => <NewRepairScreen {...props} user={user} />}
          </Stack.Screen>
        </>
      )}
    </Stack.Navigator>
  );
}
