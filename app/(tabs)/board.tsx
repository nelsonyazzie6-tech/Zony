import { useRouter } from 'expo-router';
import { collection, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../../firebaseConfig';

const sports = ['All', 'Basketball', 'Soccer', 'Volleyball', 'Football', 'Baseball', 'Tennis'];

export default function BoardScreen() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('All');
  const [sportFilter, setSportFilter] = useState('All');
  const [search, setSearch] = useState('');
  const router = useRouter();
  const user = auth.currentUser;

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'board'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPosts(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filtered = posts
    .filter(p => typeFilter === 'All' || p.type === typeFilter)
    .filter(p => sportFilter === 'All' || p.sport === sportFilter)
    .filter(p =>
      p.city?.toLowerCase().includes(search.toLowerCase()) ||
      p.state?.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase())
    );

  const handleDelete = (id: string) => {
    Alert.alert('Delete Post', 'Are you sure you want to delete this post?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await deleteDoc(doc(db, 'board', id));
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        }
      }
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Player Board</Text>
      <Text style={styles.sub}>Find players or teams near you</Text>

      <TextInput
        style={styles.search}
        placeholder="Search by city or state..."
        placeholderTextColor="#a0b8b8"
        value={search}
        onChangeText={setSearch}
      />

      <View style={styles.typeRow}>
        {['All', 'Player looking for team', 'Team looking for players'].map(f => (
          <TouchableOpacity key={f} onPress={() => setTypeFilter(f)} style={[styles.typeBtn, typeFilter === f && styles.typeActive]}>
            <Text style={[styles.typeText, typeFilter === f && styles.typeTextActive]}>
              {f === 'All' ? 'All' : f === 'Player looking for team' ? 'Players' : 'Teams'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sportRow} contentContainerStyle={{ paddingHorizontal: 20 }}>
        {sports.map(s => (
          <TouchableOpacity key={s} onPress={() => setSportFilter(s)} style={[styles.sportBtn, sportFilter === s && styles.sportActive]}>
            <Text style={[styles.sportText, sportFilter === s && styles.sportTextActive]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator size="large" color="#008080" style={{ marginTop: 60 }} />
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
                <Text style={styles.sportBadge}>{p.sport}</Text>
              </View>
              <Text style={styles.division}>{p.division}</Text>
              <Text style={styles.detail}>📍 {p.city}, {p.state}</Text>
              {p.description ? <Text style={styles.description}>{p.description}</Text> : null}
              {p.contact ? <Text style={styles.contact}>📞 {p.contact}</Text> : null}
              {user?.uid === p.postedBy && (
                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(p.id)}>
                  <Text style={styles.deleteText}>Delete</Text>
                </TouchableOpacity>
              )}
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
  header: { fontSize: 36, fontWeight: 'bold', color: '#003333', textAlign: 'center' },
  sub: { fontSize: 15, color: '#5a7a7a', textAlign: 'center', marginBottom: 12 },
  search: { marginHorizontal: 20, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: '#003333', marginBottom: 10, borderWidth: 1, borderColor: '#e0f0f0' },
  typeRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 10 },
  typeBtn: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e0f0f0' },
  typeActive: { backgroundColor: '#008080', borderColor: '#008080' },
  typeText: { fontSize: 12, color: '#5a7a7a' },
  typeTextActive: { color: '#fff', fontWeight: 'bold' },
  sportRow: { flexGrow: 0, marginBottom: 8 },
  sportBtn: { paddingHorizontal: 10, paddingVertical: 2, height: 28, borderRadius: 20, backgroundColor: '#fff', marginRight: 6, justifyContent: 'center', borderWidth: 1, borderColor: '#e0f0f0' },
  sportActive: { backgroundColor: '#008080', borderColor: '#008080' },
  sportText: { fontSize: 11, color: '#5a7a7a' },
  sportTextActive: { color: '#fff', fontWeight: 'bold' },
  list: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 80 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#008080', shadowOpacity: 0.08, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: '#e0f5f5' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  typeBadge: { fontSize: 13, fontWeight: '600', color: '#008080' },
  sportBadge: { fontSize: 13, color: '#fff', backgroundColor: '#008080', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, overflow: 'hidden' },
  division: { fontSize: 15, fontWeight: 'bold', color: '#003333', marginBottom: 6 },
  detail: { fontSize: 14, color: '#5a7a7a', marginBottom: 4 },
  description: { fontSize: 14, color: '#003333', marginBottom: 4 },
  contact: { fontSize: 13, color: '#2a7a2a', fontWeight: '600', marginTop: 4 },
  deleteBtn: { marginTop: 10, alignSelf: 'flex-end', backgroundColor: '#cc4444', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 14 },
  deleteText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 50, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#003333', marginBottom: 8 },
  emptySub: { fontSize: 15, color: '#a0b8b8', textAlign: 'center' },
  postBtn: { position: 'absolute', bottom: 24, alignSelf: 'center', backgroundColor: '#008080', borderRadius: 24, paddingVertical: 14, paddingHorizontal: 32, shadowColor: '#008080', shadowOpacity: 0.4, shadowRadius: 8, elevation: 8 },
  postBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});