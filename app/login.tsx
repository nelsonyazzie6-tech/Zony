import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth } from '../firebaseConfig';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const router = useRouter();

  const handleSubmit = async () => {
    if (!email || !password) return;
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      router.replace('/');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Zony</Text>
      <Text style={styles.sub}>{isSignUp ? 'Create an account' : 'Welcome back'}</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#a89080"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#a89080"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity style={styles.btn} onPress={handleSubmit}>
        <Text style={styles.btnText}>{isSignUp ? 'Sign Up' : 'Log In'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
        <Text style={styles.toggle}>
          {isSignUp ? 'Already have an account? Log in' : "Don't have an account? Sign up"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5ede0', justifyContent: 'center', padding: 32 },
  header: { fontSize: 40, fontWeight: 'bold', color: '#1a0f0a', marginBottom: 4 },
  sub: { fontSize: 18, color: '#7a4a2a', marginBottom: 32 },
  input: { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: '#1a0f0a', marginBottom: 16 },
  btn: { backgroundColor: '#e8622a', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginBottom: 16 },
  btnText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  toggle: { color: '#7a4a2a', textAlign: 'center', fontSize: 14 },
});