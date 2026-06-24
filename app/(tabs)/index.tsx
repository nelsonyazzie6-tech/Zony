import { Rajdhani_700Bold, useFonts } from '@expo-google-fonts/rajdhani';
import { useRouter } from 'expo-router';
import { collection, deleteDoc, doc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { auth, db } from '../../firebaseConfig';

const sportOptions = [
  { label: 'All Sports', value: 'All' },
  { label: 'Basketball', value: 'Basketball' },
  { label: 'Volleyball', value: 'Volleyball' },
  { label: 'Softball', value: 'Softball' },
];

const states = ['All States', 'AZ', 'NM', 'CO', 'UT', 'TX', 'CA', 'NV', 'OK', 'AL', 'AK', 'AR', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NH', 'NJ', 'NY', 'NC', 'ND', 'OH', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'];

function getSportColor(sport: string) {
  if (sport === 'Basketball') return '#008080';
  if (sport === 'Volleyball') return '#7A1E1E';
  if (sport === 'Softball') return '#B8860B';
  return '#008080';
}

function simplifyDivisions(divisions: string[]): string {
  const groups = ['6U', '8U', '10U', '12U', '14U', '16U', '18U', 'HS'];
  const result: string[] = [];
  const adultDivisions = divisions.filter(d => d.startsWith('Adult'));
  const groupDivisions = divisions.filter(d => !d.startsWith('Adult'));
  groups.forEach(g => {
    const hasBoys = groupDivisions.includes(`${g} Boys`);
    const hasGirls = groupDivisions.includes(`${g} Girls`);
    const hasCoed = groupDivisions.includes(`${g} Coed`);
    if (hasBoys && hasGirls) { result.push(g); }
    else if (hasBoys) { result.push(`${g} Boys`); }
    else if (hasGirls) { result.push(`${g} Girls`); }
    else if (hasCoed) { result.push(`${g} Coed`); }
  });
  if (adultDivisions.length === 1) { result.push(adultDivisions[0]); }
  else if (adultDivisions.length > 1) { result.push('Adults'); }
  return result.join(', ');
}

function BellIcon({ color, hasNew }: { color: string; hasNew: boolean }) {
  return (
    <View>
      <Svg width="28" height="28" viewBox="0 0 22 22" fill="none">
        <Path d="M11 2a6 6 0 0 1 6 6v4l2 3H3l2-3V8a6 6 0 0 1 6-6Z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
        <Path d="M9 17a2 2 0 0 0 4 0" stroke={color} strokeWidth="1.5" />
      </Svg>
      {hasNew && <View style={styles.bellDot} />}
    </View>
  );
}

function MessageIcon({ color, hasNew }: { color: string; hasNew: boolean }) {
  return (
    <View>
      <Svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
      {hasNew && <View style={styles.bellDot} />}
    </View>
  );
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

function NotiTrophyIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M8 3h8v8a4 4 0 0 1-8 0V3Z" stroke="#008080" strokeWidth="1.8" strokeLinejoin="round" />
      <Path d="M8 6H5a2 2 0 0 0 0 4h3M16 6h3a2 2 0 0 1 0 4h-3" stroke="#008080" strokeWidth="1.8" strokeLinecap="round" />
      <Path d="M12 15v4M9 21h6" stroke="#008080" strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}

function CalendarIcon({ size = 14, color = '#5a5a5a' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Rect x="3" y="4" width="18" height="18" rx="2" />
      <Line x1="16" y1="2" x2="16" y2="6" />
      <Line x1="8" y1="2" x2="8" y2="6" />
      <Line x1="3" y1="10" x2="21" y2="10" />
    </Svg>
  );
}

function LocationIcon({ size = 14, color = '#5a5a5a' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 1 1 18 0z" />
      <Circle cx="12" cy="10" r="3" />
    </Svg>
  );
}

function PersonIcon({ size = 13, color = '#008080' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="12" cy="8" r="4" />
      <Path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
    </Svg>
  );
}

function XIcon({ size = 12, color = '#ccc' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Line x1="18" y1="6" x2="6" y2="18" />
      <Line x1="6" y1="6" x2="18" y2="18" />
    </Svg>
  );
}

function WarningIcon({ size = 32, color = '#cc4444' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Path d="m12 2 10 18H2L12 2z" />
      <Line x1="12" y1="9" x2="12" y2="13" />
      <Line x1="12" y1="17" x2="12" y2="17" />
    </Svg>
  );
}

export default function HomeScreen() {
  const [sport, setSport] = useState('All');
  const [showSportPicker, setShowSportPicker] = useState(false);
  const [stateFilter, setStateFilter] = useState('All States');
  const [showStatePicker, setShowStatePicker] = useState(false);
  const [search, setSearch] = useState('');
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasNewNotifications, setHasNewNotifications] = useState(false);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [canceledNotiModal, setCanceledNotiModal] = useState<{ visible: boolean; tournamentName: string; organizerName: string; organizerPhone: string }>({
    visible: false, tournamentName: '', organizerName: '', organizerPhone: '',
  });
  const router = useRouter();
  const user = auth.currentUser;
  const [fontsLoaded] = useFonts({ Rajdhani_700Bold });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'tournaments'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTournaments(data);
      setLoading(false);
    }, () => { setLoading(false); });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'notifications'), where('toUserId', '==', user.uid));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a: any, b: any) => b.createdAt?.seconds - a.createdAt?.seconds);
      setNotifications(data);
      setHasNewNotifications(data.some((n: any) => !n.read));
    }, () => {});
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'messages'), where('participants', 'array-contains', user.uid));
    const unsub = onSnapshot(q, (snap) => {
      const hasUnread = snap.docs.some(d => {
        const data = d.data();
        return (data.unreadCount?.[user.uid] || 0) > 0;
      });
      setHasUnreadMessages(hasUnread);
    }, () => {});
    return () => unsub();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await Promise.all(
        notifications.filter((n: any) => !n.read).map((n: any) =>
          updateDoc(doc(db, 'notifications', n.id), { read: true })
        )
      );
    } catch (_) {}
  };

  const handleDeleteNotification = async (id: string) => {
    try { await deleteDoc(doc(db, 'notifications', id)); } catch (_) {}
  };

  const handleClearAllNotifications = async () => {
    try {
      await Promise.all(notifications.map((n: any) => deleteDoc(doc(db, 'notifications', n.id))));
    } catch (_) {}
  };

  const handleNotificationPress = async (n: any) => {
    try {
      if (!n.read) await updateDoc(doc(db, 'notifications', n.id), { read: true });
    } catch (_) {}

    const isCanceled = n.message?.includes('canceled by the organizer');
    if (isCanceled) {
      const match = n.message?.match(/^[^\w]*(.+?) has been canceled by the organizer/);
      const tournamentName = match?.[1] || 'This tournament';
      setShowNotifications(false);
      setCanceledNotiModal({ visible: true, tournamentName, organizerName: n.organizerName || '', organizerPhone: n.organizerPhone || '' });
      return;
    }
    setShowNotifications(false);
    if (n.link) { router.push(n.link as any); } else { router.push('/'); }
  };

  const sportLabel = sportOptions.find(o => o.value === sport)?.label || 'All Sports';

  const filtered = tournaments
    .filter((t: any) => t.status !== 'canceled')
    .filter((t: any) => sport === 'All' || t.sport === sport)
    .filter((t: any) => stateFilter === 'All States' || t.state === stateFilter)
    .filter((t: any) =>
      t.name?.toLowerCase().includes(search.toLowerCase()) ||
      t.city?.toLowerCase().includes(search.toLowerCase()) ||
      t.state?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a: any, b: any) => {
      const dateA = a.startDateValue?.toMillis?.() ?? new Date(a.date?.split(' - ')[0] || 0).getTime();
      const dateB = b.startDateValue?.toMillis?.() ?? new Date(b.date?.split(' - ')[0] || 0).getTime();
      return dateA - dateB;
    });

  const hasActiveFilters = sport !== 'All' || stateFilter !== 'All States' || search.trim() !== '';

  return (
    <View style={styles.container}>

      {/* Plain beige header — no color block */}
      <View style={styles.headerBlock}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.bellBtn} onPress={() => setShowNotifications(true)}>
            <BellIcon color="#008080" hasNew={hasNewNotifications} />
          </TouchableOpacity>
          <Text style={[styles.header, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>ZONY</Text>
          <TouchableOpacity style={styles.msgBtn} onPress={() => router.push('/messages')}>
            <MessageIcon color="#008080" hasNew={hasUnreadMessages} />
          </TouchableOpacity>
        </View>
        <Text style={[styles.sub, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>Tournaments near you</Text>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.search}
          placeholder="Search by name or city..."
          placeholderTextColor="#a0b8b8"
          value={search}
          onChangeText={setSearch}
        />
        <TouchableOpacity style={styles.stateBtn} onPress={() => setShowStatePicker(true)}>
          {stateFilter === 'All States' ? (
            <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <Path d="M12 2a10 10 0 100 20A10 10 0 0012 2z" stroke="#008080" strokeWidth="1.5" />
              <Path d="M2 12h20" stroke="#008080" strokeWidth="1.5" />
              <Path d="M12 2a15 15 0 010 20M12 2a15 15 0 000 20" stroke="#008080" strokeWidth="1.5" />
              <Path d="M4.5 7h15M4.5 17h15" stroke="#008080" strokeWidth="1" opacity={0.6} />
            </Svg>
          ) : <Text style={styles.stateBtnText}>{stateFilter}</Text>}
        </TouchableOpacity>
      </View>

      <View style={styles.filterRow}>
        <View style={styles.dropdownWrapper}>
          <TouchableOpacity style={styles.dropdownSelect} onPress={() => setShowSportPicker(!showSportPicker)}>
            <Text style={styles.dropdownSelectText}>{sportLabel}</Text>
            <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
              <Path d="M2 4l4 4 4-4" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </TouchableOpacity>
          {showSportPicker && (
            <View style={styles.inlineMenu}>
              {sportOptions.map(o => (
                <TouchableOpacity
                  key={o.value}
                  style={[styles.dropdownMenuItem, sport === o.value && styles.dropdownMenuItemActive]}
                  onPress={() => { setSport(o.value); setShowSportPicker(false); }}
                >
                  <Text style={[styles.dropdownMenuText, sport === o.value && styles.dropdownMenuTextActive]}>{o.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#7A1E1E" style={{ marginTop: 60 }} />
      ) : filtered.length === 0 ? (
        <View style={styles.emptyContainer}>
          <SadFace />
          <Text style={styles.emptyTitle}>
            {hasActiveFilters ? 'No tournaments match your filters' : 'No tournaments yet'}
          </Text>
          <Text style={styles.emptySub}>
            {hasActiveFilters ? 'Try adjusting your search or filters.' : 'Be the first to post one in your area.'}
          </Text>
          {hasActiveFilters && (
            <TouchableOpacity style={styles.clearFiltersBtn} onPress={() => { setSport('All'); setStateFilter('All States'); setSearch(''); }}>
              <Text style={styles.clearFiltersBtnText}>Clear Filters</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(t: any) => t.id}
          contentContainerStyle={styles.list}
          renderItem={({ item: t }: any) => {
            const sportColor = getSportColor(t.sport);
            const organizerInitials = t.organizerName
              ? t.organizerName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
              : '?';
            const hasDivisions = t.divisions?.length > 0;
            return (
              <TouchableOpacity
                style={styles.card}
                onPress={() => router.push({ pathname: '/tournament', params: { id: t.id, postedBy: t.postedBy } })}
              >
                <View style={[styles.cardHeader, { backgroundColor: sportColor }]}>
                  <Text style={[styles.name, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>{t.name}</Text>
                  <Text style={[styles.sportBadge, { color: sportColor }]}>{t.sport}</Text>
                </View>
                <View style={styles.cardBody}>
                  <View style={styles.detailRow}>
                    <CalendarIcon size={14} color={sportColor} />
                    <Text style={[styles.dateText, { color: sportColor }]}>{t.date}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <LocationIcon size={14} color="#5a5a5a" />
                    <Text style={styles.detail}>{t.city}, {t.state}</Text>
                  </View>
                  {hasDivisions ? (
                    <View style={styles.divisionsRow}>
                      <View style={styles.detailRow}>
                        <PersonIcon size={14} color="#5a5a5a" />
                        <Text style={styles.divisionsText}>{simplifyDivisions(t.divisions)}</Text>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.spotsRow}>
                      <View style={[styles.spotsBadge, { backgroundColor: `${sportColor}1A`, borderColor: sportColor }]}>
                        <Text style={[styles.spots, { color: sportColor }]}>{t.spots} spots left</Text>
                      </View>
                    </View>
                  )}
                  {t.tournamentFormat && (
                    <View style={[styles.formatBadge, { backgroundColor: `${sportColor}18` }]}>
                      <Text style={[styles.formatBadgeText, { color: sportColor }]}>
                        {t.tournamentFormat === 'double' ? 'DOUBLE ELIMINATION' : 'SINGLE ELIMINATION'}
                      </Text>
                    </View>
                  )}
                  {t.organizerName ? (
                    <View style={styles.organizerRow}>
                      {t.organizerPhoto ? (
                        <Image source={{ uri: t.organizerPhoto }} style={styles.organizerPhoto} />
                      ) : (
                        <View style={[styles.organizerAvatar, { backgroundColor: sportColor }]}>
                          <Text style={styles.organizerAvatarText}>{organizerInitials}</Text>
                        </View>
                      )}
                      <Text style={styles.organizerName}>by {t.organizerName}</Text>
                    </View>
                  ) : null}
                  <Text style={styles.viewMoreHint}>View card for more details</Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      <Modal visible={showStatePicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Filter by State</Text>
            <ScrollView>
              {states.map(s => (
                <TouchableOpacity key={s} style={styles.modalItem} onPress={() => { setStateFilter(s); setShowStatePicker(false); }}>
                  <Text style={[styles.modalItemText, stateFilter === s && styles.modalItemActive]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.modalClose} onPress={() => setShowStatePicker(false)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showNotifications} transparent animationType="slide">
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={styles.sheetBackdrop} onPress={() => setShowNotifications(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>NOTIFICATIONS</Text>
              <View style={styles.sheetHeaderRight}>
                <TouchableOpacity onPress={handleMarkAllRead}>
                  <Text style={styles.markAllRead}>Mark all read</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowNotifications(false)} style={{ marginLeft: 16 }}>
                  <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
                    <Path d="M14 4L4 14M4 4l10 10" stroke="#111" strokeWidth="1.5" strokeLinecap="round" />
                  </Svg>
                </TouchableOpacity>
              </View>
            </View>
            {notifications.length === 0 ? (
              <View style={styles.sheetEmpty}>
                <SadFace />
                <Text style={styles.sheetEmptyTitle}>No notifications yet</Text>
                <Text style={styles.sheetEmptySub}>You'll see activity here when someone joins your tournament.</Text>
              </View>
            ) : (
              <FlatList
                data={notifications}
                keyExtractor={(n: any) => n.id}
                contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8 }}
                renderItem={({ item: n }: any) => {
                  const isRead = n.read === true;
                  const isCanceled = n.message?.includes('canceled by the organizer');
                  const parts = n.message?.match(/^(.+?) registered (.+?) into (.+?)!$/);
                  const contactName = parts?.[1] || '';
                  const teamName = parts?.[2] || '';
                  const tournamentName = parts?.[3] || '';
                  return (
                    <TouchableOpacity
                      style={[styles.notiCard, isRead && styles.notiCardRead, isCanceled && styles.notiCardCanceled]}
                      onPress={() => handleNotificationPress(n)}
                    >
                      <View style={[styles.notiIcon, isCanceled && styles.notiIconCanceled]}>
                        {isCanceled ? <WarningIcon size={20} color="#cc4444" /> : <NotiTrophyIcon />}
                      </View>
                      <View style={styles.notiContent}>
                        <View style={styles.notiTopRow}>
                          <Text style={[styles.notiTeamName, isRead && styles.notiMessageRead, isCanceled && styles.notiCanceledText]} numberOfLines={3}>
                            {parts ? `${contactName} registered ${teamName} into ${tournamentName}!` : n.message}
                          </Text>
                          <Text style={styles.notiTime}>{n.createdAt?.toDate?.()?.toLocaleDateString()}</Text>
                        </View>
                        {isCanceled && <Text style={styles.notiCanceledHint}>Tap for next steps</Text>}
                      </View>
                      {!isRead && <View style={styles.notiDot} />}
                      <TouchableOpacity onPress={() => handleDeleteNotification(n.id)} style={styles.notiDelete}>
                        <XIcon size={12} color="#ccc" />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  );
                }}
                ListFooterComponent={
                  <TouchableOpacity style={styles.clearAllNotisBtn} onPress={handleClearAllNotifications}>
                    <Text style={styles.clearAllNotisText}>Clear All</Text>
                  </TouchableOpacity>
                }
              />
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={canceledNotiModal.visible} animationType="fade" transparent>
        <View style={styles.canceledModalOverlay}>
          <View style={styles.canceledModalBox}>
            <WarningIcon size={40} color="#cc4444" />
            <Text style={[styles.canceledModalTitle, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>EVENT CANCELED</Text>
            <Text style={styles.canceledModalName}>{canceledNotiModal.tournamentName}</Text>
            <Text style={styles.canceledModalMsg}>
              This event has been canceled by the organizer. We recommend reaching out to them directly for information about next steps — such as refunds, rescheduling, or alternative events.
            </Text>
            <View style={styles.canceledModalSteps}>
              <Text style={styles.canceledModalStepTitle}>Contact Organizer for Details</Text>
              {canceledNotiModal.organizerName ? <Text style={styles.canceledModalContactLine}>{canceledNotiModal.organizerName}</Text> : null}
              {canceledNotiModal.organizerPhone ? <Text style={styles.canceledModalContactLine}>{canceledNotiModal.organizerPhone}</Text> : null}
              {!canceledNotiModal.organizerName && !canceledNotiModal.organizerPhone ? (
                <Text style={styles.canceledModalContactLine}>No contact info available. Try the Messages tab.</Text>
              ) : null}
            </View>
            <TouchableOpacity
              style={styles.canceledModalBtn}
              onPress={() => setCanceledNotiModal({ visible: false, tournamentName: '', organizerName: '', organizerPhone: '' })}
            >
              <Text style={[styles.canceledModalBtnText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>CONFIRM</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5ede0' },
  headerBlock: { paddingTop: 60, paddingBottom: 12, paddingHorizontal: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  header: { fontSize: 42, fontWeight: '900', color: '#003333', textAlign: 'center', letterSpacing: 6 },
  bellBtn: { padding: 4 },
  msgBtn: { padding: 4 },
  bellDot: { position: 'absolute', top: 0, right: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: '#FF4444', borderWidth: 1.5, borderColor: '#fff' },
  sub: { fontSize: 14, color: '#a0b8b8', textAlign: 'center', letterSpacing: 2 },
  searchRow: { flexDirection: 'row', marginHorizontal: 20, gap: 8, marginBottom: 10, marginTop: 14 },
  search: { flex: 1, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: '#003333', borderWidth: 1, borderColor: '#e0d8c8' },
  stateBtn: { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14, justifyContent: 'center', alignItems: 'center', minWidth: 44, borderWidth: 1, borderColor: '#e0d8c8' },
  stateBtnText: { fontSize: 14, color: '#008080', fontWeight: '600' },
  filterRow: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 8, zIndex: 999 },
  dropdownWrapper: { zIndex: 999 },
  dropdownSelect: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#e0d8c8', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  dropdownSelectText: { fontSize: 13, color: '#555', fontWeight: '500' },
  inlineMenu: { position: 'absolute', top: 44, left: 0, right: 0, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e0d8c8', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, elevation: 10, zIndex: 1000 },
  dropdownMenuItem: { paddingVertical: 12, paddingHorizontal: 16 },
  dropdownMenuItemActive: { backgroundColor: '#f0fafa' },
  dropdownMenuText: { fontSize: 13, color: '#333' },
  dropdownMenuTextActive: { color: '#008080', fontWeight: '700' },
  list: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 20 },
  card: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#e0d8c8', elevation: 3, shadowColor: '#003333', shadowOpacity: 0.1, shadowRadius: 8 },
  cardCanceled: { opacity: 0.5 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10 },
  cardBody: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 12 },
  name: { fontSize: 17, fontWeight: 'bold', color: '#f5ede0', flex: 1, marginRight: 8, textTransform: 'uppercase', letterSpacing: 1.2 },
  sportBadge: { fontSize: 11, backgroundColor: '#f5ede0', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, overflow: 'hidden', fontWeight: 'bold' },
  formatBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginBottom: 8 },
  formatBadgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  detail: { fontSize: 14, color: '#5a5a5a' },
  dateText: { fontSize: 14, fontWeight: '700' },
  divisionsRow: { marginTop: 0 },
  divisionsText: { fontSize: 14, fontWeight: '400', color: '#5a5a5a' },
  spotsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  spotsBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, alignSelf: 'flex-start' },
  spots: { fontSize: 13, fontWeight: '900' },
  canceledBadge: { backgroundColor: '#7A1E1E', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  canceledBadgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  organizerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  organizerPhoto: { width: 20, height: 20, borderRadius: 10 },
  organizerAvatar: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  organizerAvatarText: { fontSize: 8, color: '#fff', fontWeight: 'bold' },
  organizerName: { fontSize: 11, color: '#a0b8b8', fontWeight: '500' },
  viewMoreHint: { fontSize: 11, color: '#c0c0c0', marginTop: 6, textAlign: 'center' },
  emptyContainer: { alignItems: 'center', marginTop: 60, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#a0b8b8', marginTop: 8 },
  emptySub: { fontSize: 14, color: '#a0b8b8', textAlign: 'center', paddingHorizontal: 40 },
  clearFiltersBtn: { marginTop: 8, backgroundColor: '#008080', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10 },
  clearFiltersBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#f5ede0', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '70%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#008080', marginBottom: 12, textAlign: 'center', letterSpacing: 1 },
  modalItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#e0d8c8' },
  modalItemText: { fontSize: 15, color: '#003333' },
  modalItemActive: { color: '#7A1E1E', fontWeight: 'bold' },
  modalClose: { backgroundColor: '#7A1E1E', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 12 },
  modalCloseText: { color: '#f5ede0', fontSize: 16, fontWeight: 'bold' },
  sheetOverlay: { flex: 1, justifyContent: 'flex-end' },
  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { backgroundColor: '#F5F0E8', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '78%' },
  sheetHandle: { width: 40, height: 4, backgroundColor: '#ccc', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 8 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.08)' },
  sheetTitle: { fontSize: 20, fontWeight: '900', color: '#111', letterSpacing: 2 },
  sheetHeaderRight: { flexDirection: 'row', alignItems: 'center' },
  markAllRead: { fontSize: 12, color: '#008080', fontWeight: '600' },
  sheetEmpty: { alignItems: 'center', marginTop: 60, gap: 10 },
  sheetEmptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#003333', marginBottom: 8 },
  sheetEmptySub: { fontSize: 14, color: '#a0b8b8', textAlign: 'center', paddingHorizontal: 40 },
  notiCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#fff', borderRadius: 16, padding: 12, marginBottom: 8, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  notiCardRead: { backgroundColor: 'transparent', shadowOpacity: 0, elevation: 0 },
  notiCardCanceled: { backgroundColor: '#fff5f5', borderWidth: 1, borderColor: '#ffcccc' },
  notiIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(0,128,128,0.1)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  notiIconCanceled: { backgroundColor: 'rgba(204,68,68,0.1)' },
  notiContent: { flex: 1 },
  notiTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  notiTeamName: { fontSize: 13, fontWeight: '700', color: '#111', flex: 1, lineHeight: 18 },
  notiMessageRead: { fontWeight: '500', color: '#666' },
  notiCanceledText: { color: '#cc4444' },
  notiCanceledHint: { fontSize: 11, color: '#cc4444', marginTop: 4, fontWeight: '600' },
  notiTime: { fontSize: 10, color: '#aaa', flexShrink: 0 },
  notiDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#8B1A1A', flexShrink: 0 },
  notiDelete: { padding: 4 },
  clearAllNotisBtn: { alignSelf: 'center', marginTop: 12, marginBottom: 8, paddingHorizontal: 20, paddingVertical: 10, opacity: 0.5 },
  clearAllNotisText: { fontSize: 13, color: '#bbb', fontWeight: '400' },
  notiDeleteText: { fontSize: 12, color: '#ccc' },
  canceledModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  canceledModalBox: { backgroundColor: '#f5ede0', borderRadius: 24, padding: 28, alignItems: 'center', width: '100%', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 16, elevation: 8 },
  canceledModalTitle: { fontSize: 26, color: '#cc4444', letterSpacing: 2, marginTop: 12, marginBottom: 4, textAlign: 'center' },
  canceledModalName: { fontSize: 16, fontWeight: '700', color: '#003333', marginBottom: 12, textAlign: 'center' },
  canceledModalMsg: { fontSize: 14, color: '#555', textAlign: 'center', lineHeight: 22, marginBottom: 16 },
  canceledModalSteps: { backgroundColor: '#fff', borderRadius: 14, padding: 16, width: '100%', marginBottom: 20, borderWidth: 1, borderColor: '#e0d8c8' },
  canceledModalStepTitle: { fontSize: 13, fontWeight: '700', color: '#003333', marginBottom: 10 },
  canceledModalStep: { fontSize: 13, color: '#555', lineHeight: 20, marginBottom: 6 },
  canceledModalContactLine: { fontSize: 14, color: '#003333', fontWeight: '700', marginBottom: 4 },
  canceledModalBtn: { backgroundColor: '#cc4444', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 40, alignItems: 'center' },
  canceledModalBtnText: { color: '#fff', fontSize: 18, letterSpacing: 1 },
});