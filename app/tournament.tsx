import { Rajdhani_700Bold, useFonts } from '@expo-google-fonts/rajdhani';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, arrayRemove, arrayUnion, collection, deleteDoc, doc, getDoc, getDocs, increment, onSnapshot, orderBy, query, runTransaction, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Clipboard, Image, KeyboardAvoidingView, Linking, Modal, Platform, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
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

// Reusable styled info modal matching app theme
function InfoModal({ visible, title, message, onClose }: { visible: boolean; title: string; message: string; onClose: () => void }) {
  const [fontsLoaded] = useFonts({ Rajdhani_700Bold });
  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.successOverlay}>
        <View style={styles.deleteBox}>
          <Text style={[styles.deleteModalTitle, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>{title}</Text>
          <Text style={styles.deleteModalMsg}>{message}</Text>
          <TouchableOpacity style={[styles.successBtn, { backgroundColor: '#008080', alignSelf: 'stretch' }]} onPress={onClose}>
            <Text style={[styles.successBtnText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function TournamentScreen() {
  const { id, postedBy } = useLocalSearchParams();
  const router = useRouter();
  const [tournament, setTournament] = useState<any>(null);
  const [joined, setJoined] = useState(false);
  const [onWaitlist, setOnWaitlist] = useState(false);
  const [myWaitlistDivision, setMyWaitlistDivision] = useState<string | null>(null);

  // spotsLeft is per-division when the tournament has divisions, otherwise a single number
  const [divisionSpotsLeft, setDivisionSpotsLeft] = useState<Record<string, number>>({});
  const [spotsLeft, setSpotsLeft] = useState(0);

  const [activeTab, setActiveTab] = useState<'details' | 'teams' | 'waitlist'>('details');
  const [teams, setTeams] = useState([]);
  const [waitlistEntries, setWaitlistEntries] = useState([]);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [isEditingRegistration, setIsEditingRegistration] = useState(false);
  const [myTeamId, setMyTeamId] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showWaitlistModal, setShowWaitlistModal] = useState(false);
  const [showLeaveWaitlistModal, setShowLeaveWaitlistModal] = useState(false);
  const [leaveWaitlistLoading, setLeaveWaitlistLoading] = useState(false);
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
  const [cancelConfirmVisible, setCancelConfirmVisible] = useState(false);
  const [fontsLoaded] = useFonts({ Rajdhani_700Bold });
  const [waitlistPhone, setWaitlistPhone] = useState('');
  const [waitlistDivision, setWaitlistDivision] = useState('');
  const [showWaitlistDivisionPicker, setShowWaitlistDivisionPicker] = useState(false);

  // Info modal (replaces silent failures for "division full" etc.)
  const [infoModal, setInfoModal] = useState<{ visible: boolean; title: string; message: string }>({
    visible: false, title: '', message: '',
  });

  const user = auth.currentUser;
  const isOwner = user?.uid === postedBy;

  const hasDivisionSpots = (data: any) => data?.divisionSpots && Object.keys(data.divisionSpots).length > 0;

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      const snap = await getDoc(doc(db, 'tournaments', id as string));
      if (snap.exists()) {
        const data = snap.data();
        setTournament(data);
        if (hasDivisionSpots(data)) {
          setDivisionSpotsLeft(data.divisionSpots);
        } else {
          setSpotsLeft(data.spots);
        }
        if (data.joinedUsers?.includes(user?.uid)) setJoined(true);
      }
      if (user) {
        const userSnap = await getDoc(doc(db, 'users', user.uid));
        if (userSnap.exists()) setCurrentUsername(userSnap.data().username || user.email || '');
        const waitlistSnap = await getDocs(collection(db, 'tournaments', id as string, 'waitlist'));
        const myEntry = waitlistSnap.docs.find(d => d.data().userId === user.uid);
        if (myEntry) {
          setOnWaitlist(true);
          setMyWaitlistDivision(myEntry.data().division || null);
        }
      }
    };
    load();

    const teamsQuery = query(collection(db, 'tournaments', id as string, 'teams'), orderBy('createdAt', 'asc'));
    const unsubTeams = onSnapshot(teamsQuery, (snap) => {
      setTeams(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const waitlistQuery = query(collection(db, 'tournaments', id as string, 'waitlist'), orderBy('createdAt', 'asc'));
    const unsubWaitlist = onSnapshot(waitlistQuery, (snap) => {
      setWaitlistEntries(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubTeams(); unsubWaitlist(); };
  }, []);

  const handleCopyAddress = () => {
    if (!tournament) return;
    const parts = [tournament.address, tournament.city, tournament.state, tournament.zip].filter(Boolean);
    Clipboard.setString(parts.join(', '));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCancelRegistration = () => setCancelConfirmVisible(true);

  const doCancelRegistration = async () => {
    setCancelConfirmVisible(false);
    try {
      const teamsSnap = await getDocs(collection(db, 'tournaments', id as string, 'teams'));
      const myTeam = teamsSnap.docs.find(d => d.data().registeredBy === user?.uid);
      const myTeamData = myTeam?.data();
      const cancelingDivision: string = myTeamData?.division || '';

      if (myTeam) await deleteDoc(doc(db, 'tournaments', id as string, 'teams', myTeam.id));

      const usesDivisionSpots = hasDivisionSpots(tournament);

      await runTransaction(db, async (tx) => {
        const tRef = doc(db, 'tournaments', id as string);
        const tSnap = await tx.get(tRef);
        if (!tSnap.exists()) return;
        if (usesDivisionSpots && cancelingDivision) {
          tx.update(tRef, {
            joinedUsers: arrayRemove(user?.uid),
            [`divisionSpots.${cancelingDivision}`]: increment(1),
          });
        } else {
          tx.update(tRef, { joinedUsers: arrayRemove(user?.uid), spots: increment(1) });
        }
      });

      setJoined(false);
      setMyTeamId(null);
      if (usesDivisionSpots && cancelingDivision) {
        setDivisionSpotsLeft(prev => ({ ...prev, [cancelingDivision]: (prev[cancelingDivision] || 0) + 1 }));
      } else {
        setSpotsLeft(prev => prev + 1);
      }

      const cancelingName = myTeamData?.contactName || currentUsername || 'A team';
      const cancelingTeamName = myTeamData?.teamName || 'Unknown team';

      await addDoc(collection(db, 'notifications'), {
        toUserId: postedBy as string,
        message: `${cancelingName} canceled registration for ${tournament?.name}`,
        body: `${cancelingTeamName} has withdrawn from ${tournament?.name}.`,
        link: `/tournament?id=${id}&postedBy=${postedBy}`,
        createdAt: serverTimestamp(),
        read: false,
      });

      const ownerSnap = await getDoc(doc(db, 'users', postedBy as string));
      if (ownerSnap.exists() && ownerSnap.data().pushToken) {
        await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: ownerSnap.data().pushToken,
            title: '❌ Team canceled registration',
            body: `${cancelingTeamName} withdrew from ${tournament?.name}.`,
          }),
        });
      }

      // Promote next waitlisted person FOR THE SAME DIVISION (or any, if no divisions)
      let waitlistQueryRef;
      if (usesDivisionSpots && cancelingDivision) {
        waitlistQueryRef = query(
          collection(db, 'tournaments', id as string, 'waitlist'),
          where('division', '==', cancelingDivision),
          orderBy('createdAt', 'asc')
        );
      } else {
        waitlistQueryRef = query(collection(db, 'tournaments', id as string, 'waitlist'), orderBy('createdAt', 'asc'));
      }

      const waitlistSnap = await getDocs(waitlistQueryRef);
      if (waitlistSnap.docs.length > 0) {
        const first = waitlistSnap.docs[0];
        const firstData = first.data();
        const firstUserId = firstData.userId;
        const promotedDivision = firstData.division || cancelingDivision || '';

        await runTransaction(db, async (tx) => {
          const tRef = doc(db, 'tournaments', id as string);
          const tSnap = await tx.get(tRef);
          if (!tSnap.exists()) return;
          if (usesDivisionSpots && promotedDivision) {
            tx.update(tRef, {
              joinedUsers: arrayUnion(firstUserId),
              [`divisionSpots.${promotedDivision}`]: increment(-1),
            });
          } else {
            tx.update(tRef, { joinedUsers: arrayUnion(firstUserId), spots: increment(-1) });
          }
        });

        if (usesDivisionSpots && promotedDivision) {
          setDivisionSpotsLeft(prev => ({ ...prev, [promotedDivision]: Math.max(0, (prev[promotedDivision] || 0) - 1) }));
        } else {
          setSpotsLeft(prev => Math.max(0, prev - 1));
        }

        await addDoc(collection(db, 'tournaments', id as string, 'teams'), {
          teamName: firstData.username || 'Waitlist Team',
          contactName: firstData.username || '',
          contactInfo: firstData.phone || '',
          division: promotedDivision,
          registeredBy: firstUserId,
          fromWaitlist: true,
          createdAt: serverTimestamp(),
        });

        await deleteDoc(first.ref);

        await addDoc(collection(db, 'notifications'), {
          toUserId: firstUserId,
          message: `🎉 You've been added to ${tournament?.name}!`,
          body: "A spot opened and you were next on the waitlist. You're in — check your registration.",
          link: `/tournament?id=${id}&postedBy=${postedBy}`,
          createdAt: serverTimestamp(),
          read: false,
        });

        const waitlistUserSnap = await getDoc(doc(db, 'users', firstUserId));
        if (waitlistUserSnap.exists() && waitlistUserSnap.data().pushToken) {
          await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: waitlistUserSnap.data().pushToken,
              title: "🎉 You're in!",
              body: `A spot opened in ${tournament?.name} and you've been automatically registered.`,
            }),
          });
        }

        await addDoc(collection(db, 'notifications'), {
          toUserId: postedBy as string,
          message: `${firstData.username || 'A waitlisted user'} was auto-added to ${tournament?.name}`,
          body: 'They were next on the waitlist and have been registered automatically.',
          link: `/tournament?id=${id}&postedBy=${postedBy}`,
          createdAt: serverTimestamp(),
          read: false,
        });
      }
    } catch (e: any) { console.error(e); }
  };

  const handleJoinWaitlist = async () => {
    if (!user || onWaitlist) return;
    const usesDivisionSpots = hasDivisionSpots(tournament);
    if (usesDivisionSpots && !waitlistDivision) {
      setInfoModal({ visible: true, title: 'SELECT A DIVISION', message: 'Please select which division you want to be waitlisted for.' });
      return;
    }
    try {
      await addDoc(collection(db, 'tournaments', id as string, 'waitlist'), {
        userId: user.uid,
        username: currentUsername,
        phone: waitlistPhone.trim() || null,
        division: usesDivisionSpots ? waitlistDivision : '',
        createdAt: serverTimestamp(),
      });
      setOnWaitlist(true);
      setMyWaitlistDivision(usesDivisionSpots ? waitlistDivision : null);
      setShowWaitlistModal(true);

      const divisionNote = usesDivisionSpots ? ` (${waitlistDivision})` : '';

      await addDoc(collection(db, 'notifications'), {
        toUserId: postedBy as string,
        message: `${currentUsername} joined the waitlist for ${tournament?.name}${divisionNote}`,
        body: "They'll be automatically added if a spot opens.",
        link: `/tournament?id=${id}&postedBy=${postedBy}`,
        createdAt: serverTimestamp(),
        read: false,
      });

      const ownerSnap = await getDoc(doc(db, 'users', postedBy as string));
      if (ownerSnap.exists() && ownerSnap.data().pushToken) {
        await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: ownerSnap.data().pushToken,
            title: '📋 New waitlist signup',
            body: `${currentUsername} joined the waitlist for ${tournament?.name}${divisionNote}.`,
          }),
        });
      }
    } catch (e: any) { console.error(e); }
  };

  // Leave waitlist
  const doLeaveWaitlist = async () => {
    if (!user) return;
    setLeaveWaitlistLoading(true);
    try {
      const waitlistSnap = await getDocs(collection(db, 'tournaments', id as string, 'waitlist'));
      const myEntry = waitlistSnap.docs.find(d => d.data().userId === user.uid);
      if (myEntry) await deleteDoc(myEntry.ref);
      setOnWaitlist(false);
      setMyWaitlistDivision(null);
      setShowLeaveWaitlistModal(false);

      await addDoc(collection(db, 'notifications'), {
        toUserId: postedBy as string,
        message: `${currentUsername} left the waitlist for ${tournament?.name}`,
        body: 'They have removed themselves from the waitlist.',
        link: `/tournament?id=${id}&postedBy=${postedBy}`,
        createdAt: serverTimestamp(),
        read: false,
      });
    } catch (e: any) { console.error(e); }
    setLeaveWaitlistLoading(false);
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

  const getDivisionFee = (div: string): string | null => {
    if (!tournament?.divisionFees) return null;
    const fee = tournament.divisionFees[div];
    return fee ? `$${fee}` : null;
  };

  const getDivisionSpotsLeft = (div: string): number | null => {
    if (!hasDivisionSpots(tournament)) return null;
    return divisionSpotsLeft[div] ?? tournament.divisionSpots[div] ?? 0;
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
        const usesDivisionSpots = hasDivisionSpots(tournament);
        let registered = false;
        let wasFull = false;

        await runTransaction(db, async (tx) => {
          const tRef = doc(db, 'tournaments', id as string);
          const tSnap = await tx.get(tRef);
          if (!tSnap.exists()) return;
          const data = tSnap.data();

          if (usesDivisionSpots) {
            const divSpots = data.divisionSpots?.[teamDivision];
            if (divSpots === undefined || divSpots <= 0) { wasFull = true; return; }
            tx.update(tRef, {
              joinedUsers: arrayUnion(user.uid),
              [`divisionSpots.${teamDivision}`]: increment(-1),
            });
          } else {
            const spots = data.spots;
            if (spots <= 0) { wasFull = true; return; }
            tx.update(tRef, { joinedUsers: arrayUnion(user.uid), spots: increment(-1) });
          }
          registered = true;
        });

        if (wasFull) {
          setTeamLoading(false);
          setInfoModal({
            visible: true,
            title: 'DIVISION FULL',
            message: `The ${teamDivision} division is full. You can join the waitlist for this division instead.`,
          });
          return;
        }

        if (!registered) { setTeamLoading(false); return; }

        setJoined(true);
        if (usesDivisionSpots) {
          setDivisionSpotsLeft(prev => ({ ...prev, [teamDivision]: Math.max(0, (prev[teamDivision] ?? tournament.divisionSpots[teamDivision] ?? 0) - 1) }));
        } else {
          setSpotsLeft(prev => prev - 1);
        }

        await addDoc(collection(db, 'tournaments', id as string, 'teams'), {
          teamName, contactName, contactInfo,
          division: teamDivision,
          registeredBy: user.uid,
          createdAt: serverTimestamp(),
        });

        await addDoc(collection(db, 'notifications'), {
          toUserId: postedBy as string,
          message: `${contactName} registered ${teamName} into ${tournament?.name}!`,
          body: `Division: ${teamDivision}`,
          link: `/tournament?id=${id}&postedBy=${postedBy}`,
          createdAt: serverTimestamp(),
          read: false,
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

        await addDoc(collection(db, 'notifications'), {
          toUserId: user.uid,
          message: `You're registered for ${tournament?.name}!`,
          body: `${teamName} is confirmed in the ${teamDivision} division.`,
          link: `/tournament?id=${id}&postedBy=${postedBy}`,
          createdAt: serverTimestamp(),
          read: false,
        });

        setShowTeamModal(false);
        setTeamName(''); setContactName(''); setContactInfo(''); setTeamDivision('');

        const depositMsg = tournament?.depositAmount && tournament?.depositDue
          ? `Deposit of ${tournament.depositAmount} due by ${tournament.depositDue}.`
          : tournament?.depositAmount ? `Deposit of ${tournament.depositAmount} required.` : '';

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
              read: false,
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
  const usesDivisionSpots = hasDivisionSpots(tournament);

  // "Full" means: no divisions and spots <= 0, OR every division is at 0
  const isFull = usesDivisionSpots
    ? tournament.divisions.every((d: string) => getDivisionSpotsLeft(d) === 0)
    : spotsLeft <= 0;

  const sportColor = tournament.sport === 'Basketball' ? '#008080'
    : tournament.sport === 'Volleyball' ? '#7A1E1E'
    : tournament.sport === 'Softball' ? '#B8860B'
    : '#008080';

  const organizerInitials = tournament.organizerName
    ? tournament.organizerName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';

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
            <TouchableOpacity style={[styles.tab, activeTab === 'waitlist' && { backgroundColor: sportColor }]} onPress={() => setActiveTab('waitlist')}>
              <Text style={[styles.tabText, activeTab === 'waitlist' && styles.tabTextActive]}>Waitlist {waitlistEntries.length > 0 ? `(${waitlistEntries.length})` : ''}</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 'teams' && isOwner ? (
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
            <Text style={styles.teamsCount}>{teams.length} {teams.length === 1 ? 'team' : 'teams'} registered</Text>
            {teams.length === 0 ? (
              <View style={styles.emptyTeams}><SadFace /><Text style={styles.emptyTeamsText}>No teams registered yet.</Text></View>
            ) : (
              teams.map((t: any) => (
                <View key={t.id} style={styles.teamCard}>
                  <View style={styles.teamCardTop}>
                    <Text style={[styles.teamName, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>{t.teamName}</Text>
                    <View style={styles.teamCardBadges}>
                      {t.fromWaitlist && (
                        <View style={styles.waitlistAutoTag}>
                          <Text style={styles.waitlistAutoTagText}>Auto-added</Text>
                        </View>
                      )}
                      {t.division ? (
                        <View style={[styles.teamDivisionBadge, { backgroundColor: `${sportColor}20`, borderColor: sportColor }]}>
                          <Text style={[styles.teamDivisionText, { color: sportColor }]}>{t.division}</Text>
                        </View>
                      ) : null}
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

        ) : activeTab === 'waitlist' && isOwner ? (
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
            <Text style={styles.teamsCount}>{waitlistEntries.length} {waitlistEntries.length === 1 ? 'person' : 'people'} waiting</Text>
            {waitlistEntries.length === 0 ? (
              <View style={styles.emptyTeams}><SadFace /><Text style={styles.emptyTeamsText}>No one on the waitlist.</Text></View>
            ) : (
              waitlistEntries.map((w: any, index: number) => {
                const joinedDate = w.createdAt?.toDate?.()?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) || '';
                return (
                  <View key={w.id} style={styles.waitlistCard}>
                    <View style={[styles.waitlistPosition, { backgroundColor: `${sportColor}15`, borderColor: `${sportColor}40` }]}>
                      <Text style={[styles.waitlistPositionText, { color: sportColor }, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>#{index + 1}</Text>
                    </View>
                    <View style={styles.waitlistInfo}>
                      <Text style={[styles.waitlistName, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>{w.username || 'Unknown'}</Text>
                      {w.division ? (
                        <View style={[styles.teamDivisionBadge, { backgroundColor: `${sportColor}20`, borderColor: sportColor, alignSelf: 'flex-start', marginTop: 4, marginBottom: 2 }]}>
                          <Text style={[styles.teamDivisionText, { color: sportColor }]}>{w.division}</Text>
                        </View>
                      ) : null}
                      {w.phone ? (
                        <TouchableOpacity onPress={() => Linking.openURL(`tel:${w.phone.replace(/\D/g, '')}`)}>
                          <Text style={[styles.waitlistPhone, { color: sportColor }]}>📱 {w.phone}</Text>
                        </TouchableOpacity>
                      ) : null}
                      {joinedDate ? <Text style={styles.waitlistDate}>Joined {joinedDate}</Text> : null}
                    </View>
                  </View>
                );
              })
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

              <View style={styles.row}><Text style={styles.rowIcon}>📅</Text><Text style={styles.rowLabel}>Date</Text></View>
              <Text style={styles.rowValue}>{tournament.date}</Text>

              <View style={[styles.row, { marginTop: 16 }]}><Text style={styles.rowIcon}>📍</Text><Text style={styles.rowLabel}>Location</Text></View>
              {tournament.address ? <Text style={styles.rowValue}>{tournament.address}</Text> : null}
              <Text style={styles.rowValue}>{tournament.city}, {tournament.state} {tournament.zip}</Text>
              <TouchableOpacity style={styles.copyBtn} onPress={handleCopyAddress}>
                <Text style={styles.copyBtnText}>{copied ? '✓ Copied!' : 'Copy Address'}</Text>
              </TouchableOpacity>

              {tournament.divisions?.length > 0 && (
                <>
                  <View style={[styles.row, { marginTop: 16 }]}><Text style={styles.rowIcon}>🏅</Text><Text style={styles.rowLabel}>Divisions</Text></View>
                  {tournament.divisions.map((d: string) => {
                    const fee = getDivisionFee(d);
                    const divSpots = getDivisionSpotsLeft(d);
                    return (
                      <Text key={d} style={styles.rowValue}>
                        {d}{fee ? `  —  ${fee}` : ''}{divSpots !== null ? `  •  ${divSpots === 0 ? 'Full' : `${divSpots} spot${divSpots === 1 ? '' : 's'} left`}` : ''}
                      </Text>
                    );
                  })}
                </>
              )}

              {tournament.spectatorFee ? (
                <>
                  <View style={[styles.row, { marginTop: 16 }]}><Text style={styles.rowIcon}>🎟️</Text><Text style={styles.rowLabel}>Spectator Fee</Text></View>
                  <Text style={styles.rowValue}>{tournament.spectatorFee} at the door</Text>
                </>
              ) : null}

              {tournament.rosterSize ? (
                <>
                  <View style={[styles.row, { marginTop: 16 }]}><Text style={styles.rowIcon}>👥</Text><Text style={styles.rowLabel}>Roster Size</Text></View>
                  <Text style={styles.rowValue}>{tournament.rosterSize} players</Text>
                </>
              ) : null}

              {tournament.prizes ? (
                <>
                  <View style={[styles.row, { marginTop: 16 }]}><Text style={styles.rowIcon}>🏆</Text><Text style={styles.rowLabel}>Prizes</Text></View>
                  {tournament.prizes.split(/\n| · /).map((line: string, i: number) => line.trim() ? (
                    <Text key={i} style={styles.rowValue}>{line.trim()}</Text>
                  ) : null)}
                </>
              ) : null}

              {tournament.depositAmount ? (
                <>
                  <View style={[styles.row, { marginTop: 16 }]}><Text style={styles.rowIcon}>💳</Text><Text style={styles.rowLabel}>Deposit</Text></View>
                  <Text style={styles.rowValue}>{tournament.depositAmount}{tournament.depositDue ? ` due by ${tournament.depositDue}` : ''}</Text>
                </>
              ) : null}

              {(tournament.contactName || tournament.contactPhone || tournament.contactEmail) ? (
                <>
                  <View style={[styles.row, { marginTop: 16 }]}><Text style={styles.rowIcon}>📞</Text><Text style={styles.rowLabel}>Contact</Text></View>
                  {tournament.contactName ? <Text style={styles.rowValue}>{tournament.contactName}</Text> : null}
                  {tournament.contactPhone ? (
                    <TouchableOpacity onPress={() => Linking.openURL(`tel:${tournament.contactPhone.replace(/\D/g, '')}`)} style={styles.contactLine}>
                      <Text style={styles.contactLineIcon}>📱</Text>
                      <Text style={[styles.rowValue, styles.tappableLink]}>{tournament.contactPhone}</Text>
                    </TouchableOpacity>
                  ) : null}
                  {tournament.contactEmail ? (
                    <TouchableOpacity onPress={() => Linking.openURL(`mailto:${tournament.contactEmail}`)} style={styles.contactLine}>
                      <Text style={styles.contactLineIcon}>✉️</Text>
                      <Text style={[styles.rowValue, styles.tappableLink]}>{tournament.contactEmail}</Text>
                    </TouchableOpacity>
                  ) : null}
                </>
              ) : null}

              {!usesDivisionSpots && (
                <Text style={[styles.spotsText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>
                  {isFull ? 'Tournament Full' : `${spotsLeft} spots left`}
                </Text>
              )}

              {onWaitlist && !isOwner && (
                <View style={styles.waitlistBanner}>
                  <Text style={styles.waitlistBannerText}>
                    📋 You're on the waitlist{myWaitlistDivision ? ` for ${myWaitlistDivision}` : ''} — you'll be automatically added if a spot opens.
                  </Text>
                </View>
              )}
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
                ) : onWaitlist ? (
                  // Already on a waitlist — show leave option, but still allow registering
                  // in case a different division has room
                  <>
                    <TouchableOpacity
                      style={styles.leaveWaitlistBtn}
                      onPress={() => setShowLeaveWaitlistModal(true)}
                    >
                      <Text style={styles.leaveWaitlistText}>✓ On Waitlist{myWaitlistDivision ? ` (${myWaitlistDivision})` : ''}  ·  Leave</Text>
                    </TouchableOpacity>
                    {!isFull && !isCanceled && (
                      <TouchableOpacity
                        style={[styles.joinBtn, { backgroundColor: sportColor }]}
                        onPress={() => setShowTeamModal(true)}
                      >
                        <Text style={styles.joinText}>Register Team</Text>
                      </TouchableOpacity>
                    )}
                  </>
                ) : isFull && !isCanceled ? (
                  <TouchableOpacity
                    style={[styles.joinBtn, { backgroundColor: sportColor }]}
                    onPress={() => setShowWaitlistModal(true)}
                  >
                    <Text style={styles.joinText}>Join Waitlist</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.joinBtn, isCanceled && styles.joinedBtn]}
                    onPress={() => { if (!isCanceled) setShowTeamModal(true); }}
                    disabled={isCanceled}
                  >
                    <Text style={styles.joinText}>{isCanceled ? 'Canceled' : 'Register Team'}</Text>
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
                  {registrationDivisions.map((d: string) => {
                    const divSpots = getDivisionSpotsLeft(d);
                    const divFull = divSpots === 0;
                    return (
                      <TouchableOpacity key={d} style={styles.modalDropdownItem} onPress={() => { setTeamDivision(d); setShowDivisionPicker(false); }}>
                        <View style={styles.divisionPickerRow}>
                          <Text style={[styles.modalDropdownItemText, teamDivision === d && styles.modalDropdownItemActive]}>
                            {d}{divFull ? ' (Full)' : ''}
                          </Text>
                          {getDivisionFee(d) ? <Text style={styles.divisionFeeTag}>{getDivisionFee(d)}</Text> : null}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
              {teamDivision && getDivisionFee(teamDivision) ? (
                <View style={styles.selectedDivisionFeeBox}>
                  <Text style={styles.selectedDivisionFeeText}>💵 Entry fee for {teamDivision}: {getDivisionFee(teamDivision)}</Text>
                </View>
              ) : null}
              {teamDivision && getDivisionSpotsLeft(teamDivision) === 0 ? (
                <View style={styles.depositNotice}>
                  <Text style={styles.depositNoticeText}>⚠️ {teamDivision} is currently full. You'll be notified if you try to register, and can join the waitlist instead.</Text>
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

      {/* Leave Waitlist Confirm Modal */}
      <Modal visible={showLeaveWaitlistModal} animationType="fade" transparent>
        <View style={styles.successOverlay}>
          <View style={styles.deleteBox}>
            <Text style={[styles.deleteModalTitle, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>LEAVE WAITLIST?</Text>
            <Text style={styles.deleteModalMsg}>You'll lose your spot in line for {tournament.name}{myWaitlistDivision ? ` (${myWaitlistDivision})` : ''}. If a spot opens, someone else will be added first.</Text>
            <View style={styles.deleteModalBtns}>
              <TouchableOpacity style={styles.deleteModalCancelBtn} onPress={() => setShowLeaveWaitlistModal(false)}>
                <Text style={[styles.deleteModalCancelText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>KEEP SPOT</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteModalConfirmBtn} onPress={doLeaveWaitlist} disabled={leaveWaitlistLoading}>
                <Text style={[styles.deleteModalConfirmText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>{leaveWaitlistLoading ? 'LEAVING...' : 'LEAVE'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Waitlist Join Modal */}
      <Modal visible={showWaitlistModal} animationType="fade" transparent>
        <View style={styles.successOverlay}>
          <View style={styles.successBox}>
            {onWaitlist ? (
              <>
                <Text style={{ fontSize: 40, marginBottom: 8 }}>⏳</Text>
                <Text style={[styles.successTitle, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>ON THE WAITLIST</Text>
                <Text style={styles.successMsg}>You'll be automatically added to {tournament.name}{myWaitlistDivision ? ` (${myWaitlistDivision})` : ''} if a spot opens.</Text>
                <TouchableOpacity style={[styles.successBtn, { backgroundColor: sportColor }]} onPress={() => setShowWaitlistModal(false)}>
                  <Text style={[styles.successBtnText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>GOT IT</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={{ fontSize: 40, marginBottom: 8 }}>📋</Text>
                <Text style={[styles.successTitle, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>JOIN WAITLIST</Text>
                <Text style={styles.successMsg}>You'll be automatically added if a spot opens. Add your phone so the organizer can reach you.</Text>

                {usesDivisionSpots && (
                  <View style={{ width: '100%', marginBottom: 12 }}>
                    <TouchableOpacity style={styles.modalDropdown} onPress={() => setShowWaitlistDivisionPicker(!showWaitlistDivisionPicker)}>
                      <Text style={waitlistDivision ? styles.modalDropdownSelected : styles.modalDropdownPlaceholder}>{waitlistDivision || 'Select division...'}</Text>
                      <Text style={styles.dropdownArrow}>{showWaitlistDivisionPicker ? '▲' : '▼'}</Text>
                    </TouchableOpacity>
                    {showWaitlistDivisionPicker && (
                      <View style={styles.modalDropdownList}>
                        {registrationDivisions.map((d: string) => (
                          <TouchableOpacity key={d} style={styles.modalDropdownItem} onPress={() => { setWaitlistDivision(d); setShowWaitlistDivisionPicker(false); }}>
                            <Text style={[styles.modalDropdownItemText, waitlistDivision === d && styles.modalDropdownItemActive]}>{d}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                )}

                <TextInput
                  style={styles.waitlistPhoneInput}
                  placeholder="Phone number (optional)"
                  placeholderTextColor="#a0b8b8"
                  value={waitlistPhone}
                  onChangeText={v => setWaitlistPhone(formatPhone(v))}
                  keyboardType="phone-pad"
                  maxLength={12}
                />
                <View style={styles.waitlistModalBtns}>
                  <TouchableOpacity style={styles.waitlistModalCancelBtn} onPress={() => setShowWaitlistModal(false)}>
                    <Text style={styles.waitlistModalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.waitlistModalConfirmBtn, { backgroundColor: sportColor }]} onPress={handleJoinWaitlist}>
                    <Text style={[styles.successBtnText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>JOIN</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
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
            <View style={styles.paymentPromptBox}>
              <Text style={styles.paymentPromptTitle}>💳 Payment Details</Text>
              <Text style={styles.paymentPromptText}>Contact the organizer for payment instructions and accepted methods.</Text>
              {successData?.contactInfo ? <Text style={styles.paymentContactInfo}>{successData.contactInfo}</Text> : null}
            </View>
            <TouchableOpacity style={[styles.successBtn, { backgroundColor: sportColor }]} onPress={() => setShowSuccessModal(false)}>
              <Text style={[styles.successBtnText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>GOT IT</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <InfoModal
        visible={infoModal.visible}
        title={infoModal.title}
        message={infoModal.message}
        onClose={() => setInfoModal({ visible: false, title: '', message: '' })}
      />

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
  tabText: { fontSize: 13, fontWeight: '600', color: '#5a7a7a' },
  tabTextActive: { color: '#fff' },
  teamsCount: { fontSize: 11, color: '#999', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, paddingLeft: 4 },
  emptyTeams: { alignItems: 'center', marginTop: 60, gap: 10 },
  emptyTeamsText: { fontSize: 16, color: '#a0b8b8' },
  teamCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#f0f0f0', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  teamCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  teamName: { fontSize: 17, fontWeight: '900', color: '#111', flex: 1 },
  teamCardBadges: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  waitlistAutoTag: { backgroundColor: '#e0f5f5', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#a0d8d8' },
  waitlistAutoTagText: { fontSize: 11, color: '#008080', fontWeight: '600' },
  teamDivisionBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1 },
  teamDivisionText: { fontSize: 12, fontWeight: '600' },
  submittedLabel: { fontSize: 10, color: '#aaa', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  contactName: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 4 },
  contactLine: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  contactLineIcon: { fontSize: 12 },
  contactLineText: { fontSize: 12, color: '#777' },
  tappableLink: { color: '#008080', textDecorationLine: 'underline' },
  waitlistCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#f0f0f0', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  waitlistPosition: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  waitlistPositionText: { fontSize: 16, fontWeight: '900' },
  waitlistInfo: { flex: 1 },
  waitlistName: { fontSize: 15, color: '#111', fontWeight: '700', letterSpacing: 0.5 },
  waitlistPhone: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  waitlistDate: { fontSize: 12, color: '#a0b8b8', marginTop: 2 },
  waitlistBanner: { backgroundColor: '#fff8e0', borderRadius: 12, padding: 12, marginTop: 12, borderWidth: 1, borderColor: '#f0d080' },
  waitlistBannerText: { fontSize: 13, color: '#7a5a00', fontWeight: '600', lineHeight: 18 },
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
  leaveWaitlistBtn: { borderRadius: 16, paddingVertical: 16, alignItems: 'center', borderWidth: 1.5, borderColor: '#a0b8b8', backgroundColor: '#f5ede0' },
  leaveWaitlistText: { fontSize: 15, color: '#5a7a7a', fontWeight: '600' },
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
  waitlistPhoneInput: { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: '#003333', borderWidth: 1, borderColor: '#e0d8c8', width: '100%', marginBottom: 16 },
  waitlistModalBtns: { flexDirection: 'row', gap: 10, width: '100%' },
  waitlistModalCancelBtn: { flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: '#e0d8c8' },
  waitlistModalCancelText: { fontSize: 16, color: '#5a7a7a', fontWeight: '600' },
  waitlistModalConfirmBtn: { flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
});