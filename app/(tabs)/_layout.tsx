import { Tabs } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

function TrophyIcon({ color }: { color: string }) {
  return (
    <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <Path d="M6 2h12v10a6 6 0 01-12 0V2z" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <Path d="M6 7H3a3 3 0 003 3" stroke={color} strokeWidth="2" />
      <Path d="M18 7h3a3 3 0 01-3 3" stroke={color} strokeWidth="2" />
      <Path d="M12 18v3" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Path d="M8 21h8" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

function PlusIcon({ color }: { color: string }) {
  return (
    <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </Svg>
  );
}

function PersonIcon({ color }: { color: string }) {
  return (
    <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8" r="4" stroke={color} strokeWidth="2" />
      <Path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

function TabItem({ icon, label, focused }: { icon: React.ReactNode; label: string; focused: boolean }) {
  return (
    <View style={styles.tabItem}>
      {icon}
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{label}</Text>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabItem icon={<TrophyIcon color={focused ? '#e8622a' : '#a89080'} />} label="Tournaments" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="post"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabItem icon={<PlusIcon color={focused ? '#e8622a' : '#a89080'} />} label="Post" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabItem icon={<PersonIcon color={focused ? '#e8622a' : '#a89080'} />} label="Profile" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0e8e0',
    height: 75,
    paddingBottom: 10,
    paddingTop: 8,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tabLabel: {
    fontSize: 10,
    color: '#a89080',
    textAlign: 'center',
    width: 60,
  },
  tabLabelActive: {
    color: '#e8622a',
    fontWeight: '600',
  },
});