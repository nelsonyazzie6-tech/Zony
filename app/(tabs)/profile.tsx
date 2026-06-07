import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>N</Text>
      </View>
      <Text style={styles.name}>Nelson</Text>
      <Text style={styles.sub}>Gallup, NM</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>My Tournaments</Text>
        <Text style={styles.empty}>You haven't joined any tournaments yet.</Text>
      </View>

      <TouchableOpacity style={styles.editBtn}>
        <Text style={styles.editText}>Edit Profile</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5ede0', paddingTop: 60, alignItems: 'center' },
  avatar: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#e8622a', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { fontSize: 40, color: '#fff', fontWeight: 'bold' },
  name: { fontSize: 26, fontWeight: 'bold', color: '#1a0f0a' },
  sub: { fontSize: 16, color: '#7a4a2a', marginBottom: 24 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, width: '90%', marginBottom: 20 },
  cardTitle: { fontSize: 17, fontWeight: 'bold', color: '#1a0f0a', marginBottom: 10 },
  empty: { fontSize: 14, color: '#a89080' },
  editBtn: { backgroundColor: '#e8622a', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 40 },
  editText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});