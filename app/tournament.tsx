import { Rajdhani_700Bold, useFonts } from '@expo-google-fonts/rajdhani';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, arrayRemove, arrayUnion, collection, deleteDoc, doc, getDoc, getDocs, increment, onSnapshot, orderBy, query, runTransaction, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { deleteObject, ref } from 'firebase/storage';
import { useEffect, useState } from 'react';
import { Clipboard, Image, Keyboard, KeyboardAvoidingView, Linking, Modal, Platform, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { auth, db, storage } from '../firebaseConfig';

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

type IconProps = { size?: number; color?: string };

function CalendarIcon({ size = 15, color = '#008080' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Rect x="3" y="4" width="18" height="18" rx="2" />
      <Line x1="16" y1="2" x2="16" y2="6" />
      <Line x1="8" y1="2" x2="8" y2="6" />
      <Line x1="3" y1="10" x2="21" y2="10" />
    </Svg>
  );
}

function LocationIcon({ size = 15, color = '#008080' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 1 1 18 0z" />
      <Circle cx="12" cy="10" r="3" />
    </Svg>
  );
}

function PeopleIcon({ size = 15, color = '#008080' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <Circle cx="9" cy="7" r="4" />
      <Path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <Path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </Svg>
  );
}

function TrophyIcon({ size = 15, color = '#008080' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M8 21h8" />
      <Path d="M12 17v4" />
      <Path d="M7 4h10v5a5 5 0 0 1-10 0z" />
      <Path d="M17 5h3a2 2 0 0 1-2 4h-1" />
      <Path d="M7 5H4a2 2 0 0 0 2 4h1" />
    </Svg>
  );
}

function CardIcon({ size = 15, color = '#008080' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Rect x="2" y="5" width="20" height="14" rx="2" />
      <Line x1="2" y1="10" x2="22" y2="10" />
    </Svg>
  );
}

function PhoneCallIcon({ size = 15, color = '#008080' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.91.69 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.33 1.85.56 2.81.69A2 2 0 0 1 22 16.92z" />
    </Svg>
  );
}

function PhoneMobileIcon({ size = 12, color = '#999' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Rect x="5" y="2" width="14" height="20" rx="2" />
      <Line x1="12" y1="18" x2="12" y2="18" />
    </Svg>
  );
}

function MailIcon({ size = 15, color = '#008080' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Rect x="2" y="4" width="20" height="16" rx="2" />
      <Path d="m22 6-10 7L2 6" />
    </Svg>
  );
}

function TicketIcon({ size = 15, color = '#008080' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z" />
      <Line x1="13" y1="5" x2="13" y2="19" strokeDasharray="2 2" />
    </Svg>
  );
}

function WarningIcon({ size = 15, color = '#cc4444' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Path d="m12 2 10 18H2L12 2z" />
      <Line x1="12" y1="9" x2="12" y2="13" />
      <Line x1="12" y1="17" x2="12" y2="17" />
    </Svg>
  );
}

function CheckIcon({ size = 15, color = '#fff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="12" cy="12" r="10" />
      <Path d="m8 12 3 3 5-6" />
    </Svg>
  );
}

function HourglassIcon({ size = 40, color = '#008080' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 2h12" />
      <Path d="M6 22h12" />
      <Path d="M6 2c0 5 4 8 6 10-2 2-6 5-6 10" />
      <Path d="M18 2c0 5-4 8-6 10 2 2 6 5 6 10" />
    </Svg>
  );
}

function ClipboardIcon({ size = 15, color = '#7a5a00' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Rect x="4" y="3" width="16" height="18" rx="2" />
      <Path d="M9 2h6v2H9z" />
      <Line x1="8" y1="9" x2="16" y2="9" />
      <Line x1="8" y1="13" x2="16" y2="13" />
      <Line x1="8" y1="17" x2="12" y2="17" />
    </Svg>
  );
}

function MessageIcon({ size = 18, color = '#fff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </Svg>
  );
}

function TrashIcon({ size = 18, color = '#fff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 6h18" />
      <Path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <Path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <Line x1="10" y1="11" x2="10" y2="17" />
      <Line x1="14" y1="11" x2="14" y2="17" />
    </Svg>
  );
}

function formatPhone(val: string) {
  const digits = val.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

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
  const [myTeamName, setMyTeamName] = useState<string | null>(null);
  const [divisionSpotsLeft, setDivisionSpotsLeft] = useState<Record<string, number>>({});
  const [spotsLeft, setSpotsLeft] = useState(0);
  const [activeTab, setActiveTab] = useState<'details' | 'teams' | 'waitlist' | 'bracket'>('details');
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
  const [showOrganizerReminderModal, setShowOrganizerReminderModal] = useState(false);
  const [showDeleteEventModal, setShowDeleteEventModal] = useState(false);
  const [deleteEventLoading, setDeleteEventLoading] = useState(false);
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
  const [infoModal, setInfoModal] = useState<{ visible: boolean; title: string; message: string }>({
    visible: false, title: '', message: '',
  });

  const user = auth.currentUser;
  const isOwner = user?.uid === (tournament?.postedBy || postedBy);

  const hasDivisionSpots = (data: any) => data?.divisionSpots && Object.keys(data.divisionSpots).length > 0;

  useEffect(() => {
    const loadUsername = async () => {
      if (!user) return;
      const userSnap = await getDoc(doc(db, 'users', user.uid));
      if (userSnap.exists()) setCurrentUsername(userSnap.data().username || user.email || '');
    };
    loadUsername();

    if (!id) return;

    const tournamentRef = doc(db, 'tournaments', id as string);
    const unsubTournament = onSnapshot(tournamentRef, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      setTournament(data);
      if (hasDivisionSpots(data)) {
        setDivisionSpotsLeft(data.divisionSpots);
      } else {
        setSpotsLeft(data.spots);
      }
      setJoined(!!data.joinedUsers?.includes(user?.uid));
     }, () => {});

    const teamsQuery = query(collection(db, 'tournaments', id as string, 'teams'), orderBy('createdAt', 'asc'));
    const unsubTeams = onSnapshot(teamsQuery, (snap) => {
      const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTeams(docs);
      const myTeam = docs.find((t: any) => t.registeredBy === user?.uid);
      setMyTeamName(myTeam ? (myTeam as any).teamName || null : null);
    }, () => {});

    const waitlistQuery = query(collection(db, 'tournaments', id as string, 'waitlist'), orderBy('createdAt', 'asc'));
    const unsubWaitlist = onSnapshot(waitlistQuery, (snap) => {
      const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setWaitlistEntries(docs);
      const myEntry = docs.find((w: any) => w.userId === user?.uid);
      if (myEntry) {
        setOnWaitlist(true);
        setMyWaitlistDivision((myEntry as any).division || null);
      } else {
        setOnWaitlist(false);
        setMyWaitlistDivision(null);
      }
    }, () => {});

    return () => { unsubTournament(); unsubTeams(); unsubWaitlist(); };
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
      setMyTeamName(null);
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
    } catch (e: any) {
      setInfoModal({
        visible: true,
        title: 'SOMETHING WENT WRONG',
        message: "We couldn't finish canceling your registration. Please check your connection and try again. If this keeps happening, contact the organizer directly.",
      });
    }
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

      await addDoc(collection(db, 'notifications'), {
        toUserId: user.uid,
        message: `You're on the waitlist for ${tournament?.name}!`,
        body: `We'll notify you if a spot opens${divisionNote ? ` in ${waitlistDivision}` : ''}.`,
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
    } catch (e: any) {
      setInfoModal({
        visible: true,
        title: 'SOMETHING WENT WRONG',
        message: "We couldn't add you to the waitlist. Please check your connection and try again.",
      });
    }
  };

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
    } catch (e: any) {
      setInfoModal({
        visible: true,
        title: 'SOMETHING WENT WRONG',
        message: "We couldn't remove you from the waitlist. Please check your connection and try again.",
      });
    }
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
    } catch (e: any) { }
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

  const getSpectatorPaymentMethodsText = (): string | null => {
    const methods: string[] = tournament?.spectatorPaymentMethods || [];
    if (methods.length === 0) return null;
    const display = methods.map(m => {
      if (m === 'Other') return tournament?.spectatorPaymentOther?.trim() || null;
      return m;
    }).filter(Boolean) as string[];
    if (display.length === 0) return null;
    return `${display.join(', ')} accepted`;
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
        setMyTeamName(teamName);
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
        setMyTeamName(teamName);
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
    } catch (e: any) {
      setInfoModal({
        visible: true,
        title: 'REGISTRATION FAILED',
        message: "We couldn't complete your registration. Please check your connection and try again. If this keeps happening, contact the organizer to confirm your spot.",
      });
    }
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
              organizerName: tournament.organizerName || tournament.contactName || '',
              organizerPhone: tournament.contactPhone || '',
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

      const waitlistSnap = await getDocs(collection(db, 'tournaments', id as string, 'waitlist'));
      await Promise.all(
        waitlistSnap.docs.map(async (waitlistDoc) => {
          const waitlistData = waitlistDoc.data();
          if (waitlistData.userId) {
            await addDoc(collection(db, 'notifications'), {
              toUserId: waitlistData.userId,
              message: `⚠️ ${tournament.name} has been canceled by the organizer.`,
              link: `/`,
              organizerName: tournament.organizerName || tournament.contactName || '',
              organizerPhone: tournament.contactPhone || '',
              createdAt: serverTimestamp(),
              read: false,
            });
            const userSnap = await getDoc(doc(db, 'users', waitlistData.userId));
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

      await updateDoc(doc(db, 'tournaments', id as string), { status: 'canceled' });
      setShowDeleteModal(false);
      setShowOrganizerReminderModal(true);
    } catch (e: any) {
      setInfoModal({
        visible: true,
        title: 'SOMETHING WENT WRONG',
        message: "We couldn't cancel the tournament. Please check your connection and try again.",
      });
    }
    setDeleteLoading(false);
  };

  const confirmDeleteEvent = async () => {
    setDeleteEventLoading(true);
    try {
      const tournamentId = id as string;

      const teamsSnap = await getDocs(collection(db, 'tournaments', tournamentId, 'teams'));
      await Promise.all(teamsSnap.docs.map((teamDoc) => deleteDoc(teamDoc.ref)));

      const waitlistSnap = await getDocs(collection(db, 'tournaments', tournamentId, 'waitlist'));
      await Promise.all(waitlistSnap.docs.map((entryDoc) => deleteDoc(entryDoc.ref)));

      if (tournament?.imagePath) {
        try {
          await deleteObject(ref(storage, tournament.imagePath));
        } catch (imgErr) {
        }
      }

      await deleteDoc(doc(db, 'tournaments', tournamentId));

      setShowDeleteEventModal(false);
      setDeleteEventLoading(false);
      router.replace('/');
    } catch (e: any) {
      setDeleteEventLoading(false);
      setInfoModal({
        visible: true,
        title: 'SOMETHING WENT WRONG',
        message: "We couldn't delete this event. Please check your connection and try again.",
      });
    }
  };

  const handleShare = async () => {
    if (!tournament) return;
    try {
      await Share.share({
        message: `🏆 ${tournament.name}\n📅 ${tournament.date}\n📍 ${tournament.city}, ${tournament.state}${tournament.contactPhone ? `\n📞 ${tournament.contactPhone}` : ''}\n\nFind this tournament on Zony!`,
      });
    } catch (e: any) {  }
  };

  const handleMessageOrganizer = () => {
    if (!postedBy || !tournament) return;
    router.push({
      pathname: '/start-dm',
      params: {
        recipientId: postedBy as string,
        recipientName: tournament.organizerName || 'Organizer',
        context: `Tournament: ${tournament.name}`,
      },
    });
  };

  if (!tournament) return null;
  const isCanceled = tournament.status === 'canceled';
  const usesDivisionSpots = hasDivisionSpots(tournament);

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
  const spectatorPaymentMethodsText = getSpectatorPaymentMethodsText();
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
            <WarningIcon size={14} color="#fff" />
            <Text style={styles.canceledBannerText}>This tournament has been canceled</Text>
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
    {tournament?.bracketStatus === 'bracket_generated' && (
      <TouchableOpacity
        style={[styles.tab, activeTab === 'bracket' && { backgroundColor: sportColor }]}
        onPress={() => {
          router.push({
            pathname: '/bracket',
            params: {
              tournamentId: id,
              divisionId: tournament?.divisions?.[0] || 'open',
              postedBy: tournament?.postedBy || postedBy,
              divisions: (tournament?.divisions || []).join(','),
              tournamentName: tournament?.name || '',
            },
          });
        }}
      >
        <Text style={[styles.tabText, activeTab === 'bracket' && styles.tabTextActive]}>Bracket</Text>
      </TouchableOpacity>
    )}
  </View>
)}

