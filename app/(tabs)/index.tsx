import { Rajdhani_700Bold, useFonts } from '@expo-google-fonts/rajdhani';
import { useRouter } from 'expo-router';
import { collection, deleteDoc, doc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Svg, { Path, Polygon } from 'react-native-svg';
import { auth, db } from '../../firebaseConfig';

const sportOptions = [
  { label: 'All Sports', value: 'All' },
  { label: 'Basketball', value: 'Basketball' },
  { label: 'Volleyball', value: 'Volleyball' },
  { label: 'Softball', value: 'Softball' },
];

const states = ['All States', 'AZ', 'NM', 'CO', 'UT', 'TX', 'CA', 'NV', 'OK', 'AL', 'AK', 'AR', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NH', 'NJ', 'NY', 'NC', 'ND', 'OH', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'];

function BellIcon({ color, hasNew }: { color: string; hasNew: boolean }) {
  return (
    <View>
      <Svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <Path d="M11 2a6 6 0 0 1 6 6v4l2 3H3l2-3V8a6 6 0 0 1 6-6Z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
        <Path d="M9 17a2 2 0 0 0 4 0" stroke={color} strokeWidth="1.5" />
      </Svg>
      {hasNew && <View style={styles.bellDot} />}
    </View>
  );
}

export default function HomeScreen() {
  const [sport, setSport] = useState('All');
  const [showSportPicker, setShowSportPicker] = useState(false);
  const [stateFilter, setStateFilter] = useState('All States');
  const [showStatePicker, setShowStatePicker] = useState(false);
  const [search, setSearch] = useState('');
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasNewNotifications, setHasNewNotifications] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(140);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const router = useRouter();
  const user = auth.currentUser;
  const [fontsLoaded] = useFonts({ Rajdhani_700Bold });

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
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a: any, b: any) => b.createdAt?.seconds - a.createdAt?.seconds);
      setNotifications(data);
      setHasNewNotifications(data.some((n: any) => !n.read));
    });
    return () => unsub();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await Promise.all(
        notifications.filter((n: any) => !n.read).map((n: any) =>
          updateDoc(doc(db, 'notifications', n.id), { read: true })
        )
      );
    } catch (e) { console.log(e); }
  };

  const handleDeleteNotification = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', id));
    } catch (e) { console.log(e); }
  };

  const sportLabel = sportOptions.find(o => o.value === sport)?.label || 'All Sports';

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
        <Svg style={StyleSheet.absoluteFill} width="100%" height={headerHeight} viewBox="0 0 390 130" preserveAspectRatio="xMidYMid slice">
          <Polygon points="0,0 80,30 40,80" fill="white" opacity={0.04} />
          <Polygon points="80,30 160,10 120,70" fill="white" opacity={0.07} />
          <Polygon points="40,80 120,70 80,130" fill="white" opacity={0.05} />
          <Polygon points="160,10 260,50 180,90" fill="white" opacity={0.06} />
          <Polygon points="120,70 180,90 100,130" fill="white" opacity={0.08} />
          <Polygon points="260,50 330,20 310,80" fill="white" opacity={0.05} />
          <Polygon points="180,90 310,80 240,130" fill="white" opacity={0.07} />
          <Polygon points="330,20 390,0 390,60" fill="white" opacity={0.04} />
          <Polygon points="310,80 390,60 390,130" fill="white" opacity={0.06} />
          <Polygon points="0,60 40,80 0,130" fill="white" opacity={0.05} />
          <Polygon points="0,0 40,0 80,30" fill="white" opacity={0.08} />
          <Polygon points="160,10 260,0 260,50" fill="white" opacity={0.04} />
          <Polygon points="260,0 330,20 390,0" fill="white" opacity={0.06} />
          <Polygon points="240,130 310,80 390,130" fill="white" opacity={0.05} />
          <Polygon points="80,130 180,90 240,130" fill="white" opacity={0.04} />
        </Svg>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.bellBtn} onPress={() => setShowNotifications(true)}>
            <BellIcon color="#f5ede0" hasNew={hasNewNotifications} />
          </TouchableOpacity>
          <Text style={[styles.header, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>ZONY</Text>
          <View style={{ width: 24 }} />
        </View>
        <Text style={[styles.sub, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>Tournaments near you</Text>
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
            </Svg>
          ) : <Text style={styles.stateBtnText}>{stateFilter}</Text>}
        </TouchableOpacity>
      </View>

      <View style={styles.filterRow}>
        <View style={styles.dropdownWrapper}>
          <TouchableOpacity style={styles.dropdownSelect} onPress={() => setShowSportPicker(!showSportPicker)}>
            <Text style={styles.dropdownSelectText}>{sportLabel}</Text>
            <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
              <Path d="M2 4l4 4 4-4" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </TouchableOpacity>
          {showSportPicker && (
            <View style={styles.inlineMenu}>
              {sportOptions.map(o => (
                <TouchableOpacity
                  key={o.value}
                  style={[styles.dropdownMenuItem, sport === o.value && styles.dropdownMenuItemActive]}
                  onPress={() => { setSport(o.value); setShowSportPicker(false); }}
                >
                  <Text style={[styles.dropdownMenuText, sport === o.value && styles.dropdownMenuTextActive]}>{o.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>

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
                <Text style={[styles.name, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>{t.name}</Text>
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

      <Modal visible={showNotifications} transparent animationType="slide">
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={styles.sheetBackdrop} onPress={() => setShowNotifications(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>NOTIFICATIONS</Text>
              <View style={styles.sheetHeaderRight}>
                <TouchableOpacity onPress={handleMarkAllRead}>
                  <Text style={styles.markAllRead}>Mark all read</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowNotifications(false)} style={{ marginLeft: 16 }}>
                  <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
                    <Path d="M14 4L4 14M4 4l10 10" stroke="#111" strokeWidth="1.5" strokeLinecap="round" />
                  </Svg>
                </TouchableOpacity>
              </View>
            </View>
            {notifications.length === 0 ? (
              <View style={styles.sheetEmpty}>
                <Text style={styles.sheetEmptyIcon}>🔔</Text>
                <Text style={styles.sheetEmptyTitle}>No notifications yet</Text>
                <Text style={styles.sheetEmptySub}>You'll see activity here when someone joins your tournament.</Text>
              </View>
            ) : (
              <FlatList
                data={notifications}
                keyExtractor={n => n.id}
                contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8 }}
                renderItem={({ item: n }) => {
                  const isRead = n.read === true;
                  return (
                    <TouchableOpacity
                      style={[styles.notiCard, isRead && styles.notiCardRead]}
                      onPress={() => updateDoc(doc(db, 'notifications', n.id), { read: true })}
                    >
                      <View style={styles.notiIcon}>
                        <Text style={{ fontSize: 18 }}>🔔</Text>
                      </View>
                      <View style={styles.notiContent}>
                        <View style={styles.notiTopRow}>
                          <Text style={[styles.notiMessage, isRead && styles.notiMessageRead]} numberOfLines={1}>{n.message}</Text>
                          <Text style={styles.notiTime}>{n.createdAt?.toDate?.()?.toLocaleDateString()}</Text>
                        </View>
                        {n.body ? <Text style={styles.notiBody} numberOfLines={2}>{n.body}</Text> : null}
                      </View>
                      {!isRead && <View style={styles.notiDot} />}
                      <TouchableOpacity onPress={() => handleDeleteNotification(n.id)} style={styles.notiDelete}>
                        <Text style={styles.notiDeleteText}>✕</Text>
                      </TouchableOpacity>
                    </TouchableOpacity>
                  );
                }}
              />
            )}
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
  header: { fontSize: 42, fontWeight: '900', color: '#f5ede0', textAlign: 'center', letterSpacing: 6 },
  bellBtn: { marginLeft: 10 },
  bellDot: { position: 'absolute', top: 0, right: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: '#FF4444', borderWidth: 1.5, borderColor: '#fff' },
  sub: { fontSize: 14, color: 'rgba(255,255,255,0.8)', textAlign: 'center', letterSpacing: 2 },
  searchRow: { flexDirection: 'row', marginHorizontal: 20, gap: 8, marginBottom: 10, marginTop: 14 },
  search: { flex: 1, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: '#003333', borderWidth: 1, borderColor: '#e0d8c8' },
  stateBtn: { backgroundColor: '#008080', borderRadius: 12, paddingHorizontal: 14, justifyContent: 'center', alignItems: 'center', minWidth: 44 },
  stateBtnText: { fontSize: 14, color: '#f5ede0', fontWeight: '600' },
  filterRow: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 8, zIndex: 999 },
  dropdownWrapper: { zIndex: 999 },
  dropdownSelect: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#e0d8c8', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  dropdownSelectText: { fontSize: 13, color: '#555', fontWeight: '500' },
  inlineMenu: { position: 'absolute', top: 44, left: 0, right: 0, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e0d8c8', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, elevation: 10, zIndex: 1000 },
  dropdownMenuItem: { paddingVertical: 12, paddingHorizontal: 16 },
  dropdownMenuItemActive: { backgroundColor: '#f0fafa' },
  dropdownMenuText: { fontSize: 13, color: '#333' },
  dropdownMenuTextActive: { color: '#008080', fontWeight: '700' },
  list: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 20 },
  card: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#e0d8c8', elevation: 3, shadowColor: '#003333', shadowOpacity: 0.1, shadowRadius: 8 },
  cardHeader: { backgroundColor: '#008080', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10 },
  cardBody: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 12 },
  name: { fontSize: 17, fontWeight: 'bold', color: '#f5ede0', flex: 1, marginRight: 8, textTransform: 'uppercase', letterSpacing: 1.2 },
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
  sheetOverlay: { flex: 1, justifyContent: 'flex-end' },
  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { backgroundColor: '#F5F0E8', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '78%' },
  sheetHandle: { width: 40, height: 4, backgroundColor: '#ccc', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 8 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.08)' },
  sheetTitle: { fontSize: 20, fontWeight: '900', color: '#111', letterSpacing: 2 },
  sheetHeaderRight: { flexDirection: 'row', alignItems: 'center' },
  markAllRead: { fontSize: 12, color: '#008080', fontWeight: '600' },
  sheetEmpty: { alignItems: 'center', marginTop: 60 },
  sheetEmptyIcon: { fontSize: 50, marginBottom: 12 },
  sheetEmptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#003333', marginBottom: 8 },
  sheetEmptySub: { fontSize: 14, color: '#a0b8b8', textAlign: 'center', paddingHorizontal: 40 },
  notiCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#fff', borderRadius: 16, padding: 12, marginBottom: 4, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  notiCardRead: { backgroundColor: 'transparent', shadowOpacity: 0, elevation: 0 },
  notiIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(0,128,128,0.1)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  notiContent: { flex: 1 },
  notiTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  notiMessage: { fontSize: 13, fontWeight: '700', color: '#111', flex: 1 },
  notiMessageRead: { fontWeight: '500', color: '#666' },
  notiBody: { fontSize: 12, color: '#aaa', marginTop: 2, lineHeight: 16 },
  notiTime: { fontSize: 10, color: '#aaa', flexShrink: 0 },
  notiDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#8B1A1A', marginTop: 4, flexShrink: 0 },
  notiDelete: { padding: 4 },
  notiDeleteText: { fontSize: 12, color: '#ccc' },
});