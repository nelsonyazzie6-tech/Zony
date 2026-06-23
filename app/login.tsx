import { Rajdhani_700Bold, useFonts } from '@expo-google-fonts/rajdhani';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword, OAuthProvider, sendPasswordResetEmail, signInWithCredential, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useState } from 'react';
import {
  Image, Keyboard, KeyboardAvoidingView, Platform, StyleSheet, Text,
  TextInput, TouchableOpacity, TouchableWithoutFeedback, View
} from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { auth, db } from '../firebaseConfig';

function EmailIcon() {
  return (
    <Svg width={18} height={18} viewBox="-1 0 22 20" fill="none" style={{ marginRight: 10 }}>
      <Path d="M3 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <Path d="M2 7l8 5 8-5" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
  );
}

function LockIcon() {
  return (
    <Svg width={18} height={18} viewBox="-1 0 22 22" fill="none" style={{ marginRight: 10 }}>
      <Path d="M4 9h12v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9Z" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <Path d="M7 9V7a3 3 0 0 1 6 0v2" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <Path d="M10 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" fill="#999"/>
      <Path d="M10 13v2" stroke="#999" strokeWidth="2" strokeLinecap="round"/>
    </Svg>
  );
}

function UserIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 18 18" fill="none" style={{ marginRight: 10 }}>
      <Path d="M9 9a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="#999" strokeWidth="1.4"/>
      <Path d="M1 17c0-4 3.6-7 8-7s8 3 8 7" stroke="#999" strokeWidth="1.4" strokeLinecap="round"/>
    </Svg>
  );
}

function WarningIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#cc2222" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8 }}>
      <Path d="m12 2 10 18H2L12 2z" />
      <Line x1="12" y1="9" x2="12" y2="13" />
      <Line x1="12" y1="17" x2="12" y2="17" />
    </Svg>
  );
}

function CheckIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#006060" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8 }}>
      <Circle cx="12" cy="12" r="10" />
      <Path d="m8 12 3 3 5-6" />
    </Svg>
  );
}

