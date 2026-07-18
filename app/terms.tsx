import { Rajdhani_700Bold, useFonts } from '@expo-google-fonts/rajdhani';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useState } from 'react';
import {
  ActivityIndicator, Linking, ScrollView, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native';
import { auth, db } from '../firebaseConfig';

const ALL_SPORTS = ['Basketball', 'Volleyball', 'Softball'];

const RULES = [
  {
    title: 'No Objectionable Content',
    body: 'Do not post content that is hateful, violent, discriminatory, sexually explicit, or otherwise offensive. This includes posts, comments, profile information, and team names.',
  },
  {
    title: 'No Harassment or Abuse',
    body: 'Treat every member of the Zony community with respect. Harassment, threats, bullying, or targeted abuse of any user will result in immediate removal.',
  },
  {
    title: 'No Spam or Scams',
    body: 'Do not post spam, misleading listings, fake tournaments, or fraudulent content of any kind.',
  },
  {
    title: 'Accurate Information',
    body: 'Tournament organizers are responsible for keeping their listings accurate and up to date. Posting false or misleading event information is a violation of these terms.',
  },
  {
    title: 'Content Moderation',
    body: 'Zony reserves the right to remove any content and suspend or permanently ban any user who violates these terms. Reports are reviewed within 24 hours.',
  },
  {
    title: 'Your Responsibility',
    body: 'By using Zony, you take responsibility for the content you post and the way you interact with other users. You must be 13 years of age or older to use this app.',
  },
];

export default function TermsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }>();
  const [fontsLoaded] = useFonts({ Rajdhani_700Bold });
  const [agreeing, setAgreeing] = useState(false);

  const handleAgree = async () => {
    setAgreeing(true);
    try {
      const { createUserWithEmailAndPassword } = await import('firebase/auth');
      const cred = await createUserWithEmailAndPassword(auth, params.email, params.password);
      const fullName = `${params.firstName.trim()} ${params.lastName.trim()}`;
      await setDoc(doc(db, 'users', cred.user.uid), {
        username: fullName,
        firstName: params.firstName.trim(),
        lastName: params.lastName.trim(),
        email: cred.user.email,
        createdAt: new Date(),
        agreedToTerms: true,
        agreedToTermsAt: new Date(),
        // Notifications on by default for all sports/activity — users can
        // narrow this down in Settings later. Explicit rather than relying
        // on the "missing field = notify all" fallback in post.tsx.
        notificationsEnabled: true,
        preferredSports: ALL_SPORTS,
      });
      router.replace('/onboarding');
    } catch (e: any) {
      // If account creation fails here, go back to login with error
      router.replace({ pathname: '/login', params: { signupError: e.code || 'unknown' } });
    }
    setAgreeing(false);
  };

  const handleDecline = () => {
    router.back();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleDecline} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>
          COMMUNITY RULES
        </Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.intro, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>
          BEFORE YOU JOIN
        </Text>
        <Text style={styles.introBody}>
          Zony is a sports tournament and community platform. To keep it a safe and positive space for everyone, all users must agree to these community rules before creating an account.
        </Text>

        {RULES.map((rule, i) => (
          <View key={i} style={styles.ruleCard}>
            <View style={styles.ruleNumberWrap}>
              <Text style={[styles.ruleNumber, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>
                {i + 1}
              </Text>
            </View>
            <View style={styles.ruleContent}>
              <Text style={[styles.ruleTitle, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>
                {rule.title}
              </Text>
              <Text style={styles.ruleBody}>{rule.body}</Text>
            </View>
          </View>
        ))}

        <View style={styles.legalNote}>
          <Text style={styles.legalText}>
            By tapping "I Agree," you confirm that you have read and agree to Zony's community rules and{' '}
            <Text
              style={styles.legalLink}
              onPress={() => Linking.openURL('https://nelsonyazzie6-tech.github.io/Zony/')}
            >
              Privacy Policy
            </Text>
            . Violations may result in content removal or account suspension without notice.
          </Text>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.agreeBtn}
          onPress={handleAgree}
          disabled={agreeing}
          activeOpacity={0.85}
        >
          {agreeing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={[styles.agreeBtnText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>
              I AGREE — CREATE ACCOUNT
            </Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.declineBtn} onPress={handleDecline} disabled={agreeing}>
          <Text style={styles.declineBtnText}>I Don't Agree</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5ede0' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 60, paddingBottom: 16, paddingHorizontal: 20,
    backgroundColor: '#f5ede0', borderBottomWidth: 1, borderBottomColor: '#e0d8c8',
  },
  backBtn: { width: 60 },
  backText: { fontSize: 16, color: '#008080', fontWeight: '600' },
  headerTitle: { fontSize: 18, color: '#003333', letterSpacing: 1.5 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 24 },
  intro: { fontSize: 22, color: '#003333', letterSpacing: 1.5, marginBottom: 10 },
  introBody: { fontSize: 14, color: '#555', lineHeight: 22, marginBottom: 24 },
  ruleCard: {
    flexDirection: 'row', gap: 14,
    backgroundColor: '#fff', borderRadius: 16,
    padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#e0d8c8',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  ruleNumberWrap: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#008080', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, marginTop: 2,
  },
  ruleNumber: { color: '#fff', fontSize: 15 },
  ruleContent: { flex: 1 },
  ruleTitle: { fontSize: 15, color: '#003333', marginBottom: 6 },
  ruleBody: { fontSize: 13, color: '#555', lineHeight: 20 },
  legalNote: {
    backgroundColor: '#e8f4f4', borderRadius: 12,
    padding: 14, marginTop: 8,
    borderWidth: 1, borderColor: '#b0d8d8',
  },
  legalText: { fontSize: 12, color: '#5a7a7a', lineHeight: 18 },
  legalLink: { color: '#008080', fontWeight: '600', textDecorationLine: 'underline' },
  footer: {
    paddingHorizontal: 20, paddingBottom: 44, paddingTop: 16,
    backgroundColor: '#f5ede0', borderTopWidth: 1, borderTopColor: '#e0d8c8',
  },
  agreeBtn: {
    backgroundColor: '#008080', borderRadius: 16,
    paddingVertical: 16, alignItems: 'center',
    shadowColor: '#008080', shadowOpacity: 0.3, shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 }, elevation: 4,
    marginBottom: 10,
  },
  agreeBtnText: { color: '#fff', fontSize: 16, letterSpacing: 1 },
  declineBtn: { alignItems: 'center', paddingVertical: 10 },
  declineBtnText: { fontSize: 14, color: '#a0b8b8', fontWeight: '500' },
});