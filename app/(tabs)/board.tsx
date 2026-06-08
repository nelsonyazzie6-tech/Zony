import { useRouter } from 'expo-router';
import { collection, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';
import { auth, db } from '../../firebaseConfig';

const sports = ['All', 'Basketball', 'Softball', 'Volleyball'];

function formatPhone(val: string) {
  if (!val) return '';
  const digits = val.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export default function BoardScreen() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('All');
  const [sportFilter, setSportFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [headerHeight, setHeaderHeight] = useState(120);
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
      {/* Header */}
      <View style={styles.headerBlock} onLayout={e => setHeaderHeight(e.nativeEvent.layout.height)}>
        <Svg style={StyleSheet.absoluteFill} width="100%" height={headerHeight} viewBox={`0 0 400 ${headerHeight}`}>
          <Polygon points="0,0 80,0 0,80" fill="#f5ede0" opacity={0.10} />
          <Polygon points="400,0 320,0 400,80" fill="#f5ede0" opacity={0.10} />
          <Polygon points="160,0 240,0 200,60" fill="#f5ede0" opacity={0.08} />
          <Polygon points={`0,${headerHeight} 60,${headerHeight} 0,${headerHeight - 60}`} fill="#7A1E1E" opacity={0.10} />
          <Polygon points={`400,${headerHeight} 340,${headerHeight} 400,${headerHeight - 60}`} fill="#7A1E1E" opacity={0.10} />
        </Svg>
        <Text style={styles.header}>Player Board</Text>
        <Text style={styles.sub}>Find players or teams near you</Text>
      </View>

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
        <ActivityIndicator size="large" color="#7A1E1E" style={{ marginTop: 60 }} />
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
              <View style={styles.cardHeader}>
                <Text style={styles.typeBadge}>{p.type === 'Player looking for team' ? '🙋 Player' : '👥 Team'}</Text>
                <Text style={styles.sportBadge}>{p.sport}</Text>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.division}>{p.division}</Text>
                <Text style={styles.detail}>📍 {p.city}, {p.state}</Text>
                {p.description ? <Text style={styles.description}>{p.description}</Text> : null}
                {p.contact ? <Text style={styles.contact}>📞 {formatPhone(p.contact)}</Text> : null}
                {p.contactPhone ? <Text style={styles.contact}>📞 {formatPhone(p.contactPhone)}</Text> : null}
                {p.contactEmail ? <Text style={styles.contact}>✉️ {p.contactEmail}</Text> : null}
                {user?.uid === p.postedBy && (
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(p.id)}>
                    <Text style={styles.deleteText}>Delete</Text>
                  </TouchableOpacity>
                )}
              </View>
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
  container: { flex: 1, backgroundColor: '#f5ede0' },
  headerBlock: { backgroundColor: '#008080', paddingTop: 60, paddingBottom: 16, paddingHorizontal: 0, marginBottom: 14 },
  header: { fontSize: 32, fontWeight: 'bold', color: '#f5ede0', textAlign: 'center', letterSpacing: 2 },
  sub: { fontSize: 14, color: '#e0f5f5', textAlign: 'center', letterSpacing: 1 },
  search: { marginHorizontal: 20, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: '#003333', marginBottom: 10, borderWidth: 1, borderColor: '#e0d8c8' },
  typeRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 10 },
  typeBtn: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e0d8c8' },
  typeActive: { backgroundColor: '#7A1E1E', borderColor: '#7A1E1E' },
  typeText: { fontSize: 12, color: '#5a7a7a' },
  typeTextActive: { color: '#fff', fontWeight: 'bold' },
  sportRow: { flexGrow: 0, marginBottom: 8 },
  sportBtn: { paddingHorizontal: 10, paddingVertical: 2, height: 28, borderRadius: 20, backgroundColor: '#fff', marginRight: 6, justifyContent: 'center', borderWidth: 1, borderColor: '#e0d8c8' },
  sportActive: { backgroundColor: '#008080', borderColor: '#008080' },
  sportText: { fontSize: 11, color: '#5a7a7a' },
  sportTextActive: { color: '#fff', fontWeight: 'bold' },
  list: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 80 },
  card: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#e0d8c8', elevation: 3, shadowColor: '#003333', shadowOpacity: 0.1, shadowRadius: 8 },
  cardHeader: { backgroundColor: '#008080', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10 },
  cardBody: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 12 },
  typeBadge: { fontSize: 13, fontWeight: '600', color: '#f5ede0' },
  sportBadge: { fontSize: 11, color: '#008080', backgroundColor: '#f5ede0', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, overflow: 'hidden', fontWeight: 'bold' },
  division: { fontSize: 15, fontWeight: 'bold', color: '#003333', marginBottom: 6 },
  detail: { fontSize: 14, color: '#5a7a7a', marginBottom: 4 },
  description: { fontSize: 14, color: '#003333', marginBottom: 4 },
  contact: { fontSize: 13, color: '#7A1E1E', fontWeight: '600', marginTop: 4 },
  deleteBtn: { marginTop: 10, alignSelf: 'flex-end', backgroundColor: '#7A1E1E', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 14 },
  deleteText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 50, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#008080', marginBottom: 8 },
  emptySub: { fontSize: 15, color: '#a0b8b8', textAlign: 'center' },
  postBtn: { position: 'absolute', bottom: 24, alignSelf: 'center', backgroundColor: '#7A1E1E', borderRadius: 24, paddingVertical: 14, paddingHorizontal: 32, shadowColor: '#7A1E1E', shadowOpacity: 0.4, shadowRadius: 8, elevation: 8 },
  postBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
