import { Rajdhani_700Bold, useFonts } from '@expo-google-fonts/rajdhani';
import { useRouter } from 'expo-router';
import { collection, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Path, Polygon } from 'react-native-svg';
import { db } from '../../firebaseConfig';

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

// Trophy icon, used for forTournament
function TrophyIcon({ size = 13, color = '#5a5a5a' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M8 21h8" />
      <Path d="M12 17v4" />
      <Path d="M7 4h10v5a5 5 0 0 1-10 0z" />
      <Path d="M17 5h3a2 2 0 0 1-2 4h-1" />
      <Path d="M7 5H4a2 2 0 0 0 2 4h1" />
    </Svg>
  );
}

// Person icon, used for division
function PersonIcon({ size = 13, color = '#5a5a5a' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="12" cy="8" r="4" />
      <Path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
    </Svg>
  );
}

function getSportColor(sport: string) {
  if (sport === 'Basketball') return '#008080';
  if (sport === 'Volleyball') return '#7A1E1E';
  if (sport === 'Softball') return '#B8860B';
  return '#008080';
}

function formatTimeAgo(createdAt: any): string {
  if (!createdAt) return '';
  const date = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const divisionOptions = [
  { label: 'All Divisions', value: 'All' },
  { label: '6U Boys', value: '6U Boys' },
  { label: '6U Girls', value: '6U Girls' },
  { label: '6U Coed', value: '6U Coed' },
  { label: '8U Boys', value: '8U Boys' },
  { label: '8U Girls', value: '8U Girls' },
  { label: '8U Coed', value: '8U Coed' },
  { label: '10U Boys', value: '10U Boys' },
  { label: '10U Girls', value: '10U Girls' },
  { label: '10U Coed', value: '10U Coed' },
  { label: '12U Boys', value: '12U Boys' },
  { label: '12U Girls', value: '12U Girls' },
  { label: '12U Coed', value: '12U Coed' },
  { label: '14U Boys', value: '14U Boys' },
  { label: '14U Girls', value: '14U Girls' },
  { label: '14U Coed', value: '14U Coed' },
  { label: '16U Boys', value: '16U Boys' },
  { label: '16U Girls', value: '16U Girls' },
  { label: '16U Coed', value: '16U Coed' },
  { label: '18U Boys', value: '18U Boys' },
  { label: '18U Girls', value: '18U Girls' },
  { label: '18U Coed', value: '18U Coed' },
  { label: 'HS Boys', value: 'HS Boys' },
  { label: 'HS Girls', value: 'HS Girls' },
  { label: 'HS Coed', value: 'HS Coed' },
  { label: 'Adult Men', value: 'Adult Men' },
  { label: 'Adult Women', value: 'Adult Women' },
  { label: 'Adult Coed', value: 'Adult Coed' },
];

const sportOptions = [
  { label: 'All Sports', value: 'All' },
  { label: 'Basketball', value: 'Basketball' },
  { label: 'Volleyball', value: 'Volleyball' },
  { label: 'Softball', value: 'Softball' },
];

export default function BoardScreen() {
  const [posts, setPosts] = useState([]);
  const [userCache, setUserCache] = useState<Record<string, { username: string; photoURL: string }>>({});
  const [loading, setLoading] = useState(true);
  const [sportFilter, setSportFilter] = useState('All');
  const [divisionFilter, setDivisionFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [headerHeight, setHeaderHeight] = useState(120);
  const [showSportMenu, setShowSportMenu] = useState(false);
  const [showDivisionMenu, setShowDivisionMenu] = useState(false);
  const router = useRouter();
  const [fontsLoaded] = useFonts({ Rajdhani_700Bold });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'board'), async (snapshot) => {
      const now = new Date();
      const data = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((p: any) => {
          if (!p.expiresAt) return true;
          const expDate = p.expiresAt.toDate ? p.expiresAt.toDate() : new Date(p.expiresAt);
          return expDate > now;
        });
      setPosts(data);
      setLoading(false);

      const uids = [...new Set(data.map((p: any) => p.postedBy).filter(Boolean))];
      const newCache: Record<string, { username: string; photoURL: string }> = {};
      await Promise.all(uids.map(async (uid: string) => {
        try {
          const snap = await getDoc(doc(db, 'users', uid));
          if (snap.exists()) {
            newCache[uid] = {
              username: snap.data().username || '',
              photoURL: snap.data().photoURL || '',
            };
          }
        } catch (_) {}
      }));
      setUserCache(prev => ({ ...prev, ...newCache }));
    }, (error) => {
      console.log('Board listener error:', error);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filtered = posts
    .filter((p: any) => sportFilter === 'All' || p.sport === sportFilter)
    .filter((p: any) => divisionFilter === 'All' || p.division === divisionFilter)
    .filter((p: any) =>
      search.trim() === '' ||
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase())
    );

  const sportLabel = sportOptions.find(o => o.value === sportFilter)?.label || 'All Sports';
  const divisionLabel = divisionOptions.find(o => o.value === divisionFilter)?.label || 'All Divisions';

  const closeAll = () => { setShowSportMenu(false); setShowDivisionMenu(false); };

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
          <Polygon points="0,0 0,60 40,80 0,130 80,130 40,80" fill="white" opacity={0.03} />
          <Polygon points="0,60 0,0 40,0 80,30 40,80" fill="white" opacity={0.03} />
        </Svg>
        <Text style={[styles.header, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>SPORTS BOARD</Text>
        <Text style={[styles.sub, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>Find players or teams near you</Text>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.search}
          placeholder="Search players..."
          placeholderTextColor="#a0b8b8"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={styles.filtersRow}>
        <View style={styles.dropdownWrapper}>
          <TouchableOpacity style={styles.dropdownSelect} onPress={() => { closeAll(); setShowSportMenu(true); }}>
            <Text style={styles.dropdownSelectText}>{sportLabel}</Text>
            <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
              <Path d="M2 4l4 4 4-4" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </TouchableOpacity>
          {showSportMenu && (
            <View style={styles.inlineMenu}>
              {sportOptions.map(o => (
                <TouchableOpacity key={o.value} style={[styles.dropdownMenuItem, sportFilter === o.value && styles.dropdownMenuItemActive]} onPress={() => { setSportFilter(o.value); closeAll(); }}>
                  <Text style={[styles.dropdownMenuText, sportFilter === o.value && styles.dropdownMenuTextActive]}>{o.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.dropdownWrapper}>
          <TouchableOpacity style={styles.dropdownSelect} onPress={() => { closeAll(); setShowDivisionMenu(true); }}>
            <Text style={styles.dropdownSelectText} numberOfLines={1}>{divisionLabel}</Text>
            <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
              <Path d="M2 4l4 4 4-4" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </TouchableOpacity>
          {showDivisionMenu && (
            <View style={styles.inlineMenuScrollable}>
              <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
                {divisionOptions.map(o => (
                  <TouchableOpacity key={o.value} style={[styles.dropdownMenuItem, divisionFilter === o.value && styles.dropdownMenuItemActive]} onPress={() => { setDivisionFilter(o.value); closeAll(); }}>
                    <Text style={[styles.dropdownMenuText, divisionFilter === o.value && styles.dropdownMenuTextActive]}>{o.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
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
          keyExtractor={(p: any) => p.id}
          contentContainerStyle={styles.list}
          onScrollBeginDrag={closeAll}
          renderItem={({ item: p }: any) => {
            const sportColor = getSportColor(p.sport);
            const poster = userCache[p.postedBy] || null;
            const posterInitials = poster?.username
              ? poster.username.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
              : '?';
            const timeAgo = formatTimeAgo(p.createdAt);

            return (
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.85}
                onPress={() => router.push({ pathname: '/board-detail', params: { id: p.id } })}
              >
                <View style={[styles.cardAccentBar, { backgroundColor: sportColor }]} />

                <View style={styles.cardInner}>
                  <View style={styles.cardTopRow}>
                    <Text
                      style={[styles.cardName, { color: sportColor }, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}
                      numberOfLines={1}
                    >
                      {p.name ? p.name.toUpperCase() : p.sport?.toUpperCase()}
                    </Text>
                    <View style={[styles.sportBadge, { backgroundColor: `${sportColor}15`, borderColor: `${sportColor}40` }]}>
                      <Text style={[styles.sportBadgeText, { color: sportColor }]}>{p.sport}</Text>
                    </View>
                  </View>

                  {p.division ? (
                    <View style={styles.detailRow}>
                      <PersonIcon size={13} color="#5a5a5a" />
                      <Text style={styles.detail}>{p.division}</Text>
                    </View>
                  ) : null}
                  {p.forTournament ? (
                    <View style={styles.detailRow}>
                      <TrophyIcon size={13} color="#5a5a5a" />
                      <Text style={styles.detail}>{p.forTournament}</Text>
                    </View>
                  ) : null}
                  {p.description ? <Text style={styles.description} numberOfLines={2}>{p.description}</Text> : null}

                  <View style={styles.cardFooter}>
                    {poster?.photoURL ? (
                      <Image source={{ uri: poster.photoURL }} style={styles.posterPhoto} />
                    ) : (
                      <View style={[styles.posterAvatar, { backgroundColor: sportColor }]}>
                        <Text style={styles.posterAvatarText}>{posterInitials}</Text>
                      </View>
                    )}
                    <Text style={styles.posterName}>{poster?.username || 'Unknown'}</Text>
                    {timeAgo ? <Text style={styles.timeAgo}>· {timeAgo}</Text> : null}
                  </View>
                  <Text style={styles.viewMoreHint}>View card for more details</Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
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
  filtersRow: { flexDirection: 'row', gap: 8, marginHorizontal: 16, marginBottom: 8, zIndex: 999 },
  dropdownWrapper: { flex: 1, zIndex: 999 },
  dropdownSelect: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: '#e8e8e8', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  dropdownSelectText: { fontSize: 13, color: '#555', fontWeight: '500', flex: 1, marginRight: 4 },
  inlineMenu: { position: 'absolute', top: 44, left: 0, right: 0, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e8e8e8', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, elevation: 10, zIndex: 1000 },
  inlineMenuScrollable: { position: 'absolute', top: 44, left: 0, right: 0, maxHeight: 260, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e8e8e8', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, elevation: 10, zIndex: 1000 },
  dropdownMenuItem: { paddingVertical: 12, paddingHorizontal: 16 },
  dropdownMenuItemActive: { backgroundColor: '#f0fafa' },
  dropdownMenuText: { fontSize: 13, color: '#333' },
  dropdownMenuTextActive: { color: '#008080', fontWeight: '700' },
  list: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 24 },
  card: { backgroundColor: '#fff', borderRadius: 14, marginBottom: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#e0d8c8', elevation: 3, shadowColor: '#003333', shadowOpacity: 0.08, shadowRadius: 8, flexDirection: 'row' },
  cardAccentBar: { width: 5, alignSelf: 'stretch' },
  cardInner: { flex: 1, paddingHorizontal: 12, paddingTop: 12, paddingBottom: 12 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardName: { fontSize: 17, fontWeight: '900', flex: 1, marginRight: 8, letterSpacing: 0.5 },
  sportBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  sportBadgeText: { fontSize: 11, fontWeight: '700' },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  detail: { fontSize: 13, color: '#5a5a5a' },
  description: { fontSize: 13, color: '#888', marginTop: 4, lineHeight: 18 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  posterPhoto: { width: 22, height: 22, borderRadius: 11 },
  posterAvatar: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  posterAvatarText: { fontSize: 9, color: '#fff', fontWeight: 'bold' },
  posterName: { fontSize: 12, color: '#555', fontWeight: '600' },
  timeAgo: { fontSize: 11, color: '#a0b8b8' },
  viewMoreHint: { fontSize: 11, color: '#c0c0c0', marginTop: 6, textAlign: 'center' },
  emptyContainer: { alignItems: 'center', marginTop: 60, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#a0b8b8', marginTop: 8 },
  emptySub: { fontSize: 15, color: '#a0b8b8', textAlign: 'center' },
});