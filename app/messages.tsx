import { Rajdhani_700Bold, useFonts } from '@expo-google-fonts/rajdhani';
import { useRouter } from 'expo-router';
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import Svg, { Path, Polygon } from 'react-native-svg';
import { auth, db } from '../firebaseConfig';

function timeAgo(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (days > 0) return `${days}d ago`;
  if (hrs > 0) return `${hrs}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return 'just now';
}

export default function MessagesScreen() {
  const [fontsLoaded] = useFonts({ Rajdhani_700Bold });
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [headerHeight, setHeaderHeight] = useState(120);
  const router = useRouter();
  const user = auth.currentUser;
  const swipeRefs = useRef<{ [key: string]: Swipeable | null }>({});

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'messages'),
      where('participants', 'array-contains', user.uid),
      orderBy('updatedAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setThreads(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => {
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleDelete = async (threadId: string) => {
    try {
      await deleteDoc(doc(db, 'messages', threadId));
    } catch (_) {}
  };

  const renderRightActions = (progress: Animated.AnimatedInterpolation<number>, threadId: string) => {
    const translateX = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [80, 0],
    });
    return (
      <Animated.View style={[styles.deleteAction, { transform: [{ translateX }] }]}>
        <TouchableOpacity
          style={styles.deleteActionBtn}
          onPress={() => {
            swipeRefs.current[threadId]?.close();
            handleDelete(threadId);
          }}
        >
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
          <Text style={styles.deleteActionText}>Delete</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerBlock} onLayout={e => setHeaderHeight(e.nativeEvent.layout.height)}>
        <Svg style={StyleSheet.absoluteFill} width="125%" height={headerHeight} viewBox="0 0 390 130" preserveAspectRatio="xMidYMid slice">
          <Polygon points="0,0 80,30 40,80" fill="white" opacity={0.04} />
          <Polygon points="80,30 160,10 120,70" fill="white" opacity={0.07} />
          <Polygon points="40,80 120,70 80,130" fill="white" opacity={0.05} />
          <Polygon points="160,10 260,50 180,90" fill="white" opacity={0.06} />
          <Polygon points="120,70 180,90 100,130" fill="white" opacity={0.08} />
          <Polygon points="260,50 330,20 310,80" fill="white" opacity={0.05} />
          <Polygon points="180,90 310,80 240,130" fill="white" opacity={0.07} />
          <Polygon points="330,20 450,0 450,60" fill="white" opacity={0.04} />
          <Polygon points="310,80 450,60 450,130" fill="white" opacity={0.06} />
          <Polygon points="0,60 40,80 0,130" fill="white" opacity={0.05} />
          <Polygon points="0,0 40,0 80,30" fill="white" opacity={0.08} />
          <Polygon points="160,10 260,0 260,50" fill="white" opacity={0.04} />
          <Polygon points="260,0 330,20 450,0" fill="white" opacity={0.06} />
          <Polygon points="240,130 310,80 450,130" fill="white" opacity={0.05} />
          <Polygon points="80,130 180,90 240,130" fill="white" opacity={0.04} />
          <Polygon points="0,0 0,60 40,80 0,130 80,130 40,80" fill="white" opacity={0.03} />
          <Polygon points="0,60 0,0 40,0 80,30 40,80" fill="white" opacity={0.03} />
        </Svg>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.header, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>MESSAGES</Text>
        <Text style={[styles.sub, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>Direct conversations</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#008080" style={{ marginTop: 60 }} />
      ) : threads.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Svg width={64} height={64} viewBox="0 0 64 64" fill="none">
            <Path d="M12 16h40a4 4 0 0 1 4 4v20a4 4 0 0 1-4 4H20l-8 6V20a4 4 0 0 1 4-4Z" stroke="#a0b8b8" strokeWidth="2" strokeLinejoin="round" />
          </Svg>
          <Text style={styles.emptyTitle}>No messages yet</Text>
          <Text style={styles.emptySub}>Message a player or seller from their post.</Text>
        </View>
      ) : (
        <FlatList
          data={threads}
          keyExtractor={(t: any) => t.id}
          contentContainerStyle={styles.list}
          renderItem={({ item: t }: any) => {
            const other = t.participantNames?.[t.participants.find((p: string) => p !== user?.uid)] || 'Unknown';
            const otherInitials = other.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
            const ago = t.updatedAt?.seconds ? timeAgo(Math.floor(Date.now() / 1000) - t.updatedAt.seconds) : '';
            const unread = t.unreadCount?.[user?.uid] > 0;
            return (
              <Swipeable
                ref={ref => { swipeRefs.current[t.id] = ref; }}
                renderRightActions={(progress) => renderRightActions(progress, t.id)}
                rightThreshold={40}
                overshootRight={false}
              >
                <TouchableOpacity
                  style={styles.threadCard}
                  activeOpacity={0.85}
                  onPress={() => router.push({ pathname: '/chat', params: { threadId: t.id, otherName: other } })}
                >
                  <View style={styles.threadAvatar}>
                    <Text style={[styles.threadAvatarText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>{otherInitials}</Text>
                  </View>
                  <View style={styles.threadInfo}>
                    <View style={styles.threadTopRow}>
                      <Text style={[styles.threadName, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }, unread && styles.threadNameUnread]}>
                        {other.toUpperCase()}
                      </Text>
                      <Text style={styles.threadTime}>{ago}</Text>
                    </View>
                    <Text style={[styles.threadPreview, unread && styles.threadPreviewUnread]} numberOfLines={1}>
                      {t.lastMessage || 'Start of conversation'}
                    </Text>
                    {t.context ? <Text style={styles.threadContext} numberOfLines={1}>re: {t.context}</Text> : null}
                  </View>
                  {unread && <View style={styles.unreadDot} />}
                </TouchableOpacity>
              </Swipeable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5ede0' },
  headerBlock: { backgroundColor: '#003333', paddingTop: 60, paddingBottom: 16, paddingHorizontal: 20 },
  backBtn: { marginBottom: 10 },
  backText: { color: 'rgba(255,255,255,0.8)', fontSize: 15, fontWeight: '600' },
  header: { fontSize: 28, fontWeight: '900', color: '#fff', letterSpacing: 3 },
  sub: { fontSize: 14, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  list: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 80 },
  threadCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#e8e8e8', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  threadAvatar: { width: 46, height: 46, borderRadius: 12, backgroundColor: '#008080', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  threadAvatarText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  threadInfo: { flex: 1 },
  threadTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  threadName: { fontSize: 14, fontWeight: '700', color: '#111', letterSpacing: 0.5 },
  threadNameUnread: { color: '#003333' },
  threadTime: { fontSize: 11, color: '#aaa' },
  threadPreview: { fontSize: 13, color: '#888', marginBottom: 2 },
  threadPreviewUnread: { color: '#333', fontWeight: '600' },
  threadContext: { fontSize: 11, color: '#a0b8b8', fontStyle: 'italic' },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#008080', marginLeft: 8 },
  emptyContainer: { alignItems: 'center', marginTop: 80, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#a0b8b8', marginTop: 8 },
  emptySub: { fontSize: 14, color: '#a0b8b8', textAlign: 'center', paddingHorizontal: 40 },
  deleteAction: { width: 80, marginBottom: 10, borderRadius: 16, overflow: 'hidden' },
  deleteActionBtn: { flex: 1, backgroundColor: '#7A1E1E', alignItems: 'center', justifyContent: 'center', gap: 4 },
  deleteActionText: { color: '#fff', fontSize: 11, fontWeight: '600' },
});