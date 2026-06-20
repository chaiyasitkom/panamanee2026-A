import React, { useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Colors } from '../theme/colors';
import { useAppData } from '../context/AppContext';
import AppShell from './AppShell';

import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import RepairsScreen from '../screens/RepairsScreen';
import RepairDetailScreen from '../screens/RepairDetailScreen';
import NewRepairScreen from '../screens/NewRepairScreen';
import ReporterDashboardScreen from '../screens/ReporterDashboardScreen';
import MyRepairsScreen from '../screens/MyRepairsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import MachinesScreen from '../screens/MachinesScreen';
import UsersScreen from '../screens/UsersScreen';
import CategoriesScreen from '../screens/CategoriesScreen';
import DocPJ2Screen from '../screens/DocPJ2Screen';

const Stack = createNativeStackNavigator();

const headerOpts = { headerShown: true, headerStyle: { backgroundColor: Colors.primary }, headerTintColor: '#fff' };

function AdminShell({ navigation, user, onLogout }) {
  const { data } = useAppData();
  const [page, setPage] = useState('dashboard');
  const pendingCount = data.repairs.filter(r => ['new', 'assess'].includes(r.status)).length;
  const isAdminish = ['Admin', 'Officer', 'Director'].includes(user.role);

  const navItems = [
    { key: 'dashboard', icon: 'grid-outline', label: 'แดชบอร์ด' },
    { key: 'repairs', icon: 'list-outline', label: 'รายการแจ้งซ่อม', badge: pendingCount },
    { key: 'machines', icon: 'construct-outline', label: 'ทะเบียนเครื่องจักร' },
    { key: 'docpj2', icon: 'ribbon-outline', label: 'ปจ2-เอกสารรับรอง' },
    ...(isAdminish ? [
      { key: 'users', icon: 'people-outline', label: 'จัดการผู้ใช้งาน' },
      { key: 'categories', icon: 'pricetags-outline', label: 'จัดการหมวดหมู่' },
    ] : []),
    { key: 'profile', icon: 'person-outline', label: 'โปรไฟล์' },
  ];

  const pages = {
    dashboard: <DashboardScreen navigation={navigation} user={user} goToPage={setPage} />,
    repairs: <RepairsScreen navigation={navigation} user={user} />,
    machines: <MachinesScreen navigation={navigation} user={user} />,
    docpj2: <DocPJ2Screen navigation={navigation} user={user} />,
    users: <UsersScreen navigation={navigation} user={user} />,
    categories: <CategoriesScreen navigation={navigation} user={user} />,
    profile: <ProfileScreen navigation={navigation} user={user} onLogout={onLogout} />,
  };

  return <AppShell navItems={navItems} pages={pages} page={page} onSelectPage={setPage} user={user} onLogout={onLogout} />;
}

function ReporterShell({ navigation, user, onLogout }) {
  const [page, setPage] = useState('rdashboard');

  const navItems = [
    { key: 'rdashboard', icon: 'grid-outline', label: 'แดชบอร์ด' },
    { key: 'newrepair', icon: 'add-circle-outline', label: 'แจ้งซ่อมใหม่' },
    { key: 'myrepairs', icon: 'clipboard-outline', label: 'ติดตามสถานะ' },
    { key: 'machines', icon: 'construct-outline', label: 'ทะเบียนเครื่องจักร' },
    { key: 'docpj2', icon: 'ribbon-outline', label: 'ปจ2-เอกสารรับรอง' },
    { key: 'profile', icon: 'person-outline', label: 'โปรไฟล์' },
  ];

  const pages = {
    rdashboard: <ReporterDashboardScreen navigation={navigation} user={user} goToPage={setPage} />,
    newrepair: <NewRepairScreen navigation={navigation} user={user} goToPage={setPage} />,
    myrepairs: <MyRepairsScreen navigation={navigation} user={user} />,
    machines: <MachinesScreen navigation={navigation} user={user} />,
    docpj2: <DocPJ2Screen navigation={navigation} user={user} />,
    profile: <ProfileScreen navigation={navigation} user={user} onLogout={onLogout} />,
  };

  return <AppShell navItems={navItems} pages={pages} page={page} onSelectPage={setPage} user={user} onLogout={onLogout} />;
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
            {props => <ReporterShell {...props} user={user} onLogout={onLogout} />}
          </Stack.Screen>
          <Stack.Screen name="RepairDetail" component={RepairDetailScreen} options={{ ...headerOpts, title: 'รายละเอียดใบแจ้งซ่อม' }} />
        </>
      ) : (
        <>
          <Stack.Screen name="AdminMain">
            {props => <AdminShell {...props} user={user} onLogout={onLogout} />}
          </Stack.Screen>
          <Stack.Screen name="RepairDetail" component={RepairDetailScreen} options={{ ...headerOpts, title: 'รายละเอียดใบแจ้งซ่อม' }} />
          <Stack.Screen name="CreateRepair" options={{ ...headerOpts, title: 'แจ้งซ่อมใหม่' }}>
            {props => <NewRepairScreen {...props} user={user} />}
          </Stack.Screen>
        </>
      )}
    </Stack.Navigator>
  );
}
