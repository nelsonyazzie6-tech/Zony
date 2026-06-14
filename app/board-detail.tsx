import { Rajdhani_700Bold, useFonts } from '@expo-google-fonts/rajdhani';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, collection, deleteDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Image, Linking, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Path, Polygon, Rect } from 'react-native-svg';
import { auth, db } from '../firebaseConfig';

function getSportColor(sport: string) {
  if (sport === 'Basketball') return '#008080';
  if (sport === 'Volleyball') return '#7A1E1E';
  if (sport === 'Softball') return '#B8860B';
  return '#008080';
}

// Sport icons, replace 🏀
function BasketballIcon({ size = 12, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="12" cy="12" r="10" />
      <Path d="M12 2.5v19" />
      <Path d="M2.5 12h19" />
      <Path d="M4.8 4.8c7 5.5 7 9.4 0 14.4" />
      <Path d="M19.2 4.8c-7 5.5-7 9.4 0 14.4" />
    </Svg>
  );
}

function VolleyballIcon({ size = 12, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="12" cy="12" r="10" />
      <Path d="M12 2c3 2 4.5 5 4.5 8s-1.5 6-4.5 8" />
      <Path d="M3 9c4-1.5 9-1.5 14 1" />
      <Path d="M3 16c4-3.5 11-4 17.5-1" />
    </Svg>
  );
}

function SoftballIcon({ size = 12, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="12" cy="12" r="10" />
      <Path d="M5 5c4 4 4 10 0 14" />
      <Path d="M19 5c-4 4-4 10 0 14" />
    </Svg>
  );
}

function SportIcon({ sport, size = 12, color = '#fff' }: { sport: string; size?: number; color?: string }) {
  if (sport === 'Volleyball') return <VolleyballIcon size={size} color={color} />;
  if (sport === 'Softball') return <SoftballIcon size={size} color={color} />;
  return <BasketballIcon size={size} color={color} />;
}

