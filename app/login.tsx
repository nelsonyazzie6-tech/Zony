import { Rajdhani_700Bold, useFonts } from '@expo-google-fonts/rajdhani';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword, GoogleAuthProvider, OAuthProvider, sendPasswordResetEmail, signInWithCredential, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useState } from 'react';
import {
  KeyboardAvoidingView, Platform, StyleSheet, Text,
  TextInput, TouchableOpacity, View
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { auth, db } from '../firebaseConfig';

GoogleSignin.configure({
  webClientId: '295900317104-6issabib0tcbp5ktf3tdpegi5mifs6or.apps.googleusercontent.com',
  iosClientId: '295900317104-dk7n2cq2obdc9a2v37p1p6ih61pj9fha.apps.googleusercontent.com',
});

function TrophyIcon() {
  return (
    <Svg width={52} height={52} viewBox="0 0 36 36" fill="none">
      <Path d="M10 6h16v16a8 8 0 0 1-16 0V6Z" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
      <Path d="M10 11H6a4 4 0 0 0 0 8h4M26 11h4a4 4 0 0 1 0 8h-4" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      <Path d="M18 28v4M14 34h8" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    </Svg>
  );
}

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
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      router.replace('/');
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
      const username = credential.fullName?.givenName
        ? `${credential.fullName.givenName} ${credential.fullName.lastName || ''}`.trim()
        : (userCred.user.email?.split('@')[0] || 'Player');

      await setDoc(userDocRef, {
        username,
        email: userCred.user.email,
        createdAt: new Date(),
      }, { merge: true });

      router.replace('/');
    } catch (e: any) {
      if (e.code === 'ERR_REQUEST_CANCELED') {
        // user canceled, do nothing
      } else {
        console.log(e);
        setErrorMsg('Apple sign-in failed. Please try again.');
      }
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.data?.idToken;
      if (!idToken) throw new Error('No ID token returned');

      const credential = GoogleAuthProvider.credential(idToken);
      const userCred = await signInWithCredential(auth, credential);

      const userDocRef = doc(db, 'users', userCred.user.uid);
      const username = userCred.user.displayName || userCred.user.email?.split('@')[0] || 'Player';

      await setDoc(userDocRef, {
        username,
        email: userCred.user.email,
        createdAt: new Date(),
      }, { merge: true });

      router.replace('/');
    } catch (e: any) {
      if (e.code === 'SIGN_IN_CANCELLED' || e.code === '-5') {
        // user canceled
      } else {
        console.log(e);
        setErrorMsg('Google sign-in failed. Please try again.');
      }
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.top}>
        <View style={styles.logoBox}>
          <TrophyIcon />
        </View>
        <Text style={[styles.appName, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>
          ZONY
        </Text>
        <Text style={styles.slogan}>Your game starts here</Text>
      </View>

      <View style={styles.form}>
        {isSignUp && (
          <View style={styles.nameRow}>
            <View style={styles.nameField}>
              <Text style={styles.fieldLabel}>FIRST NAME</Text>
              <View style={styles.inputRow}>
                <UserIcon />
                <TextInput
                  style={styles.input}
                  placeholder="First"
                  placeholderTextColor="#bbb"
                  value={firstName}
                  onChangeText={t => { setFirstName(t); setErrorMsg(''); }}
                  autoCapitalize="words"
                />
              </View>
            </View>
            <View style={styles.nameField}>
              <Text style={styles.fieldLabel}>LAST NAME</Text>
              <View style={styles.inputRow}>
                <UserIcon />
                <TextInput
                  style={styles.input}
                  placeholder="Last"
                  placeholderTextColor="#bbb"
                  value={lastName}
                  onChangeText={t => { setLastName(t); setErrorMsg(''); }}
                  autoCapitalize="words"
                />
              </View>
            </View>
          </View>
        )}

        <View>
          <Text style={styles.fieldLabel}>EMAIL</Text>
          <View style={styles.inputRow}>
            <EmailIcon />
            <TextInput
              style={styles.input}
              placeholder="jordan@email.com"
              placeholderTextColor="#bbb"
              value={email}
              onChangeText={t => { setEmail(t); setErrorMsg(''); setSuccessMsg(''); }}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>
        </View>

        <View>
          <Text style={styles.fieldLabel}>PASSWORD</Text>
          <View style={styles.inputRow}>
            <LockIcon />
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#bbb"
              value={password}
              onChangeText={t => { setPassword(t); setErrorMsg(''); }}
              secureTextEntry
            />
          </View>
        </View>

        {errorMsg ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️  {errorMsg}</Text>
          </View>
        ) : null}

        {successMsg ? (
          <View style={styles.successBox}>
            <Text style={styles.successText}>✓  {successMsg}</Text>
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
          <TouchableOpacity style={styles.socialBtn} onPress={handleGoogleSignIn}>
            <Svg width={18} height={18} viewBox="0 0 18 18" style={{ marginRight: 8 }}>
              <Path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
              <Path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
              <Path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332Z" fill="#FBBC05"/>
              <Path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
            </Svg>
            <Text style={styles.socialBtnText}>Google</Text>
          </TouchableOpacity>
          {Platform.OS === 'ios' && (
            <TouchableOpacity style={styles.socialBtn} onPress={handleAppleSignIn}>
              <Svg width={18} height={18} viewBox="0 0 18 18" style={{ marginRight: 8 }}>
                <Path d="M9 0C4.029 0 0 4.029 0 9c0 3.982 2.579 7.356 6.155 8.555.45.083.615-.195.615-.433 0-.214-.008-.779-.012-1.529-2.504.543-3.033-1.207-3.033-1.207-.409-1.04-1-1.317-1-1.317-.817-.559.062-.547.062-.547.903.063 1.379.928 1.379.928.803 1.376 2.107.979 2.62.748.082-.581.314-.979.572-1.204-2-.227-4.103-1-4.103-4.455 0-.984.351-1.788.928-2.418-.093-.228-.402-1.144.088-2.384 0 0 .757-.242 2.479.924A8.641 8.641 0 0 1 9 4.128c.766.003 1.537.104 2.257.303 1.72-1.166 2.477-.924 2.477-.924.491 1.24.182 2.156.09 2.384.578.63.926 1.434.926 2.418 0 3.464-2.107 4.226-4.115 4.449.323.279.612.829.612 1.671 0 1.206-.011 2.179-.011 2.476 0 .241.162.521.619.433C15.424 16.353 18 12.981 18 9c0-4.971-4.029-9-9-9Z" fill="#111"/>
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

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F0E8',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  top: { alignItems: 'center', marginBottom: 28 },
  logoBox: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: '#008080',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#008080',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    marginBottom: 16,
  },
  appName: {
    fontSize: 48,
    fontWeight: '900',
    color: '#111',
    letterSpacing: 4,
    marginBottom: 6,
  },
  slogan: { fontSize: 14, color: '#999' },
  form: { width: '100%', gap: 8 },
  nameRow: { flexDirection: 'row', gap: 10 },
  nameField: { flex: 1 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#888',
    letterSpacing: 1,
    marginBottom: 6,
    marginTop: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: '#e8e8e8',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
    marginBottom: 4,
  },
  input: { flex: 1, fontSize: 15, color: '#003333' },
  errorBox: {
    backgroundColor: '#fff0f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
    marginTop: 2,
    marginBottom: 2,
  },
  errorText: {
    fontSize: 13,
    color: '#cc2222',
    fontWeight: '600',
    lineHeight: 18,
  },
  successBox: {
    backgroundColor: '#e0f5f5',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#a0d8d8',
    marginTop: 2,
    marginBottom: 2,
  },
  successText: {
    fontSize: 13,
    color: '#006060',
    fontWeight: '600',
    lineHeight: 18,
  },
  forgotRow: { alignItems: 'flex-end', marginBottom: 4 },
  forgotText: { fontSize: 12, color: '#008080', fontWeight: '600' },
  signInBtn: {
    backgroundColor: '#8B1A1A',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#8B1A1A',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  signInBtnText: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e0e0e0' },
  dividerText: { marginHorizontal: 10, fontSize: 12, color: '#aaa', fontWeight: '500' },
  socialRow: { flexDirection: 'row', gap: 12 },
  socialBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e8e8e8',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  socialBtnText: { fontSize: 14, fontWeight: '600', color: '#333' },
  signupRow: { alignItems: 'center', marginTop: 8 },
  bottomText: { fontSize: 14, color: '#aaa' },
  bottomLink: { color: '#8B1A1A', fontWeight: '700' },
});