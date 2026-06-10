import { Rajdhani_700Bold, useFonts } from '@expo-google-fonts/rajdhani';
import { useRouter } from 'expo-router';
import { collection, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Svg, { Path, Polygon } from 'react-native-svg';
import { auth, db } from '../../firebaseConfig';

function SadFace() {
  return (
    <Svg width={64} height={64} viewBox="0 0 64 64" fill="none">
      <Path d="M32 12a20 20 0 1 0 0 40 20 20 0 0 0 0-40Z" stroke="#a0b8b8" strokeWidth="2" />
      <Path d="M24 26a2 2 0 1 1 4 0 2 2 0 0 1-4 0Z" fill="#a0b8b8" />
      <Path d="M36 26a2 2 0 1 1 4 0 2 2 0 0 1-4 0Z" fill="#a0b8b8" />
      <Path d="M24 42c1.5-3 4-5 8-5s6.5 2 8 5" stroke="#a0b8b8" strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

function getSportColor(sport: string) {
  if (sport === 'Basketball') return '#008080';
  if (sport === 'Volleyball') return '#7A1E1E';
  if (sport === 'Softball') return '#B8860B';
  return '#008080';
}

function getLookingLabel(type: string, lookingFor: string) {
  if (type && lookingFor) return `${type} looking for ${lookingFor}`;
  if (type) return type;
  return '';
}

export default function BoardScreen() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('All');
  const [sportFilter, setSportFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [headerHeight, setHeaderHeight] = useState(120);
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [showSportMenu, setShowSportMenu] = useState(false);
  const router = useRouter();
  const user = auth.currentUser;
  const [fontsLoaded] = useFonts({ Rajdhani_700Bold });

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
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.city?.toLowerCase().includes(search.toLowerCase()) ||
      p.state?.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase())
    );

  const typeOptions = [
    { label: 'All', value: 'All' },
    { label: 'Player', value: 'Player' },
    { label: 'Team', value: 'Team' },
  ];

  const sportOptions = [
    { label: 'All Sports', value: 'All' },
    { label: 'Basketball', value: 'Basketball' },
    { label: 'Volleyball', value: 'Volleyball' },
    { label: 'Softball', value: 'Softball' },
  ];

  const typeLabel = typeOptions.find(o => o.value === typeFilter)?.label || 'All';
  const sportLabel = sportOptions.find(o => o.value === sportFilter)?.label || 'All Sports';

  return (
    <View style={styles.container}>

      {/* Header */}
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
        <Text style={[styles.header, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>SPORTS BOARD</Text>
        <Text style={[styles.sub, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>Find players or teams near you</Text>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.search}
          placeholder="Search players..."
          placeholderTextColor="#a0b8b8"
          value={search}
          onChangeText={setSearch}
        />
        <TouchableOpacity style={styles.stateBtn}>
          <Svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <Path d="M3 5h14M5 10h10M7 15h6" stroke="#f5ede0" strokeWidth="1.5" strokeLinecap="round" />
          </Svg>
        </TouchableOpacity>
      </View>

      {/* Dropdown filters */}
      <View style={styles.filtersRow}>
        <View style={styles.dropdownWrapper}>
          <TouchableOpacity
            style={styles.dropdownSelect}
            onPress={() => { setShowTypeMenu(!showTypeMenu); setShowSportMenu(false); }}
          >
            <Text style={styles.dropdownSelectText}>{typeLabel}</Text>
            <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
              <Path d="M2 4l4 4 4-4" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </TouchableOpacity>
          {showTypeMenu && (
            <View style={styles.inlineMenu}>
              {typeOptions.map(o => (
                <TouchableOpacity
                  key={o.value}
                  style={[styles.dropdownMenuItem, typeFilter === o.value && styles.dropdownMenuItemActive]}
                  onPress={() => { setTypeFilter(o.value); setShowTypeMenu(false); }}
                >
                  <Text style={[styles.dropdownMenuText, typeFilter === o.value && styles.dropdownMenuTextActive]}>{o.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.dropdownWrapper}>
          <TouchableOpacity
            style={styles.dropdownSelect}
            onPress={() => { setShowSportMenu(!showSportMenu); setShowTypeMenu(false); }}
          >
            <Text style={styles.dropdownSelectText}>{sportLabel}</Text>
            <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
              <Path d="M2 4l4 4 4-4" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </TouchableOpacity>
          {showSportMenu && (
            <View style={styles.inlineMenu}>
              {sportOptions.map(o => (
                <TouchableOpacity
                  key={o.value}
                  style={[styles.dropdownMenuItem, sportFilter === o.value && styles.dropdownMenuItemActive]}
                  onPress={() => { setSportFilter(o.value); setShowSportMenu(false); }}
                >
                  <Text style={[styles.dropdownMenuText, sportFilter === o.value && styles.dropdownMenuTextActive]}>{o.label}</Text>
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
          <SadFace />
          <Text style={styles.emptyTitle}>Nothing posted yet</Text>
          <Text style={styles.emptySub}>Be the first to post on the board.</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={p => p.id}
          contentContainerStyle={styles.list}
          renderItem={({ item: p }) => {
            const sportColor = getSportColor(p.sport);
            const lookingLabel = getLookingLabel(p.type, p.lookingFor);
            return (
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.85}
                onPress={() => router.push({ pathname: '/board-detail', params: { id: p.id } })}
              >
                <View style={[styles.cardHeader, { backgroundColor: sportColor }]}>
                  <Text style={[styles.cardName, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]} numberOfLines={1}>
                    {p.name ? p.name.toUpperCase() : p.type?.toUpperCase()}
                  </Text>
                  <View style={[styles.sportBadge, { borderColor: sportColor }]}>
                    <Text style={[styles.sportBadgeText, { color: sportColor }]}>{p.sport}</Text>
                  </View>
                </View>
                <View style={styles.cardBody}>
                  {p.city ? <Text style={styles.detail}>📍 {p.city}, {p.state}</Text> : null}
                  {p.division ? <Text style={styles.detail}>🏅 {p.division}</Text> : null}
                  {lookingLabel ? <Text style={styles.detail}>👤 {lookingLabel}</Text> : null}
                  {p.description ? <Text style={styles.description} numberOfLines={2}>{p.description}</Text> : null}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      <TouchableOpacity style={styles.postBtn} onPress={() => router.push('/postboard')}>
        <Text style={[styles.postBtnText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>+ POST TO BOARD</Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5ede0' },
  headerBlock: { backgroundColor: '#008080', paddingTop: 60, paddingBottom: 16, paddingHorizontal: 0, marginBottom: 0 },
  header: { fontSize: 28, fontWeight: '900', color: '#fff', textAlign: 'center', letterSpacing: 3 },
  sub: { fontSize: 14, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginTop: 2 },
  searchRow: { flexDirection: 'row', marginHorizontal: 16, gap: 8, marginTop: 14, marginBottom: 10 },
  search: { flex: 1, backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: '#003333', borderWidth: 1, borderColor: '#e8e8e8', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  stateBtn: { backgroundColor: '#008080', borderRadius: 14, width: 44, alignItems: 'center', justifyContent: 'center' },
  filtersRow: { flexDirection: 'row', gap: 8, marginHorizontal: 16, marginBottom: 10, zIndex: 999 },
  dropdownWrapper: { flex: 1, zIndex: 999 },
  dropdownSelect: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: '#e8e8e8', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  dropdownSelectText: { fontSize: 13, color: '#555', fontWeight: '500' },
  inlineMenu: { position: 'absolute', top: 44, left: 0, right: 0, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e8e8e8', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, elevation: 10, zIndex: 1000 },
  dropdownMenuItem: { paddingVertical: 12, paddingHorizontal: 16 },
  dropdownMenuItemActive: { backgroundColor: '#f0fafa' },
  dropdownMenuText: { fontSize: 13, color: '#333' },
  dropdownMenuTextActive: { color: '#008080', fontWeight: '700' },
  list: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 80 },
  card: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#e0d8c8', elevation: 3, shadowColor: '#003333', shadowOpacity: 0.1, shadowRadius: 8 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10 },
  cardName: { fontSize: 16, fontWeight: 'bold', color: '#f5ede0', flex: 1, marginRight: 8, letterSpacing: 1 },
  sportBadge: { backgroundColor: '#f5ede0', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  sportBadgeText: { fontSize: 11, fontWeight: 'bold' },
  cardBody: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 12 },
  detail: { fontSize: 14, color: '#5a5a5a', marginBottom: 4 },
  description: { fontSize: 13, color: '#999', marginTop: 4 },
  emptyContainer: { alignItems: 'center', marginTop: 60, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#a0b8b8', marginTop: 8 },
  emptySub: { fontSize: 15, color: '#a0b8b8', textAlign: 'center' },
  postBtn: { position: 'absolute', bottom: 24, alignSelf: 'center', backgroundColor: '#7A1E1E', borderRadius: 12, paddingVertical: 16, paddingHorizontal: 32, shadowColor: '#7A1E1E', shadowOpacity: 0.4, shadowRadius: 8, elevation: 8 },
  postBtnText: { color: '#fff', fontSize: 18, letterSpacing: 1 },
});