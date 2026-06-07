import { useRouter } from 'expo-router';
import { collection, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { db } from '../../firebaseConfig';

const sports = ['All', 'Basketball', 'Soccer', 'Volleyball', 'Football'];

export default function HomeScreen() {
  const [sport, setSport] = useState('All');
  const [search, setSearch] = useState('');
  const [tournaments, setTournaments] = useState([]);
  const router = useRouter();

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'tournaments'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTournaments(data);
    });
    return () => unsub();
  }, []);

  const filtered = tournaments
    .filter(t => sport === 'All' || t.sport === sport)
    .filter(t =>
      t.name?.toLowerCase().includes(search.toLowerCase()) ||
      t.location?.toLowerCase().includes(search.toLowerCase())
    );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Zony</Text>
      <Text style={styles.sub}>Tournaments near you</Text>

      <TextInput
        style={styles.search}
        placeholder="Search by name or city..."
        placeholderTextColor="#a89080"
        value={search}
        onChangeText={setSearch}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ paddingHorizontal: 20 }}>
        {sports.map((s) => (
          <TouchableOpacity key={s} onPress={() => setSport(s)} style={[styles.filterBtn, sport === s && styles.filterActive]}>
            <Text style={[styles.filterText, sport === s && styles.filterTextActive]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.list}>
        {filtered.length === 0 ? (
          <Text style={styles.empty}>No tournaments found.</Text>
        ) : (
          filtered.map((t) => (
            <TouchableOpacity
              key={t.id}
              style={styles.card}
              onPress={() => router.push({ pathname: '/tournament', params: { id: t.id, name: t.name, sport: t.sport, date: t.date, location: t.location, spots: t.spots } })}
            >
              <View style={styles.cardTop}>
                <Text style={styles.name}>{t.name}</Text>
                <Text style={styles.sportBadge}>{t.sport}</Text>
              </View>
              <Text style={styles.detail}>📅 {t.date} · 📍 {t.location}</Text>
              <Text style={styles.spots}>{t.spots} spots left</Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5ede0', paddingTop: 60 },
  header: { fontSize: 36, fontWeight: 'bold', color: '#1a0f0a', paddingHorizontal: 20 },
  sub: { fontSize: 16, color: '#7a4a2a', paddingHorizontal: 20, marginBottom: 12 },
  search: { marginHorizontal: 20, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: '#1a0f0a', marginBottom: 12 },
  filterRow: { marginBottom: 16 },
  filterBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', marginRight: 8 },
  filterActive: { backgroundColor: '#e8622a' },
  filterText: { fontSize: 14, color: '#7a4a2a' },
  filterTextActive: { color: '#fff', fontWeight: 'bold' },
  list: { paddingHorizontal: 20 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  name: { fontSize: 16, fontWeight: 'bold', color: '#1a0f0a', flex: 1 },
  sportBadge: { fontSize: 13, color: '#fff', backgroundColor: '#e8622a', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, overflow: 'hidden' },
  detail: { fontSize: 14, color: '#7a4a2a', marginBottom: 4 },
  spots: { fontSize: 13, color: '#e8622a', fontWeight: '600' },
  empty: { textAlign: 'center', color: '#a89080', marginTop: 40, fontSize: 15 },
});