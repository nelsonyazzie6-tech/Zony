import { collection, deleteDoc, doc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { auth, db } from '../../firebaseConfig';

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
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
          {!isRead && <View style={styles.unreadDot} />}
          <Text style={[styles.message, isRead && styles.messageRead]}>{n.message}</Text>
          <Text style={styles.time}>{n.createdAt?.toDate?.()?.toLocaleDateString()}</Text>
          {isRead && <Text style={styles.readLabel}>Read</Text>}
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
      <Text style={styles.header}>Notifications</Text>
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
  container: { flex: 1, backgroundColor: '#f0fafa', paddingTop: 60 },
  header: { fontSize: 36, fontWeight: 'bold', color: '#003333', textAlign: 'center', marginBottom: 20 },
  list: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 40 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    shadowColor: '#008080', shadowOpacity: 0.08, shadowRadius: 8, elevation: 2,
    borderWidth: 1, borderColor: '#e0f5f5', marginBottom: 10, position: 'relative',
  },
  cardRead: { backgroundColor: '#f9f9f9', borderColor: '#ddd' },
  unreadDot: {
    position: 'absolute', top: 14, right: 14,
    width: 9, height: 9, borderRadius: 5, backgroundColor: '#008080',
  },
  message: { fontSize: 15, color: '#003333', marginBottom: 4, paddingRight: 16 },
  messageRead: { color: '#5a7a7a' },
  readLabel: { fontSize: 11, color: '#a0b8b8', marginTop: 4 },
  time: { fontSize: 12, color: '#5a7a7a' },
  swipeDelete: { width: 80, marginBottom: 10 },
  swipeDeleteInner: {
    flex: 1, backgroundColor: '#cc4444',
    justifyContent: 'center', alignItems: 'center', borderRadius: 12,
  },
  swipeDeleteText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  clearAllBtn: { alignSelf: 'center', marginTop: 16, paddingHorizontal: 20, paddingVertical: 10 },
  clearAllText: { fontSize: 14, color: '#a0b8b8', fontWeight: '500' },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 50, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#003333', marginBottom: 8 },
  emptySub: { fontSize: 15, color: '#a0b8b8', textAlign: 'center', paddingHorizontal: 40 },
});