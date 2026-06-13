import { Rajdhani_700Bold, useFonts } from '@expo-google-fonts/rajdhani';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, collection, deleteDoc, doc, getDoc, increment, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Image, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { auth, db } from '../firebaseConfig';

function timeAgo(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (days > 0) return `${days}d ago`;
  if (hrs > 0) return `${hrs}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return 'just now';
}

async function sendPush(token: string, title: string, body: string) {
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: token, title, body, sound: 'default' }),
    });
  } catch (e) { console.log('Push error:', e); }
}

const REPORT_REASONS = ['Spam', 'Scam or Fraud', 'Offensive Content', 'Harassment', 'Other'];

export default function CommunityPostScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [fontsLoaded] = useFonts({ Rajdhani_700Bold });
  const [post, setPost] = useState<any>(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
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
      const snap = await getDoc(doc(db, 'community', id as string));
      if (snap.exists()) setPost({ id: snap.id, ...snap.data() });
    };
    load();
    const q = query(collection(db, 'community', id as string, 'comments'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setComments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const handleComment = async () => {
    if (!commentText.trim() || !user) return;
    setSubmitting(true);
    try {
      const userSnap = await getDoc(doc(db, 'users', user.uid));
      const username = userSnap.exists() ? (userSnap.data().username || '') : '';
      const initials = username ? username.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() : '??';

      await addDoc(collection(db, 'community', id as string, 'comments'), {
        body: commentText.trim(), authorName: username, authorInitials: initials, authorId: user.uid, createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'community', id as string), { commentCount: increment(1) });

      // Item 4 — notify post author when someone comments (not if they comment on their own post)
      if (post?.authorId && post.authorId !== user.uid) {
        await addDoc(collection(db, 'notifications'), {
          toUserId: post.authorId,
          message: `${username} commented on your post`,
          body: commentText.trim().slice(0, 80),
          link: `/community-post?id=${id}`,
          createdAt: serverTimestamp(),
          read: false,
        });
        const authorSnap = await getDoc(doc(db, 'users', post.authorId));
        if (authorSnap.exists() && authorSnap.data().pushToken) {
          await sendPush(authorSnap.data().pushToken, `💬 ${username} commented`, commentText.trim().slice(0, 80));
        }
      }

      setCommentText('');
    } catch (e: any) { console.log(e); }
    setSubmitting(false);
  };

  const handleReply = async (commentId: string, commentAuthorId: string, commentAuthorName: string) => {
    if (!replyText.trim() || !user) return;
    try {
      const userSnap = await getDoc(doc(db, 'users', user.uid));
      const username = userSnap.exists() ? (userSnap.data().username || '') : '';
      const initials = username ? username.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() : '??';

      await addDoc(collection(db, 'community', id as string, 'comments', commentId, 'replies'), {
        body: replyText.trim(), authorName: username, authorInitials: initials, authorId: user.uid, createdAt: serverTimestamp(),
      });

      // Item 5 — notify commenter when someone replies (not if replying to yourself)
      if (commentAuthorId && commentAuthorId !== user.uid) {
        await addDoc(collection(db, 'notifications'), {
          toUserId: commentAuthorId,
          message: `${username} replied to your comment`,
          body: replyText.trim().slice(0, 80),
          link: `/community-post?id=${id}`,
          createdAt: serverTimestamp(),
          read: false,
        });
        const commenterSnap = await getDoc(doc(db, 'users', commentAuthorId));
        if (commenterSnap.exists() && commenterSnap.data().pushToken) {
          await sendPush(commenterSnap.data().pushToken, `↩️ ${username} replied`, replyText.trim().slice(0, 80));
        }
      }

      setReplyText('');
      setReplyingTo(null);
    } catch (e: any) { console.log(e); }
  };

  const confirmDelete = async () => {
    setDeleteLoading(true);
    try {
      await deleteDoc(doc(db, 'community', id as string));
      router.replace('/(tabs)/community');
    } catch (e: any) { console.log(e); }
    setDeleteLoading(false);
  };

  const handleMessage = () => {
    if (!post?.authorId) return;
    const listingLabel = post.title || post.body?.slice(0, 60) || 'your listing';
    const prefilledMessage = `Hi, I'm interested in your listing: "${listingLabel}"`;
    router.push({
      pathname: '/start-dm',
      params: {
        recipientId: post.authorId,
        recipientName: post.authorName || 'Seller',
        prefillMessage: prefilledMessage,
      },
    });
  };

  const handleReport = async (reason: string) => {
    if (!user || !post) return;
    setReportSubmitting(true);
    try {
      await addDoc(collection(db, 'reports'), {
        postId: id as string,
        postType: 'community',
        postAuthorId: post.authorId || null,
        postSnapshot: {
          title: post.title || null,
          body: post.body || null,
          type: post.type || null,
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

  if (!post) return null;
  const isSale = post.type === 'Sale';
  const isOwner = user?.uid === post.authorId;
  const ago = post.createdAt?.seconds ? timeAgo(Math.floor(Date.now() / 1000) - post.createdAt.seconds) : '';
  const avatarColor = isSale ? '#7A1E1E' : '#008080';
  const badgeBg = isSale ? 'rgba(122,30,30,0.1)' : 'rgba(0,128,128,0.1)';
  const badgeColor = isSale ? '#7A1E1E' : '#008080';

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>
        <View style={styles.topRow}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          {isOwner ? (
            <TouchableOpacity onPress={() => setShowDeleteModal(true)} style={styles.deleteBtn}>
              <Text style={styles.deleteBtnText}>Delete Post</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => setShowReportModal(true)} style={styles.reportBtn}>
              <Text style={styles.reportBtnText}>Report</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.postCard}>
            <View style={styles.postTop}>
              <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
                <Text style={[styles.avatarText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>{post.authorInitials || '??'}</Text>
              </View>
              <View style={styles.postMeta}>
                <Text style={[styles.postAuthor, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>
                  {post.authorName ? post.authorName.toUpperCase() : 'ANONYMOUS'}
                </Text>
                <Text style={styles.postTime}>{ago}</Text>
              </View>
              <View style={[styles.typeBadge, { backgroundColor: badgeBg }]}>
                <Text style={[styles.typeBadgeText, { color: badgeColor }]}>{isSale ? 'For Sale' : 'Question'}</Text>
              </View>
            </View>
            {post.title ? <Text style={[styles.postTitle, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>{post.title}</Text> : null}
            <Text style={styles.postBody}>{post.body}</Text>
            {post.imageUrl ? <Image source={{ uri: post.imageUrl }} style={styles.postImage} /> : null}
            {isSale && post.price ? <Text style={styles.postPrice}>{post.price}</Text> : null}

            {isSale && !isOwner && post.authorId ? (
              <TouchableOpacity style={styles.messageBtn} onPress={handleMessage} activeOpacity={0.85}>
                <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" style={{ marginRight: 8 }}>
                  <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
                <Text style={[styles.messageBtnText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>MESSAGE SELLER</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <Text style={styles.commentsHeader}>{comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}</Text>

          {comments.map((c: any) => {
            const cAgo = c.createdAt?.seconds ? timeAgo(Math.floor(Date.now() / 1000) - c.createdAt.seconds) : '';
            return (
              <View key={c.id} style={styles.commentCard}>
                <View style={styles.commentTop}>
                  <View style={styles.commentAvatar}>
                    <Text style={[styles.commentAvatarText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>{c.authorInitials || '??'}</Text>
                  </View>
                  <View style={styles.commentMeta}>
                    <Text style={[styles.commentAuthor, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>{c.authorName ? c.authorName.toUpperCase() : 'ANONYMOUS'}</Text>
                    <Text style={styles.commentTime}>{cAgo}</Text>
                  </View>
                </View>
                <Text style={styles.commentBody}>{c.body}</Text>
                <TouchableOpacity onPress={() => setReplyingTo(replyingTo === c.id ? null : c.id)}>
                  <Text style={styles.replyBtn}>Reply</Text>
                </TouchableOpacity>
                {replyingTo === c.id && (
                  <View style={styles.replyInput}>
                    <TextInput
                      style={styles.replyTextInput}
                      placeholder="Write a reply..."
                      placeholderTextColor="#a0b8b8"
                      value={replyText}
                      onChangeText={setReplyText}
                      autoFocus
                    />
                    <TouchableOpacity
                      style={styles.replySendBtn}
                      onPress={() => handleReply(c.id, c.authorId, c.authorName)}
                    >
                      <Text style={styles.replySendText}>Send</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
          <View style={{ height: 20 }} />
        </ScrollView>

        <View style={styles.commentInputRow}>
          <TextInput
            style={styles.commentInput}
            placeholder="Write a comment..."
            placeholderTextColor="#a0b8b8"
            value={commentText}
            onChangeText={setCommentText}
          />
          <TouchableOpacity
            style={[styles.sendBtn, !commentText.trim() && styles.sendBtnDisabled]}
            onPress={handleComment}
            disabled={submitting || !commentText.trim()}
          >
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
              <Path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={showDeleteModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={[styles.modalTitle, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>DELETE POST</Text>
            <Text style={styles.modalMsg}>Are you sure you want to delete this post? This cannot be undone.</Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowDeleteModal(false)} activeOpacity={0.85}>
                <Text style={[styles.modalCancelText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>KEEP IT</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalDeleteBtn} onPress={confirmDelete} disabled={deleteLoading} activeOpacity={0.85}>
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5ede0', paddingTop: 60 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 8 },
  backText: { fontSize: 16, color: '#008080', fontWeight: '600' },
  deleteBtn: { backgroundColor: '#1a1a2e', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  deleteBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  reportBtn: { backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: '#e0d8c8' },
  reportBtnText: { color: '#999', fontSize: 13, fontWeight: '600' },
  scroll: { paddingHorizontal: 16, paddingBottom: 20 },
  postCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e8e8e8', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  postTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  avatar: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  postMeta: { flex: 1 },
  postAuthor: { fontSize: 15, fontWeight: '700', color: '#111', letterSpacing: 0.5 },
  postTime: { fontSize: 11, color: '#aaa', marginTop: 1 },
  typeBadge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  typeBadgeText: { fontSize: 10, fontWeight: '600' },
  postTitle: { fontSize: 18, color: '#111', marginBottom: 8 },
  postBody: { fontSize: 14, color: '#444', lineHeight: 22 },
 postImage: { width: '100%', height: 280, borderRadius: 12, marginTop: 12, resizeMode: 'contain', backgroundColor: '#f5ede0' },
  postPrice: { fontSize: 18, fontWeight: '900', color: '#7A1E1E', marginTop: 12 },
  messageBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#7A1E1E', borderRadius: 12, paddingVertical: 14, marginTop: 14 },
  messageBtnText: { color: '#fff', fontSize: 16, letterSpacing: 1 },
  commentsHeader: { fontSize: 13, fontWeight: '700', color: '#a0b8b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  commentCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#e8e8e8' },
  commentTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  commentAvatar: { width: 34, height: 34, borderRadius: 9, backgroundColor: '#008080', alignItems: 'center', justifyContent: 'center' },
  commentAvatarText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  commentMeta: { flex: 1 },
  commentAuthor: { fontSize: 13, fontWeight: '700', color: '#111', letterSpacing: 0.5 },
  commentTime: { fontSize: 11, color: '#aaa' },
  commentBody: { fontSize: 13, color: '#555', lineHeight: 19, marginBottom: 6 },
  replyBtn: { fontSize: 12, color: '#008080', fontWeight: '600' },
  replyInput: { flexDirection: 'row', gap: 8, marginTop: 8, alignItems: 'center' },
  replyTextInput: { flex: 1, backgroundColor: '#f5ede0', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: '#003333', borderWidth: 1, borderColor: '#e8e8e8' },
  replySendBtn: { backgroundColor: '#008080', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  replySendText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  commentInputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  commentInput: { flex: 1, backgroundColor: '#f5ede0', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: '#003333', borderWidth: 1, borderColor: '#e8e8e8' },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#008080', alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: '#a0b8b8' },
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