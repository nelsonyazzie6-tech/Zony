import { useRouter } from 'expo-router';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { db } from '../../firebaseConfig';

export default function PostScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [sport, setSport] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [spots, setSpots] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name || !sport || !date || !location || !spots) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'tournaments'), {
        name,
        sport,
        date,
        location,
        spots: parseInt(spots),
        createdAt: serverTimestamp(),
      });
      setSubmitted(true);
    } catch (e) {
      console.error('Error posting tournament:', e);
    }
    setLoading(false);
  };

  if (submitted) {
    return (
      <View style={styles.successContainer}>
        <Text style={styles.successIcon}>🎉</Text>
        <Text style={styles.successTitle}>Tournament Posted!</Text>
        <Text style={styles.successSub}>Your tournament is now live on Zony.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => { setSubmitted(false); router.push('/'); }}>
          <Text style={styles.backText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Post a Tournament</Text>
      <Text style={styles.sub}>Fill out the details below</Text>

      <View style={styles.form}>
        <Text style={styles.label}>Tournament Name</Text>
        <TextInput style={styles.input} placeholder="e.g. Gallup Summer Hoops" placeholderTextColor="#a89080" value={name} onChangeText={setName} />

        <Text style={styles.label}>Sport</Text>
        <TextInput style={styles.input} placeholder="e.g. Basketball, Soccer" placeholderTextColor="#a89080" value={sport} onChangeText={setSport} />

        <Text style={styles.label}>Date</Text>
        <TextInput style={styles.input} placeholder="e.g. Jun 14" placeholderTextColor="#a89080" value={date} onChangeText={setDate} />

        <Text style={styles.label}>Location</Text>
        <TextInput style={styles.input} placeholder="e.g. Gallup, NM" placeholderTextColor="#a89080" value={location} onChangeText={setLocation} />

        <Text style={styles.label}>Available Spots</Text>
        <TextInput style={styles.input} placeholder="e.g. 8" placeholderTextColor="#a89080" value={spots} onChangeText={setSpots} keyboardType="numeric" />

        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
          <Text style={styles.submitText}>{loading ? 'Posting...' : 'Post Tournament'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5ede0', paddingTop: 60 },
  header: { fontSize: 32, fontWeight: 'bold', color: '#1a0f0a', paddingHorizontal: 20 },
  sub: { fontSize: 16, color: '#7a4a2a', paddingHorizontal: 20, marginBottom: 24 },
  form: { paddingHorizontal: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#1a0f0a', marginBottom: 6 },
  input: { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: '#1a0f0a', marginBottom: 16 },
  submitBtn: { backgroundColor: '#e8622a', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 8, marginBottom: 40 },
  submitText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  successContainer: { flex: 1, backgroundColor: '#f5ede0', alignItems: 'center', justifyContent: 'center', padding: 40 },
  successIcon: { fontSize: 60, marginBottom: 16 },
  successTitle: { fontSize: 28, fontWeight: 'bold', color: '#1a0f0a', marginBottom: 8 },
  successSub: { fontSize: 16, color: '#7a4a2a', marginBottom: 32, textAlign: 'center' },
  backBtn: { backgroundColor: '#e8622a', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32 },
  backText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});