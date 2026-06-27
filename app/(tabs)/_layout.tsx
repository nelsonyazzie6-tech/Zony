import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

function TournamentsIcon({ color }: { color: string }) {
  return (
    <Svg width="28" height="28" viewBox="0 0 22 22" fill="none">
      <Path d="M7 2h8v8a4 4 0 0 1-8 0V2Z" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
      <Path d="M7 5H4a2 2 0 0 0 0 4h3M15 5h3a2 2 0 0 1 0 4h-3" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <Path d="M11 14v4M8 20h6" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </Svg>
  );
}

function BoardIcon({ color }: { color: string }) {
  return (
    <Svg width="28" height="28" viewBox="0 0 22 22" fill="none">
      <Rect x="2" y="2" width="8" height="8" rx="2" stroke={color} strokeWidth="1.5"/>
      <Rect x="12" y="2" width="8" height="8" rx="2" stroke={color} strokeWidth="1.5"/>
      <Rect x="2" y="12" width="8" height="8" rx="2" stroke={color} strokeWidth="1.5"/>
      <Rect x="12" y="12" width="8" height="8" rx="2" stroke={color} strokeWidth="1.5"/>
    </Svg>
  );
}

function PostIcon({ color }: { color: string }) {
  return (
    <Svg width="28" height="28" viewBox="0 0 22 22" fill="none">
      <Circle cx="11" cy="11" r="9" stroke={color} strokeWidth="1.5"/>
      <Path d="M11 7v8M7 11h8" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </Svg>
  );
}

function CommunityIcon({ color }: { color: string }) {
  return (
    <Svg width="28" height="28" viewBox="0 0 22 22" fill="none">
      <Circle cx="7" cy="8" r="3" stroke={color} strokeWidth="1.5"/>
      <Circle cx="15" cy="8" r="3" stroke={color} strokeWidth="1.5"/>
      <Path d="M1 19c0-3 2.7-5 6-5M21 19c0-3-2.7-5-6-5" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <Path d="M8 19c0-3 1.3-5 3-5s3 2 3 5" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </Svg>
  );
}

function ProfileIcon({ color }: { color: string }) {
  return (
    <Svg width="28" height="28" viewBox="0 0 22 22" fill="none">
      <Circle cx="11" cy="7" r="4" stroke={color} strokeWidth="1.5"/>
      <Path d="M3 19c0-4 3.6-7 8-7s8 3 8 7" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </Svg>
  );
}

function TabItem({ icon }: { icon: React.ReactNode }) {
  return (
    <View style={styles.tabItem}>
      {icon}
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
        animation: 'fade',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabItem icon={<TournamentsIcon color={focused ? '#008080' : '#999'} />} />
          ),
        }}
      />
      <Tabs.Screen
        name="board"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabItem icon={<BoardIcon color={focused ? '#008080' : '#999'} />} />
          ),
        }}
      />
      <Tabs.Screen
        name="post"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabItem icon={<PostIcon color={focused ? '#008080' : '#999'} />} />
          ),
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabItem icon={<CommunityIcon color={focused ? '#008080' : '#999'} />} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabItem icon={<ProfileIcon color={focused ? '#008080' : '#999'} />} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#F5F0E8',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    height: 75,
    paddingBottom: 10,
    paddingTop: 8,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});