import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { collection, doc, getDoc, onSnapshot, query, setDoc, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../../firebaseConfig';

export default function ProfileScreen() {
  const router = useRouter();
  const user = auth.currentUser;
  const [myPosted, setMyPosted] = useState([]);
  const [myJoined, setMyJoined] = useState([]);
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [username, setUsername] = useState('');

  useEffect(() => {
    if (!user) return;

    const loadUserData = async () => {
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists()) {
        if (snap.data().photoURL) setPhotoURL(snap.data().photoURL);
        if (snap.data().username) setUsername(snap.data().username);
      }
    };
    loadUserData();

    const postedQuery = query(collection(db, 'tournaments'), where('postedBy', '==', user.uid));
    const unsubPosted = onSnapshot(postedQuery, (snap) => {
      setMyPosted(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const joinedQuery = query(collection(db, 'tournaments'), where('joinedUsers', 'array-contains', user.uid));
    const unsubJoined = onSnapshot(joinedQuery, (snap) => {
      setMyJoined(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubPosted(); unsubJoined(); };
  }, []);

  const handlePickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled && result.assets[0].base64) {
      const base64 = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setPhotoURL(base64);
      await setDoc(doc(db, 'users', user!.uid), { photoURL: base64 }, { merge: true });
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace('/login');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const displayName = username || user?.email || '';
  const initial = displayName[0]?.toUpperCase() ?? 'Z';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={handlePickPhoto}>
        {photoURL ? (
          <Image source={{ uri: photoURL }} style={styles.avatarImg} />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
        )}
        <Text style={styles.changePhoto}>Change Photo</Text>
      </TouchableOpacity>

      <Text style={styles.name}>{displayName}</Text>
      <Text style={styles.sub}>Zony Member</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Tournaments I Posted</Text>
        {myPosted.length === 0 ? (
          <Text style={styles.empty}>You haven't posted any tournaments yet.</Text>
        ) : (
          myPosted.map(t => (
            <TouchableOpacity key={t.id} style={styles.tourneyRow} onPress={() => router.push({ pathname: '/tournament', params: { id: t.id, postedBy: t.postedBy } })}>
              <Text style={styles.tourneyName}>{t.name}</Text>
              <Text style={styles.tourneyDetail}>{t.date} · {t.city}, {t.state}</Text>
            </TouchableOpacity>
          ))
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Tournaments I Joined</Text>
        {myJoined.length === 0 ? (
          <Text style={styles.empty}>You haven't joined any tournaments yet.</Text>
        ) : (
          myJoined.map(t => (
            <TouchableOpacity key={t.id} style={styles.tourneyRow} onPress={() => router.push({ pathname: '/tournament', params: { id: t.id, postedBy: t.postedBy } })}>
              <Text style={styles.tourneyName}>{t.name}</Text>
              <Text style={styles.tourneyDetail}>{t.date} · {t.city}, {t.state}</Text>
            </TouchableOpacity>
          ))
        )}
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5ede0' },
  content: { paddingTop: 60, alignItems: 'center', paddingBottom: 40 },
  avatar: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#008080', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  avatarImg: { width: 90, height: 90, borderRadius: 45, marginBottom: 4, borderWidth: 3, borderColor: '#008080' },
  avatarText: { fontSize: 40, color: '#fff', fontWeight: 'bold' },
  changePhoto: { fontSize: 12, color: '#008080', textAlign: 'center', marginBottom: 12 },
  name: { fontSize: 18, fontWeight: 'bold', color: '#003333', marginBottom: 4 },
  sub: { fontSize: 16, color: '#5a7a7a', marginBottom: 24 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, width: '90%', marginBottom: 16, borderWidth: 1, borderColor: '#e0f5f5' },
  cardTitle: { fontSize: 17, fontWeight: 'bold', color: '#003333', marginBottom: 12 },
  empty: { fontSize: 14, color: '#a0b8b8' },
  tourneyRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#e0f5f5' },
  tourneyName: { fontSize: 15, fontWeight: '600', color: '#003333' },
  tourneyDetail: { fontSize: 13, color: '#5a7a7a', marginTop: 2 },
  logoutBtn: { backgroundColor: '#cc4444', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 40, marginTop: 8 },
  logoutText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});