// Trophy icon, replaces 🏅 / 🏆
function TrophyIcon({ size = 12, color = '#fff' }: { size?: number; color?: string }) {
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

// Phone (Mobile) icon, replaces 📱
function PhoneMobileIcon({ size = 13, color = '#008080' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Rect x="5" y="2" width="14" height="20" rx="2" />
      <Path d="M12 18h.01" />
    </Svg>
  );
}

// Mail icon, replaces ✉️
function MailIcon({ size = 13, color = '#008080' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Rect x="2" y="4" width="20" height="16" rx="2" />
      <Path d="m22 6-10 7L2 6" />
    </Svg>
  );
}

const REPORT_REASONS = ['Spam', 'Scam or Fraud', 'Offensive Content', 'Harassment', 'Other'];

export default function BoardDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [post, setPost] = useState<any>(null);
  const [poster, setPoster] = useState<{ username: string; photoURL: string } | null>(null);
const [hideContactInfo, setHideContactInfo] = useState<boolean | null>(null);
  const [fontsLoaded] = useFonts({ Rajdhani_700Bold });
  const [headerHeight, setHeaderHeight] = useState(160);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Report state
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [showReportConfirm, setShowReportConfirm] = useState(false);

  const user = auth.currentUser;

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      const snap = await getDoc(doc(db, 'board', id as string));
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() };
        setPost(data);
        if ((data as any).postedBy) {
          try {
            const userSnap = await getDoc(doc(db, 'users', (data as any).postedBy));
            if (userSnap.exists()) {
              setPoster({
                username: userSnap.data().username || '',
                photoURL: userSnap.data().photoURL || '',
              });
              setHideContactInfo(userSnap.data().hideContactInfo === true);
            }
          } catch (_) {}
        }
      }
    };
    load();
  }, []);

  if (!post) return null;

  const isOwner = user?.uid === post.postedBy;
  const sportColor = getSportColor(post.sport);
  const initials = post.name
    ? post.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
    : post.type === 'Player' ? 'PL' : 'TM';
  const postedDate = post.createdAt?.toDate?.()?.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) || '';
  const posterInitials = poster?.username
    ? poster.username.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  // Contact info visible to owner always, hidden to others if toggle is on
 const showContact = isOwner || hideContactInfo === false;

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await deleteDoc(doc(db, 'board', id as string));
      router.replace('/(tabs)/board');
    } catch (e: any) { console.log(e); }
    setDeleteLoading(false);
  };

  const handleMessage = () => {
    if (!post.postedBy) return;
    router.push({
      pathname: '/start-dm',
      params: {
        recipientId: post.postedBy,
        recipientName: post.name || post.type || 'Player',
        context: `Board: ${post.name || post.type || 'Post'}`,
      },
    });
  };

  const handleReport = async (reason: string) => {
    if (!user || !post) return;
    setReportSubmitting(true);
    try {
      await addDoc(collection(db, 'reports'), {
        postId: id as string,
        postType: 'board',
        postAuthorId: post.postedBy || null,
        postSnapshot: {
          name: post.name || null,
          sport: post.sport || null,
          division: post.division || null,
          description: post.description || null,
        },
        reason,
        reportedBy: user.uid,
        createdAt: serverTimestamp(),
        status: 'pending',
      });
      setShowReportModal(false);
      setShowReportConfirm(true);
    } catch (e: any) { console.log(e); }
    setReportSubmitting(false);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.headerBlock, { backgroundColor: sportColor }]} onLayout={e => setHeaderHeight(e.nativeEvent.layout.height)}>
        <Svg style={StyleSheet.absoluteFill} width="100%" height={headerHeight} viewBox="0 0 390 160" preserveAspectRatio="xMidYMid slice">
          <Polygon points="0,0 80,30 40,80" fill="white" opacity={0.04} />
          <Polygon points="80,30 160,10 120,70" fill="white" opacity={0.07} />
          <Polygon points="40,80 120,70 80,130" fill="white" opacity={0.05} />
          <Polygon points="160,10 260,50 180,90" fill="white" opacity={0.06} />
          <Polygon points="120,70 180,90 100,130" fill="white" opacity={0.08} />
          <Polygon points="260,50 330,20 310,80" fill="white" opacity={0.05} />
          <Polygon points="180,90 310,80 240,130" fill="white" opacity={0.07} />
          <Polygon points="330,20 390,0 390,60" fill="white" opacity={0.04} />
          <Polygon points="310,80 390,60 390,130" fill="white" opacity={0.06} />
          <Polygon points="0,60 40,80 0,130" fill="white" opacity={0.05} />
          <Polygon points="0,0 40,0 80,30" fill="white" opacity={0.08} />
          <Polygon points="160,10 260,0 260,50" fill="white" opacity={0.04} />
          <Polygon points="260,0 330,20 390,0" fill="white" opacity={0.06} />
          <Polygon points="240,130 310,80 390,130" fill="white" opacity={0.05} />
          <Polygon points="80,130 180,90 240,130" fill="white" opacity={0.04} />
        </Svg>
        <View style={styles.topRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.back}>
            <Text style={styles.backText}>‹ Sports Board</Text>
          </TouchableOpacity>
          {!isOwner && (
            <TouchableOpacity onPress={() => setShowReportModal(true)} style={styles.reportBtn}>
              <Text style={styles.reportBtnText}>Report</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.heroInner}>
          <View style={styles.avatarLarge}>
            <Text style={[styles.avatarLargeText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>{initials}</Text>
          </View>
          <View style={styles.heroInfo}>
            <Text style={[styles.heroName, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>
              {post.name ? post.name.toUpperCase() : post.sport?.toUpperCase()}
            </Text>
            <View style={styles.badgeRow}>
              {post.sport ? (
                <View style={styles.badgeRow2}>
                  <SportIcon sport={post.sport} size={12} color="#fff" />
                  <Text style={styles.badgeText}>{post.sport}</Text>
                </View>
              ) : null}
              {post.division ? (
                <View style={styles.badgeRow2}>
                  <TrophyIcon size={12} color="#fff" />
                  <Text style={styles.badgeText}>{post.division}</Text>
                </View>
              ) : null}
              {post.forTournament ? (
                <View style={styles.badgeRow2}>
                  <TrophyIcon size={12} color="#fff" />
                  <Text style={styles.badgeText}>{post.forTournament}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {post.description ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>ABOUT</Text>
            <Text style={styles.descriptionText}>{post.description}</Text>
          </View>
        ) : null}

        <View style={styles.infoCard}>
          {post.division ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Division</Text>
              <Text style={styles.infoValue}>{post.division}</Text>
            </View>
          ) : null}
          {post.sport ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Sport</Text>
              <Text style={styles.infoValue}>{post.sport}</Text>
            </View>
          ) : null}
          {post.forTournament ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>For</Text>
              <Text style={styles.infoValue}>{post.forTournament}</Text>
            </View>
          ) : null}

          {/* Phone — hidden if poster has hideContactInfo on */}
          {post.contactPhone ? (
            showContact ? (
              <TouchableOpacity
                style={styles.infoRow}
                onPress={() => Linking.openURL(`tel:${post.contactPhone.replace(/\D/g, '')}`)}
                activeOpacity={0.7}
              >
                <Text style={styles.infoLabel}>Phone</Text>
                <View style={styles.tappableLinkRow}>
                  <PhoneMobileIcon size={13} color="#008080" />
                  <Text style={[styles.infoValue, styles.tappableLink]}>{post.contactPhone}</Text>
                </View>
              </TouchableOpacity>
            ) : null
          ) : null}

          {/* Email — hidden if poster has hideContactInfo on */}
          {post.contactEmail ? (
            showContact ? (
              <TouchableOpacity
                style={[styles.infoRow, { borderBottomWidth: 0 }]}
                onPress={() => Linking.openURL(`mailto:${post.contactEmail}`)}
                activeOpacity={0.7}
              >
                <Text style={styles.infoLabel}>Email</Text>
                <View style={styles.tappableLinkRow}>
                  <MailIcon size={13} color="#008080" />
                  <Text style={[styles.infoValue, styles.tappableLink]}>{post.contactEmail}</Text>
                </View>
              </TouchableOpacity>
            ) : null
          ) : null}

          {/* Nudge shown when contact is hidden */}
          {!showContact && (post.contactPhone || post.contactEmail) ? (
            <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.infoLabel}>Contact</Text>
              <Text style={styles.hiddenContactNote}>Message to get contact info</Text>
            </View>
          ) : null}
        </View>

        {poster && (
          <View style={styles.posterCard}>
            {poster.photoURL ? (
              <Image source={{ uri: poster.photoURL }} style={styles.posterPhoto} />
            ) : (
              <View style={[styles.posterAvatar, { backgroundColor: sportColor }]}>
                <Text style={[styles.posterAvatarText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>{posterInitials}</Text>
              </View>
            )}
            <View>
              <Text style={styles.posterLabel}>Posted by</Text>
              <Text style={[styles.posterName, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>{poster.username}</Text>
            </View>
            {postedDate ? <Text style={styles.postedDate}>{postedDate}</Text> : null}
          </View>
        )}

        {!isOwner && post.postedBy ? (
          <TouchableOpacity style={[styles.messageBtn, { backgroundColor: sportColor }]} onPress={handleMessage} activeOpacity={0.85}>
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" style={{ marginRight: 8 }}>
              <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
            <Text style={[styles.messageBtnText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>MESSAGE</Text>
          </TouchableOpacity>
        ) : null}

        {isOwner ? (
          <View style={styles.ownerActions}>
            <TouchableOpacity style={styles.editBtn} onPress={() => router.push({ pathname: '/edit-board', params: { id } })} activeOpacity={0.85}>
              <Text style={[styles.editBtnText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>EDIT POST</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteBtn} onPress={() => setShowDeleteModal(true)} activeOpacity={0.85}>
              <Text style={[styles.deleteBtnText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>DELETE POST</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={{ height: 20 }} />
      </ScrollView>

      <Modal visible={showDeleteModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={[styles.modalTitle, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>DELETE POST</Text>
            <Text style={styles.modalMsg}>Are you sure you want to delete this post? This cannot be undone.</Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowDeleteModal(false)} activeOpacity={0.85}>
                <Text style={[styles.modalCancelText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>KEEP IT</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalDeleteBtn} onPress={handleDelete} disabled={deleteLoading} activeOpacity={0.85}>
                <Text style={[styles.modalDeleteText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>{deleteLoading ? 'DELETING...' : 'DELETE'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Report Reason Modal */}
      <Modal visible={showReportModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={[styles.modalTitle, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>REPORT POST</Text>
            <Text style={styles.modalMsg}>Why are you reporting this post?</Text>
            {REPORT_REASONS.map(reason => (
              <TouchableOpacity
                key={reason}
                style={styles.reportReasonBtn}
                onPress={() => handleReport(reason)}
                disabled={reportSubmitting}
                activeOpacity={0.8}
              >
                <Text style={[styles.reportReasonText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>{reason}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.modalCancelBtnFull} onPress={() => setShowReportModal(false)} disabled={reportSubmitting}>
              <Text style={[styles.modalCancelText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>CANCEL</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Report Confirmation Modal */}
      <Modal visible={showReportConfirm} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={[styles.modalTitle, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>REPORT SUBMITTED</Text>
            <Text style={styles.modalMsg}>Thanks for letting us know. Our team will review this post.</Text>
            <TouchableOpacity style={styles.modalOkBtn} onPress={() => setShowReportConfirm(false)}>
              <Text style={[styles.modalOkText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5ede0' },
  headerBlock: { paddingTop: 60, paddingBottom: 24, paddingHorizontal: 20 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  back: {},
  backText: { fontSize: 16, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
  reportBtn: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  reportBtnText: { color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '600' },
  heroInner: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatarLarge: { width: 72, height: 72, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarLargeText: { color: '#fff', fontSize: 24, fontWeight: '900' },
  heroInfo: { flex: 1 },
  heroName: { color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: 1, marginBottom: 8 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badgeRow2: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badge: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  scroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 48 },
  section: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e8e8e8', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  sectionLabel: { fontSize: 10, fontWeight: '700', color: '#a0b8b8', letterSpacing: 2, marginBottom: 8 },
  descriptionText: { fontSize: 14, color: '#555', lineHeight: 22 },
  infoCard: { backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e8e8e8', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  infoLabel: { fontSize: 13, color: '#a0b8b8', fontWeight: '500' },
  infoValue: { fontSize: 13, color: '#111', fontWeight: '600' },
  tappableLinkRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  tappableLink: { color: '#008080', textDecorationLine: 'underline' },
  hiddenContactNote: { fontSize: 13, color: '#a0b8b8', fontStyle: 'italic' },
  posterCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 14, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#e8e8e8' },
  posterPhoto: { width: 40, height: 40, borderRadius: 20 },
  posterAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  posterAvatarText: { color: '#fff', fontSize: 14, fontWeight: '900' },
  posterLabel: { fontSize: 10, color: '#a0b8b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  posterName: { fontSize: 14, color: '#003333', letterSpacing: 0.5 },
  postedDate: { fontSize: 11, color: '#a0b8b8', marginLeft: 'auto' },
  messageBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 14, paddingVertical: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  messageBtnText: { color: '#fff', fontSize: 18, letterSpacing: 1 },
  ownerActions: { gap: 10 },
  editBtn: { backgroundColor: '#008080', borderRadius: 12, paddingVertical: 16, alignItems: 'center', shadowColor: '#008080', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  editBtnText: { color: '#fff', fontSize: 18, letterSpacing: 1 },
  deleteBtn: { backgroundColor: '#1a1a2e', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  deleteBtnText: { color: '#fff', fontSize: 18, letterSpacing: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  modalBox: { backgroundColor: '#f5ede0', borderRadius: 24, padding: 28, alignItems: 'center', width: '100%', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 16, elevation: 8 },
  modalTitle: { fontSize: 26, color: '#1a1a2e', letterSpacing: 2, marginBottom: 12, textAlign: 'center' },
  modalMsg: { fontSize: 15, color: '#555', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  modalBtns: { flexDirection: 'row', gap: 12, width: '100%' },
  modalCancelBtn: { flex: 1, backgroundColor: '#fff', borderRadius: 14, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: '#e0d8c8' },
  modalCancelBtnFull: { width: '100%', backgroundColor: '#fff', borderRadius: 14, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: '#e0d8c8', marginTop: 4 },
  modalCancelText: { fontSize: 16, color: '#555', letterSpacing: 1 },
  modalDeleteBtn: { flex: 1, backgroundColor: '#1a1a2e', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  modalDeleteText: { color: '#fff', fontSize: 16, letterSpacing: 1 },
  reportReasonBtn: { width: '100%', backgroundColor: '#fff', borderRadius: 14, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: '#e0d8c8', marginBottom: 8 },
  reportReasonText: { fontSize: 15, color: '#003333', letterSpacing: 0.5 },
  modalOkBtn: { width: '100%', backgroundColor: '#008080', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  modalOkText: { fontSize: 15, color: '#fff', letterSpacing: 1 },
});