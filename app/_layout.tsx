import { useColorScheme } from '@/hooks/use-color-scheme';
import { Rajdhani_700Bold, useFonts } from '@expo-google-fonts/rajdhani';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { auth, db } from '../firebaseConfig';

export const unstable_settings = {
  anchor: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function registerPushToken(uid: string) {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    await setDoc(doc(db, 'users', uid), { pushToken: token }, { merge: true });
  } catch (e) {
    console.log('Push token error:', e);
  }
}

function SplashLoading({ fontsLoaded }: { fontsLoaded: boolean }) {
  return (
    <View style={styles.splashContainer}>
      <Text style={[styles.splashText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>
        ZONY
      </Text>
    </View>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [fontsLoaded] = useFonts({ Rajdhani_700Bold });
  const [forceShow, setForceShow] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setForceShow(false), 1200);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setReady(true);
      if (u) registerPushToken(u.uid);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!ready) return;
    const inAuth = segments[0] === 'login';
    if (!user && !inAuth) {
      router.replace('/login');
    } else if (user && inAuth) {
      router.replace('/');
    }
  }, [user, ready, segments]);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  if (!ready || forceShow) {
    return <SplashLoading fontsLoaded={fontsLoaded} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="tournament" options={{ headerShown: false }} />
          <Stack.Screen name="map" options={{ headerShown: false }} />
          <Stack.Screen name="postboard" options={{ headerShown: false }} />
          <Stack.Screen name="notifications" options={{ headerShown: false }} />
          <Stack.Screen name="board-detail" options={{ headerShown: false }} />
          <Stack.Screen name="edit-board" options={{ headerShown: false }} />
          <Stack.Screen name="new-post" options={{ headerShown: false }} />
          <Stack.Screen name="messages" options={{ headerShown: false }} />
<Stack.Screen name="chat" options={{ headerShown: false }} />
<Stack.Screen name="start-dm" options={{ headerShown: false }} />
<Stack.Screen name="community-post" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: '#8B1A1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashText: {
    fontSize: 56,
    fontWeight: '900',
    color: '#F5F0E8',
    letterSpacing: 8,
  },
});