import { Rajdhani_700Bold, useFonts } from '@expo-google-fonts/rajdhani';
import { useRouter } from 'expo-router';
import { collection, doc, getDoc, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Keyboard, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, useWindowDimensions, View } from 'react-native';
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

function ChatBubbleIcon({ size = 13, color = '#aaa' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </Svg>
  );
}

function timeAgo(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (days > 0) return `${days}d ago`;
  if (hrs > 0) return `${hrs}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return 'just now';
}

function FeedImage({ uri }: { uri: string }) {
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = screenWidth - 32 - 28;
  const [aspectRatio, setAspectRatio] = useState(1);

  useEffect(() => {
    let cancelled = false;
    Image.getSize(
      uri,
      (w, h) => { if (!cancelled && w && h) setAspectRatio(w / h); },
      () => {}
    );
    return () => { cancelled = true; };
  }, [uri]);

  return (
    <Image
      source={{ uri }}
      style={[styles.cardImage, { width: cardWidth, height: cardWidth / aspectRatio }]}
      resizeMode="cover"
    />
  );
}

const filterOptions = [
  { label: 'All', value: 'All' },
  { label: 'For Sale', value: 'Sale' },
  { label: 'Questions', value: 'Question' },
];

export default function CommunityScreen() {
  const [fontsLoaded] = useFonts({ Rajdhani_700Bold });
  const [filter, setFilter] = useState('All');
  const [showFilter, setShowFilter] = useState(false);
  const [search, setSearch] = useState('');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myPhotoURL, setMyPhotoURL] = useState<string | null>(null);
  const [headerHeight, setHeaderHeight] = useState(120);
  const router = useRouter();
  const user = auth.currentUser;
  const initials = user?.email?.slice(0, 2).toUpperCase() || 'ME';

  useEffect(() => {
    const q = query(collection(db, 'community'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => {
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, 'users', user.uid)).then(snap => {
      if (snap.exists() && snap.data().photoURL) setMyPhotoURL(snap.data().photoURL);
    });
  }, []);

  const filterLabel = filterOptions.find(o => o.value === filter)?.label || 'All';

  const filtered = posts
    .filter((p: any) => filter === 'All' || p.type === filter)
    .filter((p: any) =>
      search.trim() === '' ||
      p.title?.toLowerCase().includes(search.toLowerCase()) ||
      p.body?.toLowerCase().includes(search.toLowerCase()) ||
      p.authorName?.toLowerCase().includes(search.toLowerCase())
    );

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.container}>

        {/* ── Teal header with polygon background ── */}
        <View
          style={styles.headerBlock}
          onLayout={e => setHeaderHeight(e.nativeEvent.layout.height)}
        >
          <Svg style={StyleSheet.absoluteFill} width="125%" height={headerHeight} viewBox="0 0 390 130" preserveAspectRatio="xMidYMid slice">
            <Polygon points="0,0 80,30 40,80" fill="white" opacity="0.04" />
            <Polygon points="80,30 160,10 120,70" fill="white" opacity="0.07" />
            <Polygon points="40,80 120,70 80,130" fill="white" opacity="0.05" />
            <Polygon points="160,10 260,50 180,90" fill="white" opacity="0.06" />
            <Polygon points="120,70 180,90 100,130" fill="white" opacity="0.08" />
            <Polygon points="260,50 330,20 310,80" fill="white" opacity="0.05" />
            <Polygon points="180,90 310,80 240,130" fill="white" opacity="0.07" />
            <Polygon points="330,20 450,0 450,60" fill="white" opacity="0.04" />
            <Polygon points="310,80 450,60 450,130" fill="white" opacity="0.06" />
            <Polygon points="0,60 40,80 0,130" fill="white" opacity="0.05" />
            <Polygon points="0,0 40,0 80,30" fill="white" opacity="0.08" />
            <Polygon points="160,10 260,0 260,50" fill="white" opacity="0.04" />
            <Polygon points="260,0 330,20 450,0" fill="white" opacity="0.06" />
            <Polygon points="240,130 310,80 450,130" fill="white" opacity="0.05" />
            <Polygon points="80,130 180,90 240,130" fill="white" opacity="0.04" />
          </Svg>
          <Text style={[styles.headerTitle, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>COMMUNITY</Text>
          <Text style={[styles.headerSub, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>Connect beyond the game</Text>
        </View>

        <TouchableOpacity style={styles.composer} onPress={() => router.push('/new-post')} activeOpacity={0.8}>
          {myPhotoURL ? (
            <Image source={{ uri: myPhotoURL }} style={styles.composerAvatarImg} />
          ) : (
            <View style={styles.composerAvatar}>
              <Text style={[styles.composerAvatarText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>{initials}</Text>
            </View>
          )}
          <View style={styles.composerInput}>
            <Text style={styles.composerPlaceholder}>Ask a question or post gear for sale...</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.searchRow}>
          <TextInput
            style={styles.search}
            placeholder="Search posts..."
            placeholderTextColor="#a0b8b8"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <View style={styles.filterRow}>
          <View style={styles.dropdownWrapper}>
            <TouchableOpacity style={styles.dropdownSelect} onPress={() => { Keyboard.dismiss(); setShowFilter(!showFilter); }}>
              <Text style={styles.dropdownSelectText}>{filterLabel}</Text>
              <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
                <Path d="M2 4l4 4 4-4" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </TouchableOpacity>
            {showFilter && (
              <View style={styles.inlineMenu}>
                {filterOptions.map(o => (
                  <TouchableOpacity
                    key={o.value}
                    style={[styles.dropdownMenuItem, filter === o.value && styles.dropdownMenuItemActive]}
                    onPress={() => { setFilter(o.value); setShowFilter(false); }}
                  >
                    <Text style={[styles.dropdownMenuText, filter === o.value && styles.dropdownMenuTextActive]}>{o.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#008080" style={{ marginTop: 60 }} />
        ) : filtered.length === 0 ? (
          <View style={styles.emptyContainer}>
            <SadFace />
            <Text style={styles.emptyTitle}>
              {search.trim() || filter !== 'All' ? 'No posts match your search' : 'Nothing posted yet'}
            </Text>
            <Text style={styles.emptySub}>
              {search.trim() || filter !== 'All' ? 'Try a different search or filter.' : 'Be the first to post in the community.'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(p: any) => p.id}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            onScrollBeginDrag={Keyboard.dismiss}
            renderItem={({ item: p }: any) => {
              const ago = p.createdAt?.seconds ? timeAgo(Math.floor(Date.now() / 1000) - p.createdAt.seconds) : '';
              const isSale = p.type === 'Sale';
              const avatarColor = isSale ? '#7A1E1E' : '#008080';
              const badgeBg = isSale ? 'rgba(122,30,30,0.1)' : 'rgba(0,128,128,0.1)';
              const badgeColor = isSale ? '#7A1E1E' : '#008080';
              return (
                <TouchableOpacity
                  style={styles.card}
                  activeOpacity={0.85}
                  onPress={() => router.push({ pathname: '/community-post', params: { id: p.id } })}
                >
                  <View style={styles.cardTop}>
                    {p.authorPhotoURL ? (
                      <Image source={{ uri: p.authorPhotoURL }} style={styles.avatarImg} />
                    ) : (
                      <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
                        <Text style={[styles.avatarText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>
                          {p.authorInitials || '??'}
                        </Text>
                      </View>
                    )}
                    <View style={styles.cardMeta}>
                      <Text style={[styles.cardAuthor, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>
                        {p.authorName ? p.authorName.toUpperCase() : 'ANONYMOUS'}
                      </Text>
                      <Text style={styles.cardTime}>{ago}</Text>
                    </View>
                    <View style={[styles.typeBadge, { backgroundColor: badgeBg }]}>
                      <Text style={[styles.typeBadgeText, { color: badgeColor }]}>
                        {isSale ? 'For Sale' : 'Question'}
                      </Text>
                    </View>
                  </View>
                  {p.title ? <Text style={styles.cardTitle}>{p.title}</Text> : null}
                  <Text style={styles.cardBody} numberOfLines={3}>{p.body}</Text>
                  {p.imageUrl ? <FeedImage uri={p.imageUrl} /> : null}
                  <View style={styles.cardFooter}>
                    {isSale && p.price ? <Text style={styles.cardPrice}>{p.price}</Text> : <View />}
                    <View style={styles.commentCountRow}>
                      <ChatBubbleIcon />
                      <Text style={styles.commentCount}>{p.commentCount || 0} comments</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5ede0' },
  headerBlock: { backgroundColor: '#008080', paddingTop: 60, paddingBottom: 25, paddingHorizontal: 16, alignItems: 'center' },
  headerTitle: { fontSize: 32, fontWeight: '900', color: '#f5ede0', letterSpacing: 6, textAlign: 'center' },
  headerSub: { fontSize: 14, color: 'rgba(245,237,224,0.75)', marginTop: 4, textAlign: 'center', letterSpacing: 2 },
  composer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0', paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  composerAvatar: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#008080', alignItems: 'center', justifyContent: 'center' },
  composerAvatarImg: { width: 38, height: 38, borderRadius: 10 },
  composerAvatarText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  composerInput: { flex: 1, backgroundColor: '#f5ede0', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  composerPlaceholder: { fontSize: 13, color: '#aaa' },
  searchRow: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  search: { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: '#003333', borderWidth: 1, borderColor: '#e0d8c8', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  filterRow: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 4, zIndex: 999 },
  dropdownWrapper: { zIndex: 999 },
  dropdownSelect: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: '#e0d8c8', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  dropdownSelectText: { fontSize: 13, color: '#555', fontWeight: '500' },
  inlineMenu: { position: 'absolute', top: 44, left: 0, right: 0, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e0d8c8', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, elevation: 10, zIndex: 1000 },
  dropdownMenuItem: { paddingVertical: 12, paddingHorizontal: 16 },
  dropdownMenuItemActive: { backgroundColor: '#f0fafa' },
  dropdownMenuText: { fontSize: 13, color: '#333' },
  dropdownMenuTextActive: { color: '#008080', fontWeight: '700' },
  list: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 80 },
  card: { backgroundColor: '#fff', borderRadius: 16, marginBottom: 12, padding: 14, borderWidth: 1, borderColor: '#e0d8c8', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  avatar: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  avatarImg: { width: 38, height: 38, borderRadius: 10 },
  avatarText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  cardMeta: { flex: 1 },
  cardAuthor: { fontSize: 14, fontWeight: '700', color: '#111', letterSpacing: 0.5 },
  cardTime: { fontSize: 11, color: '#aaa', marginTop: 1 },
  typeBadge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  typeBadgeText: { fontSize: 10, fontWeight: '600' },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#111', marginBottom: 4 },
  cardBody: { fontSize: 13, color: '#555', lineHeight: 19 },
  cardImage: { borderRadius: 12, marginTop: 10 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  cardPrice: { fontSize: 14, fontWeight: '800', color: '#7A1E1E' },
  commentCountRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  commentCount: { fontSize: 12, color: '#aaa' },
  emptyContainer: { alignItems: 'center', marginTop: 60, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#a0b8b8', marginTop: 8 },
  emptySub: { fontSize: 14, color: '#a0b8b8', textAlign: 'center', paddingHorizontal: 40 },
});