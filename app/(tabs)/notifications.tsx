import { collection, deleteDoc, doc, onSnapshot, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../../firebaseConfig';

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    const q = query(collection(db, 'notifications'), where('toUserId', '==', user.uid));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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

  const renderItem = ({ item: n }: any) => (
    <View style={styles.cardWrapper}>
      <View style={styles.card}>
        <Text style={styles.message}>{n.message}</Text>
        <Text style={styles.time}>{n.createdAt?.toDate?.()?.toLocaleDateString()}</Text>
      </View>
      <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(n.id)}>
        <Text style={styles.deleteBtnText}>Delete</Text>
      </TouchableOpacity>
    </View>
  );

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
  cardWrapper: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  card: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 16, shadowColor: '#008080', shadowOpacity: 0.08, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: '#e0f5f5' },
  message: { fontSize: 15, color: '#003333', marginBottom: 4 },
  time: { fontSize: 12, color: '#5a7a7a' },
  deleteBtn: { backgroundColor: '#cc4444', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  deleteBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  clearAllBtn: { alignSelf: 'center', marginTop: 16, paddingHorizontal: 20, paddingVertical: 10 },
  clearAllText: { fontSize: 14, color: '#a0b8b8', fontWeight: '500' },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 50, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#003333', marginBottom: 8 },
  emptySub: { fontSize: 15, color: '#a0b8b8', textAlign: 'center', paddingHorizontal: 40 },
});