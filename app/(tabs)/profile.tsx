import { Rajdhani_700Bold, useFonts } from '@expo-google-fonts/rajdhani';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { deleteUser, signOut } from 'firebase/auth';
import { arrayRemove, collection, deleteDoc, doc, getDoc, getDocs, increment, onSnapshot, query, runTransaction, setDoc, where } from 'firebase/firestore';
import { deleteObject, getStorage, ref } from 'firebase/storage';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Linking, Modal, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { auth, db } from '../../firebaseConfig';

const AVATAR_COLORS = ['#008080', '#7A1E1E', '#B8860B'];

const FAQ = [
  { q: 'How do I post a tournament?', a: 'Tap the Post tab at the bottom of the screen and fill out the tournament details.' },
  { q: 'How do I register a team?', a: 'Open a tournament, scroll to the bottom, and tap "Register Team". Fill out your team info and submit.' },
  { q: 'How do I cancel my registration?', a: 'Open the tournament you registered for and tap "Cancel Registration".' },
  { q: 'How do I post on the Sports Board?', a: 'Go to the Board tab and tap "+ POST TO BOARD" at the bottom.' },
  { q: 'How do I delete my post?', a: 'Open your post and tap "Delete Post" — only visible to the original poster.' },
];

function getSportColor(sport: string) {
  if (sport === 'Basketball') return '#008080';
  if (sport === 'Volleyball') return '#7A1E1E';
  if (sport === 'Softball') return '#B8860B';
  return '#008080';
}