function getAuthErrorMessage(code: string): string {
  switch (code) {
    case 'auth/invalid-email':
      return 'That email address doesn\'t look right. Double-check and try again.';
    case 'auth/user-not-found':
    case 'auth/invalid-credential':
      return 'No account found with that email and password.';
    case 'auth/wrong-password':
      return 'Incorrect password. Try again or use "Forgot password?" below.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Try logging in instead.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.';
    case 'auth/network-request-failed':
      return 'No internet connection. Check your network and try again.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const router = useRouter();
  const [fontsLoaded] = useFonts({ Rajdhani_700Bold });

  const handleSubmit = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    if (!email || !password) {
      setErrorMsg('Please enter your email and password.');
      return;
    }
    if (isSignUp && (!firstName.trim() || !lastName.trim())) {
      setErrorMsg('Please enter your first and last name.');
      return;
    }
    setLoading(true);
    try {
      if (isSignUp) {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        const fullName = `${firstName.trim()} ${lastName.trim()}`;
        await setDoc(doc(db, 'users', cred.user.uid), {
          username: fullName,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: cred.user.email,
          createdAt: new Date(),
        });
        router.replace('/onboarding');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        router.replace('/');
      }
    } catch (e: any) {
      setErrorMsg(getAuthErrorMessage(e.code));
    }
    setLoading(false);
  };

  const handleForgotPassword = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    if (!email.trim()) {
      setErrorMsg('Enter your email address above, then tap "Forgot password?"');
      return;
    }
    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSuccessMsg(`Reset link sent to ${email.trim()}. Check your inbox.`);
    } catch (e: any) {
      setErrorMsg(getAuthErrorMessage(e.code));
    }
    setResetLoading(false);
  };

  const handleAppleSignIn = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const provider = new OAuthProvider('apple.com');
      const authCredential = provider.credential({
        idToken: credential.identityToken!,
      });

      const userCred = await signInWithCredential(auth, authCredential);

      const userDocRef = doc(db, 'users', userCred.user.uid);
      const existingDoc = await getDoc(userDocRef);
      const isNewUser = !existingDoc.exists();

      const username = credential.fullName?.givenName
        ? `${credential.fullName.givenName} ${credential.fullName.lastName || ''}`.trim()
        : (userCred.user.email?.split('@')[0] || 'Player');

      await setDoc(userDocRef, {
        username,
        email: userCred.user.email,
        createdAt: new Date(),
      }, { merge: true });

      router.replace(isNewUser ? '/onboarding' : '/');
    } catch (e: any) {
      if (e.code !== 'ERR_REQUEST_CANCELED') {
        setErrorMsg('Apple sign-in failed. Please try again.');
      }
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{ flex: 1 }}>
          <View style={styles.top}>
            <Image source={require('../assets/images/icon.png')} style={styles.logoBox} resizeMode="cover" />
            <Text style={[styles.appName, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>ZONY</Text>
            <Text style={styles.slogan}>Your game starts here</Text>
          </View>

          <View style={styles.form}>
            {isSignUp && (
              <View style={styles.nameRow}>
                <View style={styles.nameField}>
                  <Text style={styles.fieldLabel}>FIRST NAME</Text>
                  <View style={styles.inputRow}>
                    <UserIcon />
                    <TextInput style={styles.input} placeholder="First" placeholderTextColor="#bbb" value={firstName} onChangeText={t => { setFirstName(t); setErrorMsg(''); }} autoCapitalize="words" />
                  </View>
                </View>
                <View style={styles.nameField}>
                  <Text style={styles.fieldLabel}>LAST NAME</Text>
                  <View style={styles.inputRow}>
                    <UserIcon />
                    <TextInput style={styles.input} placeholder="Last" placeholderTextColor="#bbb" value={lastName} onChangeText={t => { setLastName(t); setErrorMsg(''); }} autoCapitalize="words" />
                  </View>
                </View>
              </View>
            )}

            <View>
              <Text style={styles.fieldLabel}>EMAIL</Text>
              <View style={styles.inputRow}>
                <EmailIcon />
                <TextInput style={styles.input} placeholder="zony@email.com" placeholderTextColor="#bbb" value={email} onChangeText={t => { setEmail(t); setErrorMsg(''); setSuccessMsg(''); }} autoCapitalize="none" keyboardType="email-address" />
              </View>
            </View>

            <View>
              <Text style={styles.fieldLabel}>PASSWORD</Text>
              <View style={styles.inputRow}>
                <LockIcon />
                <TextInput style={styles.input} placeholder="••••••••" placeholderTextColor="#bbb" value={password} onChangeText={t => { setPassword(t); setErrorMsg(''); }} secureTextEntry />
              </View>
            </View>

            {errorMsg ? (
              <View style={styles.errorBox}>
                <View style={styles.messageRow}>
                  <WarningIcon />
                  <Text style={styles.errorText}>{errorMsg}</Text>
                </View>
              </View>
            ) : null}

            {successMsg ? (
              <View style={styles.successBox}>
                <View style={styles.messageRow}>
                  <CheckIcon />
                  <Text style={styles.successText}>{successMsg}</Text>
                </View>
              </View>
            ) : null}

            {!isSignUp && (
              <TouchableOpacity style={styles.forgotRow} onPress={handleForgotPassword} disabled={resetLoading}>
                <Text style={styles.forgotText}>{resetLoading ? 'Sending...' : 'Forgot password?'}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.signInBtn} onPress={handleSubmit} disabled={loading}>
              <Text style={styles.signInBtnText}>
                {loading ? 'Please wait...' : isSignUp ? 'Sign Up' : 'Sign In'}
              </Text>
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.socialRow}>
              {Platform.OS === 'ios' && (
                <TouchableOpacity style={styles.socialBtn} onPress={handleAppleSignIn}>
                  <Svg width={18} height={18} viewBox="0 0 384 512" style={{ marginRight: 8 }}>
                    <Path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1-2 49.9-15.4 69.5-34.3z" fill="#111"/>
                  </Svg>
                  <Text style={styles.socialBtnText}>Apple</Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity style={styles.signupRow} onPress={() => { setIsSignUp(!isSignUp); setFirstName(''); setLastName(''); setErrorMsg(''); setSuccessMsg(''); }}>
              <Text style={styles.bottomText}>
                {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
                <Text style={styles.bottomLink}>{isSignUp ? 'Log in' : 'Sign up'}</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0E8', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  top: { alignItems: 'center', marginBottom: 28 },
  logoBox: { width: 96, height: 96, borderRadius: 24, shadowColor: '#8B1A1A', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8, marginBottom: 16, overflow: 'hidden' },
  appName: { fontSize: 48, fontWeight: '900', color: '#111', letterSpacing: 4, marginBottom: 6 },
  slogan: { fontSize: 14, color: '#999' },
  form: { width: '100%', gap: 8 },
  nameRow: { flexDirection: 'row', gap: 10 },
  nameField: { flex: 1 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: '#888', letterSpacing: 1, marginBottom: 6, marginTop: 4 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, borderWidth: 1, borderColor: '#e8e8e8', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1, marginBottom: 4 },
  input: { flex: 1, fontSize: 15, color: '#003333' },
  messageRow: { flexDirection: 'row', alignItems: 'center' },
  errorBox: { backgroundColor: '#fff0f0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: '#fecaca', marginTop: 2, marginBottom: 2 },
  errorText: { flex: 1, fontSize: 13, color: '#cc2222', fontWeight: '600', lineHeight: 18 },
  successBox: { backgroundColor: '#e0f5f5', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: '#a0d8d8', marginTop: 2, marginBottom: 2 },
  successText: { flex: 1, fontSize: 13, color: '#006060', fontWeight: '600', lineHeight: 18 },
  forgotRow: { alignItems: 'flex-end', marginBottom: 4 },
  forgotText: { fontSize: 12, color: '#008080', fontWeight: '600' },
  signInBtn: { backgroundColor: '#008080', borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 8, shadowColor: '#008080', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4 },
  signInBtnText: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e0e0e0' },
  dividerText: { marginHorizontal: 10, fontSize: 12, color: '#aaa', fontWeight: '500' },
  socialRow: { flexDirection: 'row', gap: 12 },
  socialBtn: { flex: 1, flexDirection: 'row', backgroundColor: '#fff', borderRadius: 14, paddingVertical: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e8e8e8', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  socialBtnText: { fontSize: 14, fontWeight: '600', color: '#333' },
  signupRow: { alignItems: 'center', marginTop: 8 },
  bottomText: { fontSize: 14, color: '#aaa' },
  bottomLink: { color: '#8B1A1A', fontWeight: '700' },
});