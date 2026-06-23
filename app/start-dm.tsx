import { useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, collection, doc, getDoc, getDocs, query, serverTimestamp, where } from 'firebase/firestore';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { auth, db } from '../firebaseConfig';

export default function StartDmScreen() {
  const { recipientId, recipientName, prefillMessage } = useLocalSearchParams();
  const router = useRouter();
  const user = auth.currentUser;

  useEffect(() => {
    const go = async () => {
      if (!user || !recipientId) return;

      const mySnap = await getDoc(doc(db, 'users', user.uid));
      const myName = mySnap.exists() ? (mySnap.data().username || user.email || 'Unknown') : 'Unknown';

      const q = query(collection(db, 'messages'), where('participants', 'array-contains', user.uid));
      const snap = await getDocs(q);
      const existing = snap.docs.find(d => {
        const parts: string[] = d.data().participants || [];
        return parts.includes(recipientId as string);
      });

      let threadId: string;
      if (existing) {
        threadId = existing.id;
      } else {
        const ref = await addDoc(collection(db, 'messages'), {
          participants: [user.uid, recipientId],
          participantNames: {
            [user.uid]: myName,
            [recipientId as string]: recipientName || 'Unknown',
          },
          lastMessage: '',
          updatedAt: serverTimestamp(),
          unreadCount: {
            [user.uid]: 0,
            [recipientId as string]: 0,
          },
        });
        threadId = ref.id;
      }

      router.replace({
        pathname: '/chat',
        params: {
          threadId,
          otherName: recipientName || 'Unknown',
          prefillMessage: prefillMessage || '',
        },
      });
    };
    go().catch(() => {});
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5ede0' }}>
      <ActivityIndicator size="large" color="#008080" />
    </View>
  );
}