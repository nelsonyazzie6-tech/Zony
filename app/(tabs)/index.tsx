import { useRouter } from 'expo-router';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { auth, db } from '../../firebaseConfig';

const sports = ['All', 'Basketball', 'Soccer', 'Volleyball', 'Football', 'Baseball', 'Tennis'];

function BellIcon({ color, hasNew }: { color: string; hasNew: boolean }) {
  return (
    <View>
      <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <Path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M13.73 21a2 2 0 01-3.46 0" stroke={color} strokeWidth="2" strokeLinecap="round" />
      </Svg>
      {hasNew && <View style={styles.bellDot} />}
    </View>
  );
}

export default function HomeScreen() {
  const [sport, setSport] = useState('All');
  const [search, setSearch] = useState('');
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasNewNotifications, setHasNewNotifications] = useState(false);
  const router = useRouter();
  const user = auth.currentUser;

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'tournaments'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTournaments(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'notifications'), where('toUserId', '==', user.uid));
    const unsub = onSnapshot(q, (snap) => {
      setHasNewNotifications(snap.docs.length > 0);
    });
    return () => unsub();
  }, []);

  const filtered = tournaments
    .filter(t => sport === 'All' || t.sport === sport)
    .filter(t =>
      t.name?.toLowerCase().includes(search.toLowerCase()) ||
      t.city?.toLowerCase().includes(search.toLowerCase()) ||
      t.state?.toLowerCase().includes(search.toLowerCase())
    );

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.bellBtn} onPress={() => router.push('/notifications')}>
          <BellIcon color="#e8622a" hasNew={hasNewNotifications} />
        </TouchableOpacity>
        <Text style={styles.header}>Zony</Text>
        <TouchableOpacity style={styles.mapBtn} onPress={() => router.push('/map')}>
          <Text style={styles.mapBtnText}>🗺 Map</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.sub}>Tournaments near you</Text>

      <TextInput
        style={styles.search}
        placeholder="Search by name, city, or state..."
        placeholderTextColor="#a89080"
        value={search}
        onChangeText={setSearch}
      />

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={sports}
        keyExtractor={s => s}
        style={styles.filterRow}
        contentContainerStyle={{ paddingHorizontal: 20 }}
        renderItem={({ item: s }) => (
          <TouchableOpacity onPress={() => setSport(s)} style={[styles.filterBtn, sport === s && styles.filterActive]}>
            <Text style={[styles.filterText, sport === s && styles.filterTextActive]}>{s}</Text>
          </TouchableOpacity>
        )}
      />

      {loading ? (
        <ActivityIndicator size="large" color="#e8622a" style={{ marginTop: 60 }} />
      ) : filtered.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🏆</Text>
          <Text style={styles.emptyTitle}>No tournaments found</Text>
          <Text style={styles.emptySub}>Be the first to post one in your area.</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={t => t.id}
          contentContainerStyle={styles.list}
          renderItem={({ item: t }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push({ pathname: '/tournament', params: { id: t.id, postedBy: t.postedBy } })}
            >
              <View style={styles.cardTop}>
                <Text style={styles.name}>{t.name}</Text>
                <Text style={styles.sportBadge}>{t.sport}</Text>
              </View>
              <Text style={styles.detail}>📅 {t.date}</Text>
              <Text style={styles.detail}>📍 {t.city}, {t.state}</Text>
              {t.entryFee ? <Text style={styles.fee}>💵 {t.entryFee} entry</Text> : null}
              {t.spectatorFee ? <Text style={styles.fee}>🎟 {t.spectatorFee} spectators</Text> : null}
              <Text style={styles.spots}>{t.spots} spots left</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5ede0', paddingTop: 60 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, marginBottom: 4 },
  header: { fontSize: 36, fontWeight: 'bold', color: '#1a0f0a', textAlign: 'center' },
  bellBtn: { position: 'absolute', left: 20 },
  bellDot: { position: 'absolute', top: 0, right: 0, width: 8, height: 8, borderRadius: 4, backgroundColor: '#e8622a' },
  mapBtn: { position: 'absolute', right: 20, backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  mapBtnText: { fontSize: 13, color: '#e8622a', fontWeight: '600' },
  sub: { fontSize: 15, color: '#7a4a2a', textAlign: 'center', marginBottom: 12 },
  search: { marginHorizontal: 20, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: '#1a0f0a', marginBottom: 10 },
  filterRow: { flexGrow: 0, marginBottom: 8 },
  filterBtn: { paddingHorizontal: 10, paddingVertical: 2, height: 28, borderRadius: 20, backgroundColor: '#fff', marginRight: 6, justifyContent: 'center' },
  filterActive: { backgroundColor: '#e8622a' },
  filterText: { fontSize: 11, color: '#7a4a2a' },
  filterTextActive: { color: '#fff', fontWeight: 'bold' },
  list: { paddingHorizontal: 20, paddingTop: 4 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  name: { fontSize: 16, fontWeight: 'bold', color: '#1a0f0a', flex: 1 },
  sportBadge: { fontSize: 12, color: '#fff', backgroundColor: '#e8622a', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, overflow: 'hidden' },
  detail: { fontSize: 14, color: '#7a4a2a', marginBottom: 4 },
  fee: { fontSize: 13, color: '#2a7a2a', fontWeight: '600', marginBottom: 2 },
  spots: { fontSize: 13, color: '#e8622a', fontWeight: '600', marginTop: 4 },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 50, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#1a0f0a', marginBottom: 8 },
  emptySub: { fontSize: 15, color: '#a89080', textAlign: 'center' },
});