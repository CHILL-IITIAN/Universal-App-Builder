import React from 'react';
import { SafeAreaView, StyleSheet, Text, View, ScrollView } from 'react-native';

const App = () => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.title}>💪 FitApp</Text>
          <Text style={styles.subtitle}>Your personal fitness tracker</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Today's Goals</Text>
          <Text>🏃 Steps: 8,432 / 10,000</Text>
          <Text>🔥 Calories: 1,850 / 2,200</Text>
          <Text>💧 Water: 6 / 8 glasses</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { padding: 20, backgroundColor: '#4CAF50' },
  title: { fontSize: 28, fontWeight: 'bold', color: 'white' },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  card: { margin: 16, padding: 16, backgroundColor: 'white', borderRadius: 12 }
});

export default App;
