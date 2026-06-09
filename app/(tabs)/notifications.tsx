import { Rajdhani_700Bold, useFonts } from '@expo-google-fonts/rajdhani';
import { collection, deleteDoc, doc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { auth, db } from '../../firebaseConfig';

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fontsLoaded] = useFonts({ Rajdhani_700Bold });
  const user = auth.currentUser;
  const swipeRefs = useRef<{ [key: string]: Swipeable | null }>({});

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const q = query(collection(db, 'notifications'), where('toUserId', '==', user.uid));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a: any, b: any) => b.createdAt?.seconds - a.createdAt?.seconds);
      setNotifications(data);
      setLoading(false);
    }, (error) => {
      console.log('Notifications error:', error);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', id));
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleMarkRead = async (id: string, alreadyRead: boolean) => {
    if (alreadyRead) return;
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (e: any) {
      console.log('Mark read error:', e.message);
    }
  };

  const handleMarkAllRead = () => {
    notifications.forEach((n: any) => {
      if (!n.read) handleMarkRead(n.id, false);
    });
  };

  const handleClearAll = () => {
    Alert.alert('Clear All', 'Delete all notifications?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear All', style: 'destructive', onPress: async () => {
          try {
            await Promise.all(notifications.map((n: any) => deleteDoc(doc(db, 'notifications', n.id))));
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        }
      }
    ]);
  };

  const renderRightActions = (progress: Animated.AnimatedInterpolation<number>, id: string) => {
    const trans = progress.interpolate({ inputRange: [0, 1], outputRange: [80, 0] });
    return (
      <Animated.View style={[styles.swipeDelete, { transform: [{ translateX: trans }] }]}>
        <TouchableOpacity onPress={() => handleDelete(id)} style={styles.swipeDeleteInner}>
          <Text style={styles.swipeDeleteText}>Delete</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderItem = ({ item: n }: any) => {
    const isRead = n.read === true;
    return (
      <Swipeable
        ref={ref => { swipeRefs.current[n.id] = ref; }}
        renderRightActions={(progress) => renderRightActions(progress, n.id)}
        onSwipeableOpen={() => handleDelete(n.id)}
        rightThreshold={60}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => handleMarkRead(n.id, isRead)}
          style={[styles.card, isRead && styles.cardRead]}
        >
          <View style={styles.cardIcon}>
            <Text style={styles.cardIconText}>🔔</Text>
          </View>
          <View style={styles.cardContent}>
            <View style={styles.cardTopRow}>
              <Text style={[styles.message, isRead && styles.messageRead]} numberOfLines={1}>{n.message}</Text>
              <Text style={styles.time}>{n.createdAt?.toDate?.()?.toLocaleDateString()}</Text>
            </View>
            {n.body ? <Text style={styles.cardBody} numberOfLines={2}>{n.body}</Text> : null}
          </View>
          {!isRead && <View style={styles.unreadDot} />}
        </TouchableOpacity>
      </Swipeable>
    );
  };

  const renderFooter = () => {
    if (notifications.length === 0) return null;
    return (
      <TouchableOpacity style={styles.clearAllBtn} onPress={handleClearAll}>
        <Text style={styles.clearAllText}>Clear All</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>

      {/* Handle bar */}
      <View style={styles.handleBar} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>NOTIFICATIONS</Text>
        <TouchableOpacity onPress={handleMarkAllRead}>
          <Text style={styles.markAllRead}>Mark all read</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#008080" style={{ marginTop: 60 }} />
      ) : notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🔔</Text>
          <Text style={styles.emptyTitle}>No notifications yet</Text>
          <Text style={styles.emptySub}>You'll see activity here when someone joins your tournament.</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={n => n.id}
          contentContainerStyle={styles.list}
          renderItem={renderItem}
          ListFooterComponent={renderFooter}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0E8', paddingTop: 12 },
  handleBar: { width: 40, height: 4, backgroundColor: '#ccc', borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.08)' },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#111', letterSpacing: 2 },
  markAllRead: { fontSize: 12, color: '#008080', fontWeight: '600' },
  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40 },
  card: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#fff', borderRadius: 16, padding: 12,
    marginBottom: 4, shadowColor: '#000', shadowOpacity: 0.04,
    shadowRadius: 4, elevation: 1,
  },
  cardRead: { backgroundColor: 'transparent' },
  cardIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(0,128,128,0.1)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardIconText: { fontSize: 20 },
  cardContent: { flex: 1 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  message: { fontSize: 14, fontWeight: '700', color: '#111', flex: 1 },
  messageRead: { fontWeight: '500', color: '#666' },
  cardBody: { fontSize: 12, color: '#aaa', marginTop: 2, lineHeight: 16 },
  time: { fontSize: 10, color: '#aaa', flexShrink: 0 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#8B1A1A', marginTop: 4, flexShrink: 0 },
  swipeDelete: { width: 80, marginBottom: 4 },
  swipeDeleteInner: { flex: 1, backgroundColor: '#cc4444', justifyContent: 'center', alignItems: 'center', borderRadius: 16 },
  swipeDeleteText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  clearAllBtn: { alignSelf: 'center', marginTop: 16, paddingHorizontal: 20, paddingVertical: 10 },
  clearAllText: { fontSize: 13, color: '#aaa', fontWeight: '500' },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 50, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#003333', marginBottom: 8 },
  emptySub: { fontSize: 15, color: '#a0b8b8', textAlign: 'center', paddingHorizontal: 40 },
});