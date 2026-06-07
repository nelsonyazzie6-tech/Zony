import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function TournamentScreen() {
  const { name, sport, date, location, spots } = useLocalSearchParams();
  const router = useRouter();

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <View style={styles.card}>
        <Text style={styles.sportBadge}>{sport}</Text>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.detail}>📅 {date}</Text>
        <Text style={styles.detail}>📍 {location}</Text>
        <Text style={styles.spots}>{spots} spots left</Text>
      </View>

      <TouchableOpacity style={styles.joinBtn}>
        <Text style={styles.joinText}>Join Tournament</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5ede0', paddingTop: 60 },
  back: { paddingHorizontal: 20, marginBottom: 16 },
  backText: { fontSize: 16, color: '#e8622a', fontWeight: '600' },
  card: { backgroundColor: '#fff', marginHorizontal: 20, borderRadius: 16, padding: 24, marginBottom: 20 },
  sportBadge: { fontSize: 13, color: '#fff', backgroundColor: '#e8622a', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, overflow: 'hidden', alignSelf: 'flex-start', marginBottom: 12 },
  name: { fontSize: 26, fontWeight: 'bold', color: '#1a0f0a', marginBottom: 16 },
  detail: { fontSize: 16, color: '#7a4a2a', marginBottom: 8 },
  spots: { fontSize: 15, color: '#e8622a', fontWeight: '600', marginTop: 8 },
  joinBtn: { backgroundColor: '#e8622a', marginHorizontal: 20, borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  joinText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
});