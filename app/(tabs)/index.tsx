import { useRouter } from 'expo-router';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Svg, { Path, Polygon } from 'react-native-svg';
import { auth, db } from '../../firebaseConfig';

const sports = ['All', 'Basketball', 'Volleyball', 'Softball'];
const states = ['All States', 'AZ', 'NM', 'CO', 'UT', 'TX', 'CA', 'NV', 'OK', 'AL', 'AK', 'AR', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NH', 'NJ', 'NY', 'NC', 'ND', 'OH', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'];

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
  const [stateFilter, setStateFilter] = useState('All States');
  const [showStatePicker, setShowStatePicker] = useState(false);
  const [search, setSearch] = useState('');
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasNewNotifications, setHasNewNotifications] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(140);
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
    .filter(t => stateFilter === 'All States' || t.state === stateFilter)
    .filter(t =>
      t.name?.toLowerCase().includes(search.toLowerCase()) ||
      t.city?.toLowerCase().includes(search.toLowerCase()) ||
      t.state?.toLowerCase().includes(search.toLowerCase())
    );

  return (
    <View style={styles.container}>
      <View style={styles.headerBlock} onLayout={e => setHeaderHeight(e.nativeEvent.layout.height)}>
        <Svg style={StyleSheet.absoluteFill} width="100%" height={headerHeight} viewBox={`0 0 400 ${headerHeight}`}>
          <Polygon points="0,0 100,0 0,100" fill="#f5ede0" opacity={0.10} />
          <Polygon points="400,0 300,0 400,100" fill="#f5ede0" opacity={0.10} />
          <Polygon points="150,0 250,0 200,70" fill="#f5ede0" opacity={0.10} />
          <Polygon points={`50,${headerHeight} 150,${headerHeight} 100,${headerHeight - 90}`} fill="#f5ede0" opacity={0.04} />
          <Polygon points={`250,${headerHeight} 350,${headerHeight} 300,${headerHeight - 90}`} fill="#f5ede0" opacity={0.04} />
          <Polygon points={`0,${headerHeight} 70,${headerHeight} 0,${headerHeight - 70}`} fill="#7A1E1E" opacity={0.1} />
          <Polygon points={`400,${headerHeight} 330,${headerHeight} 400,${headerHeight - 70}`} fill="#7A1E1E" opacity={0.1} />
          <Polygon points="180,0 220,0 200,30" fill="#7A1E1E" opacity={0.08} />
        </Svg>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.bellBtn} onPress={() => router.push('/notifications')}>
            <BellIcon color="#f5ede0" hasNew={hasNewNotifications} />
          </TouchableOpacity>
          <Text style={styles.header}>Zony</Text>
          <View style={{ width: 24 }} />
        </View>
        <Text style={styles.sub}>Tournaments near you</Text>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.search}
          placeholder="Search by name or city..."
          placeholderTextColor="#a0b8b8"
          value={search}
          onChangeText={setSearch}
        />
        <TouchableOpacity style={styles.stateBtn} onPress={() => setShowStatePicker(true)}>
          {stateFilter === 'All States' ? (
            <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <Path d="M12 2a10 10 0 100 20A10 10 0 0012 2z" stroke="#f5ede0" strokeWidth="1.5" />
              <Path d="M2 12h20" stroke="#f5ede0" strokeWidth="1.5" />
              <Path d="M12 2a15 15 0 010 20M12 2a15 15 0 000 20" stroke="#f5ede0" strokeWidth="1.5" />
              <Path d="M4.5 7h15M4.5 17h15" stroke="#f5ede0" strokeWidth="1" opacity={0.6} />
              <Path d="M7 4.5c1 1.5 1 3.5 0 5" stroke="#f5ede0" strokeWidth="0.8" opacity={0.5} />
              <Path d="M17 4.5c-1 1.5-1 3.5 0 5" stroke="#f5ede0" strokeWidth="0.8" opacity={0.5} />
              <Path d="M9 2.5c0.5 2 0.5 4 0 6M15 2.5c-0.5 2-0.5 4 0 6" stroke="#f5ede0" strokeWidth="0.7" opacity={0.4} />
            </Svg>
          ) : <Text style={styles.stateBtnText}>{stateFilter}</Text>}
        </TouchableOpacity>
      </View>

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
        <ActivityIndicator size="large" color="#7A1E1E" style={{ marginTop: 60 }} />
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
              <View style={styles.cardHeader}>
                <Text style={styles.name}>{t.name}</Text>
                <Text style={styles.sportBadge}>{t.sport}</Text>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.detail}>📅 {t.date}</Text>
                <Text style={styles.detail}>📍 {t.city}, {t.state}</Text>
                {t.entryFee ? <Text style={styles.fee}>💵 {t.entryFee} entry</Text> : null}
                {t.spectatorFee ? <Text style={styles.fee}>🎟 {t.spectatorFee} spectators</Text> : null}
                <View style={styles.spotsRow}>
                  <Text style={styles.spots}>{t.spots} spots left</Text>
                  {t.status === 'canceled' && (
                    <View style={styles.canceledBadge}>
                      <Text style={styles.canceledBadgeText}>Canceled</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      <Modal visible={showStatePicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Filter by State</Text>
            <ScrollView>
              {states.map(s => (
                <TouchableOpacity key={s} style={styles.modalItem} onPress={() => { setStateFilter(s); setShowStatePicker(false); }}>
                  <Text style={[styles.modalItemText, stateFilter === s && styles.modalItemActive]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.modalClose} onPress={() => setShowStatePicker(false)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5ede0' },
  headerBlock: { backgroundColor: '#008080', paddingTop: 60, paddingBottom: 16, paddingHorizontal: 0 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  header: { fontSize: 36, fontWeight: 'bold', color: '#f5ede0', textAlign: 'center', letterSpacing: 2 },
  bellBtn: { marginLeft: 10 },
  bellDot: { position: 'absolute', top: 0, right: 0, width: 8, height: 8, borderRadius: 4, backgroundColor: '#7A1E1E' },
  sub: { fontSize: 14, color: '#e0f5f5', textAlign: 'center', letterSpacing: 1 },
  searchRow: { flexDirection: 'row', marginHorizontal: 20, gap: 8, marginBottom: 10, marginTop: 14 },
  search: { flex: 1, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: '#003333', borderWidth: 1, borderColor: '#e0d8c8' },
  stateBtn: { backgroundColor: '#008080', borderRadius: 12, paddingHorizontal: 14, justifyContent: 'center', alignItems: 'center', minWidth: 44 },
  stateBtnText: { fontSize: 14, color: '#f5ede0', fontWeight: '600' },
  filterRow: { flexGrow: 0, marginBottom: 8 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 4, height: 30, borderRadius: 20, backgroundColor: '#fff', marginRight: 6, justifyContent: 'center', borderWidth: 1, borderColor: '#e0d8c8' },
  filterActive: { backgroundColor: '#7A1E1E', borderColor: '#7A1E1E' },
  filterText: { fontSize: 12, color: '#5a7a7a' },
  filterTextActive: { color: '#f5ede0', fontWeight: 'bold' },
  list: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 20 },
  card: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#e0d8c8', elevation: 3, shadowColor: '#003333', shadowOpacity: 0.1, shadowRadius: 8 },
  cardHeader: { backgroundColor: '#008080', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10 },
  cardBody: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 12 },
  name: { fontSize: 15, fontWeight: 'bold', color: '#f5ede0', flex: 1, marginRight: 8 },
  sportBadge: { fontSize: 11, color: '#008080', backgroundColor: '#f5ede0', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, overflow: 'hidden', fontWeight: 'bold' },
  detail: { fontSize: 14, color: '#5a5a5a', marginBottom: 4 },
  fee: { fontSize: 13, color: '#7A1E1E', fontWeight: '600', marginBottom: 2 },
  spotsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  spots: { fontSize: 13, color: '#008080', fontWeight: '600' },
  canceledBadge: { backgroundColor: '#7A1E1E', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  canceledBadgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 50, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#008080', marginBottom: 8 },
  emptySub: { fontSize: 15, color: '#a0b8b8', textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#f5ede0', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '70%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#008080', marginBottom: 12, textAlign: 'center', letterSpacing: 1 },
  modalItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#e0d8c8' },
  modalItemText: { fontSize: 15, color: '#003333' },
  modalItemActive: { color: '#7A1E1E', fontWeight: 'bold' },
  modalClose: { backgroundColor: '#7A1E1E', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 12 },
  modalCloseText: { color: '#f5ede0', fontSize: 16, fontWeight: 'bold' },
});