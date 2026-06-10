import { Rajdhani_700Bold, useFonts } from '@expo-google-fonts/rajdhani';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, arrayRemove, arrayUnion, collection, deleteDoc, doc, getDoc, getDocs, increment, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Alert, Clipboard, KeyboardAvoidingView, Modal, Platform, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { auth, db } from '../firebaseConfig';

function SadFace() {
  return (
    <Svg width={64} height={64} viewBox="0 0 64 64" fill="none">
      <Path d="M32 12a20 20 0 1 0 0 40 20 20 0 0 0 0-40Z" stroke="#a0b8b8" strokeWidth="2" />
      <Path d="M24 26a2 2 0 1 1 4 0 2 2 0 0 1-4 0Z" fill="#a0b8b8" />
      <Path d="M36 26a2 2 0 1 1 4 0 2 2 0 0 1-4 0Z" fill="#a0b8b8" />
      <Path d="M24 42c1.5-3 4-5 8-5s6.5 2 8 5" stroke="#a0b8b8" strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

function SuccessTrophy() {
  return (
    <Svg width={56} height={56} viewBox="0 0 24 24" fill="none">
      <Path d="M8 3h8v8a4 4 0 0 1-8 0V3Z" stroke="#008080" strokeWidth="1.5" strokeLinejoin="round" />
      <Path d="M8 6H5a2 2 0 0 0 0 4h3M16 6h3a2 2 0 0 1 0 4h-3" stroke="#008080" strokeWidth="1.5" strokeLinecap="round" />
      <Path d="M12 15v4M9 21h6" stroke="#008080" strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  );
}

function formatPhone(val: string) {
  const digits = val.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export default function TournamentScreen() {
  const { id, postedBy } = useLocalSearchParams();
  const router = useRouter();
  const [tournament, setTournament] = useState<any>(null);
  const [joined, setJoined] = useState(false);
  const [spotsLeft, setSpotsLeft] = useState(0);
  const [activeTab, setActiveTab] = useState<'details' | 'teams'>('details');
  const [teams, setTeams] = useState([]);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [successData, setSuccessData] = useState<{ teamName: string; tournamentName: string; depositMsg: string } | null>(null);
  const [teamName, setTeamName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [teamDivision, setTeamDivision] = useState('');
  const [showDivisionPicker, setShowDivisionPicker] = useState(false);
  const [teamLoading, setTeamLoading] = useState(false);
  const [currentUsername, setCurrentUsername] = useState('');
  const [copied, setCopied] = useState(false);
  const [fontsLoaded] = useFonts({ Rajdhani_700Bold });
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

    const teamsQuery = query(collection(db, 'tournaments', id as string, 'teams'), orderBy('createdAt', 'asc'));
    const unsubTeams = onSnapshot(teamsQuery, (snap) => {
      setTeams(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubTeams(); };
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
          } catch (e: any) { Alert.alert('Error', e.message); }
        }
      }
    ]);
  };

  const hasUnsavedTeamData = () => !!(teamName || contactName || contactInfo || teamDivision);

  const tryCloseModal = () => {
    if (hasUnsavedTeamData()) {
      Alert.alert('Discard changes?', 'You have unsaved information. Are you sure you want to leave?', [
        { text: 'Keep Editing', style: 'cancel' },
        {
          text: 'Discard', style: 'destructive', onPress: () => {
            setTeamName(''); setContactName(''); setContactInfo(''); setTeamDivision('');
            setShowTeamModal(false);
          }
        },
      ]);
    } else {
      setShowTeamModal(false);
    }
  };

  const handleRegisterTeam = async () => {
    if (!teamName || !contactName || !contactInfo || !teamDivision) {
      Alert.alert('Missing info', 'Please fill out all fields.');
      return;
    }
    if (!user) { Alert.alert('Sign in required', 'You need to be logged in.'); return; }
    if (spotsLeft <= 0) { Alert.alert('Full', 'This tournament is full.'); return; }
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
        message: `${contactName} registered ${teamName} into ${tournament?.name}!`,
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
            body: `${contactName} registered ${teamName} into ${tournament?.name}!`,
          }),
        });
      }

      setShowTeamModal(false);
      setTeamName(''); setContactName(''); setContactInfo(''); setTeamDivision('');

      const depositMsg = tournament?.depositAmount && tournament?.depositDue
        ? `Deposit of ${tournament.depositAmount} is due by ${tournament.depositDue}. This deposit is non-refundable.`
        : tournament?.depositAmount
        ? `Deposit of ${tournament.depositAmount} is required. This deposit is non-refundable.`
        : '';

      setSuccessData({ teamName, tournamentName: tournament?.name, depositMsg });
      setShowSuccessModal(true);

    } catch (e: any) { Alert.alert('Error', e.message); }
    setTeamLoading(false);
  };

  const confirmDelete = async () => {
    setDeleteLoading(true);
    try {
      const teamsSnap = await getDocs(collection(db, 'tournaments', id as string, 'teams'));
      await Promise.all(
        teamsSnap.docs.map(async (teamDoc) => {
          const teamData = teamDoc.data();
          if (teamData.registeredBy) {
            await addDoc(collection(db, 'notifications'), {
              toUserId: teamData.registeredBy,
              message: `⚠️ ${tournament.name} has been canceled by the organizer.`,
              createdAt: serverTimestamp(),
            });
            const userSnap = await getDoc(doc(db, 'users', teamData.registeredBy));
            if (userSnap.exists() && userSnap.data().pushToken) {
              await fetch('https://exp.host/--/api/v2/push/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  to: userSnap.data().pushToken,
                  title: '⚠️ Tournament Canceled',
                  body: `${tournament.name} has been canceled by the organizer.`,
                }),
              });
            }
          }
        })
      );
      await deleteDoc(doc(db, 'tournaments', id as string));
      router.replace('/');
    } catch (e: any) { Alert.alert('Error', e.message); }
    setDeleteLoading(false);
  };

  const handleShare = async () => {
    if (!tournament) return;
    try {
      await Share.share({
        message: `🏆 ${tournament.name}\n📅 ${tournament.date}\n📍 ${tournament.city}, ${tournament.state}${tournament.entryFee ? `\n💵 Entry: ${tournament.entryFee}` : ''}${tournament.contactPhone ? `\n📞 ${tournament.contactPhone}` : ''}\n\nFind this tournament on Zony!`,
      });
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  if (!tournament) return null;
  const isCanceled = tournament.status === 'canceled';

  const sportColor = tournament.sport === 'Basketball' ? '#008080'
    : tournament.sport === 'Volleyball' ? '#7A1E1E'
    : tournament.sport === 'Softball' ? '#B8860B'
    : '#008080';

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
            <TouchableOpacity style={[styles.tab, activeTab === 'details' && { backgroundColor: sportColor }]} onPress={() => setActiveTab('details')}>
              <Text style={[styles.tabText, activeTab === 'details' && styles.tabTextActive]}>Details</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tab, activeTab === 'teams' && { backgroundColor: sportColor }]} onPress={() => setActiveTab('teams')}>
              <Text style={[styles.tabText, activeTab === 'teams' && styles.tabTextActive]}>Teams {teams.length > 0 ? `(${teams.length})` : ''}</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 'teams' && isOwner ? (
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
            <Text style={styles.teamsCount}>{teams.length} {teams.length === 1 ? 'team' : 'teams'} registered</Text>
            {teams.length === 0 ? (
              <View style={styles.emptyTeams}>
                <SadFace />
                <Text style={styles.emptyTeamsText}>No teams registered yet.</Text>
              </View>
            ) : (
              teams.map((t: any) => (
                <View key={t.id} style={styles.teamCard}>
                  <View style={styles.teamCardTop}>
                    <Text style={[styles.teamName, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>{t.teamName}</Text>
                    <View style={[styles.teamDivisionBadge, { backgroundColor: `${sportColor}20`, borderColor: sportColor }]}>
                      <Text style={[styles.teamDivisionText, { color: sportColor }]}>{t.division}</Text>
                    </View>
                  </View>
                  <View style={styles.divider} />
                  <Text style={styles.submittedLabel}>Submitted by</Text>
                  <Text style={styles.contactName}>{t.contactName}</Text>
                  {t.contactInfo ? (
                    <View style={styles.contactLine}>
                      <Text style={styles.contactLineIcon}>📱</Text>
                      <Text style={styles.contactLineText}>{t.contactInfo}</Text>
                    </View>
                  ) : null}
                </View>
              ))
            )}
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
            <View style={styles.card}>
              <View style={[styles.sportBadge, { backgroundColor: sportColor }]}>
                <Text style={styles.sportBadgeText}>{tournament.sport}</Text>
              </View>
              <Text style={[styles.tournamentName, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>{tournament.name}</Text>
              <View style={styles.divider} />

              <View style={styles.row}>
                <Text style={styles.rowIcon}>📅</Text>
                <Text style={styles.rowLabel}>Date</Text>
              </View>
              <Text style={styles.rowValue}>{tournament.date}</Text>

              <View style={[styles.row, { marginTop: 16 }]}>
                <Text style={styles.rowIcon}>📍</Text>
                <Text style={styles.rowLabel}>Location</Text>
              </View>
              {tournament.address ? <Text style={styles.rowValue}>{tournament.address}</Text> : null}
              <Text style={styles.rowValue}>{tournament.city}, {tournament.state} {tournament.zip}</Text>
              <TouchableOpacity style={styles.copyBtn} onPress={handleCopyAddress}>
                <Text style={styles.copyBtnText}>{copied ? '✓ Copied!' : 'Copy Address'}</Text>
              </TouchableOpacity>

              {tournament.divisions?.length > 0 && (
                <>
                  <View style={[styles.row, { marginTop: 16 }]}>
                    <Text style={styles.rowIcon}>🏅</Text>
                    <Text style={styles.rowLabel}>Divisions</Text>
                  </View>
                  <Text style={styles.rowValue}>{tournament.divisions.join(' · ')}</Text>
                </>
              )}

              {tournament.entryFee ? (
                <>
                  <View style={[styles.row, { marginTop: 16 }]}>
                    <Text style={styles.rowIcon}>💵</Text>
                    <Text style={styles.rowLabel}>Entry Fee</Text>
                  </View>
                  <Text style={styles.rowValue}>{tournament.entryFee} per team</Text>
                </>
              ) : null}

              {tournament.spectatorFee ? (
                <>
                  <View style={[styles.row, { marginTop: 16 }]}>
                    <Text style={styles.rowIcon}>🎟️</Text>
                    <Text style={styles.rowLabel}>Spectator Fee</Text>
                  </View>
                  <Text style={styles.rowValue}>{tournament.spectatorFee} at the door</Text>
                </>
              ) : null}

              {tournament.rosterSize ? (
                <>
                  <View style={[styles.row, { marginTop: 16 }]}>
                    <Text style={styles.rowIcon}>👥</Text>
                    <Text style={styles.rowLabel}>Roster Size</Text>
                  </View>
                  <Text style={styles.rowValue}>{tournament.rosterSize} players</Text>
                </>
              ) : null}

              {tournament.prizes ? (
                <>
                  <View style={[styles.row, { marginTop: 16 }]}>
                    <Text style={styles.rowIcon}>{tournament.prizeType === 'other' ? '🏆' : '💰'}</Text>
                    <Text style={styles.rowLabel}>{tournament.prizeType === 'other' ? 'Prizes' : 'Prize Money'}</Text>
                  </View>
                  <Text style={styles.rowValue}>{tournament.prizes}</Text>
                </>
              ) : null}

              {tournament.depositAmount ? (
                <>
                  <View style={[styles.row, { marginTop: 16 }]}>
                    <Text style={styles.rowIcon}>💳</Text>
                    <Text style={styles.rowLabel}>Deposit</Text>
                  </View>
                  <Text style={styles.rowValue}>{tournament.depositAmount}{tournament.depositDue ? ` due by ${tournament.depositDue}` : ''}</Text>
                </>
              ) : null}

              {(tournament.contactName || tournament.contactPhone || tournament.contactEmail) ? (
                <>
                  <View style={[styles.row, { marginTop: 16 }]}>
                    <Text style={styles.rowIcon}>📞</Text>
                    <Text style={styles.rowLabel}>Contact</Text>
                  </View>
                  {tournament.contactName ? <Text style={styles.rowValue}>{tournament.contactName}</Text> : null}
                  {tournament.contactPhone ? (
                    <View style={styles.contactLine}>
                      <Text style={styles.contactLineIcon}>📱</Text>
                      <Text style={styles.rowValue}>{tournament.contactPhone}</Text>
                    </View>
                  ) : null}
                  {tournament.contactEmail ? (
                    <View style={styles.contactLine}>
                      <Text style={styles.contactLineIcon}>✉️</Text>
                      <Text style={styles.rowValue}>{tournament.contactEmail}</Text>
                    </View>
                  ) : null}
                </>
              ) : null}

              <Text style={[styles.spotsText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>{spotsLeft} spots left</Text>
            </View>

            {isOwner ? (
              <View style={styles.ownerActions}>
                <TouchableOpacity style={styles.editBtn} onPress={() => router.push({ pathname: '/edit-tournament', params: { id } })}>
                  <Text style={styles.editBtnText}>Edit Tournament</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => setShowDeleteModal(true)}>
                  <Text style={styles.deleteBtnText}>Delete Tournament</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.joinBtn, (joined || isCanceled) && styles.joinedBtn]}
                onPress={() => {
                  if (joined) { handleCancelRegistration(); }
                  else if (!isCanceled && spotsLeft > 0) { setShowTeamModal(true); }
                }}
                disabled={!joined && (spotsLeft <= 0 || isCanceled)}
              >
                <Text style={styles.joinText}>
                  {isCanceled && !joined ? 'Canceled' : joined ? 'Registered ✓ (tap to cancel)' : spotsLeft <= 0 ? 'Full' : 'Register Team'}
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        )}
      </View>

      {/* Team Registration Modal */}
      <Modal visible={showTeamModal} animationType="slide" transparent onRequestClose={tryCloseModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Register Your Team</Text>
                  <Text style={styles.modalSub}>{tournament.name}</Text>
                </View>
                <TouchableOpacity onPress={tryCloseModal} style={styles.modalCloseBtn}>
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.modalLabel}>Team Name</Text>
              <TextInput style={styles.modalInput} placeholder="e.g. Gallup Ballers" placeholderTextColor="#a0b8b8" value={teamName} onChangeText={setTeamName} />

              <Text style={styles.modalLabel}>Your Name</Text>
              <TextInput style={styles.modalInput} placeholder="e.g. John Begay" placeholderTextColor="#a0b8b8" value={contactName} onChangeText={setContactName} />

              <Text style={styles.modalLabel}>Your Contact Info</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. 928-555-1234"
                placeholderTextColor="#a0b8b8"
                value={contactInfo}
                onChangeText={v => setContactInfo(formatPhone(v))}
                keyboardType="phone-pad"
                maxLength={12}
              />

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
                <TouchableOpacity style={styles.modalCancelBtn} onPress={tryCloseModal}>
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

      {/* Delete Confirmation Modal */}
      <Modal visible={showDeleteModal} animationType="fade" transparent>
        <View style={styles.successOverlay}>
          <View style={styles.deleteBox}>
            <Text style={[styles.deleteModalTitle, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>
              DELETE TOURNAMENT
            </Text>
            <Text style={styles.deleteModalMsg}>
              This will notify all registered teams and permanently delete{' '}
              <Text style={{ fontWeight: '700', color: '#003333' }}>{tournament.name}</Text>.
              {'\n\n'}This cannot be undone.
            </Text>
            <View style={styles.deleteModalBtns}>
              <TouchableOpacity
                style={styles.deleteModalCancelBtn}
                onPress={() => setShowDeleteModal(false)}
                activeOpacity={0.85}
              >
                <Text style={[styles.deleteModalCancelText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>KEEP IT</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteModalConfirmBtn}
                onPress={confirmDelete}
                disabled={deleteLoading}
                activeOpacity={0.85}
              >
                <Text style={[styles.deleteModalConfirmText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>
                  {deleteLoading ? 'DELETING...' : 'DELETE'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal visible={showSuccessModal} animationType="fade" transparent>
        <View style={styles.successOverlay}>
          <View style={styles.successBox}>
            <SuccessTrophy />
            <Text style={[styles.successTitle, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>
              TEAM REGISTERED!
            </Text>
            <Text style={styles.successMsg}>
              {successData?.teamName} has been registered for {successData?.tournamentName}.
            </Text>
            {successData?.depositMsg ? (
              <View style={styles.successDepositBox}>
                <Text style={styles.successDepositText}>💰 {successData.depositMsg}</Text>
              </View>
            ) : null}
            <TouchableOpacity
              style={[styles.successBtn, { backgroundColor: sportColor }]}
              onPress={() => setShowSuccessModal(false)}
              activeOpacity={0.85}
            >
              <Text style={[styles.successBtnText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>GOT IT</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
  tabRow: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 16, backgroundColor: '#e0f5f5', borderRadius: 12, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabActive: { backgroundColor: '#008080' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#5a7a7a' },
  tabTextActive: { color: '#fff' },
  teamsCount: { fontSize: 11, color: '#999', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, paddingLeft: 4 },
  emptyTeams: { alignItems: 'center', marginTop: 60, gap: 10 },
  emptyTeamsText: { fontSize: 16, color: '#a0b8b8' },
  teamCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#f0f0f0', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  teamCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  teamName: { fontSize: 17, fontWeight: '900', color: '#111', flex: 1 },
  teamDivisionBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1 },
  teamDivisionText: { fontSize: 12, fontWeight: '600' },
  submittedLabel: { fontSize: 10, color: '#aaa', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  contactName: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 4 },
  contactLine: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  contactLineIcon: { fontSize: 12 },
  contactLineText: { fontSize: 12, color: '#777' },
  card: { backgroundColor: '#fff', borderRadius: 24, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  sportBadge: { alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 12 },
  sportBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  tournamentName: { fontSize: 26, fontWeight: '900', color: '#111', marginBottom: 12, lineHeight: 30 },
  divider: { height: 1, backgroundColor: '#f0f0f0', marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  rowIcon: { fontSize: 15 },
  rowLabel: { fontSize: 13, fontWeight: '700', color: '#333' },
  rowValue: { fontSize: 14, color: '#555', paddingLeft: 24, marginBottom: 2 },
  copyBtn: { marginLeft: 24, marginTop: 8, backgroundColor: '#f5ede0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start' },
  copyBtnText: { fontSize: 12, color: '#008080', fontWeight: '600' },
  spotsText: { fontSize: 18, color: '#008080', fontWeight: '900', marginTop: 16 },
  ownerActions: { gap: 10, marginBottom: 20 },
  editBtn: { backgroundColor: '#008080', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  editBtnText: { color: '#fff', fontSize: 18, fontFamily: 'Rajdhani_700Bold', letterSpacing: 1 },
  deleteBtn: { backgroundColor: '#1a1a2e', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  deleteBtnText: { color: '#fff', fontSize: 18, fontFamily: 'Rajdhani_700Bold', letterSpacing: 1 },
  joinBtn: { backgroundColor: '#008080', borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginBottom: 20 },
  joinedBtn: { backgroundColor: '#a0b8b8' },
  joinText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#f0fafa', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  modalCloseBtn: { padding: 4 },
  modalCloseText: { fontSize: 22, color: '#5a7a7a', fontWeight: 'bold' },
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
  successOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  successBox: { backgroundColor: '#f5ede0', borderRadius: 24, padding: 28, alignItems: 'center', width: '100%', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 16, elevation: 8 },
  successTitle: { fontSize: 28, color: '#003333', letterSpacing: 2, marginTop: 12, marginBottom: 8, textAlign: 'center' },
  successMsg: { fontSize: 15, color: '#555', textAlign: 'center', marginBottom: 16, lineHeight: 22 },
  successDepositBox: { backgroundColor: '#fff8e0', borderRadius: 12, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: '#f0d080', width: '100%' },
  successDepositText: { fontSize: 13, color: '#7a5a00', fontWeight: '600', textAlign: 'center', lineHeight: 20 },
  successBtn: { borderRadius: 14, paddingVertical: 14, paddingHorizontal: 40, alignItems: 'center', marginTop: 4 },
  successBtnText: { color: '#fff', fontSize: 18, letterSpacing: 1 },
  deleteBox: { backgroundColor: '#f5ede0', borderRadius: 24, padding: 28, alignItems: 'center', width: '100%', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 16, elevation: 8 },
  deleteModalTitle: { fontSize: 26, color: '#1a1a2e', letterSpacing: 2, marginBottom: 12, textAlign: 'center' },
  deleteModalMsg: { fontSize: 15, color: '#555', textAlign: 'center', lineHeight: 24, marginBottom: 24 },
  deleteModalBtns: { flexDirection: 'row', gap: 12, width: '100%' },
  deleteModalCancelBtn: { flex: 1, backgroundColor: '#fff', borderRadius: 14, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: '#e0d8c8' },
  deleteModalCancelText: { fontSize: 16, color: '#555', letterSpacing: 1 },
  deleteModalConfirmBtn: { flex: 1, backgroundColor: '#1a1a2e', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  deleteModalConfirmText: { color: '#fff', fontSize: 16, letterSpacing: 1 },
});