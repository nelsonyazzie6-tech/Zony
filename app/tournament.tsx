import { Rajdhani_700Bold, useFonts } from '@expo-google-fonts/rajdhani';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, arrayRemove, arrayUnion, collection, deleteDoc, doc, getDoc, getDocs, increment, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Clipboard, Image, KeyboardAvoidingView, Modal, Platform, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
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
  const [isEditingRegistration, setIsEditingRegistration] = useState(false);
  const [myTeamId, setMyTeamId] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [successData, setSuccessData] = useState<{ teamName: string; tournamentName: string; depositMsg: string; contactInfo: string } | null>(null);
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
    // Custom modal handled via showDeleteModal pattern — use inline state
    setCancelConfirmVisible(true);
  };

  const [cancelConfirmVisible, setCancelConfirmVisible] = useState(false);

  const doCancelRegistration = async () => {
    setCancelConfirmVisible(false);
    try {
      const teamsSnap = await getDocs(collection(db, 'tournaments', id as string, 'teams'));
      const myTeam = teamsSnap.docs.find(d => d.data().registeredBy === user?.uid);
      if (myTeam) await deleteDoc(doc(db, 'tournaments', id as string, 'teams', myTeam.id));
      await updateDoc(doc(db, 'tournaments', id as string), {
        joinedUsers: arrayRemove(user?.uid),
        spots: increment(1),
      });
      setJoined(false);
      setMyTeamId(null);
      setSpotsLeft(prev => prev + 1);
    } catch (e: any) { console.error(e); }
  };

  const openEditRegistration = async () => {
    try {
      const teamsSnap = await getDocs(collection(db, 'tournaments', id as string, 'teams'));
      const myTeam = teamsSnap.docs.find(d => d.data().registeredBy === user?.uid);
      if (!myTeam) return;
      const data = myTeam.data();
      setMyTeamId(myTeam.id);
      setTeamName(data.teamName || '');
      setContactName(data.contactName || '');
      setContactInfo(data.contactInfo || '');
      setTeamDivision(data.division || '');
      setIsEditingRegistration(true);
      setShowTeamModal(true);
    } catch (e: any) { console.error(e); }
  };

  const tryCloseModal = () => {
    setTeamName(''); setContactName(''); setContactInfo(''); setTeamDivision('');
    setIsEditingRegistration(false);
    setMyTeamId(null);
    setShowTeamModal(false);
  };

  // Division-specific fee lookup
  const getDivisionFee = (div: string): string | null => {
    if (!tournament?.divisionFees) return null;
    const fee = tournament.divisionFees[div];
    return fee ? `$${fee}` : null;
  };

  const handleRegisterTeam = async () => {
    if (!teamName || !contactName || !contactInfo || !teamDivision) return;
    if (!user) return;

    setTeamLoading(true);
    try {
      if (isEditingRegistration && myTeamId) {
        await updateDoc(doc(db, 'tournaments', id as string, 'teams', myTeamId), {
          teamName, contactName, contactInfo, division: teamDivision,
        });
        setShowTeamModal(false);
        setTeamName(''); setContactName(''); setContactInfo(''); setTeamDivision('');
        setIsEditingRegistration(false);
        setMyTeamId(null);
      } else {
        if (spotsLeft <= 0) { setTeamLoading(false); return; }

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
          link: `/tournament?id=${id}&postedBy=${postedBy}`,
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
          ? `Deposit of ${tournament.depositAmount} due by ${tournament.depositDue}.`
          : tournament?.depositAmount
          ? `Deposit of ${tournament.depositAmount} required.`
          : '';

        // Build contact info string for payment prompt
        const orgContact = [tournament?.contactName, tournament?.contactPhone].filter(Boolean).join(' · ');

        setSuccessData({ teamName, tournamentName: tournament?.name, depositMsg, contactInfo: orgContact });
        setShowSuccessModal(true);
      }
    } catch (e: any) { console.error(e); }
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
              link: `/`,
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
    } catch (e: any) { console.error(e); }
    setDeleteLoading(false);
  };

  const handleShare = async () => {
    if (!tournament) return;
    try {
      await Share.share({
        message: `🏆 ${tournament.name}\n📅 ${tournament.date}\n📍 ${tournament.city}, ${tournament.state}${tournament.contactPhone ? `\n📞 ${tournament.contactPhone}` : ''}\n\nFind this tournament on Zony!`,
      });
    } catch (e: any) { console.error(e); }
  };

  if (!tournament) return null;
  const isCanceled = tournament.status === 'canceled';

  const sportColor = tournament.sport === 'Basketball' ? '#008080'
    : tournament.sport === 'Volleyball' ? '#7A1E1E'
    : tournament.sport === 'Softball' ? '#B8860B'
    : '#008080';

  const organizerInitials = tournament.organizerName
    ? tournament.organizerName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  // Divisions available for registration
  const registrationDivisions = tournament.divisions?.length > 0 ? tournament.divisions : [];

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
              <View style={styles.sportBadgeRow}>
                <View style={[styles.sportBadge, { backgroundColor: sportColor }]}>
                  <Text style={styles.sportBadgeText}>{tournament.sport}</Text>
                </View>
              </View>
              <Text style={[styles.tournamentName, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>{tournament.name}</Text>

              {tournament.organizerName ? (
                <View style={styles.organizerRow}>
                  {tournament.organizerPhoto ? (
                    <Image source={{ uri: tournament.organizerPhoto }} style={styles.organizerPhoto} />
                  ) : (
                    <View style={[styles.organizerAvatar, { backgroundColor: sportColor }]}>
                      <Text style={[styles.organizerInitials, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>{organizerInitials}</Text>
                    </View>
                  )}
                  <View>
                    <Text style={styles.organizerLabel}>Posted by</Text>
                    <Text style={[styles.organizerName, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>{tournament.organizerName}</Text>
                  </View>
                </View>
              ) : null}

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
                  {tournament.divisions.map((d: string) => {
                    const fee = getDivisionFee(d);
                    return (
                      <Text key={d} style={styles.rowValue}>
                        {d}{fee ? `  —  ${fee}` : ''}
                      </Text>
                    );
                  })}
                </>
              )}

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
      <Text style={styles.rowIcon}>🏆</Text>
      <Text style={styles.rowLabel}>Prizes</Text>
    </View>
    {tournament.prizes.split(/\n| · /).map((line: string, i: number) => line.trim() ? (
      <Text key={i} style={styles.rowValue}>{line.trim()}</Text>
    ) : null)}
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
                  <Text style={[styles.editBtnText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>Edit Tournament</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => setShowDeleteModal(true)}>
                  <Text style={[styles.deleteBtnText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>Delete Tournament</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.registrationActions}>
                {joined ? (
                  <>
                    <TouchableOpacity style={[styles.joinBtn, { backgroundColor: sportColor }]} onPress={openEditRegistration}>
                      <Text style={styles.joinText}>Edit Registration ✏️</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.cancelRegBtn} onPress={handleCancelRegistration}>
                      <Text style={styles.cancelRegText}>Cancel Registration</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity
                    style={[styles.joinBtn, (spotsLeft <= 0 || isCanceled) && styles.joinedBtn]}
                    onPress={() => { if (!isCanceled && spotsLeft > 0) setShowTeamModal(true); }}
                    disabled={spotsLeft <= 0 || isCanceled}
                  >
                    <Text style={styles.joinText}>
                      {isCanceled ? 'Canceled' : spotsLeft <= 0 ? 'Full' : 'Register Team'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </ScrollView>
        )}
      </View>

      {/* Registration Modal */}
      <Modal visible={showTeamModal} animationType="slide" transparent onRequestClose={tryCloseModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <View style={styles.modalHeader}>
                <View>
                  <Text style={[styles.modalTitle, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>{isEditingRegistration ? 'EDIT REGISTRATION' : 'REGISTER YOUR TEAM'}</Text>
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
              <TextInput style={styles.modalInput} placeholder="e.g. 928-555-1234" placeholderTextColor="#a0b8b8" value={contactInfo} onChangeText={v => setContactInfo(formatPhone(v))} keyboardType="phone-pad" maxLength={12} />

              <Text style={styles.modalLabel}>Division</Text>
              <TouchableOpacity style={styles.modalDropdown} onPress={() => setShowDivisionPicker(!showDivisionPicker)}>
                <Text style={teamDivision ? styles.modalDropdownSelected : styles.modalDropdownPlaceholder}>{teamDivision || 'Select division...'}</Text>
                <Text style={styles.dropdownArrow}>{showDivisionPicker ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {showDivisionPicker && (
                <View style={styles.modalDropdownList}>
                  {registrationDivisions.map((d: string) => (
                    <TouchableOpacity key={d} style={styles.modalDropdownItem} onPress={() => { setTeamDivision(d); setShowDivisionPicker(false); }}>
                      <View style={styles.divisionPickerRow}>
                        <Text style={[styles.modalDropdownItemText, teamDivision === d && styles.modalDropdownItemActive]}>{d}</Text>
                        {getDivisionFee(d) ? (
                          <Text style={styles.divisionFeeTag}>{getDivisionFee(d)}</Text>
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Show selected division's fee inline */}
              {teamDivision && getDivisionFee(teamDivision) ? (
                <View style={styles.selectedDivisionFeeBox}>
                  <Text style={styles.selectedDivisionFeeText}>💵 Entry fee for {teamDivision}: {getDivisionFee(teamDivision)}</Text>
                </View>
              ) : null}

              {tournament.depositAmount && !isEditingRegistration ? (
                <View style={styles.depositNotice}>
                  <Text style={styles.depositNoticeText}>💰 Non-refundable deposit of {tournament.depositAmount}{tournament.depositDue ? ` due by ${tournament.depositDue}` : ' required'}.</Text>
                </View>
              ) : null}

              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.modalCancelBtn} onPress={tryCloseModal}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleRegisterTeam} disabled={teamLoading}>
                  <Text style={[styles.modalSubmitText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>{teamLoading ? 'Saving...' : isEditingRegistration ? 'SAVE' : 'REGISTER'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Cancel Registration Confirm Modal */}
      <Modal visible={cancelConfirmVisible} animationType="fade" transparent>
        <View style={styles.successOverlay}>
          <View style={styles.deleteBox}>
            <Text style={[styles.deleteModalTitle, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>CANCEL REGISTRATION?</Text>
            <Text style={styles.deleteModalMsg}>Are you sure you want to cancel your registration for {tournament.name}?</Text>
            <View style={styles.deleteModalBtns}>
              <TouchableOpacity style={styles.deleteModalCancelBtn} onPress={() => setCancelConfirmVisible(false)}>
                <Text style={[styles.deleteModalCancelText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>KEEP IT</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteModalConfirmBtn} onPress={doCancelRegistration}>
                <Text style={[styles.deleteModalConfirmText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>CANCEL</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Tournament Modal */}
      <Modal visible={showDeleteModal} animationType="fade" transparent>
        <View style={styles.successOverlay}>
          <View style={styles.deleteBox}>
            <Text style={[styles.deleteModalTitle, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>DELETE TOURNAMENT</Text>
            <Text style={styles.deleteModalMsg}>
              This will notify all registered teams and permanently delete{' '}
              <Text style={{ fontWeight: '700', color: '#003333' }}>{tournament.name}</Text>.{'\n\n'}This cannot be undone.
            </Text>
            <View style={styles.deleteModalBtns}>
              <TouchableOpacity style={styles.deleteModalCancelBtn} onPress={() => setShowDeleteModal(false)}>
                <Text style={[styles.deleteModalCancelText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>KEEP IT</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteModalConfirmBtn} onPress={confirmDelete} disabled={deleteLoading}>
                <Text style={[styles.deleteModalConfirmText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>{deleteLoading ? 'DELETING...' : 'DELETE'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success / Payment Prompt Modal */}
      <Modal visible={showSuccessModal} animationType="fade" transparent>
        <View style={styles.successOverlay}>
          <View style={styles.successBox}>
            <SuccessTrophy />
            <Text style={[styles.successTitle, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>TEAM REGISTERED!</Text>
            <Text style={styles.successMsg}>{successData?.teamName} is registered for {successData?.tournamentName}.</Text>

            {successData?.depositMsg ? (
              <View style={styles.successDepositBox}>
                <Text style={styles.successDepositText}>💰 {successData.depositMsg}</Text>
              </View>
            ) : null}

            {/* Item 12 — payment contact prompt */}
            <View style={styles.paymentPromptBox}>
              <Text style={styles.paymentPromptTitle}>💳 Payment Details</Text>
              <Text style={styles.paymentPromptText}>
                Contact the organizer for payment instructions and accepted methods.
              </Text>
              {successData?.contactInfo ? (
                <Text style={styles.paymentContactInfo}>{successData.contactInfo}</Text>
              ) : null}
            </View>

            <TouchableOpacity style={[styles.successBtn, { backgroundColor: sportColor }]} onPress={() => setShowSuccessModal(false)}>
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
  sportBadgeRow: { marginBottom: 12 },
  sportBadge: { alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  sportBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  tournamentName: { fontSize: 26, fontWeight: '900', color: '#111', marginBottom: 12, lineHeight: 30 },
  organizerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14, backgroundColor: '#f5ede0', borderRadius: 12, padding: 10 },
  organizerPhoto: { width: 40, height: 40, borderRadius: 20 },
  organizerAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  organizerInitials: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  organizerLabel: { fontSize: 11, color: '#a0b8b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  organizerName: { fontSize: 15, color: '#003333', letterSpacing: 0.5 },
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
  editBtnText: { color: '#fff', fontSize: 18, letterSpacing: 1 },
  deleteBtn: { backgroundColor: '#1a1a2e', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  deleteBtnText: { color: '#fff', fontSize: 18, letterSpacing: 1 },
  registrationActions: { gap: 10, marginBottom: 20 },
  joinBtn: { backgroundColor: '#008080', borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  joinedBtn: { backgroundColor: '#a0b8b8' },
  joinText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  cancelRegBtn: { borderRadius: 16, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: '#cc4444' },
  cancelRegText: { fontSize: 15, color: '#cc4444', fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#f0fafa', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  modalCloseBtn: { padding: 4 },
  modalCloseText: { fontSize: 22, color: '#5a7a7a', fontWeight: 'bold' },
  modalTitle: { fontSize: 22, color: '#003333', letterSpacing: 1, marginBottom: 4 },
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
  divisionPickerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  divisionFeeTag: { fontSize: 13, color: '#008080', fontWeight: '700' },
  selectedDivisionFeeBox: { backgroundColor: '#e0f5f5', borderRadius: 10, padding: 10, marginTop: 6, marginBottom: 4 },
  selectedDivisionFeeText: { fontSize: 13, color: '#003333', fontWeight: '600' },
  depositNotice: { backgroundColor: '#fff8e0', borderRadius: 10, padding: 12, marginTop: 12, borderWidth: 1, borderColor: '#f0d080' },
  depositNoticeText: { fontSize: 13, color: '#7a5a00', fontWeight: '600' },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 20, marginBottom: 10 },
  modalCancelBtn: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: '#c0d8d8' },
  modalCancelText: { fontSize: 16, color: '#5a7a7a', fontWeight: '600' },
  modalSubmitBtn: { flex: 1, backgroundColor: '#008080', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  modalSubmitText: { color: '#fff', fontSize: 16, letterSpacing: 1 },
  successOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  successBox: { backgroundColor: '#f5ede0', borderRadius: 24, padding: 28, alignItems: 'center', width: '100%', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 16, elevation: 8 },
  successTitle: { fontSize: 28, color: '#003333', letterSpacing: 2, marginTop: 12, marginBottom: 8, textAlign: 'center' },
  successMsg: { fontSize: 15, color: '#555', textAlign: 'center', marginBottom: 12, lineHeight: 22 },
  successDepositBox: { backgroundColor: '#fff8e0', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#f0d080', width: '100%' },
  successDepositText: { fontSize: 13, color: '#7a5a00', fontWeight: '600', textAlign: 'center', lineHeight: 20 },
  paymentPromptBox: { backgroundColor: '#e0f5f5', borderRadius: 12, padding: 14, marginBottom: 20, width: '100%', borderWidth: 1, borderColor: '#c0e8e8' },
  paymentPromptTitle: { fontSize: 13, fontWeight: '700', color: '#003333', marginBottom: 4 },
  paymentPromptText: { fontSize: 13, color: '#5a7a7a', lineHeight: 18 },
  paymentContactInfo: { fontSize: 13, color: '#008080', fontWeight: '600', marginTop: 6 },
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