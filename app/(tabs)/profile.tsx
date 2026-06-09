import { Rajdhani_700Bold, useFonts } from '@expo-google-fonts/rajdhani';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { collection, doc, getDoc, onSnapshot, query, setDoc, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { auth, db } from '../../firebaseConfig';

export default function ProfileScreen() {
  const router = useRouter();
  const user = auth.currentUser;
  const [myPosted, setMyPosted] = useState([]);
  const [myJoined, setMyJoined] = useState([]);
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [fontsLoaded] = useFonts({ Rajdhani_700Bold });

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

      {/* Avatar */}
      <View style={styles.avatarSection}>
        <TouchableOpacity onPress={handlePickPhoto}>
          {photoURL ? (
            <Image source={{ uri: photoURL }} style={styles.avatarImg} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
          )}
        </TouchableOpacity>
        <Text style={[styles.name, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>{displayName}</Text>
        <Text style={styles.handle}>@{username || 'zonyuser'}</Text>
        <TouchableOpacity style={styles.editBtn} onPress={handlePickPhoto}>
          <Text style={styles.editBtnText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Info rows */}
      <View style={styles.card}>
        <View style={styles.infoRow}>
          <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
            <Path d="M8 1a4 4 0 1 1 0 8A4 4 0 0 1 8 1ZM2 14c0-3 2.7-5 6-5s6 2 6 5" stroke="#008080" strokeWidth="1.4" strokeLinecap="round" />
          </Svg>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>FULL NAME</Text>
            <Text style={styles.infoValue}>{username || '—'}</Text>
          </View>
          <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
            <Path d="M5 3l4 4-4 4" stroke="#ccc" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
            <Rect x="1" y="3" width="14" height="10" rx="2" stroke="#008080" strokeWidth="1.4" />
            <Path d="M1 6l7 4 7-4" stroke="#008080" strokeWidth="1.4" />
          </Svg>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>EMAIL</Text>
            <Text style={styles.infoValue}>{user?.email || '—'}</Text>
          </View>
          <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
            <Path d="M5 3l4 4-4 4" stroke="#ccc" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </View>
      </View>

      {/* Settings rows */}
      <View style={styles.card}>
        <View style={styles.infoRow}>
          <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
            <Path d="M8 1a5 5 0 0 1 5 5v3l1.5 2h-13L3 9V6a5 5 0 0 1 5-5Z" stroke="#666" strokeWidth="1.4" />
            <Path d="M6.5 13a1.5 1.5 0 0 0 3 0" stroke="#666" strokeWidth="1.4" />
          </Svg>
          <Text style={styles.settingLabel}>Notifications</Text>
          <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
            <Path d="M5 3l4 4-4 4" stroke="#ccc" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
            <Rect x="3" y="7" width="10" height="7" rx="1.5" stroke="#666" strokeWidth="1.4" />
            <Path d="M5 7V5a3 3 0 1 1 6 0v2" stroke="#666" strokeWidth="1.4" strokeLinecap="round" />
          </Svg>
          <Text style={styles.settingLabel}>Privacy</Text>
          <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
            <Path d="M5 3l4 4-4 4" stroke="#ccc" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
            <Circle cx="8" cy="8" r="6" stroke="#666" strokeWidth="1.4" />
            <Path d="M6.5 6.5a1.5 1.5 0 1 1 2 1.4V9" stroke="#666" strokeWidth="1.4" strokeLinecap="round" />
            <Circle cx="8" cy="11.5" r="0.7" fill="#666" />
          </Svg>
          <Text style={styles.settingLabel}>Help & Support</Text>
          <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
            <Path d="M5 3l4 4-4 4" stroke="#ccc" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </View>
      </View>

      {/* Log out */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Svg width={16} height={16} viewBox="0 0 16 16" fill="none" style={{ marginRight: 8 }}>
          <Path d="M6 14H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h3M11 11l3-3-3-3M14 8H6" stroke="#dc2626" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0E8' },
  content: { paddingTop: 60, alignItems: 'center', paddingBottom: 60 },
  avatarSection: { alignItems: 'center', marginBottom: 20 },
  avatar: { width: 84, height: 84, borderRadius: 42, backgroundColor: '#8B1A1A', borderWidth: 4, borderColor: '#F5F0E8', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  avatarImg: { width: 84, height: 84, borderRadius: 42, borderWidth: 4, borderColor: '#F5F0E8' },
  avatarText: { fontSize: 32, color: '#fff', fontWeight: 'bold' },
  name: { fontSize: 24, fontWeight: '900', color: '#111', marginTop: 10 },
  handle: { fontSize: 13, color: '#aaa', marginTop: 2 },
  editBtn: { marginTop: 10, paddingHorizontal: 20, paddingVertical: 6, borderRadius: 20, borderWidth: 2, borderColor: '#008080' },
  editBtnText: { fontSize: 13, fontWeight: '600', color: '#008080' },
  card: { backgroundColor: '#fff', borderRadius: 16, width: '90%', marginBottom: 12, borderWidth: 1, borderColor: '#e8e8e8', overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#003333', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 10, color: '#aaa', letterSpacing: 1, marginBottom: 2 },
  infoValue: { fontSize: 14, color: '#333', fontWeight: '500' },
  settingLabel: { flex: 1, fontSize: 14, color: '#555', fontWeight: '500' },
  divider: { height: 1, backgroundColor: '#f0f0f0', marginLeft: 44 },
  empty: { fontSize: 13, color: '#a0b8b8', paddingHorizontal: 16, paddingBottom: 14 },
  tourneyRow: { paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  tourneyName: { fontSize: 14, fontWeight: '600', color: '#003333' },
  tourneyDetail: { fontSize: 12, color: '#5a7a7a', marginTop: 2 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderRadius: 16, width: '90%', paddingVertical: 14, borderWidth: 1, borderColor: '#fee2e2', marginTop: 4 },
  logoutText: { color: '#dc2626', fontSize: 14, fontWeight: '600' },
});