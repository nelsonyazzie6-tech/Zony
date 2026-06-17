import { Rajdhani_700Bold, useFonts } from '@expo-google-fonts/rajdhani';
import { useRouter } from 'expo-router';
import { collection, deleteDoc, doc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, FlatList, Modal, PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../../firebaseConfig';

function SwipeToDelete({ onDelete, children }: { onDelete: () => void; children: React.ReactNode }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const deleteWidth = useRef(new Animated.Value(0)).current;
  const threshold = -70;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: (_, g) => {
        if (g.dx < 0) {
          translateX.setValue(Math.max(g.dx, -80));
          deleteWidth.setValue(Math.min(-g.dx, 80));
        }
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx < threshold) {
          Animated.parallel([
            Animated.spring(translateX, { toValue: -80, useNativeDriver: false }),
            Animated.spring(deleteWidth, { toValue: 80, useNativeDriver: false }),
          ]).start();
        } else {
          Animated.parallel([
            Animated.spring(translateX, { toValue: 0, useNativeDriver: false }),
            Animated.spring(deleteWidth, { toValue: 0, useNativeDriver: false }),
          ]).start();
        }
      },
    })
  ).current;

  const handleDelete = () => {
    Animated.parallel([
      Animated.timing(translateX, { toValue: -400, duration: 200, useNativeDriver: false }),
      Animated.timing(deleteWidth, { toValue: 0, duration: 200, useNativeDriver: false }),
    ]).start(() => onDelete());
  };

  return (
    <View style={{ overflow: 'hidden', marginBottom: 4 }}>
      <Animated.View style={[styles.swipeDelete, { width: deleteWidth, position: 'absolute', right: 0, top: 0, bottom: 0 }]}>
        <TouchableOpacity onPress={handleDelete} style={styles.swipeDeleteInner}>
          <Text style={styles.swipeDeleteText}>Delete</Text>
        </TouchableOpacity>
      </Animated.View>
      <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
}

function parseLink(link: string): { pathname: string; params?: Record<string, string> } {
  try {
    const [pathname, search] = link.split('?');
    if (!search) return { pathname };
    const params: Record<string, string> = {};
    search.split('&').forEach(pair => {
      const [key, val] = pair.split('=');
      if (key && val) params[decodeURIComponent(key)] = decodeURIComponent(val);
    });
    return { pathname, params };
  } catch {
    return { pathname: link };
  }
}

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [fontsLoaded] = useFonts({ Rajdhani_700Bold });
  const router = useRouter();
  const user = auth.currentUser;

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
    } catch (e: any) { console.error(e); }
  };

  const handleMarkRead = async (id: string, alreadyRead: boolean) => {
    if (alreadyRead) return;
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (e: any) { console.error(e); }
  };

  const handleMarkAllRead = () => {
    notifications.forEach((n: any) => {
      if (!n.read) handleMarkRead(n.id, false);
    });
  };

  const handleClearAll = async () => {
    setClearing(true);
    try {
      await Promise.all(notifications.map((n: any) => deleteDoc(doc(db, 'notifications', n.id))));
    } catch (e: any) { console.error(e); }
    setClearing(false);
    setShowClearModal(false);
  };

  const handleNotificationPress = (n: any) => {
    handleMarkRead(n.id, n.read === true);
    if (!n.link) return;
    try {
      const parsed = parseLink(n.link);
      router.push(parsed as any);
    } catch {
      console.log('Navigation failed for link:', n.link);
    }
  };

  const renderItem = ({ item: n }: any) => {
    const isRead = n.read === true;
    return (
      <SwipeToDelete onDelete={() => handleDelete(n.id)}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => handleNotificationPress(n)}
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
      </SwipeToDelete>
    );
  };

  const renderFooter = () => {
    if (notifications.length === 0) return null;
    return (
      <TouchableOpacity style={styles.clearAllBtn} onPress={() => setShowClearModal(true)}>
        <Text style={styles.clearAllText}>Clear All</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.handleBar} />
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

      <Modal visible={showClearModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={[styles.modalTitle, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>CLEAR ALL</Text>
            <Text style={styles.modalMsg}>Remove all notifications? This can't be undone.</Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowClearModal(false)}>
                <Text style={[styles.modalCancelText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleClearAll} disabled={clearing}>
                <Text style={[styles.modalConfirmText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>{clearing ? 'CLEARING...' : 'CLEAR ALL'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  card: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#fff', borderRadius: 16, padding: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
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
  swipeDelete: { justifyContent: 'center', alignItems: 'center', borderRadius: 16 },
  swipeDeleteInner: { flex: 1, width: '100%', backgroundColor: '#cc4444', justifyContent: 'center', alignItems: 'center', borderRadius: 16 },
  swipeDeleteText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  clearAllBtn: { alignSelf: 'center', marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, opacity: 0.5 },
  clearAllText: { fontSize: 13, color: '#bbb', fontWeight: '400' },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 50, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#003333', marginBottom: 8 },
  emptySub: { fontSize: 15, color: '#a0b8b8', textAlign: 'center', paddingHorizontal: 40 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  modalBox: { backgroundColor: '#f5ede0', borderRadius: 24, padding: 24, width: '100%', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 16, elevation: 8 },
  modalTitle: { fontSize: 22, color: '#003333', letterSpacing: 2, marginBottom: 8, textAlign: 'center' },
  modalMsg: { fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  modalBtns: { flexDirection: 'row', gap: 10 },
  modalCancelBtn: { flex: 1, backgroundColor: '#fff', borderRadius: 14, paddingVertical: 13, alignItems: 'center', borderWidth: 1, borderColor: '#e0d8c8' },
  modalCancelText: { fontSize: 15, color: '#555', letterSpacing: 1 },
  modalConfirmBtn: { flex: 1, backgroundColor: '#003333', borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
  modalConfirmText: { fontSize: 15, color: '#fff', letterSpacing: 1 },
});