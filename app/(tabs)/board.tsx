import { useRouter } from 'expo-router';
import { collection, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { db } from '../../firebaseConfig';

export default function BoardScreen() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const router = useRouter();

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'board'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPosts(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filtered = posts.filter(p => filter === 'All' || p.type === filter);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Player Board</Text>
      <Text style={styles.sub}>Find players or teams near you</Text>

      <View style={styles.filterRow}>
        {['All', 'Player looking for team', 'Team looking for players'].map(f => (
          <TouchableOpacity key={f} onPress={() => setFilter(f)} style={[styles.filterBtn, filter === f && styles.filterActive]}>
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'All' ? 'All' : f === 'Player looking for team' ? 'Players' : 'Teams'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#e8622a" style={{ marginTop: 60 }} />
      ) : filtered.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🏀</Text>
          <Text style={styles.emptyTitle}>Nothing posted yet</Text>
          <Text style={styles.emptySub}>Be the first to post on the board.</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={p => p.id}
          contentContainerStyle={styles.list}
          renderItem={({ item: p }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.typeBadge}>{p.type === 'Player looking for team' ? '🙋 Player' : '👥 Team'}</Text>
                <Text style={styles.sport}>{p.sport}</Text>
              </View>
              <Text style={styles.division}>{p.division}</Text>
              <Text style={styles.detail}>📍 {p.city}, {p.state}</Text>
              {p.description ? <Text style={styles.description}>{p.description}</Text> : null}
              {p.contact ? <Text style={styles.contact}>📞 {p.contact}</Text> : null}
            </View>
          )}
        />
      )}

      <TouchableOpacity style={styles.postBtn} onPress={() => router.push('/postboard')}>
        <Text style={styles.postBtnText}>+ Post to Board</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5ede0', paddingTop: 60 },
  header: { fontSize: 36, fontWeight: 'bold', color: '#1a0f0a', textAlign: 'center' },
  sub: { fontSize: 15, color: '#7a4a2a', textAlign: 'center', marginBottom: 16 },
  filterRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 12 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#fff' },
  filterActive: { backgroundColor: '#e8622a' },
  filterText: { fontSize: 13, color: '#7a4a2a' },
  filterTextActive: { color: '#fff', fontWeight: 'bold' },
  list: { paddingHorizontal: 20, paddingTop: 4 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  typeBadge: { fontSize: 13, fontWeight: '600', color: '#e8622a' },
  sport: { fontSize: 13, color: '#fff', backgroundColor: '#e8622a', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, overflow: 'hidden' },
  division: { fontSize: 15, fontWeight: 'bold', color: '#1a0f0a', marginBottom: 6 },
  detail: { fontSize: 14, color: '#7a4a2a', marginBottom: 4 },
  description: { fontSize: 14, color: '#1a0f0a', marginBottom: 4 },
  contact: { fontSize: 13, color: '#2a7a2a', fontWeight: '600', marginTop: 4 },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 50, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#1a0f0a', marginBottom: 8 },
  emptySub: { fontSize: 15, color: '#a89080', textAlign: 'center' },
  postBtn: { position: 'absolute', bottom: 24, alignSelf: 'center', backgroundColor: '#e8622a', borderRadius: 24, paddingVertical: 14, paddingHorizontal: 32, shadowColor: '#e8622a', shadowOpacity: 0.4, shadowRadius: 8, elevation: 8 },
  postBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});