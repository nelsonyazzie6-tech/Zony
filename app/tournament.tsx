import { useLocalSearchParams, useRouter } from 'expo-router';
import { arrayUnion, doc, updateDoc } from 'firebase/firestore';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../firebaseConfig';

export default function TournamentScreen() {
  const { id, name, sport, date, location, spots } = useLocalSearchParams();
  const router = useRouter();
  const [joined, setJoined] = useState(false);

  const handleJoin = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Sign in required', 'You need to be logged in to join a tournament.');
      return;
    }
    try {
      await updateDoc(doc(db, 'tournaments', id as string), {
        joinedUsers: arrayUnion(user.uid),
      });
      setJoined(true);
      Alert.alert('Joined!', `You joined ${name}`);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <View style={styles.card}>
        <Text style={styles.sportBadge}>{sport}</Text>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.detail}>📅 {date}</Text>
        <Text style={styles.detail}>📍 {location}</Text>
        <Text style={styles.spots}>{spots} spots left</Text>
      </View>

      <TouchableOpacity style={[styles.joinBtn, joined && styles.joinedBtn]} onPress={handleJoin} disabled={joined}>
        <Text style={styles.joinText}>{joined ? 'Joined ✓' : 'Join Tournament'}</Text>
      </TouchableOpacity>
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
  detail: { fontSize: 16, color: '#7a4a2a', marginBottom: 8 },
  spots: { fontSize: 15, color: '#e8622a', fontWeight: '600', marginTop: 8 },
  joinBtn: { backgroundColor: '#e8622a', marginHorizontal: 20, borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  joinedBtn: { backgroundColor: '#a89080' },
  joinText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
});