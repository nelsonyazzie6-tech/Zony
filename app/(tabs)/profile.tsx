import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth } from '../../firebaseConfig';

export default function ProfileScreen() {
  const router = useRouter();
  const user = auth.currentUser;
  const initial = user?.email?.[0].toUpperCase() ?? 'Z';

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace('/login');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initial}</Text>
      </View>
      <Text style={styles.name}>{user?.email}</Text>
      <Text style={styles.sub}>Zony Member</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>My Tournaments</Text>
        <Text style={styles.empty}>You haven't joined any tournaments yet.</Text>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5ede0', paddingTop: 60, alignItems: 'center' },
  avatar: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#e8622a', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { fontSize: 40, color: '#fff', fontWeight: 'bold' },
  name: { fontSize: 18, fontWeight: 'bold', color: '#1a0f0a', marginBottom: 4 },
  sub: { fontSize: 16, color: '#7a4a2a', marginBottom: 24 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, width: '90%', marginBottom: 20 },
  cardTitle: { fontSize: 17, fontWeight: 'bold', color: '#1a0f0a', marginBottom: 10 },
  empty: { fontSize: 14, color: '#a89080' },
  logoutBtn: { backgroundColor: '#1a0f0a', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 40 },
  logoutText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});