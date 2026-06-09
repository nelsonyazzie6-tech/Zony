import { Rajdhani_700Bold, useFonts } from '@expo-google-fonts/rajdhani';
import { useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Path, Polygon } from 'react-native-svg';
import { auth } from '../../firebaseConfig';

const DUMMY_POSTS = [
  {
    id: '1',
    type: 'For Sale',
    author: 'Aaliyah R.',
    initials: 'AR',
    avatarColor: '#8B1A1A',
    time: '2h ago',
    title: 'Nike Volleyball Jersey — Size M',
    body: 'Worn twice, great condition. Navy blue. Perfect for 14U–18U players.',
    price: '$35',
  },
  {
    id: '2',
    type: 'Question',
    author: 'Jordan C.',
    initials: 'JC',
    avatarColor: '#008080',
    time: '4h ago',
    title: null,
    body: 'Anyone know a good ref service for youth basketball tournaments in the Phoenix area? Planning a 10U event in August.',
    price: null,
  },
  {
    id: '3',
    type: 'For Sale',
    author: 'Marcus W.',
    initials: 'MW',
    avatarColor: '#aaa',
    time: 'Yesterday',
    title: 'Ball bag + 2 Spalding basketballs',
    body: 'Selling a barely used ball bag + 2 Spalding basketballs. Great for a team. Asking $60 for all.',
    price: '$60',
  },
];

const filterOptions = [
  { label: 'All', value: 'All' },
  { label: 'For Sale', value: 'For Sale' },
  { label: 'Questions', value: 'Question' },
];

export default function CommunityScreen() {
  const [headerHeight, setHeaderHeight] = useState(120);
  const [fontsLoaded] = useFonts({ Rajdhani_700Bold });
  const [filter, setFilter] = useState('All');
  const [showFilter, setShowFilter] = useState(false);
  const user = auth.currentUser;
  const initials = user?.email?.slice(0, 2).toUpperCase() || 'ME';

  const filterLabel = filterOptions.find(o => o.value === filter)?.label || 'All';
  const filteredPosts = filter === 'All' ? DUMMY_POSTS : DUMMY_POSTS.filter(p => p.type === filter);

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
        <Text style={[styles.header, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>COMMUNITY</Text>
        <Text style={[styles.sub, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>Connect beyond the game</Text>
      </View>

      {/* Post composer */}
      <View style={styles.composer}>
        <View style={styles.composerAvatar}>
          <Text style={styles.composerAvatarText}>{initials}</Text>
        </View>
        <TouchableOpacity style={styles.composerInput}>
          <Text style={styles.composerPlaceholder}>Ask a question or post gear for sale...</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.composerImageBtn}>
          <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
            <Path d="M2 2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z" stroke="#888" strokeWidth="1.4" />
            <Path d="M5 9l2.5-3L10 9" stroke="#888" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>
      </View>

      {/* Filter dropdown */}
      <View style={styles.filterRow}>
        <View style={styles.dropdownWrapper}>
          <TouchableOpacity
            style={styles.dropdownSelect}
            onPress={() => setShowFilter(!showFilter)}
          >
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

      {/* Feed */}
      <FlatList
        data={filteredPosts}
        keyExtractor={p => p.id}
        contentContainerStyle={styles.list}
        renderItem={({ item: p }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <View style={[styles.avatar, { backgroundColor: p.avatarColor }]}>
                <Text style={styles.avatarText}>{p.initials}</Text>
              </View>
              <View style={styles.cardMeta}>
                <Text style={styles.cardAuthor}>{p.author}</Text>
                <Text style={styles.cardTime}>{p.time} · {p.type}</Text>
              </View>
              <View style={[styles.typeBadge, p.type === 'Question' && styles.typeBadgeQuestion]}>
                <Text style={[styles.typeBadgeText, p.type === 'Question' && styles.typeBadgeTextQuestion]}>{p.type}</Text>
              </View>
            </View>
            {p.title ? <Text style={styles.cardTitle}>{p.title}</Text> : null}
            <Text style={styles.cardBody}>{p.body}</Text>
            {p.price ? (
              <View style={styles.cardFooter}>
                <Text style={styles.cardPrice}>{p.price}</Text>
                <TouchableOpacity style={styles.messageBtn}>
                  <Text style={styles.messageBtnText}>Message</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.cardFooter}>
                <TouchableOpacity style={styles.replyBtn}>
                  <Text style={styles.replyBtnText}>Reply</Text>
                </TouchableOpacity>
                <Text style={styles.repliesText}>3 replies</Text>
              </View>
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0E8' },
  headerBlock: { backgroundColor: '#008080', paddingTop: 60, paddingBottom: 16, paddingHorizontal: 0 },
  header: { fontSize: 28, fontWeight: '900', color: '#fff', textAlign: 'center', letterSpacing: 3 },
  sub: { fontSize: 14, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginTop: 2 },
  composer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0', paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  composerAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#008080', alignItems: 'center', justifyContent: 'center' },
  composerAvatarText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  composerInput: { flex: 1, backgroundColor: '#F5F0E8', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  composerPlaceholder: { fontSize: 13, color: '#aaa' },
  composerImageBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#F5F0E8', alignItems: 'center', justifyContent: 'center' },
  filterRow: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4, zIndex: 999 },
  dropdownWrapper: { zIndex: 999 },
  dropdownSelect: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: '#e8e8e8', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  dropdownSelectText: { fontSize: 13, color: '#555', fontWeight: '500' },
  inlineMenu: { position: 'absolute', top: 44, left: 0, right: 0, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e8e8e8', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, elevation: 10, zIndex: 1000 },
  dropdownMenuItem: { paddingVertical: 12, paddingHorizontal: 16 },
  dropdownMenuItemActive: { backgroundColor: '#f0fafa' },
  dropdownMenuText: { fontSize: 13, color: '#333' },
  dropdownMenuTextActive: { color: '#008080', fontWeight: '700' },
  list: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 80 },
  card: { backgroundColor: '#fff', borderRadius: 16, marginBottom: 12, padding: 14, borderWidth: 1, borderColor: '#e8e8e8', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  avatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  cardMeta: { flex: 1 },
  cardAuthor: { fontSize: 13, fontWeight: '700', color: '#111' },
  cardTime: { fontSize: 11, color: '#aaa', marginTop: 1 },
  typeBadge: { backgroundColor: 'rgba(0,128,128,0.1)', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  typeBadgeQuestion: { backgroundColor: 'rgba(234,179,8,0.1)' },
  typeBadgeText: { fontSize: 10, color: '#008080', fontWeight: '600' },
  typeBadgeTextQuestion: { color: '#ca8a04' },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#111', marginBottom: 4 },
  cardBody: { fontSize: 13, color: '#555', lineHeight: 19 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  cardPrice: { fontSize: 14, fontWeight: '800', color: '#008080' },
  messageBtn: { backgroundColor: '#008080', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  messageBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  replyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  replyBtnText: { fontSize: 12, color: '#aaa' },
  repliesText: { fontSize: 12, color: '#aaa' },
});