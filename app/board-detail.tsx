import { Rajdhani_700Bold, useFonts } from '@expo-google-fonts/rajdhani';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { deleteDoc, doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';
import { auth, db } from '../firebaseConfig';

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

export default function BoardDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [post, setPost] = useState<any>(null);
  const [fontsLoaded] = useFonts({ Rajdhani_700Bold });
  const [headerHeight, setHeaderHeight] = useState(160);
  const user = auth.currentUser;

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      const snap = await getDoc(doc(db, 'board', id as string));
      if (snap.exists()) setPost({ id: snap.id, ...snap.data() });
    };
    load();
  }, []);

  if (!post) return null;

  const isOwner = user?.uid === post.postedBy;
  const sportColor = getSportColor(post.sport);
  const lookingLabel = getLookingLabel(post.type, post.lookingFor);

  const initials = post.name
    ? post.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
    : post.type === 'Player' ? 'PL' : 'TM';

  const postedDate = post.createdAt?.toDate?.()?.toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  }) || '';

  const handleDelete = () => {
    Alert.alert('Delete Post', 'Are you sure you want to delete this post?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await deleteDoc(doc(db, 'board', id as string));
            router.replace('/(tabs)/board');
          } catch (e: any) { Alert.alert('Error', e.message); }
        }
      }
    ]);
  };

  return (
    <View style={styles.container}>

      <View style={[styles.headerBlock, { backgroundColor: sportColor }]} onLayout={e => setHeaderHeight(e.nativeEvent.layout.height)}>
        <Svg style={StyleSheet.absoluteFill} width="100%" height={headerHeight} viewBox="0 0 390 160" preserveAspectRatio="xMidYMid slice">
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

        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹ Sports Board</Text>
        </TouchableOpacity>

        <View style={styles.heroInner}>
          <View style={styles.avatarLarge}>
            <Text style={[styles.avatarLargeText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>
              {initials}
            </Text>
          </View>
          <View style={styles.heroInfo}>
            <Text style={[styles.heroName, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>
              {post.name ? post.name.toUpperCase() : post.type?.toUpperCase()}
            </Text>
            <View style={styles.badgeRow}>
              {post.sport ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>🏀 {post.sport}</Text>
                </View>
              ) : null}
              {lookingLabel ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{lookingLabel}</Text>
                </View>
              ) : null}
              {post.city ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>📍 {post.city}, {post.state}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {post.description ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>ABOUT</Text>
            <Text style={styles.descriptionText}>{post.description}</Text>
          </View>
        ) : null}

        <View style={styles.infoCard}>
          {post.division ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Division</Text>
              <Text style={styles.infoValue}>{post.division}</Text>
            </View>
          ) : null}
          {post.gender ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Gender</Text>
              <Text style={styles.infoValue}>{post.gender}</Text>
            </View>
          ) : null}
          {post.sport ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Sport</Text>
              <Text style={styles.infoValue}>{post.sport}</Text>
            </View>
          ) : null}
          {post.forTournament ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>For</Text>
              <Text style={styles.infoValue}>{post.forTournament}</Text>
            </View>
          ) : null}
          {post.city ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Location</Text>
              <Text style={styles.infoValue}>{post.city}, {post.state}</Text>
            </View>
          ) : null}
          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.infoLabel}>Looking</Text>
            <Text style={styles.infoValue}>{lookingLabel}</Text>
          </View>
        </View>

        {(post.contactPhone || post.contactEmail) ? (
          <View style={styles.infoCard}>
            <Text style={[styles.sectionLabel, { paddingTop: 14 }]}>CONTACT</Text>
            {post.contactPhone ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Phone</Text>
                <Text style={[styles.infoValueTeal, { color: sportColor }]}>{post.contactPhone}</Text>
              </View>
            ) : null}
            {post.contactEmail ? (
              <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={[styles.infoValueTeal, { color: sportColor }]}>{post.contactEmail}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {postedDate ? (
          <Text style={styles.postedDate}>Posted {postedDate}</Text>
        ) : null}

        {isOwner ? (
          <View style={styles.ownerActions}>
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => router.push({ pathname: '/edit-board', params: { id } })}
              activeOpacity={0.85}
            >
              <Text style={[styles.editBtnText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>EDIT POST</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} activeOpacity={0.85}>
              <Text style={[styles.deleteBtnText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>DELETE POST</Text>
            </TouchableOpacity>
          </View>
        ) : null}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5ede0' },
  headerBlock: { paddingTop: 60, paddingBottom: 24, paddingHorizontal: 20 },
  back: { marginBottom: 16 },
  backText: { fontSize: 16, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
  heroInner: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatarLarge: { width: 72, height: 72, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarLargeText: { color: '#fff', fontSize: 24, fontWeight: '900' },
  heroInfo: { flex: 1 },
  heroName: { color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: 1, marginBottom: 8 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  scroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 48 },
  section: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e8e8e8', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  sectionLabel: { fontSize: 10, fontWeight: '700', color: '#a0b8b8', letterSpacing: 2, marginBottom: 8 },
  descriptionText: { fontSize: 14, color: '#555', lineHeight: 22 },
  infoCard: { backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e8e8e8', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  infoLabel: { fontSize: 13, color: '#a0b8b8', fontWeight: '500' },
  infoValue: { fontSize: 13, color: '#111', fontWeight: '600' },
  infoValueTeal: { fontSize: 13, fontWeight: '600' },
  postedDate: { fontSize: 12, color: '#a0b8b8', textAlign: 'center', marginBottom: 16 },
  ownerActions: { gap: 10 },
  editBtn: { backgroundColor: '#008080', borderRadius: 12, paddingVertical: 16, alignItems: 'center', shadowColor: '#008080', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  editBtnText: { color: '#fff', fontSize: 18, letterSpacing: 1 },
  deleteBtn: { backgroundColor: '#1a1a2e', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  deleteBtnText: { color: '#fff', fontSize: 18, letterSpacing: 1 },
});