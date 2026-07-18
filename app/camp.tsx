import { Rajdhani_700Bold, useFonts } from '@expo-google-fonts/rajdhani';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import { deleteObject, ref } from 'firebase/storage';
import { useEffect, useRef, useState } from 'react';
import { Animated, Clipboard, Image, Keyboard, KeyboardAvoidingView, Linking, Modal, Platform, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { auth, db, storage } from '../firebaseConfig';

function FlyerHeroImage({ uri }: { uri: string }) {
  const { width: screenWidth } = useWindowDimensions();
  const imgWidth = screenWidth - 80;
  const [aspectRatio, setAspectRatio] = useState(1);

  useEffect(() => {
    let cancelled = false;
    Image.getSize(uri, (w, h) => { if (!cancelled && w && h) setAspectRatio(w / h); }, () => {});
    return () => { cancelled = true; };
  }, [uri]);

  return <Image source={{ uri }} style={{ width: imgWidth, height: imgWidth / aspectRatio, borderRadius: 16, marginBottom: 14, backgroundColor: '#e0d8c8' }} />;
}

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

function SuccessTent() {
  return (
    <Svg width={56} height={56} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8" r="5" stroke="#3D4A7A" strokeWidth="1.5" />
      <Path d="M4 21c0-5 3.6-9 8-9s8 4 8 9" stroke="#3D4A7A" strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  );
}

type IconProps = { size?: number; color?: string };

function CalendarIcon({ size = 15, color = '#3D4A7A' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Rect x="3" y="4" width="18" height="18" rx="2" />
      <Line x1="16" y1="2" x2="16" y2="6" />
      <Line x1="8" y1="2" x2="8" y2="6" />
      <Line x1="3" y1="10" x2="21" y2="10" />
    </Svg>
  );
}

function LocationIcon({ size = 15, color = '#3D4A7A' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 1 1 18 0z" />
      <Circle cx="12" cy="10" r="3" />
    </Svg>
  );
}

function PeopleIcon({ size = 15, color = '#3D4A7A' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <Circle cx="9" cy="7" r="4" />
      <Path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <Path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </Svg>
  );
}

function CardIcon({ size = 15, color = '#3D4A7A' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Rect x="2" y="5" width="20" height="14" rx="2" />
      <Line x1="2" y1="10" x2="22" y2="10" />
    </Svg>
  );
}

function PhoneCallIcon({ size = 15, color = '#3D4A7A' }: IconProps) {
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

function MailIcon({ size = 15, color = '#3D4A7A' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Rect x="2" y="4" width="20" height="16" rx="2" />
      <Path d="m22 6-10 7L2 6" />
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

const REPORT_REASONS = ['Spam', 'Scam or Fraud', 'Offensive Content', 'Harassment', 'Other'];

function InfoModal({ visible, title, message, onClose }: { visible: boolean; title: string; message: string; onClose: () => void }) {
  const [fontsLoaded] = useFonts({ Rajdhani_700Bold });
  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.successOverlay}>
        <View style={styles.deleteBox}>
          <Text style={[styles.deleteModalTitle, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>{title}</Text>
          <Text style={styles.deleteModalMsg}>{message}</Text>
          <TouchableOpacity style={[styles.successBtn, { backgroundColor: '#3D4A7A', alignSelf: 'stretch' }]} onPress={onClose}>
            <Text style={[styles.successBtnText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function CampNotFound({ onBack }: { onBack: () => void }) {
  const [fontsLoaded] = useFonts({ Rajdhani_700Bold });
  return (
    <View style={styles.notFoundContainer}>
      <SadFace />
      <Text style={[styles.notFoundTitle, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>CAMP NOT FOUND</Text>
      <Text style={styles.notFoundSub}>This camp may have been removed or is no longer available.</Text>
      <TouchableOpacity style={styles.notFoundBtn} onPress={onBack}>
        <Text style={[styles.notFoundBtnText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>BACK TO HOME</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function CampScreen() {
  const { id, postedBy } = useLocalSearchParams();
  const router = useRouter();
  const [camp, setCamp] = useState<any>(null);
  const [campNotFound, setCampNotFound] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [myRegistrationId, setMyRegistrationId] = useState<string | null>(null);
  const [myPlayerName, setMyPlayerName] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'registrations'>('details');
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [showRegModal, setShowRegModal] = useState(false);
  const [isEditingRegistration, setIsEditingRegistration] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showOrganizerReminderModal, setShowOrganizerReminderModal] = useState(false);
  const [showDeleteEventModal, setShowDeleteEventModal] = useState(false);
  const [deleteEventLoading, setDeleteEventLoading] = useState(false);
  const [cancelConfirmVisible, setCancelConfirmVisible] = useState(false);
  const [successData, setSuccessData] = useState<{ playerName: string; campName: string; contactInfo: string } | null>(null);

  const [playerName, setPlayerName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [ageGroup, setAgeGroup] = useState('');
  const [showAgeGroupPicker, setShowAgeGroupPicker] = useState(false);
  const [regLoading, setRegLoading] = useState(false);

  const [currentUsername, setCurrentUsername] = useState('');
  const [copied, setCopied] = useState(false);
  const [fontsLoaded] = useFonts({ Rajdhani_700Bold });
  const [infoModal, setInfoModal] = useState<{ visible: boolean; title: string; message: string }>({
    visible: false, title: '', message: '',
  });

  const [showReportModal, setShowReportModal] = useState(false);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [showReportConfirm, setShowReportConfirm] = useState(false);
  const [savedOrganizerId, setSavedOrganizerId] = useState('');
  const [savedOrganizerName, setSavedOrganizerName] = useState('');

  const user = auth.currentUser;
  const isOwner = user?.uid === (camp?.postedBy || postedBy);

  useEffect(() => {
    const loadUsername = async () => {
      if (!user) return;
      const userSnap = await getDoc(doc(db, 'users', user.uid));
      if (userSnap.exists()) setCurrentUsername(userSnap.data().username || user.email || '');
    };
    loadUsername();

    if (!id) return;

    const campRef = doc(db, 'camps', id as string);
    const unsubCamp = onSnapshot(campRef, (snap) => {
      if (!snap.exists()) {
        setCampNotFound(true);
        return;
      }
      const data = snap.data();
      setCamp(data);
      setSavedOrganizerId(data.postedBy || '');
      setSavedOrganizerName(data.organizerName || '');
    }, () => {
      setCampNotFound(true);
    });

    const regQuery = query(collection(db, 'camps', id as string, 'registrations'), orderBy('createdAt', 'asc'));
    const unsubRegs = onSnapshot(regQuery, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setRegistrations(docs);
      const mine = docs.find((r: any) => r.registeredBy === user?.uid);
      if (mine) {
        setRegistered(true);
        setMyRegistrationId(mine.id);
        setMyPlayerName((mine as any).playerName || null);
      } else {
        setRegistered(false);
        setMyRegistrationId(null);
        setMyPlayerName(null);
      }
    }, () => {});

    return () => { unsubCamp(); unsubRegs(); };
  }, []);

  const handleCopyAddress = () => {
    if (!camp) return;
    const parts = [camp.address, camp.city, camp.state, camp.zip].filter(Boolean);
    Clipboard.setString(parts.join(', '));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCancelRegistration = () => setCancelConfirmVisible(true);

  const doCancelRegistration = async () => {
    setCancelConfirmVisible(false);
    if (!myRegistrationId || !user) return;
    try {
      await deleteDoc(doc(db, 'camps', id as string, 'registrations', myRegistrationId));
      setRegistered(false);
      setMyRegistrationId(null);
      setMyPlayerName(null);

      await addDoc(collection(db, 'notifications'), {
        toUserId: postedBy as string,
        message: `${currentUsername} canceled registration for ${camp?.name}`,
        body: `${myPlayerName || 'A camper'} has withdrawn from ${camp?.name}.`,
        link: `/camp?id=${id}&postedBy=${postedBy}`,
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
            title: '❌ Camper canceled registration',
            body: `${myPlayerName || 'A camper'} withdrew from ${camp?.name}.`,
          }),
        });
      }
    } catch (e: any) {
      setInfoModal({
        visible: true,
        title: 'SOMETHING WENT WRONG',
        message: "We couldn't finish canceling your registration. Please check your connection and try again.",
      });
    }
  };

  const openEditRegistration = () => {
    const mine = registrations.find((r: any) => r.registeredBy === user?.uid);
    if (!mine) return;
    setPlayerName(mine.playerName || '');
    setContactName(mine.contactName || '');
    setContactInfo(mine.contactInfo || '');
    setAgeGroup(mine.ageGroup || '');
    setIsEditingRegistration(true);
    setShowRegModal(true);
  };

  const tryCloseModal = () => {
    setPlayerName(''); setContactName(''); setContactInfo(''); setAgeGroup('');
    setIsEditingRegistration(false);
    setShowRegModal(false);
  };

  const hasAgeGroups = camp?.ageGroups?.length > 0;

  const handleRegister = async () => {
    const missing: string[] = [];
    if (!contactName) missing.push('Your Name');
    if (!contactInfo) missing.push('Contact Info');
    if (hasAgeGroups && !ageGroup) missing.push('Age Group');
    if (missing.length > 0) {
      setInfoModal({ visible: true, title: 'MISSING INFORMATION', message: `Please fill in:\n\n${missing.join('\n')}` });
      return;
    }
    if (!user) return;
    setRegLoading(true);
    try {
      if (isEditingRegistration && myRegistrationId) {
        await updateDoc(doc(db, 'camps', id as string, 'registrations', myRegistrationId), {
          playerName, contactName, contactInfo, ageGroup,
        });
        setMyPlayerName(playerName);
        tryCloseModal();
      } else {
        await addDoc(collection(db, 'camps', id as string, 'registrations'), {
          playerName, contactName, contactInfo, ageGroup,
          registeredBy: user.uid,
          createdAt: serverTimestamp(),
        });

        setRegistered(true);
        setMyPlayerName(playerName);

        await addDoc(collection(db, 'notifications'), {
          toUserId: postedBy as string,
          message: `${contactName} registered ${playerName} for ${camp?.name}!`,
          body: hasAgeGroups ? `Age Group: ${ageGroup}` : '',
          link: `/camp?id=${id}&postedBy=${postedBy}`,
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
              title: '⛺ New camp registration!',
              body: `${contactName} registered ${playerName} for ${camp?.name}!`,
            }),
          });
        }

        await addDoc(collection(db, 'notifications'), {
          toUserId: user.uid,
          message: `You're registered for ${camp?.name}!`,
          body: `${playerName} is confirmed${hasAgeGroups ? ` in ${ageGroup}` : ''}.`,
          link: `/camp?id=${id}&postedBy=${postedBy}`,
          createdAt: serverTimestamp(),
          read: false,
        });

        setShowRegModal(false);
        setPlayerName(''); setContactName(''); setContactInfo(''); setAgeGroup('');

        const orgContact = [camp?.contactName, camp?.contactPhone].filter(Boolean).join(' · ');
        setSuccessData({ playerName: playerName || contactName, campName: camp?.name, contactInfo: orgContact });
        setShowSuccessModal(true);
      }
    } catch (e: any) {
      setInfoModal({
        visible: true,
        title: 'REGISTRATION FAILED',
        message: "We couldn't complete your registration. Please check your connection and try again.",
      });
    }
    setRegLoading(false);
  };

  const confirmCancelCamp = async () => {
    setDeleteLoading(true);
    try {
      await Promise.all(
        registrations.map(async (reg: any) => {
          if (reg.registeredBy) {
            await addDoc(collection(db, 'notifications'), {
              toUserId: reg.registeredBy,
              message: `⚠️ ${camp.name} has been canceled by the organizer.`,
              link: `/`,
              organizerName: camp.organizerName || camp.contactName || '',
              organizerPhone: camp.contactPhone || '',
              createdAt: serverTimestamp(),
              read: false,
            });
            const userSnap = await getDoc(doc(db, 'users', reg.registeredBy));
            if (userSnap.exists() && userSnap.data().pushToken) {
              await fetch('https://exp.host/--/api/v2/push/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  to: userSnap.data().pushToken,
                  title: '⚠️ Camp Canceled',
                  body: `${camp.name} has been canceled by the organizer.`,
                }),
              });
            }
          }
        })
      );

      await updateDoc(doc(db, 'camps', id as string), { status: 'canceled' });
      setShowDeleteModal(false);
      setShowOrganizerReminderModal(true);
    } catch (e: any) {
      setInfoModal({
        visible: true,
        title: 'SOMETHING WENT WRONG',
        message: "We couldn't cancel the camp. Please check your connection and try again.",
      });
    }
    setDeleteLoading(false);
  };

  const confirmDeleteEvent = async () => {
    setDeleteEventLoading(true);
    try {
      const campId = id as string;

      const regsSnap = await getDocs(collection(db, 'camps', campId, 'registrations'));
      await Promise.all(regsSnap.docs.map((regDoc) => deleteDoc(regDoc.ref)));

      if (camp?.flyerImageUrl) {
        try {
          await deleteObject(ref(storage, `camps/${campId}/flyer.jpg`));
        } catch (_) {}
      }

      await deleteDoc(doc(db, 'camps', campId));

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
    if (!camp) return;
    try {
      await Share.share({
        message: `⛺ ${camp.name}\n📅 ${camp.startDate}${camp.endDate && camp.endDate !== camp.startDate ? ` - ${camp.endDate}` : ''}\n📍 ${camp.city}, ${camp.state}${camp.contactPhone ? `\n📞 ${camp.contactPhone}` : ''}\n\nFind this camp on Zony!`,
      });
    } catch (e: any) {}
  };

  const handleReport = async (reason: string) => {
    if (!user || !savedOrganizerId) return;
    setReportSubmitting(true);
    try {
      await addDoc(collection(db, 'reports'), {
        postId: id as string, postType: 'camp',
        postAuthorId: savedOrganizerId,
        postSnapshot: { name: camp?.name || null, sport: camp?.sport || null },
        reason, reportedBy: user.uid, createdAt: serverTimestamp(), status: 'pending',
      });
      setShowReportModal(false);
      setTimeout(() => setShowReportConfirm(true), 300);
    } catch (e: any) {
      setInfoModal({ visible: true, title: 'SOMETHING WENT WRONG', message: "We couldn't submit your report. Please check your connection and try again." });
    }
    setReportSubmitting(false);
  };

  const handleMessageOrganizer = () => {
    if (!postedBy || !camp) return;
    router.push({
      pathname: '/start-dm',
      params: {
        recipientId: postedBy as string,
        recipientName: camp.organizerName || 'Organizer',
        context: `Camp: ${camp.name}`,
      },
    });
  };

  if (campNotFound) {
    return <CampNotFound onBack={() => router.replace('/')} />;
  }

  if (!camp) return null;
  const isCanceled = camp.status === 'canceled';
  const accentColor = '#3D4A7A';

  const organizerInitials = camp.organizerName
    ? camp.organizerName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  const dateDisplay = camp.endDate && camp.endDate !== camp.startDate ? `${camp.startDate} – ${camp.endDate}` : camp.startDate;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>

        <View style={styles.topRow}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          {!isOwner && (
            <View style={styles.reportBtnWrapper} pointerEvents="box-none">
              <TouchableOpacity onPress={() => setShowReportModal(true)} style={styles.reportBtn}>
                <Text style={styles.reportBtnText}>Report</Text>
              </TouchableOpacity>
            </View>
          )}
          <TouchableOpacity onPress={handleShare} style={styles.shareBtn}>
            <Text style={styles.shareText}>Share ↗</Text>
          </TouchableOpacity>
        </View>

        {isCanceled && (
          <View style={styles.canceledBanner}>
            <WarningIcon size={14} color="#fff" />
            <Text style={styles.canceledBannerText}>This camp has been canceled</Text>
          </View>
        )}

        {isOwner && (
          <View style={styles.tabRow}>
            <TouchableOpacity style={[styles.tab, activeTab === 'details' && { backgroundColor: accentColor }]} onPress={() => setActiveTab('details')}>
              <Text style={[styles.tabText, activeTab === 'details' && styles.tabTextActive]}>Details</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tab, activeTab === 'registrations' && { backgroundColor: accentColor }]} onPress={() => setActiveTab('registrations')}>
              <Text style={[styles.tabText, activeTab === 'registrations' && styles.tabTextActive]}>Registrations {registrations.length > 0 ? `(${registrations.length})` : ''}</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 'registrations' && isOwner ? (
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
            <Text style={styles.teamsCount}>{registrations.length} {registrations.length === 1 ? 'camper' : 'campers'} registered</Text>
            {registrations.length === 0 ? (
              <View style={styles.emptyTeams}><SadFace /><Text style={styles.emptyTeamsText}>No one registered yet.</Text></View>
            ) : (
              registrations.map((r: any) => (
                <View key={r.id} style={styles.teamCard}>
                  <View style={styles.teamCardTop}>
                    <Text style={[styles.teamName, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>{r.playerName || r.contactName}</Text>
                    {r.ageGroup ? (
                      <View style={[styles.teamDivisionBadge, { backgroundColor: `${accentColor}20`, borderColor: accentColor }]}>
                        <Text style={[styles.teamDivisionText, { color: accentColor }]}>{r.ageGroup}</Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.divider} />
                  <Text style={styles.submittedLabel}>Registered by</Text>
                  <Text style={styles.contactName}>{r.contactName}</Text>
                  {r.contactInfo ? (
                    <View style={styles.contactLine}>
                      <PhoneMobileIcon size={12} color="#999" />
                      <Text style={styles.contactLineText}>{r.contactInfo}</Text>
                    </View>
                  ) : null}
                </View>
              ))
            )}
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
            <View style={styles.card}>
              {camp.flyerImageUrl ? (
                <FlyerHeroImage uri={camp.flyerImageUrl} />
              ) : null}

              <View style={styles.sportBadgeRow}>
                <View style={[styles.sportBadge, { backgroundColor: accentColor }]}>
                  <Text style={styles.sportBadgeText}>{camp.sport}</Text>
                </View>
              </View>

              {(registered || myPlayerName) && !isOwner && (
                <View style={[styles.registeredBanner, { backgroundColor: accentColor }]}>
                  <CheckIcon size={18} color="#fff" />
                  <Text style={[styles.registeredBannerText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]} numberOfLines={2}>
                    {myPlayerName ? `${myPlayerName} is Registered` : "You're Registered"}
                  </Text>
                </View>
              )}

              <Text style={[styles.tournamentName, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>{camp.name}</Text>

              {camp.organizerName ? (
                <View style={styles.organizerRow}>
                  {camp.organizerPhoto ? (
                    <Image source={{ uri: camp.organizerPhoto }} style={styles.organizerPhoto} />
                  ) : (
                    <View style={[styles.organizerAvatar, { backgroundColor: accentColor }]}>
                      <Text style={[styles.organizerInitials, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>{organizerInitials}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.organizerLabel}>Posted by</Text>
                    <Text style={[styles.organizerName, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>{camp.organizerName}</Text>
                  </View>
                  {!isOwner && (
                    <TouchableOpacity style={[styles.messageOrganizerBtn, { backgroundColor: accentColor }]} onPress={handleMessageOrganizer}>
                      <MessageIcon size={14} color="#fff" />
                      <Text style={styles.messageOrganizerBtnText}>Message</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : null}

              <View style={styles.divider} />

              <View style={styles.row}><CalendarIcon color={accentColor} /><Text style={styles.rowLabel}>Date</Text></View>
              <Text style={styles.rowValue}>{dateDisplay}</Text>

              <View style={[styles.row, { marginTop: 16 }]}><LocationIcon color={accentColor} /><Text style={styles.rowLabel}>Location</Text></View>
              {camp.address ? <Text style={styles.rowValue}>{camp.address}</Text> : null}
              <Text style={styles.rowValue}>{camp.city}, {camp.state} {camp.zip}</Text>
              <TouchableOpacity style={styles.copyBtn} onPress={handleCopyAddress}>
                <Text style={styles.copyBtnText}>{copied ? '✓ Copied!' : 'Copy Address'}</Text>
              </TouchableOpacity>

              {camp.ageGroups?.length > 0 && (
                <>
                  <View style={[styles.row, { marginTop: 16 }]}><PeopleIcon color={accentColor} /><Text style={styles.rowLabel}>Age Groups</Text></View>
                  <Text style={styles.rowValue}>{camp.ageGroups.join(', ')}</Text>
                </>
              )}

              {camp.price ? (
                <>
                  <View style={[styles.row, { marginTop: 16 }]}><CardIcon color={accentColor} /><Text style={styles.rowLabel}>Camp Fee</Text></View>
                  <Text style={styles.rowValue}>{camp.price === 'Free' ? 'Free' : camp.price}</Text>
                </>
              ) : null}

              {camp.description ? (
                <>
                  <View style={[styles.row, { marginTop: 16 }]}><PeopleIcon color={accentColor} /><Text style={styles.rowLabel}>Details</Text></View>
                  <Text style={styles.rowValue}>{camp.description}</Text>
                </>
              ) : null}

              {(camp.contactName || camp.contactPhone || camp.contactEmail) ? (
                <>
                  <View style={[styles.row, { marginTop: 16 }]}><PhoneCallIcon color={accentColor} /><Text style={styles.rowLabel}>Contact</Text></View>
                  {camp.contactName ? <Text style={styles.rowValue}>{camp.contactName}</Text> : null}
                  {camp.contactPhone ? (
                    <TouchableOpacity onPress={() => Linking.openURL(`tel:${camp.contactPhone.replace(/\D/g, '')}`)} style={styles.contactLine}>
                      <PhoneMobileIcon size={12} color={accentColor} />
                      <Text style={[styles.tappableLink, { paddingLeft: 0, color: accentColor }]}>{camp.contactPhone}</Text>
                    </TouchableOpacity>
                  ) : null}
                  {camp.contactEmail ? (
                    <TouchableOpacity onPress={() => Linking.openURL(`mailto:${camp.contactEmail}`)} style={styles.contactLine}>
                      <MailIcon size={12} color={accentColor} />
                      <Text style={[styles.tappableLink, { paddingLeft: 0, color: accentColor }]}>{camp.contactEmail}</Text>
                    </TouchableOpacity>
                  ) : null}
                </>
              ) : null}

              <View style={styles.disclaimerBox}>
                <Text style={styles.disclaimerText}>
                  Committee is not responsible for any injuries, accidents, lost or stolen items, or damages incurred during the camp. Participation is at your own risk.
                </Text>
              </View>
            </View>

            {isOwner ? (
              <View style={styles.ownerActions}>
                <TouchableOpacity style={[styles.editBtn, { backgroundColor: accentColor }]} onPress={() => router.push({ pathname: '/edit-camp', params: { id } })}>
                  <Text style={[styles.editBtnText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>Edit Camp</Text>
                </TouchableOpacity>

                {isCanceled ? (
                  <TouchableOpacity style={styles.deleteEventBtn} onPress={() => setShowDeleteEventModal(true)}>
                    <TrashIcon size={18} color="#fff" />
                    <Text style={[styles.deleteBtnText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>Delete Event</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => setShowDeleteModal(true)}>
                    <Text style={[styles.deleteBtnText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>Cancel Camp</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={styles.registrationActions}>
                {registered || myPlayerName ? (
                  <>
                    <TouchableOpacity style={[styles.joinBtn, { backgroundColor: accentColor }]} onPress={openEditRegistration}>
                      <Text style={styles.joinText}>Edit Registration</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.cancelRegBtn} onPress={handleCancelRegistration}>
                      <Text style={styles.cancelRegText}>Cancel Registration</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity
                    style={[styles.joinBtn, { backgroundColor: accentColor }, isCanceled && styles.joinedBtn]}
                    onPress={() => { if (!isCanceled) setShowRegModal(true); }}
                    disabled={isCanceled}
                  >
                    <Text style={styles.joinText}>{isCanceled ? 'Canceled' : 'Register'}</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </ScrollView>
        )}
      </View>

      {/* Registration Modal */}
      <Modal visible={showRegModal} animationType="slide" transparent onRequestClose={tryCloseModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <View style={styles.modalHeader}>
                <View>
                  <Text style={[styles.modalTitle, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>{isEditingRegistration ? 'EDIT REGISTRATION' : 'REGISTER FOR CAMP'}</Text>
                  <Text style={styles.modalSub}>{camp.name}</Text>
                </View>
                <TouchableOpacity onPress={tryCloseModal} style={styles.modalCloseBtn}>
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.modalLabel}>Player / Athlete <Text style={styles.optional}>(optional)</Text></Text>
              <TextInput style={styles.modalInput} placeholder="e.g. John Doe" placeholderTextColor="#a0b8b8" value={playerName} onChangeText={setPlayerName} />
              <Text style={styles.modalLabel}>Your Name</Text>
              <TextInput style={styles.modalInput} placeholder="e.g. Nel Zony" placeholderTextColor="#a0b8b8" value={contactName} onChangeText={setContactName} />
              <Text style={styles.modalLabel}>Your Contact Info</Text>
              <TextInput style={styles.modalInput} placeholder="e.g. 928-555-1234" placeholderTextColor="#a0b8b8" value={contactInfo} onChangeText={v => setContactInfo(formatPhone(v))} keyboardType="phone-pad" maxLength={12} />
              {hasAgeGroups && (
                <>
                  <Text style={styles.modalLabel}>Age Group</Text>
                  <TouchableOpacity style={styles.modalDropdown} onPress={() => setShowAgeGroupPicker(!showAgeGroupPicker)}>
                    <Text style={ageGroup ? styles.modalDropdownSelected : styles.modalDropdownPlaceholder}>{ageGroup || 'Select age group...'}</Text>
                    <Text style={styles.dropdownArrow}>{showAgeGroupPicker ? '▲' : '▼'}</Text>
                  </TouchableOpacity>
                  {showAgeGroupPicker && (
                    <View style={styles.modalDropdownList}>
                      {camp.ageGroups.map((a: string) => (
                        <TouchableOpacity key={a} style={styles.modalDropdownItem} onPress={() => { setAgeGroup(a); setShowAgeGroupPicker(false); }}>
                          <Text style={[styles.modalDropdownItemText, ageGroup === a && styles.modalDropdownItemActive]}>{a}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </>
              )}
              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.modalCancelBtn} onPress={tryCloseModal}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalSubmitBtn, { backgroundColor: accentColor }]} onPress={handleRegister} disabled={regLoading}>
                  <Text style={[styles.modalSubmitText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>{regLoading ? 'Saving...' : isEditingRegistration ? 'SAVE' : 'REGISTER'}</Text>
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
            <Text style={styles.deleteModalMsg}>Are you sure you want to cancel your registration for {camp.name}?</Text>
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

      {/* Cancel Camp Modal */}
      <Modal visible={showDeleteModal} animationType="fade" transparent>
        <View style={styles.successOverlay}>
          <View style={styles.deleteBox}>
            <Text style={[styles.deleteModalTitle, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>CANCEL CAMP</Text>
            <Text style={styles.deleteModalMsg}>
              This will notify all registered campers that{' '}
              <Text style={{ fontWeight: '700', color: '#003333' }}>{camp.name}</Text> has been canceled.{'\n\n'}You'll still be able to view registrations and contact info under the Registrations tab so you can follow up about refunds or rescheduling.{'\n\n'}If you're rescheduling rather than canceling, use Edit Camp instead to update the date.
            </Text>
            <View style={styles.deleteModalBtns}>
              <TouchableOpacity style={styles.deleteModalCancelBtn} onPress={() => setShowDeleteModal(false)}>
                <Text style={[styles.deleteModalCancelText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>KEEP IT</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteModalConfirmBtn} onPress={confirmCancelCamp} disabled={deleteLoading}>
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
              This will permanently delete <Text style={{ fontWeight: '700', color: '#003333' }}>{camp.name}</Text> and cannot be undone.{'\n\n'}All registration data will be removed. Be sure to save any contact information you need before continuing.
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

      {/* Success Modal */}
      <Modal visible={showSuccessModal} animationType="fade" transparent>
        <View style={styles.successOverlay}>
          <View style={styles.successBox}>
            <SuccessTent />
            <Text style={[styles.successTitle, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>REGISTERED!</Text>
            <Text style={styles.successMsg}>{successData?.playerName} is registered for {successData?.campName}.</Text>
            <View style={styles.paymentPromptBox}>
              <View style={styles.paymentPromptTitleRow}>
                <CardIcon size={14} color="#003333" />
                <Text style={styles.paymentPromptTitle}>Payment Details</Text>
              </View>
              <Text style={styles.paymentPromptText}>Contact the organizer for payment instructions and accepted methods.</Text>
              {successData?.contactInfo ? <Text style={styles.paymentContactInfo}>{successData.contactInfo}</Text> : null}
            </View>
            <TouchableOpacity style={[styles.successBtn, { backgroundColor: accentColor }]} onPress={() => setShowSuccessModal(false)}>
              <Text style={[styles.successBtnText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>GOT IT</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Organizer Reminder Modal */}
      <Modal visible={showOrganizerReminderModal} animationType="fade" transparent>
        <View style={styles.successOverlay}>
          <View style={styles.deleteBox}>
            <Text style={[styles.deleteModalTitle, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>CAMP CANCELED</Text>
            <Text style={styles.deleteModalMsg}>
              Registered campers have been notified. Please reach out to them directly about next steps — refunds, rescheduling, or alternatives.{'\n\n'}You can find their contact info under the Registrations tab, or message them through the Messages tab.
            </Text>
            <TouchableOpacity
              style={{ backgroundColor: '#3D4A7A', borderRadius: 14, paddingVertical: 14, alignItems: 'center', width: '100%' }}
              onPress={() => {
                setShowOrganizerReminderModal(false);
                setActiveTab('registrations');
              }}
            >
              <Text style={[styles.deleteModalConfirmText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>GOT IT</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Report Modal */}
      <Modal visible={showReportModal} animationType="fade" transparent>
        <View style={styles.successOverlay}>
          <View style={styles.deleteBox}>
            <Text style={[styles.deleteModalTitle, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>REPORT CAMP</Text>
            <Text style={styles.deleteModalMsg}>Why are you reporting this camp?</Text>
            {REPORT_REASONS.map(reason => (
              <TouchableOpacity key={reason} style={styles.reportReasonBtn} onPress={() => handleReport(reason)} disabled={reportSubmitting} activeOpacity={0.8}>
                <Text style={[styles.reportReasonText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>{reason}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.deleteModalCancelBtn} onPress={() => setShowReportModal(false)} disabled={reportSubmitting}>
              <Text style={[styles.deleteModalCancelText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>CANCEL</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Report Confirm Modal */}
      <Modal visible={showReportConfirm} animationType="fade" transparent>
        <View style={styles.successOverlay}>
          <View style={styles.deleteBox}>
            <Text style={[styles.deleteModalTitle, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>REPORT SUBMITTED</Text>
            <Text style={styles.deleteModalMsg}>Thanks for letting us know. Our team will review this camp within 24 hours.</Text>
            <TouchableOpacity style={[styles.successBtn, { backgroundColor: accentColor, alignSelf: 'stretch' }]} onPress={() => {
              setShowReportConfirm(false);
              setTimeout(() => router.back(), 300);
            }}>
              <Text style={[styles.successBtnText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>OK</Text>
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
  notFoundContainer: { flex: 1, backgroundColor: '#f5ede0', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 },
  notFoundTitle: { fontSize: 24, color: '#003333', letterSpacing: 2, marginTop: 8, textAlign: 'center' },
  notFoundSub: { fontSize: 15, color: '#5a7a7a', textAlign: 'center', marginBottom: 12 },
  notFoundBtn: { backgroundColor: '#3D4A7A', borderRadius: 12, paddingVertical: 16, paddingHorizontal: 32, marginTop: 8 },
  notFoundBtnText: { color: '#fff', fontSize: 16, letterSpacing: 1 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 16, position: 'relative' },
  reportBtnWrapper: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 16, color: '#3D4A7A', fontWeight: '600' },
  shareBtn: { backgroundColor: '#faf3e0', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  shareText: { fontSize: 14, color: '#3D4A7A', fontWeight: '600' },
  reportBtn: { backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: '#e0d8c8' },
  reportBtnText: { color: '#999', fontSize: 13, fontWeight: '600' },
  canceledBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#cc4444', marginHorizontal: 20, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16, marginBottom: 12, justifyContent: 'center' },
  canceledBannerText: { color: '#fff', fontWeight: 'bold', fontSize: 14, textAlign: 'center' },
  tabRow: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 16, backgroundColor: '#faf3e0', borderRadius: 12, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#5a7a7a' },
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
  contactLine: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2, paddingLeft: 24 },
  contactLineText: { fontSize: 12, color: '#777' },
  tappableLink: { fontSize: 14, color: '#3D4A7A', textDecorationLine: 'underline' },
  card: { backgroundColor: '#fff', borderRadius: 24, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  flyerHeroImage: { width: '100%', height: 200, borderRadius: 16, marginBottom: 14, backgroundColor: '#e0d8c8' },
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
  copyBtn: { marginLeft: 24, marginTop: 8, backgroundColor: '#f5ede0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start' },
  copyBtnText: { fontSize: 12, color: '#3D4A7A', fontWeight: '600' },
  ownerActions: { gap: 10, marginBottom: 20 },
  editBtn: { borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  editBtnText: { color: '#fff', fontSize: 18, letterSpacing: 1 },
  deleteBtn: { backgroundColor: '#1a1a2e', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  deleteBtnText: { color: '#fff', fontSize: 18, letterSpacing: 1 },
  deleteEventBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: '#cc4444', borderRadius: 12, paddingVertical: 16 },
  registrationActions: { gap: 10, marginBottom: 20 },
  joinBtn: { borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  joinedBtn: { backgroundColor: '#a0b8b8' },
  joinText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  cancelRegBtn: { borderRadius: 16, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: '#cc4444' },
  cancelRegText: { fontSize: 15, color: '#cc4444', fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#faf6ec', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  modalCloseBtn: { padding: 4 },
  modalCloseText: { fontSize: 22, color: '#5a7a7a', fontWeight: 'bold' },
  modalTitle: { fontSize: 22, color: '#003333', letterSpacing: 1, marginBottom: 4 },
  modalSub: { fontSize: 14, color: '#5a7a7a', marginBottom: 20 },
  modalLabel: { fontSize: 14, fontWeight: '600', color: '#003333', marginBottom: 6, marginTop: 10 },
  modalInput: { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: '#003333', marginBottom: 4, borderWidth: 1, borderColor: '#f0e8d8' },
  modalDropdown: { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#f0e8d8' },
  modalDropdownPlaceholder: { fontSize: 15, color: '#a0b8b8' },
  modalDropdownSelected: { fontSize: 15, color: '#003333' },
  dropdownArrow: { fontSize: 12, color: '#3D4A7A' },
  modalDropdownList: { backgroundColor: '#fff', borderRadius: 12, marginTop: 4, marginBottom: 8, borderWidth: 1, borderColor: '#f0e8d8', overflow: 'hidden' },
  modalDropdownItem: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#faf6ec' },
  modalDropdownItemText: { fontSize: 15, color: '#003333' },
  modalDropdownItemActive: { color: '#3D4A7A', fontWeight: 'bold' },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 20, marginBottom: 10 },
  modalCancelBtn: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: '#e0d0a8' },
  modalCancelText: { fontSize: 16, color: '#5a7a7a', fontWeight: '600' },
  modalSubmitBtn: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  modalSubmitText: { color: '#fff', fontSize: 16, letterSpacing: 1 },
  successOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  successBox: { backgroundColor: '#f5ede0', borderRadius: 24, padding: 28, alignItems: 'center', width: '100%', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 16, elevation: 8 },
  successTitle: { fontSize: 28, color: '#003333', letterSpacing: 2, marginTop: 12, marginBottom: 8, textAlign: 'center' },
  successMsg: { fontSize: 15, color: '#555', textAlign: 'center', marginBottom: 12, lineHeight: 22 },
  paymentPromptBox: { backgroundColor: '#faf3e0', borderRadius: 12, padding: 14, marginBottom: 20, width: '100%', borderWidth: 1, borderColor: '#f0e0b8' },
  paymentPromptTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  paymentPromptTitle: { fontSize: 13, fontWeight: '700', color: '#003333' },
  paymentPromptText: { fontSize: 13, color: '#5a7a7a', lineHeight: 18 },
  paymentContactInfo: { fontSize: 13, color: '#3D4A7A', fontWeight: '600', marginTop: 6 },
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
  disclaimerBox: { marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  disclaimerText: { fontSize: 11, color: '#b0b0b0', fontStyle: 'italic', lineHeight: 16, textAlign: 'center' },
  reportReasonBtn: { width: '100%', backgroundColor: '#fff', borderRadius: 14, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: '#e0d8c8', marginBottom: 8 },
  reportReasonText: { fontSize: 15, color: '#003333', letterSpacing: 0.5 },
});