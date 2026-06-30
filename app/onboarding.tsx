import { Rajdhani_700Bold, useFonts } from '@expo-google-fonts/rajdhani';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

type IconProps = { size?: number; color?: string };

function TrophyIcon({ size = 56, color = '#008080' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M8 21h8" />
      <Path d="M12 17v4" />
      <Path d="M7 4h10v5a5 5 0 0 1-10 0z" />
      <Path d="M17 5h3a2 2 0 0 1-2 4h-1" />
      <Path d="M7 5H4a2 2 0 0 0 2 4h1" />
    </Svg>
  );
}

function PeopleIcon({ size = 56, color = '#7A1E1E' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <Circle cx="9" cy="7" r="4" />
      <Path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <Path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </Svg>
  );
}

function MessageIcon({ size = 56, color = '#B8860B' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </Svg>
  );
}

function ZonyMarkIcon({ size = 64, color = '#008080' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="12" cy="12" r="9" />
      <Path d="M8.5 8.5h7l-7 7h7" />
    </Svg>
  );
}

type Slide = {
  key: string;
  Icon: (props: IconProps) => JSX.Element;
  color: string;
  title: string;
  body: string;
};

const slides: Slide[] = [
  {
    key: 'welcome',
    Icon: ZonyMarkIcon,
    color: '#008080',
    title: 'WELCOME TO ZONY',
    body: 'Your home for sports tournaments and community in the Four Corners. Here\'s a quick look at what you can do.',
  },
  {
    key: 'tournaments',
    Icon: TrophyIcon,
    color: '#008080',
    title: 'FIND & JOIN TOURNAMENTS',
    body: 'Browse tournaments near you, register your team in seconds, and join a waitlist if a division fills up. You\'ll be added automatically if a spot opens.',
  },
  {
    key: 'board',
    Icon: PeopleIcon,
    color: '#7A1E1E',
    title: 'SPORTS BOARD',
    body: 'Looking for a team, or need one more player before a tournament? Post on the Sports Board and connect with players nearby.',
  },
  {
    key: 'community',
    Icon: MessageIcon,
    color: '#B8860B',
    title: 'COMMUNITY & MESSAGES',
    body: 'Buy, sell, and ask questions in Community, and message organizers or other players directly when you need to coordinate.',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [fontsLoaded] = useFonts({ Rajdhani_700Bold });
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const finishOnboarding = () => {
    router.replace('/');
  };

  const goToSlide = (index: number) => {
    scrollRef.current?.scrollTo({ x: index * width, animated: true });
    setActiveIndex(index);
  };

  const handleScrollEnd = (e: any) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    setActiveIndex(index);
  };

  const isLastSlide = activeIndex === slides.length - 1;

  return (
    <View style={styles.container}>
      <View style={styles.skipRow}>
        <TouchableOpacity onPress={finishOnboarding} style={styles.skipBtn}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        scrollEventThrottle={16}
        // Re-sync scroll position if the window resizes mid-onboarding
        // (e.g. Split View resize, Stage Manager, rotation)
        key={width}
      >
        {slides.map((slide) => (
          <View key={slide.key} style={[styles.slide, { width }]}>
            <View style={[styles.iconCircle, { backgroundColor: `${slide.color}15`, borderColor: `${slide.color}40` }]}>
              <slide.Icon size={56} color={slide.color} />
            </View>
            <Text style={[styles.title, { color: slide.color }, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>
              {slide.title}
            </Text>
            <Text style={styles.body}>{slide.body}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.dotsRow}>
        {slides.map((slide, i) => (
          <TouchableOpacity key={slide.key} onPress={() => goToSlide(i)} style={styles.dotTouchTarget}>
            <View
              style={[
                styles.dot,
                i === activeIndex && [styles.dotActive, { backgroundColor: slide.color }],
              ]}
            />
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.nextBtn, { backgroundColor: slides[activeIndex].color }]}
        onPress={() => (isLastSlide ? finishOnboarding() : goToSlide(activeIndex + 1))}
      >
        <Text style={[styles.nextBtnText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>
          {isLastSlide ? "LET'S GO" : 'NEXT'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5ede0' },
  skipRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 60, paddingHorizontal: 24 },
  skipBtn: { paddingVertical: 8, paddingHorizontal: 12 },
  skipText: { fontSize: 15, color: '#5a7a7a', fontWeight: '600' },
  slide: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36 },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  title: { fontSize: 24, letterSpacing: 1.5, textAlign: 'center', marginBottom: 16 },
  body: { fontSize: 16, color: '#555', textAlign: 'center', lineHeight: 24, maxWidth: 320 },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  dotTouchTarget: { padding: 10 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#d8cdb8' },
  dotActive: { width: 20 },
  nextBtn: { marginHorizontal: 24, marginBottom: 48, borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  nextBtnText: { color: '#fff', fontSize: 18, letterSpacing: 1 },
});