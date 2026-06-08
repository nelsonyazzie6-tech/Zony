import { useRouter } from 'expo-router';
import { collection, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Callout, Marker } from 'react-native-maps';
import { db } from '../firebaseConfig';

export default function MapScreen() {
  const [tournaments, setTournaments] = useState([]);
  const router = useRouter();

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'tournaments'), async (snapshot) => {
      const data = await Promise.all(snapshot.docs.map(async (doc) => {
        const t = { id: doc.id, ...doc.data() };
        if (!t.city || !t.state) return null;
        try {
          const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(`${t.address || ''} ${t.city.trim()} ${t.state.trim()}`)}&key=AIzaSyC9w_A1-1lPhvtTTuCFdIQejyfm9GOJXRc`);
          const json = await res.json();
          if (json.results[0]) {
            const { lat, lng } = json.results[0].geometry.location;
            return { ...t, lat, lng };
          }
        } catch (e) {}
        return null;
      }));
      setTournaments(data.filter(Boolean));
    });
    return () => unsub();
  }, []);

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: 36.5,
          longitude: -108.5,
          latitudeDelta: 4,
          longitudeDelta: 4,
        }}
      >
        {tournaments.map(t => (
          <Marker key={t.id} coordinate={{ latitude: t.lat, longitude: t.lng }}>
            <Callout onPress={() => router.push({ pathname: '/tournament', params: { id: t.id, postedBy: t.postedBy } })}>
              <View style={styles.callout}>
                <Text style={styles.calloutName}>{t.name}</Text>
                <Text style={styles.calloutDetail}>{t.date}</Text>
                <Text style={styles.calloutDetail}>{t.city}, {t.state}</Text>
                <Text style={styles.calloutLink}>Tap to view →</Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  back: { position: 'absolute', top: 60, left: 20, zIndex: 10, backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  backText: { fontSize: 15, color: '#e8622a', fontWeight: '600' },
  map: { flex: 1 },
  callout: { width: 180, padding: 8 },
  calloutName: { fontSize: 14, fontWeight: 'bold', color: '#1a0f0a', marginBottom: 4 },
  calloutDetail: { fontSize: 12, color: '#7a4a2a' },
  calloutLink: { fontSize: 12, color: '#e8622a', fontWeight: '600', marginTop: 4 },
});