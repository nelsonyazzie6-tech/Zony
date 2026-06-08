import { useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, arrayUnion, collection, deleteDoc, doc, getDoc, increment, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../firebaseConfig';

export default function TournamentScreen() {
  const { id, postedBy } = useLocalSearchParams();
  const router = useRouter();
  const [tournament, setTournament] = useState<any>(null);
  const [joined, setJoined] = useState(false);
  const [spotsLeft, setSpotsLeft] = useState(0);
  const [comments, setComments] = useState([]);
  const [comment, setComment] = useState('');
  const user = auth.currentUser;
  const isOwner = user?.uid === postedBy;

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      const snap = await getDoc(doc(db, 'tournaments', id as string));
      if (snap.exists()) {
        const data = snap.data();
        setTournament(data);
        setSpotsLeft(data.spots);
        if (data.joinedUsers?.includes(user?.uid)) setJoined(true);
      }
    };
    load();

    const commentsQuery = query(collection(db, 'tournaments', id as string, 'comments'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(commentsQuery, (snap) => {
      setComments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  const handleJoin = async () => {
    if (!user) {
      Alert.alert('Sign in required', 'You need to be logged in to join a tournament.');
      return;
    }
    if (spotsLeft <= 0) {
      Alert.alert('Full', 'This tournament is full.');
      return;
    }
    try {
      await updateDoc(doc(db, 'tournaments', id as string), {
        joinedUsers: arrayUnion(user.uid),
        spots: increment(-1),
      });
      setJoined(true);
      setSpotsLeft(prev => prev - 1);
      Alert.alert('Joined!', `You joined ${tournament?.name}`);

      const ownerSnap = await getDoc(doc(db, 'users', postedBy as string));
      if (ownerSnap.exists() && ownerSnap.data().pushToken) {
        await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: ownerSnap.data().pushToken,
            title: '🏆 Someone joined your tournament!',
            body: `${user.email} joined ${tournament?.name}`,
          }),
        });
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Tournament', 'Are you sure you want to delete this tournament?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await deleteDoc(doc(db, 'tournaments', id as string));
            router.replace('/');
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        }
      }
    ]);
  };

  const handleCancelToggle = () => {
    const isCanceled = tournament.status === 'canceled';
    Alert.alert(
      isCanceled ? 'Reactivate Tournament' : 'Cancel Tournament',
      isCanceled ? 'Mark this tournament as active again?' : 'Mark this tournament as canceled?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes', onPress: async () => {
            const newStatus = isCanceled ? 'active' : 'canceled';
            await updateDoc(doc(db, 'tournaments', id as string), { status: newStatus });
            setTournament((prev: any) => ({ ...prev, status: newStatus }));
          }
        }
      ]
    );
  };

  const handleShare = async () => {
    if (!tournament) return;
    try {
      await Share.share({
        message: `🏆 ${tournament.name}\n📅 ${tournament.date}\n📍 ${tournament.city}, ${tournament.state}${tournament.entryFee ? `\n💵 Entry: ${tournament.entryFee}` : ''}${tournament.contactPhone ? `\n📞 ${tournament.contactPhone}` : ''}\n\nFind this tournament on Zony!`,
      });
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleComment = async () => {
    if (!comment.trim() || !user) return;
    try {
      await addDoc(collection(db, 'tournaments', id as string, 'comments'), {
        text: comment.trim(),
        userEmail: user.email,
        createdAt: serverTimestamp(),
      });
      setComment('');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  if (!tournament) return null;

  const isCanceled = tournament.status === 'canceled';

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container}>
        <View style={styles.topRow}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleShare} style={styles.shareBtn}>
            <Text style={styles.shareText}>Share ↗</Text>
          </TouchableOpacity>
        </View>

        {isCanceled && (
          <View style={styles.canceledBanner}>
            <Text style={styles.canceledBannerText}>⚠️ This tournament has been canceled</Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.sportBadge}>{tournament.sport}</Text>
          <Text style={styles.name}>{tournament.name}</Text>

          <Text style={styles.sectionTitle}>📅 Date</Text>
          <Text style={styles.detail}>{tournament.date}</Text>

          <Text style={styles.sectionTitle}>📍 Location</Text>
          {tournament.address ? <Text style={styles.detail}>{tournament.address}</Text> : null}
          <Text style={styles.detail}>{tournament.city}, {tournament.state} {tournament.zip}</Text>

          {tournament.divisions?.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>🏅 Divisions</Text>
              <Text style={styles.detail}>{tournament.divisions.join(' · ')}</Text>
            </>
          )}

          {tournament.entryFee ? (
            <>
              <Text style={styles.sectionTitle}>💵 Entry Fee</Text>
              <Text style={styles.detail}>{tournament.entryFee} per team</Text>
            </>
          ) : null}

          {tournament.spectatorFee ? (
            <>
              <Text style={styles.sectionTitle}>🎟 Spectator Fee</Text>
              <Text style={styles.detail}>{tournament.spectatorFee} at the door</Text>
            </>
          ) : null}

          {tournament.rosterSize ? (
            <>
              <Text style={styles.sectionTitle}>👥 Roster Size</Text>
              <Text style={styles.detail}>{tournament.rosterSize} players</Text>
            </>
          ) : null}

          {tournament.prizes ? (
            <>
              <Text style={styles.sectionTitle}>{tournament.prizeType === 'other' ? '🏆 Prizes' : '💵 Prize Money'}</Text>
              <Text style={styles.detail}>{tournament.prizes}</Text>
            </>
          ) : null}

          {tournament.depositAmount ? (
            <>
              <Text style={styles.sectionTitle}>💰 Deposit</Text>
              <Text style={styles.detail}>{tournament.depositAmount}{tournament.depositDue ? ` due by ${tournament.depositDue}` : ''}</Text>
            </>
          ) : null}

          {tournament.contactName || tournament.contactPhone ? (
            <>
              <Text style={styles.sectionTitle}>📞 Contact</Text>
              {tournament.contactName ? <Text style={styles.detail}>{tournament.contactName}</Text> : null}
              {tournament.contactPhone ? <Text style={styles.detail}>{tournament.contactPhone}</Text> : null}
            </>
          ) : null}

          <Text style={styles.spots}>{spotsLeft} spots left</Text>
        </View>

        {isOwner ? (
          <View style={styles.ownerActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelToggle}>
              <Text style={styles.cancelBtnText}>{isCanceled ? 'Mark as Active' : 'Cancel Tournament'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
              <Text style={styles.deleteText}>Delete Tournament</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={[styles.joinBtn, (joined || isCanceled) && styles.joinedBtn]} onPress={handleJoin} disabled={joined || spotsLeft <= 0 || isCanceled}>
            <Text style={styles.joinText}>{isCanceled ? 'Canceled' : joined ? 'Joined ✓' : spotsLeft <= 0 ? 'Full' : 'Join Tournament'}</Text>
          </TouchableOpacity>
        )}

        <View style={styles.commentsSection}>
          <Text style={styles.commentsTitle}>Comments</Text>
          {comments.length === 0 ? (
            <Text style={styles.noComments}>No comments yet. Be the first!</Text>
          ) : (
            comments.map((c: any) => (
              <View key={c.id} style={styles.commentCard}>
                <Text style={styles.commentEmail}>{c.userEmail}</Text>
                <Text style={styles.commentText}>{c.text}</Text>
              </View>
            ))
          )}

          <View style={styles.commentInput}>
            <TextInput
              style={styles.input}
              placeholder="Ask a question..."
              placeholderTextColor="#a0b8b8"
              value={comment}
              onChangeText={setComment}
            />
            <TouchableOpacity style={styles.sendBtn} onPress={handleComment}>
              <Text style={styles.sendText}>Post</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5ede0', paddingTop: 60 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 16 },
  backText: { fontSize: 16, color: '#008080', fontWeight: '600' },
  shareBtn: { backgroundColor: '#e0f5f5', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  shareText: { fontSize: 14, color: '#008080', fontWeight: '600' },
  canceledBanner: { backgroundColor: '#cc4444', marginHorizontal: 20, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16, marginBottom: 12 },
  canceledBannerText: { color: '#fff', fontWeight: 'bold', fontSize: 14, textAlign: 'center' },
  card: { backgroundColor: '#fff', marginHorizontal: 20, borderRadius: 16, padding: 24, marginBottom: 20, borderWidth: 1, borderColor: '#e0f5f5' },
  sportBadge: { fontSize: 13, color: '#fff', backgroundColor: '#008080', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, overflow: 'hidden', alignSelf: 'flex-start', marginBottom: 12 },
  name: { fontSize: 26, fontWeight: 'bold', color: '#003333', marginBottom: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#5a7a7a', marginTop: 12, marginBottom: 2 },
  detail: { fontSize: 15, color: '#003333', marginBottom: 2 },
  spots: { fontSize: 15, color: '#008080', fontWeight: '600', marginTop: 16 },
  ownerActions: { marginHorizontal: 20, gap: 10, marginBottom: 20 },
  cancelBtn: { backgroundColor: '#fff', borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 2, borderColor: '#cc4444' },
  cancelBtnText: { color: '#cc4444', fontSize: 16, fontWeight: 'bold' },
  joinBtn: { backgroundColor: '#008080', marginHorizontal: 20, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginBottom: 20 },
  joinedBtn: { backgroundColor: '#a0b8b8' },
  joinText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  deleteBtn: { backgroundColor: '#003333', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  deleteText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  commentsSection: { marginHorizontal: 20, marginBottom: 40 },
  commentsTitle: { fontSize: 18, fontWeight: 'bold', color: '#003333', marginBottom: 12 },
  noComments: { fontSize: 14, color: '#a0b8b8', marginBottom: 16 },
  commentCard: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#e0f5f5' },
  commentEmail: { fontSize: 12, color: '#5a7a7a', marginBottom: 4 },
  commentText: { fontSize: 14, color: '#003333' },
  commentInput: { flexDirection: 'row', gap: 8, marginTop: 12 },
  input: { flex: 1, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#003333', borderWidth: 1, borderColor: '#e0f0f0' },
  sendBtn: { backgroundColor: '#008080', borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center' },
  sendText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
});