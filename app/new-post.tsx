import { Rajdhani_700Bold, useFonts } from '@expo-google-fonts/rajdhani';
import { useRouter } from 'expo-router';
import { addDoc, collection, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../firebaseConfig';

const typeOptions = ['Sale', 'Question'];

export default function NewPostScreen() {
  const router = useRouter();
  const [fontsLoaded] = useFonts({ Rajdhani_700Bold });
  const [type, setType] = useState('');
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePost = async () => {
    if (!type || !body.trim()) {
      Alert.alert('Missing info', 'Please select a type and write something.');
      return;
    }
    if (type === 'Sale' && !title.trim()) {
      Alert.alert('Missing info', 'Please add a title for your sale post.');
      return;
    }
    const user = auth.currentUser;
    if (!user) { Alert.alert('Sign in required'); return; }
    setLoading(true);
    try {
      const userSnap = await getDoc(doc(db, 'users', user.uid));
      const userData = userSnap.exists() ? userSnap.data() : {};
      const username = userData.username || user.email || 'Anonymous';
      const initials = username.slice(0, 2).toUpperCase();
      const photoURL = userData.photoURL || null;

      await addDoc(collection(db, 'community'), {
        type,
        title: type === 'Sale' ? title.trim() : null,
        body: body.trim(),
        price: type === 'Sale' ? price.trim() : null,
        imageUrl: null,
        authorName: username,
        authorInitials: initials,
        authorPhotoURL: photoURL,
        authorId: user.uid,
        commentCount: 0,
        createdAt: serverTimestamp(),
      });

      router.replace('/(tabs)/community');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
    setLoading(false);
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

      <View style={styles.topRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>✕ Cancel</Text>
        </TouchableOpacity>
        <Text style={[styles.title, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>NEW POST</Text>
        <TouchableOpacity style={styles.postBtn} onPress={handlePost} disabled={loading}>
          <Text style={[styles.postBtnText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>
            {loading ? 'Posting...' : 'POST'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.form}>

        <Text style={styles.label}>Post Type</Text>
        <TouchableOpacity
          style={styles.dropdown}
          onPress={() => setShowTypePicker(!showTypePicker)}
          activeOpacity={0.8}
        >
          <Text style={type ? styles.dropdownSelected : styles.dropdownPlaceholder}>
            {type === 'Sale' ? 'For Sale' : type === 'Question' ? 'Question' : 'Select type...'}
          </Text>
          <Text style={styles.dropdownArrow}>{showTypePicker ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {showTypePicker && (
          <View style={styles.dropdownList}>
            {typeOptions.map(opt => (
              <TouchableOpacity
                key={opt}
                style={styles.dropdownItem}
                onPress={() => { setType(opt); setShowTypePicker(false); }}
              >
                <Text style={[styles.dropdownItemText, type === opt && styles.dropdownItemActive]}>
                  {opt === 'Sale' ? 'For Sale' : 'Question'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {type === 'Sale' && (
          <>
            <Text style={styles.label}>Item Title</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Nike Volleyball Jersey — Size M"
              placeholderTextColor="#a0b8b8"
              value={title}
              onChangeText={setTitle}
            />
            <Text style={styles.label}>
              Price <Text style={styles.optional}>(optional)</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. $35"
              placeholderTextColor="#a0b8b8"
              value={price}
              onChangeText={setPrice}
            />
          </>
        )}

        <Text style={styles.label}>
          {type === 'Sale' ? 'Description' : type === 'Question' ? 'Your Question' : 'Content'}
        </Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder={
            type === 'Sale'
              ? 'Describe the item, condition, size, etc...'
              : type === 'Question'
              ? 'Ask the community anything...'
              : 'Write something...'
          }
          placeholderTextColor="#a0b8b8"
          value={body}
          onChangeText={setBody}
          multiline
          numberOfLines={5}
        />

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5ede0', paddingTop: 60 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 20 },
  backText: { fontSize: 15, color: '#888', fontWeight: '500' },
  title: { fontSize: 22, color: '#003333', letterSpacing: 2 },
  postBtn: { backgroundColor: '#008080', borderRadius: 20, paddingHorizontal: 18, paddingVertical: 8 },
  postBtnText: { color: '#fff', fontSize: 15, letterSpacing: 1 },
  form: { paddingHorizontal: 20, paddingBottom: 48 },
  label: { fontSize: 13, fontWeight: '700', color: '#003333', marginBottom: 6, marginTop: 14 },
  optional: { fontWeight: '400', color: '#a0b8b8' },
  input: { backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, fontSize: 14, color: '#1a0f0a', borderWidth: 1, borderColor: '#e8e8e8', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  textArea: { height: 130, textAlignVertical: 'top' },
  dropdown: { backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#e8e8e8', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  dropdownPlaceholder: { fontSize: 14, color: '#a0b8b8' },
  dropdownSelected: { fontSize: 14, color: '#003333' },
  dropdownArrow: { fontSize: 11, color: '#008080' },
  dropdownList: { backgroundColor: '#fff', borderRadius: 16, marginTop: 4, marginBottom: 4, overflow: 'hidden', borderWidth: 1, borderColor: '#e8e8e8', elevation: 2 },
  dropdownItem: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  dropdownItemText: { fontSize: 14, color: '#003333' },
  dropdownItemActive: { color: '#008080', fontWeight: '700' },
});