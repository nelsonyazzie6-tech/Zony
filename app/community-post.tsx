import { Rajdhani_700Bold, useFonts } from '@expo-google-fonts/rajdhani';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, collection, doc, getDoc, increment, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
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
    if (!commentText.trim()) return;
    if (!user) { Alert.alert('Sign in required'); return; }
    setSubmitting(true);
    try {
      const userSnap = await getDoc(doc(db, 'users', user.uid));
      const username = userSnap.exists() ? (userSnap.data().username || user.email || 'Anonymous') : (user.email || 'Anonymous');
      await addDoc(collection(db, 'community', id as string, 'comments'), {
        body: commentText.trim(),
        authorName: username,
        authorInitials: username.slice(0, 2).toUpperCase(),
        authorId: user.uid,
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'community', id as string), { commentCount: increment(1) });
      setCommentText('');
    } catch (e: any) { Alert.alert('Error', e.message); }
    setSubmitting(false);
  };

  const handleReply = async (commentId: string) => {
    if (!replyText.trim()) return;
    if (!user) { Alert.alert('Sign in required'); return; }
    try {
      const userSnap = await getDoc(doc(db, 'users', user.uid));
      const username = userSnap.exists() ? (userSnap.data().username || user.email || 'Anonymous') : (user.email || 'Anonymous');
      await addDoc(collection(db, 'community', id as string, 'comments', commentId, 'replies'), {
        body: replyText.trim(),
        authorName: username,
        authorInitials: username.slice(0, 2).toUpperCase(),
        authorId: user.uid,
        createdAt: serverTimestamp(),
      });
      setReplyText('');
      setReplyingTo(null);
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  if (!post) return null;
  const isSale = post.type === 'Sale';
  const ago = post.createdAt?.seconds ? timeAgo(Math.floor(Date.now() / 1000) - post.createdAt.seconds) : '';

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>

        <View style={styles.topRow}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* Post */}
          <View style={styles.postCard}>
            <View style={styles.postTop}>
              <View style={[styles.avatar, { backgroundColor: isSale ? '#008080' : '#7A1E1E' }]}>
                <Text style={styles.avatarText}>{post.authorInitials || '??'}</Text>
              </View>
              <View style={styles.postMeta}>
                <Text style={styles.postAuthor}>{post.authorName}</Text>
                <Text style={styles.postTime}>{ago}</Text>
              </View>
              <View style={[styles.typeBadge, !isSale && styles.typeBadgeQuestion]}>
                <Text style={[styles.typeBadgeText, !isSale && styles.typeBadgeTextQuestion]}>
                  {isSale ? 'For Sale' : 'Question'}
                </Text>
              </View>
            </View>
            {post.title ? <Text style={[styles.postTitle, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>{post.title}</Text> : null}
            <Text style={styles.postBody}>{post.body}</Text>
            {post.imageUrl ? (
              <Image source={{ uri: post.imageUrl }} style={styles.postImage} />
            ) : null}
            {isSale && post.price ? (
              <Text style={styles.postPrice}>{post.price}</Text>
            ) : null}
          </View>

          {/* Comments */}
          <Text style={styles.commentsHeader}>
            {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
          </Text>

          {comments.map((c: any) => {
            const cAgo = c.createdAt?.seconds ? timeAgo(Math.floor(Date.now() / 1000) - c.createdAt.seconds) : '';
            return (
              <View key={c.id} style={styles.commentCard}>
                <View style={styles.commentTop}>
                  <View style={styles.commentAvatar}>
                    <Text style={styles.commentAvatarText}>{c.authorInitials || '??'}</Text>
                  </View>
                  <View style={styles.commentMeta}>
                    <Text style={styles.commentAuthor}>{c.authorName}</Text>
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
                    <TouchableOpacity style={styles.replySendBtn} onPress={() => handleReply(c.id)}>
                      <Text style={styles.replySendText}>Send</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}

          <View style={{ height: 20 }} />
        </ScrollView>

        {/* Comment input */}
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5ede0', paddingTop: 60 },
  topRow: { paddingHorizontal: 20, marginBottom: 8 },
  backText: { fontSize: 16, color: '#008080', fontWeight: '600' },
  scroll: { paddingHorizontal: 16, paddingBottom: 20 },
  postCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e8e8e8', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  postTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  postMeta: { flex: 1 },
  postAuthor: { fontSize: 14, fontWeight: '700', color: '#111' },
  postTime: { fontSize: 11, color: '#aaa', marginTop: 1 },
  typeBadge: { backgroundColor: 'rgba(0,128,128,0.1)', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  typeBadgeQuestion: { backgroundColor: 'rgba(122,30,30,0.1)' },
  typeBadgeText: { fontSize: 10, color: '#008080', fontWeight: '600' },
  typeBadgeTextQuestion: { color: '#7A1E1E' },
  postTitle: { fontSize: 18, color: '#111', marginBottom: 8 },
  postBody: { fontSize: 14, color: '#444', lineHeight: 22 },
  postImage: { width: '100%', height: 200, borderRadius: 12, marginTop: 12, resizeMode: 'cover' },
  postPrice: { fontSize: 18, fontWeight: '900', color: '#008080', marginTop: 12 },
  commentsHeader: { fontSize: 13, fontWeight: '700', color: '#a0b8b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  commentCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#e8e8e8' },
  commentTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  commentAvatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#008080', alignItems: 'center', justifyContent: 'center' },
  commentAvatarText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  commentMeta: { flex: 1 },
  commentAuthor: { fontSize: 13, fontWeight: '700', color: '#111' },
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
});