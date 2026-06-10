import { Rajdhani_700Bold, useFonts } from '@expo-google-fonts/rajdhani';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, collection, doc, getDoc, increment, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { auth, db } from '../firebaseConfig';

async function sendPushNotification(toToken: string, fromName: string, message: string) {
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: toToken,
        title: `Message from ${fromName}`,
        body: message.length > 60 ? message.slice(0, 60) + '...' : message,
        sound: 'default',
      }),
    });
  } catch (e) { console.log('Push error:', e); }
}

export default function ChatScreen() {
  const { threadId, otherName } = useLocalSearchParams();
  const router = useRouter();
  const [fontsLoaded] = useFonts({ Rajdhani_700Bold });
  const [messages, setMessages] = useState([]);
  const [thread, setThread] = useState<any>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [otherIsViewing, setOtherIsViewing] = useState(false);
  const flatRef = useRef<FlatList>(null);
  const user = auth.currentUser;

  useEffect(() => {
    if (!threadId || !user) return;
    const threadRef = doc(db, 'messages', threadId as string);

    // Mark yourself as currently viewing
    updateDoc(threadRef, { [`viewing.${user.uid}`]: true }).catch(() => {});

    const threadUnsub = onSnapshot(threadRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setThread({ id: snap.id, ...data });
        // Check if the other person is currently viewing
        const otherId = data.participants?.find((p: string) => p !== user.uid);
        setOtherIsViewing(!!data.viewing?.[otherId]);
      }
    });

    const q = query(collection(db, 'messages', threadId as string, 'chats'), orderBy('createdAt', 'asc'));
    const msgUnsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      updateDoc(threadRef, { [`unreadCount.${user.uid}`]: 0 }).catch(() => {});
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    });

    return () => {
      // Mark yourself as no longer viewing when you leave
      updateDoc(threadRef, { [`viewing.${user.uid}`]: false }).catch(() => {});
      threadUnsub();
      msgUnsub();
    };
  }, [threadId]);

  const handleSend = async () => {
    if (!text.trim() || !user || !threadId) return;
    setSending(true);
    const msgBody = text.trim();
    setText('');
    try {
      const userSnap = await getDoc(doc(db, 'users', user.uid));
      const username = userSnap.exists() ? (userSnap.data().username || user.email || 'Unknown') : 'Unknown';
      const otherId = thread?.participants?.find((p: string) => p !== user.uid);

      await addDoc(collection(db, 'messages', threadId as string, 'chats'), {
        body: msgBody,
        senderId: user.uid,
        senderName: username,
        createdAt: serverTimestamp(),
        readBy: [user.uid],
      });

      await updateDoc(doc(db, 'messages', threadId as string), {
        lastMessage: msgBody,
        updatedAt: serverTimestamp(),
        ...(otherId ? { [`unreadCount.${otherId}`]: increment(1) } : {}),
      });

      // Send push notification if the other person isn't already in the chat
      if (otherId && !otherIsViewing) {
        const otherSnap = await getDoc(doc(db, 'users', otherId));
        const pushToken = otherSnap.exists() ? otherSnap.data().pushToken : null;
        if (pushToken) {
          await sendPushNotification(pushToken, username, msgBody);
        }
      }
    } catch (e: any) { console.log(e); }
    setSending(false);
  };

  // Mark messages as read when viewing
  useEffect(() => {
    if (!user || !threadId || messages.length === 0) return;
    const threadRef = doc(db, 'messages', threadId as string);
    // Mark unread messages from the other person as read
    messages.forEach((m: any) => {
      if (m.senderId !== user.uid && !m.readBy?.includes(user.uid)) {
        const msgRef = doc(db, 'messages', threadId as string, 'chats', m.id);
        updateDoc(msgRef, { readBy: [...(m.readBy || []), user.uid] }).catch(() => {});
      }
    });
    updateDoc(threadRef, { [`unreadCount.${user.uid}`]: 0 }).catch(() => {});
  }, [messages]);

  const renderItem = ({ item: m, index }: any) => {
    const isMe = m.senderId === user?.uid;
    const time = m.createdAt?.seconds
      ? new Date(m.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '';
    const isLastMessage = index === messages.length - 1;
    const otherId = thread?.participants?.find((p: string) => p !== user?.uid);
    const isRead = m.readBy?.includes(otherId);

    // Show read/delivered only on the last message sent by me
    let receipt = null;
    if (isMe && isLastMessage) {
      receipt = (
        <Text style={styles.receipt}>
          {isRead ? '✓✓ Read' : '✓ Delivered'}
        </Text>
      );
    }

    return (
      <View style={[styles.bubbleRow, isMe ? styles.bubbleRowMe : styles.bubbleRowThem]}>
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
          <Text style={[styles.bubbleText, isMe ? styles.bubbleTextMe : styles.bubbleTextThem]}>{m.body}</Text>
        </View>
        <Text style={[styles.bubbleTime, isMe ? styles.bubbleTimeMe : styles.bubbleTimeThem]}>{time}</Text>
        {receipt}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
      <View style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
              <Path d="M15 18l-6-6 6-6" stroke="#008080" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </TouchableOpacity>
          <View style={styles.topBarCenter}>
            <View style={styles.topAvatar}>
              <Text style={[styles.topAvatarText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>
                {(otherName as string)?.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() || '??'}
              </Text>
            </View>
            <View>
              <Text style={[styles.topName, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>
                {(otherName as string)?.toUpperCase() || 'CHAT'}
              </Text>
              {thread?.context ? <Text style={styles.topContext} numberOfLines={1}>re: {thread.context}</Text> : null}
            </View>
          </View>
        </View>

        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={(m: any) => m.id}
          renderItem={renderItem}
          contentContainerStyle={styles.chatList}
          onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={<View style={styles.emptyChat}><Text style={styles.emptyChatText}>Say hello 👋</Text></View>}
        />

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Message..."
            placeholderTextColor="#a0b8b8"
            value={text}
            onChangeText={setText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!text.trim() || sending}
            activeOpacity={0.8}
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
  container: { flex: 1, backgroundColor: '#f5ede0' },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingTop: 60, paddingBottom: 14, paddingHorizontal: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0', gap: 12 },
  backBtn: { padding: 4 },
  topBarCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  topAvatar: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#008080', alignItems: 'center', justifyContent: 'center' },
  topAvatarText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  topName: { fontSize: 16, fontWeight: '700', color: '#003333', letterSpacing: 0.5 },
  topContext: { fontSize: 11, color: '#a0b8b8', fontStyle: 'italic' },
  chatList: { paddingHorizontal: 16, paddingVertical: 16, paddingBottom: 24 },
  bubbleRow: { marginBottom: 10, maxWidth: '78%' },
  bubbleRowMe: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  bubbleRowThem: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMe: { backgroundColor: '#008080', borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: '#fff', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#e8e8e8' },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  bubbleTextMe: { color: '#fff' },
  bubbleTextThem: { color: '#333' },
  bubbleTime: { fontSize: 10, marginTop: 4, color: '#aaa' },
  bubbleTimeMe: { textAlign: 'right' },
  bubbleTimeThem: { textAlign: 'left' },
  receipt: { fontSize: 10, color: '#008080', marginTop: 2, textAlign: 'right' },
  emptyChat: { flex: 1, alignItems: 'center', marginTop: 60 },
  emptyChatText: { fontSize: 14, color: '#a0b8b8' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  input: { flex: 1, backgroundColor: '#f5ede0', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: '#003333', borderWidth: 1, borderColor: '#e8e8e8', maxHeight: 100 },
  sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#008080', alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: '#a0b8b8' },
});