{/* Non-organizer bracket button — styled, sport color */}
{!isOwner && tournament?.bracketStatus === 'bracket_generated' && (
  <TouchableOpacity
    style={[styles.bracketUserBtn, {
  borderColor: sportColor,
  backgroundColor: tournament.sport === 'Basketball' ? '#e0f5f5'
    : tournament.sport === 'Volleyball' ? '#f5e0e0'
    : '#fdf3d9',
}]}
    onPress={() => {
      router.push({
        pathname: '/bracket',
        params: {
          tournamentId: id,
          divisionId: tournament?.divisions?.[0] || 'open',
          postedBy: tournament?.postedBy || postedBy,
          divisions: (tournament?.divisions || []).join(','),
          tournamentName: tournament?.name || '',
        },
      });
    }}
  >
<Text style={[styles.bracketUserBtnText, { color: sportColor }, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>BRACKET</Text>
  </TouchableOpacity>
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
                      <PhoneMobileIcon size={12} color="#999" />
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
                        <TouchableOpacity onPress={() => Linking.openURL(`tel:${w.phone.replace(/\D/g, '')}`)} style={styles.contactLineNoIndent}>
                          <PhoneMobileIcon size={12} color={sportColor} />
                          <Text style={[styles.waitlistPhone, { color: sportColor }]}>{w.phone}</Text>
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

              {(joined || myTeamName) && !isOwner && (
                <View style={[styles.registeredBanner, { backgroundColor: sportColor }]}>
                  <CheckIcon size={18} color="#fff" />
                  <Text style={[styles.registeredBannerText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]} numberOfLines={2}>
                    {myTeamName ? `${myTeamName} is Registered` : 'You\'re Registered'}
                  </Text>
                </View>
              )}

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
                  <View style={{ flex: 1 }}>
                    <Text style={styles.organizerLabel}>Posted by</Text>
                    <Text style={[styles.organizerName, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>{tournament.organizerName}</Text>
                  </View>
                  {!isOwner && (
                    <TouchableOpacity style={[styles.messageOrganizerBtn, { backgroundColor: sportColor }]} onPress={handleMessageOrganizer}>
                      <MessageIcon size={14} color="#fff" />
                      <Text style={styles.messageOrganizerBtnText}>Message</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : null}

              <View style={styles.divider} />

              <View style={styles.row}><CalendarIcon color={sportColor} /><Text style={styles.rowLabel}>Date</Text></View>
              <Text style={styles.rowValue}>{tournament.date}</Text>

              <View style={[styles.row, { marginTop: 16 }]}><LocationIcon color={sportColor} /><Text style={styles.rowLabel}>Location</Text></View>
              {tournament.address ? <Text style={styles.rowValue}>{tournament.address}</Text> : null}
              <Text style={styles.rowValue}>{tournament.city}, {tournament.state} {tournament.zip}</Text>
              <TouchableOpacity style={styles.copyBtn} onPress={handleCopyAddress}>
                <Text style={styles.copyBtnText}>{copied ? '✓ Copied!' : 'Copy Address'}</Text>
              </TouchableOpacity>

              {tournament.divisions?.length > 0 && (
                <>
                  <View style={[styles.row, { marginTop: 16 }]}><TrophyIcon color={sportColor} /><Text style={styles.rowLabel}>Divisions</Text></View>
                  {tournament.divisions.map((d: string) => {
                    const fee = getDivisionFee(d);
                    const divSpots = getDivisionSpotsLeft(d);
                    return (
                      <View key={d} style={styles.divisionRow}>
                        <Text style={styles.divisionRowLabel}>{d}{fee ? `  —  ${fee}` : ''}</Text>
                        {divSpots !== null ? (
                          <Text style={[styles.divisionRowSpots, { color: divSpots === 0 ? '#cc4444' : sportColor }]}>
                            {divSpots === 0 ? 'Full' : `${divSpots} spot${divSpots === 1 ? '' : 's'} left`}
                          </Text>
                        ) : null}
                      </View>
                    );
                  })}
                </>
              )}

              {tournament.spectatorFee ? (
                <>
                  <View style={[styles.row, { marginTop: 16 }]}><TicketIcon color={sportColor} /><Text style={styles.rowLabel}>Spectator Fee</Text></View>
                  <Text style={styles.rowValue}>
                    {tournament.spectatorFee === 'Free'
                      ? 'Open to Public — Free'
                      : `${tournament.spectatorFee} at the door${spectatorPaymentMethodsText ? `  ·  ${spectatorPaymentMethodsText}` : ''}`}
                  </Text>
                </>
              ) : null}

              {tournament.rosterSize ? (
                <>
                  <View style={[styles.row, { marginTop: 16 }]}><PeopleIcon color={sportColor} /><Text style={styles.rowLabel}>Roster Size</Text></View>
                  <Text style={styles.rowValue}>{tournament.rosterSize} players</Text>
                </>
              ) : null}

              {tournament.prizes ? (
                <>
                  <View style={[styles.row, { marginTop: 16 }]}><TrophyIcon color={sportColor} /><Text style={styles.rowLabel}>Prizes</Text></View>
                  {tournament.prizes.split(/\n| · /).map((line: string, i: number) => line.trim() ? (
                    <Text key={i} style={styles.rowValue}>{line.trim()}</Text>
                  ) : null)}
                </>
              ) : null}

              {tournament.depositAmount ? (
                <>
                  <View style={[styles.row, { marginTop: 16 }]}><CardIcon color={sportColor} /><Text style={styles.rowLabel}>Deposit</Text></View>
                  <Text style={styles.rowValue}>{tournament.depositAmount}{tournament.depositDue ? ` due by ${tournament.depositDue}` : ''}</Text>
                </>
              ) : null}

              {(tournament.contactName || tournament.contactPhone || tournament.contactEmail) ? (
                <>
                  <View style={[styles.row, { marginTop: 16 }]}><PhoneCallIcon color={sportColor} /><Text style={styles.rowLabel}>Contact</Text></View>
                  {tournament.contactName ? <Text style={styles.rowValue}>{tournament.contactName}</Text> : null}
                  {tournament.contactPhone ? (
                    <TouchableOpacity onPress={() => Linking.openURL(`tel:${tournament.contactPhone.replace(/\D/g, '')}`)} style={styles.contactLine}>
                      <PhoneMobileIcon size={12} color={sportColor} />
                      <Text style={[styles.tappableLink, { paddingLeft: 0, color: sportColor }]}>{tournament.contactPhone}</Text>
                    </TouchableOpacity>
                  ) : null}
                  {tournament.contactEmail ? (
                    <TouchableOpacity onPress={() => Linking.openURL(`mailto:${tournament.contactEmail}`)} style={styles.contactLine}>
                      <MailIcon size={12} color={sportColor} />
                      <Text style={[styles.tappableLink, { paddingLeft: 0, color: sportColor }]}>{tournament.contactEmail}</Text>
                    </TouchableOpacity>
                  ) : null}
                </>
              ) : null}

              {!usesDivisionSpots && (
                <Text style={[styles.spotsText, { color: sportColor }, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>
                  {isFull ? 'Tournament Full' : `${spotsLeft} spots left`}
                </Text>
              )}

              <View style={styles.disclaimerBox}>
                <Text style={styles.disclaimerText}>
                  Committee is not responsible for any injuries, accidents, lost or stolen items, or damages incurred during the tournament. Participation is at your own risk.
                </Text>
              </View>

              {onWaitlist && !isOwner && (
                <View style={styles.waitlistBanner}>
                  <ClipboardIcon size={16} color="#7a5a00" />
                  <Text style={styles.waitlistBannerText}>
                    You're on the waitlist{myWaitlistDivision ? ` for ${myWaitlistDivision}` : ''} — you'll be automatically added if a spot opens.
                  </Text>
                </View>
              )}
            </View>

            {isOwner ? (
              <View style={styles.ownerActions}>
                <TouchableOpacity style={styles.editBtn} onPress={() => router.push({ pathname: '/edit-tournament', params: { id } })}>
                  <Text style={[styles.editBtnText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>Edit Tournament</Text>
                </TouchableOpacity>

                {/* Generate Bracket — shown when bracket hasn't been generated yet */}
                {!isCanceled && tournament?.bracketSettings && !tournament?.bracketStatus?.includes('bracket_generated') && (
                  <TouchableOpacity
                    style={styles.generateBracketBtn}
                    onPress={() => {
                      const firstDivision = tournament?.divisions?.[0] || 'open';
                      router.push({
                        pathname: '/bracket-generate',
                        params: { tournamentId: id, divisionId: firstDivision },
                      });
                    }}
                  >
                    <Text style={[styles.generateBracketBtnText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>
                      Generate Bracket
                    </Text>
                  </TouchableOpacity>
                )}

                {isCanceled ? (
                  <TouchableOpacity style={styles.deleteEventBtn} onPress={() => setShowDeleteEventModal(true)}>
                    <TrashIcon size={18} color="#fff" />
                    <Text style={[styles.deleteBtnText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>Delete Event</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => setShowDeleteModal(true)}>
                    <Text style={[styles.deleteBtnText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>Cancel Tournament</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={styles.registrationActions}>
                {joined || myTeamName ? (
                  <>
                    <TouchableOpacity style={[styles.joinBtn, { backgroundColor: sportColor }]} onPress={openEditRegistration}>
                      <Text style={styles.joinText}>Edit Registration</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.cancelRegBtn} onPress={handleCancelRegistration}>
                      <Text style={styles.cancelRegText}>Cancel Registration</Text>
                    </TouchableOpacity>
                  </>
                ) : onWaitlist ? (
                  <>
                    <TouchableOpacity style={styles.leaveWaitlistBtn} onPress={() => setShowLeaveWaitlistModal(true)}>
                      <Text style={styles.leaveWaitlistText}>✓ On Waitlist{myWaitlistDivision ? ` (${myWaitlistDivision})` : ''}  ·  Leave</Text>
                    </TouchableOpacity>
                    {!isFull && !isCanceled && (
                      <TouchableOpacity style={[styles.joinBtn, { backgroundColor: sportColor }]} onPress={() => setShowTeamModal(true)}>
                        <Text style={styles.joinText}>Register Team</Text>
                      </TouchableOpacity>
                    )}
                  </>
                ) : isFull && !isCanceled ? (
                  <TouchableOpacity style={[styles.joinBtn, { backgroundColor: sportColor }]} onPress={() => setShowWaitlistModal(true)}>
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
              <TextInput style={styles.modalInput} placeholder="e.g. All Stars" placeholderTextColor="#a0b8b8" value={teamName} onChangeText={setTeamName} />
              <Text style={styles.modalLabel}>Your Name</Text>
              <TextInput style={styles.modalInput} placeholder="e.g. Nel Zony" placeholderTextColor="#a0b8b8" value={contactName} onChangeText={setContactName} />
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
                  <CardIcon size={14} color="#003333" />
                  <Text style={styles.selectedDivisionFeeText}>Entry fee for {teamDivision}: {getDivisionFee(teamDivision)}</Text>
                </View>
              ) : null}
              {teamDivision && getDivisionSpotsLeft(teamDivision) === 0 ? (
                <View style={styles.depositNotice}>
                  <WarningIcon size={14} color="#7a5a00" />
                  <Text style={styles.depositNoticeText}>{teamDivision} is currently full. You'll be notified if you try to register, and can join the waitlist instead.</Text>
                </View>
              ) : null}
              {tournament.depositAmount && !isEditingRegistration ? (
                <View style={styles.depositNotice}>
                  <CardIcon size={14} color="#7a5a00" />
                  <Text style={styles.depositNoticeText}>Non-refundable deposit of {tournament.depositAmount}{tournament.depositDue ? ` due by ${tournament.depositDue}` : ' required'}.</Text>
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
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.successOverlay}>
          <View style={styles.successBox}>
            {onWaitlist ? (
              <>
                <HourglassIcon size={40} color="#008080" />
                <Text style={[styles.successTitle, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>ON THE WAITLIST</Text>
                <Text style={styles.successMsg}>You'll be automatically added to {tournament.name}{myWaitlistDivision ? ` (${myWaitlistDivision})` : ''} if a spot opens.</Text>
                <TouchableOpacity style={[styles.successBtn, { backgroundColor: sportColor }]} onPress={() => setShowWaitlistModal(false)}>
                  <Text style={[styles.successBtnText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>GOT IT</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <ClipboardIcon size={40} color="#008080" />
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
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* Cancel Tournament Modal */}
      <Modal visible={showDeleteModal} animationType="fade" transparent>
        <View style={styles.successOverlay}>
          <View style={styles.deleteBox}>
            <Text style={[styles.deleteModalTitle, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>CANCEL TOURNAMENT</Text>
            <Text style={styles.deleteModalMsg}>
              This will notify all registered teams that{' '}
              <Text style={{ fontWeight: '700', color: '#003333' }}>{tournament.name}</Text> has been canceled.{'\n\n'}You'll still be able to view your registered teams and their contact info under the Teams tab so you can follow up about refunds or rescheduling.{'\n\n'}If you're rescheduling rather than canceling, use Edit Tournament instead to update the date.
            </Text>
            <View style={styles.deleteModalBtns}>
              <TouchableOpacity style={styles.deleteModalCancelBtn} onPress={() => setShowDeleteModal(false)}>
                <Text style={[styles.deleteModalCancelText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>KEEP IT</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteModalConfirmBtn} onPress={confirmDelete} disabled={deleteLoading}>
                <Text style={[styles.deleteModalConfirmText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>{deleteLoading ? 'CANCELING...' : 'CANCEL'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Event Confirm Modal */}
      <Modal visible={showDeleteEventModal} animationType="fade" transparent>
        <View style={styles.successOverlay}>
          <View style={styles.deleteBox}>
            <WarningIcon size={32} color="#cc4444" />
            <Text style={[styles.deleteModalTitle, { color: '#cc4444', marginTop: 12 }, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>DELETE EVENT?</Text>
            <Text style={styles.deleteModalMsg}>
              This will permanently delete <Text style={{ fontWeight: '700', color: '#003333' }}>{tournament.name}</Text> and cannot be undone.{'\n\n'}All registered team data and event details will be removed. Be sure to save any team contact information you need before continuing.
            </Text>
            <View style={styles.deleteModalBtns}>
              <TouchableOpacity style={styles.deleteModalCancelBtn} onPress={() => setShowDeleteEventModal(false)}>
                <Text style={[styles.deleteModalCancelText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>KEEP IT</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.deleteModalConfirmBtn, { backgroundColor: '#cc4444' }]} onPress={confirmDeleteEvent} disabled={deleteEventLoading}>
                <Text style={[styles.deleteModalConfirmText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>{deleteEventLoading ? 'DELETING...' : 'DELETE'}</Text>
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
                <CardIcon size={14} color="#7a5a00" />
                <Text style={styles.successDepositText}>{successData.depositMsg}</Text>
              </View>
            ) : null}
            <View style={styles.paymentPromptBox}>
              <View style={styles.paymentPromptTitleRow}>
                <CardIcon size={14} color="#003333" />
                <Text style={styles.paymentPromptTitle}>Payment Details</Text>
              </View>
              <Text style={styles.paymentPromptText}>Contact the organizer for payment instructions and accepted methods.</Text>
              {successData?.contactInfo ? <Text style={styles.paymentContactInfo}>{successData.contactInfo}</Text> : null}
            </View>
            <TouchableOpacity style={[styles.successBtn, { backgroundColor: sportColor }]} onPress={() => setShowSuccessModal(false)}>
              <Text style={[styles.successBtnText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>GOT IT</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Organizer Reminder Modal */}
      <Modal visible={showOrganizerReminderModal} animationType="fade" transparent>
        <View style={styles.successOverlay}>
          <View style={styles.deleteBox}>
            <Text style={[styles.deleteModalTitle, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>TOURNAMENT CANCELED</Text>
            <Text style={styles.deleteModalMsg}>
              Your registered teams have been notified. Please reach out to them directly to let them know about next steps — refunds, rescheduling, or alternative events.{'\n\n'}You can find their contact info under the Teams tab, or message them through the Messages tab.
            </Text>
            <TouchableOpacity
              style={{ backgroundColor: '#008080', borderRadius: 14, paddingVertical: 14, alignItems: 'center', width: '100%' }}
              onPress={() => {
                setShowOrganizerReminderModal(false);
                setActiveTab('teams');
              }}
            >
              <Text style={[styles.deleteModalConfirmText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>GOT IT</Text>
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
  canceledBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#cc4444', marginHorizontal: 20, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16, marginBottom: 12, justifyContent: 'center' },
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
  contactLine: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2, paddingLeft: 24 },
  contactLineNoIndent: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  contactLineText: { fontSize: 12, color: '#777' },
  tappableLink: { fontSize: 14, color: '#008080', textDecorationLine: 'underline' },
  waitlistCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#f0f0f0', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  waitlistPosition: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  waitlistPositionText: { fontSize: 16, fontWeight: '900' },
  waitlistInfo: { flex: 1 },
  waitlistName: { fontSize: 15, color: '#111', fontWeight: '700', letterSpacing: 0.5 },
  waitlistPhone: { fontSize: 12, fontWeight: '600' },
  waitlistDate: { fontSize: 12, color: '#a0b8b8', marginTop: 2 },
  waitlistBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#fff8e0', borderRadius: 12, padding: 12, marginTop: 12, borderWidth: 1, borderColor: '#f0d080' },
  waitlistBannerText: { flex: 1, fontSize: 13, color: '#7a5a00', fontWeight: '600', lineHeight: 18 },
  card: { backgroundColor: '#fff', borderRadius: 24, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  sportBadgeRow: { marginBottom: 12 },
  sportBadge: { alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  sportBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  registeredBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16, marginBottom: 14 },
  registeredBannerText: { flex: 1, color: '#fff', fontSize: 16, letterSpacing: 0.5 },
  tournamentName: { fontSize: 26, fontWeight: '900', color: '#111', marginBottom: 12, lineHeight: 30 },
  organizerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14, backgroundColor: '#f5ede0', borderRadius: 12, padding: 10 },
  organizerPhoto: { width: 40, height: 40, borderRadius: 20 },
  organizerAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  organizerInitials: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  organizerLabel: { fontSize: 11, color: '#a0b8b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  organizerName: { fontSize: 15, color: '#003333', letterSpacing: 0.5 },
  messageOrganizerBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8 },
  messageOrganizerBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#f0f0f0', marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  rowLabel: { fontSize: 13, fontWeight: '700', color: '#333' },
  rowValue: { fontSize: 14, color: '#555', paddingLeft: 24, marginBottom: 2 },
  divisionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingLeft: 24, paddingRight: 4, paddingVertical: 4 },
  divisionRowLabel: { fontSize: 14, color: '#555', flex: 1, marginRight: 8 },
  divisionRowSpots: { fontSize: 14, fontWeight: '900' },
  copyBtn: { marginLeft: 24, marginTop: 8, backgroundColor: '#f5ede0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start' },
  copyBtnText: { fontSize: 12, color: '#008080', fontWeight: '600' },
  spotsText: { fontSize: 18, fontWeight: '900', marginTop: 16 },
  ownerActions: { gap: 10, marginBottom: 20 },
  editBtn: { backgroundColor: '#008080', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  editBtnText: { color: '#fff', fontSize: 18, letterSpacing: 1 },
  generateBracketBtn: { backgroundColor: '#B8860B', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  generateBracketBtnText: { color: '#fff', fontSize: 18, letterSpacing: 1 },
  deleteBtn: { backgroundColor: '#1a1a2e', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  deleteBtnText: { color: '#fff', fontSize: 18, letterSpacing: 1 },
  deleteEventBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: '#cc4444', borderRadius: 12, paddingVertical: 16 },
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

selectedDivisionFeeBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#e0f5f5', borderRadius: 10, padding: 10, marginTop: 6, marginBottom: 4 },

selectedDivisionFeeText: { flex: 1, fontSize: 13, color: '#003333', fontWeight: '600' },

depositNotice: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#fff8e0', borderRadius: 10, padding: 12, marginTop: 12, borderWidth: 1, borderColor: '#f0d080' },

depositNoticeText: { flex: 1, fontSize: 13, color: '#7a5a00', fontWeight: '600' },

modalBtns: { flexDirection: 'row', gap: 10, marginTop: 20, marginBottom: 10 },

modalCancelBtn: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: '#c0d8d8' },

modalCancelText: { fontSize: 16, color: '#5a7a7a', fontWeight: '600' },

modalSubmitBtn: { flex: 1, backgroundColor: '#008080', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },

modalSubmitText: { color: '#fff', fontSize: 16, letterSpacing: 1 },

successOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },

successBox: { backgroundColor: '#f5ede0', borderRadius: 24, padding: 28, alignItems: 'center', width: '100%', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 16, elevation: 8 },

successTitle: { fontSize: 28, color: '#003333', letterSpacing: 2, marginTop: 12, marginBottom: 8, textAlign: 'center' },

successMsg: { fontSize: 15, color: '#555', textAlign: 'center', marginBottom: 12, lineHeight: 22 },

successDepositBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff8e0', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#f0d080', width: '100%' },

successDepositText: { flex: 1, fontSize: 13, color: '#7a5a00', fontWeight: '600', textAlign: 'left', lineHeight: 20 },

paymentPromptBox: { backgroundColor: '#e0f5f5', borderRadius: 12, padding: 14, marginBottom: 20, width: '100%', borderWidth: 1, borderColor: '#c0e8e8' },

paymentPromptTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },

paymentPromptTitle: { fontSize: 13, fontWeight: '700', color: '#003333' },

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
disclaimerBox: { marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
disclaimerText: { fontSize: 11, color: '#b0b0b0', fontStyle: 'italic', lineHeight: 16, textAlign: 'center' },
bracketUserBtn: {
  marginHorizontal: 20,
  marginBottom: 12,
  paddingVertical: 13,
  borderRadius: 14,
  borderWidth: 2,
  alignItems: 'center',
},
bracketUserBtnText: {
  fontSize: 16,
  fontWeight: '700',
  letterSpacing: 1.5,
},
});