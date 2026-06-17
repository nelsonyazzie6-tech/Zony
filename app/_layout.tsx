import { useColorScheme } from '@/hooks/use-color-scheme';
import { Rajdhani_700Bold, useFonts } from '@expo-google-fonts/rajdhani';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { auth, db } from '../firebaseConfig';
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'https://3e555aa3301825d73fc1da854b7fd082@o4511583367528448.ingest.us.sentry.io/4511583375130624',

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: true,

  // Enable Logs
  enableLogs: true,
  integrations: [Sentry.feedbackIntegration()],

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

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

function SplashLoading({ fontsLoaded, fadeOut, onFadeComplete }: { fontsLoaded: boolean; fadeOut: boolean; onFadeComplete: () => void }) {
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const exitOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacityAnim, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 60, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (fadeOut) {
      Animated.timing(exitOpacity, { toValue: 0, duration: 350, useNativeDriver: true }).start(() => {
        onFadeComplete();
      });
    }
  }, [fadeOut]);

  return (
    <Animated.View style={[styles.splashContainer, { opacity: exitOpacity }]}>
      <Animated.Text
        style={[
          styles.splashText,
          fontsLoaded && { fontFamily: 'Rajdhani_700Bold' },
          { opacity: opacityAnim, transform: [{ scale: scaleAnim }] },
        ]}
      >
        ZONY
      </Animated.Text>
    </Animated.View>
  );
}

export default Sentry.wrap(function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [fontsLoaded] = useFonts({ Rajdhani_700Bold });
  const [forceShow, setForceShow] = useState(true);
  const [splashDone, setSplashDone] = useState(false);

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

  const showSplash = !ready || forceShow;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
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
      {(!splashDone) && (
        <View style={StyleSheet.absoluteFill} pointerEvents={showSplash ? 'auto' : 'none'}>
          <SplashLoading
            fontsLoaded={fontsLoaded}
            fadeOut={!showSplash}
            onFadeComplete={() => setSplashDone(true)}
          />
        </View>
      )}
    </GestureHandlerRootView>
  );
});

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