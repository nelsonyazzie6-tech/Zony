import { useLocalSearchParams, useRouter } from 'expo-router';
import { arrayUnion, deleteDoc, doc, getDoc, increment, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../firebaseConfig';

export default function TournamentScreen() {
  const { id, postedBy } = useLocalSearchParams();
  const router = useRouter();
  const [tournament, setTournament] = useState<any>(null);
  const [joined, setJoined] = useState(false);
  const [spotsLeft, setSpotsLeft] = useState(0);
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

  if (!tournament) return null;

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

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
            <Text style={styles.sectionTitle}>🏆 Prizes</Text>
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
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
          <Text style={styles.deleteText}>Delete Tournament</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={[styles.joinBtn, joined && styles.joinedBtn]} onPress={handleJoin} disabled={joined || spotsLeft <= 0}>
          <Text style={styles.joinText}>{joined ? 'Joined ✓' : spotsLeft <= 0 ? 'Full' : 'Join Tournament'}</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5ede0', paddingTop: 60 },
  back: { paddingHorizontal: 20, marginBottom: 16 },
  backText: { fontSize: 16, color: '#e8622a', fontWeight: '600' },
  card: { backgroundColor: '#fff', marginHorizontal: 20, borderRadius: 16, padding: 24, marginBottom: 20 },
  sportBadge: { fontSize: 13, color: '#fff', backgroundColor: '#e8622a', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, overflow: 'hidden', alignSelf: 'flex-start', marginBottom: 12 },
  name: { fontSize: 26, fontWeight: 'bold', color: '#1a0f0a', marginBottom: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#a89080', marginTop: 12, marginBottom: 2 },
  detail: { fontSize: 15, color: '#1a0f0a', marginBottom: 2 },
  spots: { fontSize: 15, color: '#e8622a', fontWeight: '600', marginTop: 16 },
  joinBtn: { backgroundColor: '#e8622a', marginHorizontal: 20, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginBottom: 40 },
  joinedBtn: { backgroundColor: '#a89080' },
  joinText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  deleteBtn: { backgroundColor: '#1a0f0a', marginHorizontal: 20, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginBottom: 40 },
  deleteText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
});