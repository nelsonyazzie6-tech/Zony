import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../firebaseConfig';

function SportsBackground() {
  const items = [
    { emoji: '🏀', top: 60, left: 20, size: 40, opacity: 0.12, rotate: '-15deg' },
    { emoji: '🏐', top: 120, left: 300, size: 36, opacity: 0.10, rotate: '10deg' },
    { emoji: '🥎', top: 240, left: 340, size: 32, opacity: 0.10, rotate: '20deg' },
    { emoji: '🏏', top: 320, left: 10, size: 38, opacity: 0.09, rotate: '-30deg' },
    { emoji: '🏀', top: 480, left: 330, size: 44, opacity: 0.08, rotate: '5deg' },
    { emoji: '🥎', top: 560, left: 30, size: 34, opacity: 0.10, rotate: '-10deg' },
    { emoji: '🏐', top: 650, left: 280, size: 40, opacity: 0.09, rotate: '25deg' },
    { emoji: '🏀', top: 720, left: 60, size: 30, opacity: 0.08, rotate: '15deg' },
    { emoji: '🥎', top: 780, left: 320, size: 36, opacity: 0.09, rotate: '-20deg' },
  ];

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {items.map((item, i) => (
        <Text
          key={i}
          style={{
            position: 'absolute',
            top: item.top,
            left: item.left,
            fontSize: item.size,
            opacity: item.opacity,
            transform: [{ rotate: item.rotate }],
          }}
        >
          {item.emoji}
        </Text>
      ))}
    </View>
  );
}

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async () => {
    if (!email || !password) return;
    if (isSignUp && !username.trim()) {
      Alert.alert('Missing info', 'Please enter a username.');
      return;
    }
    setLoading(true);
    try {
      if (isSignUp) {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, 'users', cred.user.uid), {
          username: username.trim(),
          email: cred.user.email,
          createdAt: new Date(),
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      router.replace('/');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SportsBackground />

      <View style={styles.top}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoLetter}>Z</Text>
        </View>
        <Text style={styles.slogan}>Your game. Your zone.</Text>
      </View>

      <View style={styles.form}>
        {isSignUp && (
          <TextInput
            style={styles.input}
            placeholder="Username"
            placeholderTextColor="#999"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
        )}
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#999"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#999"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity style={styles.loginBtn} onPress={handleSubmit} disabled={loading}>
          <Text style={styles.loginBtnText}>{loading ? 'Please wait...' : isSignUp ? 'Sign Up' : 'Log In'}</Text>
        </TouchableOpacity>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity style={styles.createBtn} onPress={() => { setIsSignUp(!isSignUp); setUsername(''); }}>
          <Text style={styles.createBtnText}>
            {isSignUp ? 'Already have an account? Log in' : 'Create new account'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottom}>
        <Text style={styles.bottomText}>yaz</Text>
      </View>

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5ede0', justifyContent: 'space-between', paddingVertical: 60, paddingHorizontal: 32 },
  top: { alignItems: 'center', marginTop: 40 },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#008080',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#008080',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  logoLetter: { fontSize: 48, fontWeight: 'bold', color: '#fff', fontStyle: 'italic' },
  slogan: { fontSize: 15, color: '#5a7a7a', marginTop: 14, fontStyle: 'italic' },
  form: { width: '100%' },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#003333',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  loginBtn: {
    backgroundColor: '#008080',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 4,
  },
  loginBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e0e0e0' },
  dividerText: { marginHorizontal: 12, fontSize: 13, color: '#999', fontWeight: '600' },
  createBtn: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#008080',
  },
  createBtnText: { color: '#008080', fontSize: 15, fontWeight: '600' },
  bottom: { alignItems: 'center', marginBottom: 20 },
  bottomText: { fontSize: 13, color: '#999', fontWeight: '500' },
});