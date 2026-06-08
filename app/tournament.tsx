import { useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, arrayRemove, arrayUnion, collection, deleteDoc, doc, getDoc, getDocs, increment, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Alert, Clipboard, KeyboardAvoidingView, Modal, Platform, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../firebaseConfig';

export default function TournamentScreen() {
  const { id, postedBy } = useLocalSearchParams();
  const router = useRouter();
  const [tournament, setTournament] = useState<any>(null);
  const [joined, setJoined] = useState(false);
  const [spotsLeft, setSpotsLeft] = useState(0);
  const [comments, setComments] = useState([]);
  const [comment, setComment] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'teams'>('details');
  const [teams, setTeams] = useState([]);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [teamDivision, setTeamDivision] = useState('');
  const [showDivisionPicker, setShowDivisionPicker] = useState(false);
  const [teamLoading, setTeamLoading] = useState(false);
  const [currentUsername, setCurrentUsername] = useState('');
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
      if (user) {
        const userSnap = await getDoc(doc(db, 'users', user.uid));
        if (userSnap.exists()) setCurrentUsername(userSnap.data().username || user.email || '');
      }
    };
    load();

    const commentsQuery = query(collection(db, 'tournaments', id as string, 'comments'), orderBy('createdAt', 'asc'));
    const unsubComments = onSnapshot(commentsQuery, (snap) => {
      setComments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const teamsQuery = query(collection(db, 'tournaments', id as string, 'teams'), orderBy('createdAt', 'asc'));
    const unsubTeams = onSnapshot(teamsQuery, (snap) => {
      setTeams(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubComments(); unsubTeams(); };
  }, []);

  const handleCopyAddress = () => {
    if (!tournament) return;
    const parts = [tournament.address, tournament.city, tournament.state, tournament.zip].filter(Boolean);
    Clipboard.setString(parts.join(', '));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCancelRegistration = () => {
    Alert.alert('Cancel Registration', 'Are you sure you want to cancel your registration?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes', style: 'destructive', onPress: async () => {
          try {
            const teamsSnap = await getDocs(collection(db, 'tournaments', id as string, 'teams'));
            const myTeam = teamsSnap.docs.find(d => d.data().registeredBy === user?.uid);
            if (myTeam) await deleteDoc(doc(db, 'tournaments', id as string, 'teams', myTeam.id));
            await updateDoc(doc(db, 'tournaments', id as string), {
              joinedUsers: arrayRemove(user?.uid),
              spots: increment(1),
            });
            setJoined(false);
            setSpotsLeft(prev => prev + 1);
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        }
      }
    ]);
  };

  const handleRegisterTeam = async () => {
    if (!teamName || !contactName || !contactInfo || !teamDivision) {
      Alert.alert('Missing info', 'Please fill out all fields.');
      return;
    }
    if (!user) {
      Alert.alert('Sign in required', 'You need to be logged in.');
      return;
    }
    if (spotsLeft <= 0) {
      Alert.alert('Full', 'This tournament is full.');
      return;
    }
    setTeamLoading(true);
    try {
      await updateDoc(doc(db, 'tournaments', id as string), {
        joinedUsers: arrayUnion(user.uid),
        spots: increment(-1),
      });
      setJoined(true);
      setSpotsLeft(prev => prev - 1);

      await addDoc(collection(db, 'tournaments', id as string, 'teams'), {
        teamName, contactName, contactInfo,
        division: teamDivision,
        registeredBy: user.uid,
        createdAt: serverTimestamp(),
      });

      await addDoc(collection(db, 'notifications'), {
        toUserId: postedBy as string,
        message: `${teamName} (${contactName}) registered for ${tournament?.name} — Division: ${teamDivision}`,
        createdAt: serverTimestamp(),
      });

      const ownerSnap = await getDoc(doc(db, 'users', postedBy as string));
      if (ownerSnap.exists() && ownerSnap.data().pushToken) {
        await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: ownerSnap.data().pushToken,
            title: '🏆 New team registered!',
            body: `${teamName} registered for ${tournament?.name}`,
          }),
        });
      }

      setShowTeamModal(false);
      setTeamName(''); setContactName(''); setContactInfo(''); setTeamDivision('');

      const depositMsg = tournament?.depositAmount && tournament?.depositDue
        ? `\n\nDeposit of ${tournament.depositAmount} is due by ${tournament.depositDue}. This deposit is non-refundable.`
        : tournament?.depositAmount
        ? `\n\nDeposit of ${tournament.depositAmount} is required. This deposit is non-refundable.`
        : '';

      Alert.alert('Team Registered!', `${teamName} has been registered for ${tournament?.name}.${depositMsg}`);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
    setTeamLoading(false);
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
        username: currentUsername,
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
      <View style={styles.container}>
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

        {isOwner && (
          <View style={styles.tabRow}>
            <TouchableOpacity style={[styles.tab, activeTab === 'details' && styles.tabActive]} onPress={() => setActiveTab('details')}>
              <Text style={[styles.tabText, activeTab === 'details' && styles.tabTextActive]}>Details</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tab, activeTab === 'teams' && styles.tabActive]} onPress={() => setActiveTab('teams')}>
              <Text style={[styles.tabText, activeTab === 'teams' && styles.tabTextActive]}>Teams {teams.length > 0 ? `(${teams.length})` : ''}</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 'teams' && isOwner ? (
          <ScrollView contentContainerStyle={styles.teamsList}>
            {teams.length === 0 ? (
              <View style={styles.emptyTeams}>
                <Text style={styles.emptyTeamsIcon}>🏀</Text>
                <Text style={styles.emptyTeamsText}>No teams registered yet.</Text>
              </View>
            ) : (
              teams.map((t: any) => (
                <View key={t.id} style={styles.teamCard}>
                  <View style={styles.teamCardTop}>
                    <Text style={styles.teamName}>{t.teamName}</Text>
                    <Text style={styles.teamDivisionBadge}>{t.division}</Text>
                  </View>
                  <Text style={styles.teamDetail}>👤 {t.contactName}</Text>
                  <Text style={styles.teamDetail}>📞 {t.contactInfo}</Text>
                </View>
              ))
            )}
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
            <View style={styles.card}>
              <Text style={styles.sportBadge}>{tournament.sport}</Text>
              <Text style={styles.name}>{tournament.name}</Text>

              <Text style={styles.sectionTitle}>📅 Date</Text>
              <Text style={styles.detail}>{tournament.date}</Text>

              <Text style={styles.sectionTitle}>📍 Location</Text>
              {tournament.address ? <Text style={styles.detail}>{tournament.address}</Text> : null}
              <Text style={styles.detail}>{tournament.city}, {tournament.state} {tournament.zip}</Text>
              <TouchableOpacity style={styles.copyBtn} onPress={handleCopyAddress}>
                <Text style={styles.copyBtnText}>{copied ? '✓ Copied!' : 'Copy Address'}</Text>
              </TouchableOpacity>

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

              {tournament.contactName || tournament.contactPhone || tournament.contactEmail ? (
                <>
                  <Text style={styles.sectionTitle}>📞 Contact</Text>
                  {tournament.contactName ? <Text style={styles.detail}>{tournament.contactName}</Text> : null}
                  {tournament.contactPhone ? <Text style={styles.detail}>📞 {tournament.contactPhone}</Text> : null}
                  {tournament.contactEmail ? <Text style={styles.detail}>✉️ {tournament.contactEmail}</Text> : null}
                </>
              ) : null}

              <Text style={styles.spots}>{spotsLeft} spots left</Text>
            </View>

            {isOwner ? (
              <View style={styles.ownerActions}>
                <TouchableOpacity style={styles.editBtn} onPress={() => router.push({ pathname: '/edit-tournament', params: { id } })}>
                  <Text style={styles.editBtnText}>Edit Tournament</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelToggle}>
                  <Text style={styles.cancelBtnText}>{isCanceled ? 'Mark as Active' : 'Cancel Tournament'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
                  <Text style={styles.deleteText}>Delete Tournament</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.joinBtn, (joined || isCanceled) && styles.joinedBtn]}
                onPress={() => {
                  if (joined) {
                    handleCancelRegistration();
                  } else if (!isCanceled && spotsLeft > 0) {
                    setShowTeamModal(true);
                  }
                }}
                disabled={!joined && (spotsLeft <= 0 || isCanceled)}
              >
                <Text style={styles.joinText}>
                  {isCanceled && !joined ? 'Canceled' : joined ? 'Registered ✓ (tap to cancel)' : spotsLeft <= 0 ? 'Full' : 'Register Team'}
                </Text>
              </TouchableOpacity>
            )}

            <View style={styles.commentsSection}>
              <Text style={styles.commentsTitle}>Comments</Text>
              {comments.length === 0 ? (
                <Text style={styles.noComments}>No comments yet. Be the first!</Text>
              ) : (
                comments.map((c: any) => (
                  <View key={c.id} style={styles.commentCard}>
                    <Text style={styles.commentEmail}>{c.username || c.userEmail}</Text>
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
        )}
      </View>

      <Modal visible={showTeamModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>Register Your Team</Text>
              <Text style={styles.modalSub}>{tournament.name}</Text>

              <Text style={styles.modalLabel}>Team Name</Text>
              <TextInput style={styles.modalInput} placeholder="e.g. Gallup Ballers" placeholderTextColor="#a0b8b8" value={teamName} onChangeText={setTeamName} />

              <Text style={styles.modalLabel}>Your Name</Text>
              <TextInput style={styles.modalInput} placeholder="e.g. John Begay" placeholderTextColor="#a0b8b8" value={contactName} onChangeText={setContactName} />

              <Text style={styles.modalLabel}>Your Contact Info</Text>
              <TextInput style={styles.modalInput} placeholder="e.g. (928) 555-1234" placeholderTextColor="#a0b8b8" value={contactInfo} onChangeText={setContactInfo} keyboardType="phone-pad" />

              <Text style={styles.modalLabel}>Division</Text>
              <TouchableOpacity style={styles.modalDropdown} onPress={() => setShowDivisionPicker(!showDivisionPicker)}>
                <Text style={teamDivision ? styles.modalDropdownSelected : styles.modalDropdownPlaceholder}>{teamDivision || 'Select division...'}</Text>
                <Text style={styles.dropdownArrow}>{showDivisionPicker ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {showDivisionPicker && (
                <View style={styles.modalDropdownList}>
                  {(tournament.divisions || []).map((d: string) => (
                    <TouchableOpacity key={d} style={styles.modalDropdownItem} onPress={() => { setTeamDivision(d); setShowDivisionPicker(false); }}>
                      <Text style={[styles.modalDropdownItemText, teamDivision === d && styles.modalDropdownItemActive]}>{d}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {tournament.depositAmount ? (
                <View style={styles.depositNotice}>
                  <Text style={styles.depositNoticeText}>💰 A non-refundable deposit of {tournament.depositAmount}{tournament.depositDue ? ` is due by ${tournament.depositDue}` : ' is required'}.</Text>
                </View>
              ) : null}

              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowTeamModal(false)}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleRegisterTeam} disabled={teamLoading}>
                  <Text style={styles.modalSubmitText}>{teamLoading ? 'Registering...' : 'Register'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fafa', paddingTop: 60 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 16 },
  backText: { fontSize: 16, color: '#008080', fontWeight: '600' },
  shareBtn: { backgroundColor: '#e0f5f5', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  shareText: { fontSize: 14, color: '#008080', fontWeight: '600' },
  canceledBanner: { backgroundColor: '#cc4444', marginHorizontal: 20, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16, marginBottom: 12 },
  canceledBannerText: { color: '#fff', fontWeight: 'bold', fontSize: 14, textAlign: 'center' },
  tabRow: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 16, backgroundColor: '#e0f5f5', borderRadius: 12, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabActive: { backgroundColor: '#008080' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#5a7a7a' },
  tabTextActive: { color: '#fff' },
  teamsList: { paddingHorizontal: 20, paddingBottom: 40 },
  emptyTeams: { alignItems: 'center', marginTop: 60 },
  emptyTeamsIcon: { fontSize: 50, marginBottom: 12 },
  emptyTeamsText: { fontSize: 16, color: '#a0b8b8' },
  teamCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e0f5f5' },
  teamCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  teamName: { fontSize: 16, fontWeight: 'bold', color: '#003333', flex: 1 },
  teamDivisionBadge: { fontSize: 12, color: '#fff', backgroundColor: '#008080', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, overflow: 'hidden' },
  teamDetail: { fontSize: 14, color: '#5a7a7a', marginTop: 2 },
  card: { backgroundColor: '#fff', marginHorizontal: 20, borderRadius: 16, padding: 24, marginBottom: 20, borderWidth: 1, borderColor: '#e0f5f5' },
  sportBadge: { fontSize: 13, color: '#fff', backgroundColor: '#008080', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, overflow: 'hidden', alignSelf: 'flex-start', marginBottom: 12 },
  name: { fontSize: 26, fontWeight: 'bold', color: '#003333', marginBottom: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#5a7a7a', marginTop: 12, marginBottom: 2 },
  detail: { fontSize: 15, color: '#003333', marginBottom: 2 },
  copyBtn: { backgroundColor: '#e0f5f5', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start', marginTop: 6 },
  copyBtnText: { fontSize: 13, color: '#008080', fontWeight: '600' },
  spots: { fontSize: 15, color: '#008080', fontWeight: '600', marginTop: 16 },
  ownerActions: { marginHorizontal: 20, gap: 10, marginBottom: 20 },
  editBtn: { backgroundColor: '#008080', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  editBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#f0fafa', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
  modalTitle: { fontSize: 24, fontWeight: 'bold', color: '#003333', marginBottom: 4 },
  modalSub: { fontSize: 14, color: '#5a7a7a', marginBottom: 20 },
  modalLabel: { fontSize: 14, fontWeight: '600', color: '#003333', marginBottom: 6, marginTop: 10 },
  modalInput: { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: '#003333', marginBottom: 4, borderWidth: 1, borderColor: '#e0f0f0' },
  modalDropdown: { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#e0f0f0' },
  modalDropdownPlaceholder: { fontSize: 15, color: '#a0b8b8' },
  modalDropdownSelected: { fontSize: 15, color: '#003333' },
  dropdownArrow: { fontSize: 12, color: '#008080' },
  modalDropdownList: { backgroundColor: '#fff', borderRadius: 12, marginTop: 4, marginBottom: 8, borderWidth: 1, borderColor: '#e0f0f0', overflow: 'hidden' },
  modalDropdownItem: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0fafa' },
  modalDropdownItemText: { fontSize: 15, color: '#003333' },
  modalDropdownItemActive: { color: '#008080', fontWeight: 'bold' },
  depositNotice: { backgroundColor: '#fff8e0', borderRadius: 10, padding: 12, marginTop: 16, borderWidth: 1, borderColor: '#f0d080' },
  depositNoticeText: { fontSize: 13, color: '#7a5a00', fontWeight: '600' },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 20, marginBottom: 10 },
  modalCancelBtn: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: '#c0d8d8' },
  modalCancelText: { fontSize: 16, color: '#5a7a7a', fontWeight: '600' },
  modalSubmitBtn: { flex: 1, backgroundColor: '#008080', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  modalSubmitText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});