export default function ProfileScreen() {
  const router = useRouter();
  const user = auth.currentUser;
  const [myPosted, setMyPosted] = useState<any[]>([]);
  const [myRegistered, setMyRegistered] = useState<any[]>([]);
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [removingPhoto, setRemovingPhoto] = useState(false);
  const [fontsLoaded] = useFonts({ Rajdhani_700Bold });
  const [deletingTournamentId, setDeletingTournamentId] = useState<string | null>(null);

  // Loading state — prevents "SET YOUR NAME" / "??" flash before Firestore data loads
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Item 6 — profile tab state
  const [profileTab, setProfileTab] = useState<'posted' | 'registered'>('posted');

  const [showNameModal, setShowNameModal] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showRemoveConfirmModal, setShowRemoveConfirmModal] = useState(false);

  const [showDeleteTournamentModal, setShowDeleteTournamentModal] = useState(false);
  const [tournamentToDelete, setTournamentToDelete] = useState<any>(null);

  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [hideContactInfo, setHideContactInfo] = useState(false);

  // Sport Preferences
  const [preferredSports, setPreferredSports] = useState<string[]>(['Basketball', 'Volleyball', 'Softball']);
  const [showSportsModal, setShowSportsModal] = useState(false);

  const avatarColor = useMemo(() => {
    const index = (user?.uid?.charCodeAt(0) || 0) % AVATAR_COLORS.length;
    return AVATAR_COLORS[index];
  }, [user?.uid]);

  useEffect(() => {
    if (!user) return;
    const loadUserData = async () => {
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) {
          if (snap.data().photoURL) setPhotoURL(snap.data().photoURL);
          if (snap.data().username) setFullName(snap.data().username);
          if (snap.data().notificationsEnabled !== undefined) setNotificationsEnabled(snap.data().notificationsEnabled);
          if (snap.data().hideContactInfo !== undefined) setHideContactInfo(snap.data().hideContactInfo);
          if (snap.data().preferredSports !== undefined) setPreferredSports(snap.data().preferredSports);
        }
      } catch (e) { console.error(e); }
      setLoadingProfile(false);
    };
    loadUserData();

    const postedQuery = query(collection(db, 'tournaments'), where('postedBy', '==', user.uid));
    const unsubPosted = onSnapshot(postedQuery, snap => {
      const now = new Date();
      const active = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((t: any) => {
          if (t.status === 'canceled') return false;
          if (t.date) {
            const parts = t.date.split(' - ');
            const endStr = parts[1] || parts[0];
            const endDate = new Date(endStr);
            if (!isNaN(endDate.getTime())) return endDate >= now;
          }
          return true;
        });
      setMyPosted(active);
    });

    // Item 6 — listen for registered tournaments
    const joinedQuery = query(collection(db, 'tournaments'), where('joinedUsers', 'array-contains', user.uid));
    const unsubJoined = onSnapshot(joinedQuery, snap => {
      const now = new Date();
      const active = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((t: any) => {
          if (t.status === 'canceled') return false;
          if (t.date) {
            const parts = t.date.split(' - ');
            const endStr = parts[1] || parts[0];
            const endDate = new Date(endStr);
            if (!isNaN(endDate.getTime())) return endDate >= now;
          }
          return true;
        });
      setMyRegistered(active);
    });

    return () => { unsubPosted(); unsubJoined(); };
  }, []);

  const handlePickPhoto = async () => {
    setShowPhotoModal(false);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (result.canceled) return;

    setUploadingPhoto(true);
    try {
      const compressed = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 400, height: 400 } }],
        { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
      );
      const response = await fetch(compressed.uri);
      const blob = await response.blob();
      const storage = getStorage();
      const storageRef = ref(storage, `profilePhotos/${user!.uid}.jpg`);
      const { uploadBytes, getDownloadURL } = await import('firebase/storage');
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      setPhotoURL(downloadURL);
      await setDoc(doc(db, 'users', user!.uid), { photoURL: downloadURL }, { merge: true });
    } catch (e: any) { console.error(e); }
    setUploadingPhoto(false);
  };

  const handleRemovePhoto = async () => {
    setShowRemoveConfirmModal(false);
    setRemovingPhoto(true);
    try {
      const storage = getStorage();
      const storageRef = ref(storage, `profilePhotos/${user!.uid}.jpg`);
      try { await deleteObject(storageRef); } catch (_) {}
      await setDoc(doc(db, 'users', user!.uid), { photoURL: '' }, { merge: true });
      setPhotoURL(null);
    } catch (e: any) { console.error(e); }
    setRemovingPhoto(false);
  };

  const handlePhotoPress = () => {
    if (photoURL) {
      setShowPhotoModal(true);
    } else {
      handlePickPhoto();
    }
  };

  const handleSaveName = async () => {
    if (!nameInput.trim()) return;
    try {
      await setDoc(doc(db, 'users', user!.uid), { username: nameInput.trim() }, { merge: true });
      setFullName(nameInput.trim());
      setShowNameModal(false);
    } catch (e: any) { console.error(e); }
  };

  const handleToggleNotifications = async (val: boolean) => {
    setNotificationsEnabled(val);
    await setDoc(doc(db, 'users', user!.uid), { notificationsEnabled: val }, { merge: true });
  };

  const handleToggleHideContact = async (val: boolean) => {
    setHideContactInfo(val);
    await setDoc(doc(db, 'users', user!.uid), { hideContactInfo: val }, { merge: true });
  };

  const handleToggleSport = async (sport: string) => {
    const updated = preferredSports.includes(sport)
      ? preferredSports.filter(s => s !== sport)
      : [...preferredSports, sport];
    setPreferredSports(updated);
    await setDoc(doc(db, 'users', user!.uid), { preferredSports: updated }, { merge: true });
  };

  const handleDeleteTournament = (tournament: any) => {
    setTournamentToDelete(tournament);
    setShowDeleteTournamentModal(true);
  };

  const confirmDeleteTournament = async () => {
    if (!tournamentToDelete) return;
    setDeletingTournamentId(tournamentToDelete.id);
    setShowDeleteTournamentModal(false);
    try {
      await deleteDoc(doc(db, 'tournaments', tournamentToDelete.id));
    } catch (e: any) { console.error(e); }
    setDeletingTournamentId(null);
    setTournamentToDelete(null);
  };

  const confirmDeleteAccount = async () => {
    if (!user) return;
    setDeletingAccount(true);
    try {
      const uid = user.uid;

      // Delete tournaments the user posted
      const tournamentsSnap = await getDocs(query(collection(db, 'tournaments'), where('postedBy', '==', uid)));
      await Promise.all(tournamentsSnap.docs.map(d => deleteDoc(d.ref)));

      // Delete board posts the user made
      const boardSnap = await getDocs(query(collection(db, 'board'), where('postedBy', '==', uid)));
      await Promise.all(boardSnap.docs.map(d => deleteDoc(d.ref)));

      // Delete community posts the user made
      const communitySnap = await getDocs(query(collection(db, 'community'), where('authorId', '==', uid)));
      await Promise.all(communitySnap.docs.map(d => deleteDoc(d.ref)));

      // Delete the user's own notifications
      const notifsSnap = await getDocs(query(collection(db, 'notifications'), where('toUserId', '==', uid)));
      await Promise.all(notifsSnap.docs.map(d => deleteDoc(d.ref)));

      // Clean up registrations in OTHER users' tournaments:
      // remove user from joinedUsers, free up the spot, delete their team doc
      const joinedSnap = await getDocs(query(collection(db, 'tournaments'), where('joinedUsers', 'array-contains', uid)));
      await Promise.all(joinedSnap.docs.map(async (tDoc) => {
        try {
          // Remove their team registration doc(s) in this tournament
          const teamsSnap = await getDocs(collection(db, 'tournaments', tDoc.id, 'teams'));
          const myTeams = teamsSnap.docs.filter(t => t.data().registeredBy === uid);
          await Promise.all(myTeams.map(t => deleteDoc(t.ref)));

          // Remove uid from joinedUsers and free up a spot
          await runTransaction(db, async (tx) => {
            const tRef = doc(db, 'tournaments', tDoc.id);
            const tSnap = await tx.get(tRef);
            if (!tSnap.exists()) return;
            tx.update(tRef, { joinedUsers: arrayRemove(uid), spots: increment(1) });
          });
        } catch (e) { console.log('Cleanup join error:', e); }
      }));

      // Clean up waitlist entries in OTHER users' tournaments
      const allTournamentsSnap = await getDocs(collection(db, 'tournaments'));
      await Promise.all(allTournamentsSnap.docs.map(async (tDoc) => {
        try {
          const waitlistSnap = await getDocs(
            query(collection(db, 'tournaments', tDoc.id, 'waitlist'), where('userId', '==', uid))
          );
          await Promise.all(waitlistSnap.docs.map(w => deleteDoc(w.ref)));
        } catch (e) { console.log('Cleanup waitlist error:', e); }
      }));

      // Delete profile photo
      try {
        const storage = getStorage();
        const storageRef = ref(storage, `profilePhotos/${uid}.jpg`);
        await deleteObject(storageRef);
      } catch (_) {}

      await deleteDoc(doc(db, 'users', uid));
      await deleteUser(user);
      router.replace('/login');
    } catch (e: any) {
      console.error(e);
      setDeletingAccount(false);
      setShowDeleteAccountModal(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace('/login');
    } catch (e: any) { console.error(e); }
  };

  const displayName = fullName || '';
  const initials = displayName
    ? displayName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
    : '??';

  const photoLoading = uploadingPhoto || removingPhoto;

  if (loadingProfile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#008080" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      <View style={styles.avatarSection}>
        <TouchableOpacity onPress={handlePhotoPress} disabled={photoLoading}>
          {photoLoading ? (
            <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
              <ActivityIndicator color="#fff" />
            </View>
          ) : photoURL ? (
            <Image source={{ uri: photoURL }} style={styles.avatarImg} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
              <Text style={[styles.avatarText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>{initials}</Text>
            </View>
          )}
        </TouchableOpacity>
        <Text style={[styles.name, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>
          {displayName ? displayName.toUpperCase() : 'SET YOUR NAME'}
        </Text>
        <Text style={styles.email}>{user?.email || ''}</Text>
        <TouchableOpacity style={styles.editBtn} onPress={handlePhotoPress} disabled={photoLoading}>
          <Text style={styles.editBtnText}>
            {uploadingPhoto ? 'Uploading...' : removingPhoto ? 'Removing...' : photoURL ? 'Edit Profile Photo' : 'Add Profile Photo'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <TouchableOpacity style={styles.infoRow} onPress={() => { setNameInput(fullName); setShowNameModal(true); }}>
          <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
            <Path d="M8 1a4 4 0 1 1 0 8A4 4 0 0 1 8 1ZM2 14c0-3 2.7-5 6-5s6 2 6 5" stroke="#008080" strokeWidth="1.4" strokeLinecap="round" />
          </Svg>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>FULL NAME</Text>
            <Text style={styles.infoValue}>{fullName || 'Tap to set your name'}</Text>
          </View>
          <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
            <Path d="M5 3l4 4-4 4" stroke="#ccc" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>
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
        </View>
      </View>

      {/* Item 6 — My Tournaments tab switcher */}
      <View style={styles.tournamentTabRow}>
        <TouchableOpacity
          style={[styles.tournamentTab, profileTab === 'posted' && styles.tournamentTabActive]}
          onPress={() => setProfileTab('posted')}
        >
          <Text style={[styles.tournamentTabText, profileTab === 'posted' && styles.tournamentTabTextActive, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>
            POSTED ({myPosted.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tournamentTab, profileTab === 'registered' && styles.tournamentTabActive]}
          onPress={() => setProfileTab('registered')}
        >
          <Text style={[styles.tournamentTabText, profileTab === 'registered' && styles.tournamentTabTextActive, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>
            REGISTERED ({myRegistered.length})
          </Text>
        </TouchableOpacity>
      </View>

      {profileTab === 'posted' ? (
        <>
          {myPosted.length === 0 ? (
            <View style={styles.emptyTournaments}>
              <Text style={styles.emptyTournamentsText}>No active tournaments posted.</Text>
            </View>
          ) : (
            myPosted.map((t: any) => {
              const sportColor = getSportColor(t.sport);
              const isDeleting = deletingTournamentId === t.id;
              return (
                <View key={t.id} style={styles.tournamentCard}>
                  <TouchableOpacity
                    style={styles.tournamentCardInner}
                    activeOpacity={0.85}
                    onPress={() => router.push({ pathname: '/tournament', params: { id: t.id, postedBy: t.postedBy } })}
                  >
                    <View style={[styles.tournamentSportBar, { backgroundColor: sportColor }]} />
                    <View style={styles.tournamentCardContent}>
                      <Text style={[styles.tournamentCardName, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]} numberOfLines={1}>{t.name}</Text>
                      <Text style={styles.tournamentCardDate}>{t.date}</Text>
                      <Text style={styles.tournamentCardLocation}>{t.city}, {t.state}</Text>
                    </View>
                    <View style={[styles.tournamentSportBadge, { backgroundColor: `${sportColor}20` }]}>
                      <Text style={[styles.tournamentSportBadgeText, { color: sportColor }]}>{t.sport}</Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.tournamentDeleteBtn}
                    onPress={() => handleDeleteTournament(t)}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <ActivityIndicator size="small" color="#cc4444" />
                    ) : (
                      <Text style={styles.tournamentDeleteText}>Delete</Text>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </>
      ) : (
        <>
          {myRegistered.length === 0 ? (
            <View style={styles.emptyTournaments}>
              <Text style={styles.emptyTournamentsText}>No registered tournaments.</Text>
            </View>
          ) : (
            myRegistered.map((t: any) => {
              const sportColor = getSportColor(t.sport);
              return (
                <TouchableOpacity
                  key={t.id}
                  style={styles.tournamentCard}
                  activeOpacity={0.85}
                  onPress={() => router.push({ pathname: '/tournament', params: { id: t.id, postedBy: t.postedBy } })}
                >
                  <View style={styles.tournamentCardInner}>
                    <View style={[styles.tournamentSportBar, { backgroundColor: sportColor }]} />
                    <View style={styles.tournamentCardContent}>
                      <Text style={[styles.tournamentCardName, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]} numberOfLines={1}>{t.name}</Text>
                      <Text style={styles.tournamentCardDate}>{t.date}</Text>
                      <Text style={styles.tournamentCardLocation}>{t.city}, {t.state}</Text>
                    </View>
                    <View style={[styles.registeredBadge, { backgroundColor: sportColor }]}>
                      <Text style={styles.registeredBadgeText}>✓ REGISTERED</Text>
                    </View>
                    <View style={[styles.tournamentSportBadge, { backgroundColor: `${sportColor}20` }]}>
                      <Text style={[styles.tournamentSportBadgeText, { color: sportColor }]}>{t.sport}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </>
      )}

      <View style={[styles.card, { marginTop: 16 }]}>
        <TouchableOpacity style={styles.infoRow} onPress={() => setShowNotifModal(true)}>
          <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
            <Path d="M8 1a5 5 0 0 1 5 5v3l1.5 2h-13L3 9V6a5 5 0 0 1 5-5Z" stroke="#666" strokeWidth="1.4" />
            <Path d="M6.5 13a1.5 1.5 0 0 0 3 0" stroke="#666" strokeWidth="1.4" />
          </Svg>
          <Text style={styles.settingLabel}>Notifications</Text>
          <View style={[styles.togglePill, { backgroundColor: notificationsEnabled ? '#008080' : '#e0e0e0' }]}>
            <Text style={styles.togglePillText}>{notificationsEnabled ? 'ON' : 'OFF'}</Text>
          </View>
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity style={styles.infoRow} onPress={() => setShowPrivacyModal(true)}>
          <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
            <Rect x="3" y="7" width="10" height="7" rx="1.5" stroke="#666" strokeWidth="1.4" />
            <Path d="M5 7V5a3 3 0 1 1 6 0v2" stroke="#666" strokeWidth="1.4" strokeLinecap="round" />
          </Svg>
          <Text style={styles.settingLabel}>Privacy</Text>
          <View style={[styles.togglePill, { backgroundColor: hideContactInfo ? '#008080' : '#e0e0e0' }]}>
            <Text style={styles.togglePillText}>{hideContactInfo ? 'ON' : 'OFF'}</Text>
          </View>
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity style={styles.infoRow} onPress={() => setShowSportsModal(true)}>
          <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
            <Circle cx="8" cy="8" r="6" stroke="#666" strokeWidth="1.4" />
            <Path d="M8 2v12M2 8h12" stroke="#666" strokeWidth="1.4" />
          </Svg>
          <Text style={styles.settingLabel}>Sport Preferences</Text>
          <View style={[styles.togglePill, { backgroundColor: '#008080' }]}>
            <Text style={styles.togglePillText}>{preferredSports.length}/3</Text>
          </View>
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity style={styles.infoRow} onPress={() => setShowHelpModal(true)}>
          <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
            <Circle cx="8" cy="8" r="6" stroke="#666" strokeWidth="1.4" />
            <Path d="M6.5 6.5a1.5 1.5 0 1 1 2 1.4V9" stroke="#666" strokeWidth="1.4" strokeLinecap="round" />
            <Circle cx="8" cy="11.5" r="0.7" fill="#666" />
          </Svg>
          <Text style={styles.settingLabel}>Help & Support</Text>
          <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
            <Path d="M5 3l4 4-4 4" stroke="#ccc" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Svg width={16} height={16} viewBox="0 0 16 16" fill="none" style={{ marginRight: 8 }}>
          <Path d="M6 14H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h3M11 11l3-3-3-3M14 8H6" stroke="#dc2626" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.deleteAccountBtn} onPress={() => setShowDeleteAccountModal(true)}>
        <Text style={styles.deleteAccountText}>Delete Account</Text>
      </TouchableOpacity>

      {/* Photo Action Modal */}
      <Modal visible={showPhotoModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={[styles.modalTitle, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>PROFILE PHOTO</Text>
            <Text style={styles.modalSub}>What would you like to do?</Text>
            <TouchableOpacity style={styles.photoActionBtn} onPress={handlePickPhoto}>
              <Text style={[styles.photoActionText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>📷  CHANGE PHOTO</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.photoActionBtn, styles.photoActionDanger]} onPress={() => { setShowPhotoModal(false); setTimeout(() => setShowRemoveConfirmModal(true), 300); }}>
              <Text style={[styles.photoActionText, { color: '#cc4444' }, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>🗑️  REMOVE PHOTO</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoActionCancelBtn} onPress={() => setShowPhotoModal(false)}>
              <Text style={[styles.photoActionCancelText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>CANCEL</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Remove Photo Confirm Modal */}
      <Modal visible={showRemoveConfirmModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={[styles.modalTitle, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>REMOVE PHOTO</Text>
            <Text style={styles.modalSub}>Are you sure you want to remove your profile photo?</Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowRemoveConfirmModal(false)}>
                <Text style={[styles.modalCancelText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleRemovePhoto}>
                <Text style={[styles.modalConfirmText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>REMOVE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Tournament Modal */}
      <Modal visible={showDeleteTournamentModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={[styles.modalTitle, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>DELETE TOURNAMENT</Text>
            <Text style={styles.modalSub}>Delete "{tournamentToDelete?.name}"? This cannot be undone.</Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => { setShowDeleteTournamentModal(false); setTournamentToDelete(null); }}>
                <Text style={[styles.modalCancelText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={confirmDeleteTournament}>
                <Text style={[styles.modalConfirmText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>DELETE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Account Modal */}
      <Modal visible={showDeleteAccountModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={[styles.modalTitle, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>DELETE ACCOUNT</Text>
            <Text style={styles.modalSub}>This will permanently delete your account, all your tournaments, board posts, and community posts. This cannot be undone.</Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowDeleteAccountModal(false)} disabled={deletingAccount}>
                <Text style={[styles.modalCancelText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalConfirmBtn, { backgroundColor: '#cc4444' }]} onPress={confirmDeleteAccount} disabled={deletingAccount}>
                {deletingAccount ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={[styles.modalConfirmText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>DELETE</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Name Modal */}
      <Modal visible={showNameModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={[styles.modalTitle, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>EDIT NAME</Text>
            <Text style={styles.modalSub}>This name will appear on your posts and profile.</Text>
            <TextInput style={styles.modalInput} placeholder="e.g. Nelson Yazzie" placeholderTextColor="#a0b8b8" value={nameInput} onChangeText={setNameInput} autoFocus />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowNameModal(false)}>
                <Text style={[styles.modalCancelText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveName}>
                <Text style={[styles.modalSaveText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>SAVE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Notifications Modal */}
      <Modal visible={showNotifModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={[styles.modalTitle, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>NOTIFICATIONS</Text>
            <Text style={styles.modalSub}>Control push notifications for tournament activity.</Text>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Push Notifications</Text>
              <Switch value={notificationsEnabled} onValueChange={handleToggleNotifications} trackColor={{ false: '#e0e0e0', true: '#008080' }} thumbColor="#fff" />
            </View>
            <Text style={styles.toggleHint}>{notificationsEnabled ? '✓ You will receive notifications' : '✗ Notifications are disabled'}</Text>
            <TouchableOpacity style={styles.modalDoneBtn} onPress={() => setShowNotifModal(false)}>
              <Text style={[styles.modalDoneText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>DONE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Privacy Modal */}
      <Modal visible={showPrivacyModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={[styles.modalTitle, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>PRIVACY</Text>
            <Text style={styles.modalSub}>Control who can see your contact info on board posts.</Text>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Hide Contact Info</Text>
              <Switch value={hideContactInfo} onValueChange={handleToggleHideContact} trackColor={{ false: '#e0e0e0', true: '#008080' }} thumbColor="#fff" />
            </View>
            <Text style={styles.toggleHint}>
              {hideContactInfo
                ? '✓ Your phone and email are hidden on board posts'
                : '✗ Your contact info is visible to everyone'}
            </Text>
            <TouchableOpacity style={styles.modalDoneBtn} onPress={() => setShowPrivacyModal(false)}>
              <Text style={[styles.modalDoneText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>DONE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Sport Preferences Modal */}
      <Modal visible={showSportsModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={[styles.modalTitle, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>SPORT PREFERENCES</Text>
            <Text style={styles.modalSub}>Choose which sports you want tournament alerts for.</Text>
            {['Basketball', 'Volleyball', 'Softball'].map(sport => (
              <View key={sport} style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>{sport}</Text>
                <Switch
                  value={preferredSports.includes(sport)}
                  onValueChange={() => handleToggleSport(sport)}
                  trackColor={{ false: '#e0e0e0', true: '#008080' }}
                  thumbColor="#fff"
                />
              </View>
            ))}
            <TouchableOpacity style={styles.modalDoneBtn} onPress={() => setShowSportsModal(false)}>
              <Text style={[styles.modalDoneText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>DONE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Help Modal */}
      <Modal visible={showHelpModal} animationType="slide" transparent>
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={styles.sheetBackdrop} onPress={() => setShowHelpModal(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetContent}>
              <Text style={[styles.sheetTitle, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>HELP & SUPPORT</Text>
              <TouchableOpacity style={styles.contactBtn} onPress={() => Linking.openURL('mailto:support@zony.app')}>
                <Text style={[styles.contactBtnText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>✉️ CONTACT US</Text>
              </TouchableOpacity>
              <Text style={styles.faqHeader}>FREQUENTLY ASKED QUESTIONS</Text>
              {FAQ.map((item, i) => (
                <TouchableOpacity key={i} style={styles.faqItem} onPress={() => setExpandedFaq(expandedFaq === i ? null : i)} activeOpacity={0.8}>
                  <View style={styles.faqTop}>
                    <Text style={styles.faqQ}>{item.q}</Text>
                    <Text style={styles.faqChevron}>{expandedFaq === i ? '▲' : '▼'}</Text>
                  </View>
                  {expandedFaq === i && <Text style={styles.faqA}>{item.a}</Text>}
                </TouchableOpacity>
              ))}
              <Text style={styles.versionText}>Zony v1.0.0</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0E8' },
  loadingContainer: { flex: 1, backgroundColor: '#F5F0E8', alignItems: 'center', justifyContent: 'center' },
  content: { paddingTop: 60, alignItems: 'center', paddingBottom: 60 },
  avatarSection: { alignItems: 'center', marginBottom: 20 },
  avatar: { width: 84, height: 84, borderRadius: 22, borderWidth: 4, borderColor: '#F5F0E8', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  avatarImg: { width: 84, height: 84, borderRadius: 22, borderWidth: 4, borderColor: '#F5F0E8' },
  avatarText: { fontSize: 28, color: '#fff', fontWeight: 'bold' },
  name: { fontSize: 26, fontWeight: '900', color: '#111', marginTop: 10, letterSpacing: 1 },
  email: { fontSize: 13, color: '#aaa', marginTop: 2 },
  editBtn: { marginTop: 10, paddingHorizontal: 20, paddingVertical: 6, borderRadius: 20, borderWidth: 2, borderColor: '#008080' },
  editBtnText: { fontSize: 13, fontWeight: '600', color: '#008080' },
  card: { backgroundColor: '#fff', borderRadius: 16, width: '90%', marginBottom: 12, borderWidth: 1, borderColor: '#e8e8e8', overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 10, color: '#aaa', letterSpacing: 1, marginBottom: 2 },
  infoValue: { fontSize: 14, color: '#333', fontWeight: '500' },
  settingLabel: { flex: 1, fontSize: 14, color: '#555', fontWeight: '500' },
  togglePill: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  togglePillText: { fontSize: 11, color: '#fff', fontWeight: '700' },
  divider: { height: 1, backgroundColor: '#f0f0f0', marginLeft: 44 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderRadius: 16, width: '90%', paddingVertical: 14, borderWidth: 1, borderColor: '#fee2e2', marginTop: 4 },
  logoutText: { color: '#dc2626', fontSize: 14, fontWeight: '600' },
  deleteAccountBtn: { marginTop: 12, paddingVertical: 10 },
  deleteAccountText: { fontSize: 12, color: '#ccc', fontWeight: '500' },
  // Item 6 — tournament tab styles
  tournamentTabRow: { flexDirection: 'row', width: '90%', backgroundColor: '#e8e8e8', borderRadius: 12, padding: 3, marginBottom: 10, marginTop: 4 },
  tournamentTab: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center' },
  tournamentTabActive: { backgroundColor: '#008080' },
  tournamentTabText: { fontSize: 12, color: '#888', letterSpacing: 0.5 },
  tournamentTabTextActive: { color: '#fff' },
  emptyTournaments: { width: '90%', backgroundColor: '#fff', borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#e8e8e8' },
  emptyTournamentsText: { fontSize: 13, color: '#a0b8b8' },
  tournamentCard: { width: '90%', backgroundColor: '#fff', borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: '#e8e8e8', overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  tournamentCardInner: { flexDirection: 'row', alignItems: 'center' },
  tournamentSportBar: { width: 4, alignSelf: 'stretch' },
  tournamentCardContent: { flex: 1, paddingHorizontal: 12, paddingVertical: 12 },
  tournamentCardName: { fontSize: 15, fontWeight: '900', color: '#111', letterSpacing: 0.5, marginBottom: 2 },
  tournamentCardDate: { fontSize: 12, color: '#888', marginBottom: 2 },
  tournamentCardLocation: { fontSize: 12, color: '#a0b8b8' },
  tournamentSportBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, marginRight: 12 },
  tournamentSportBadgeText: { fontSize: 11, fontWeight: '700' },
  registeredBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, marginRight: 8 },
  registeredBadgeText: { fontSize: 10, fontWeight: '900', color: '#fff', letterSpacing: 0.5 },
  tournamentDeleteBtn: { borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingVertical: 10, alignItems: 'center' },
  tournamentDeleteText: { fontSize: 13, color: '#cc4444', fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  modalBox: { backgroundColor: '#f5ede0', borderRadius: 24, padding: 24, width: '100%', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 16, elevation: 8 },
  modalTitle: { fontSize: 22, color: '#003333', letterSpacing: 2, marginBottom: 8, textAlign: 'center' },
  modalSub: { fontSize: 13, color: '#888', textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  modalInput: { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: '#003333', borderWidth: 1, borderColor: '#e8e8e8', marginBottom: 16 },
  modalBtns: { flexDirection: 'row', gap: 10 },
  modalCancelBtn: { flex: 1, backgroundColor: '#fff', borderRadius: 14, paddingVertical: 13, alignItems: 'center', borderWidth: 1, borderColor: '#e0d8c8' },
  modalCancelText: { fontSize: 15, color: '#555', letterSpacing: 1 },
  modalSaveBtn: { flex: 1, backgroundColor: '#008080', borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
  modalSaveText: { fontSize: 15, color: '#fff', letterSpacing: 1 },
  modalConfirmBtn: { flex: 1, backgroundColor: '#1a1a2e', borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
  modalConfirmText: { fontSize: 15, color: '#fff', letterSpacing: 1 },
  modalDoneBtn: { backgroundColor: '#008080', borderRadius: 14, paddingVertical: 13, alignItems: 'center', marginTop: 8 },
  modalDoneText: { fontSize: 15, color: '#fff', letterSpacing: 1 },
  photoActionBtn: { backgroundColor: '#fff', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginBottom: 8, borderWidth: 1, borderColor: '#e0d8c8' },
  photoActionDanger: { borderColor: '#fecaca' },
  photoActionText: { fontSize: 15, color: '#003333', letterSpacing: 0.5 },
  photoActionCancelBtn: { paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  photoActionCancelText: { fontSize: 14, color: '#aaa', letterSpacing: 1 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 8 },
  toggleLabel: { fontSize: 14, color: '#333', fontWeight: '500' },
  toggleHint: { fontSize: 12, color: '#a0b8b8', textAlign: 'center', marginBottom: 16 },
  sheetOverlay: { flex: 1, justifyContent: 'flex-end' },
  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { backgroundColor: '#f5ede0', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' },
  sheetHandle: { width: 40, height: 4, backgroundColor: '#ccc', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  sheetContent: { paddingHorizontal: 20, paddingBottom: 40 },
  sheetTitle: { fontSize: 22, color: '#003333', letterSpacing: 2, textAlign: 'center', marginBottom: 16, marginTop: 8 },
  contactBtn: { backgroundColor: '#008080', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginBottom: 24 },
  contactBtnText: { color: '#fff', fontSize: 16, letterSpacing: 1 },
  faqHeader: { fontSize: 10, color: '#a0b8b8', letterSpacing: 2, fontWeight: '700', marginBottom: 10 },
  faqItem: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#e8e8e8' },
  faqTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  faqQ: { fontSize: 13, fontWeight: '600', color: '#333', flex: 1, marginRight: 8 },
  faqChevron: { fontSize: 10, color: '#a0b8b8' },
  faqA: { fontSize: 13, color: '#666', lineHeight: 20, marginTop: 10 },
  versionText: { fontSize: 11, color: '#ccc', textAlign: 'center', marginTop: 24 },
});