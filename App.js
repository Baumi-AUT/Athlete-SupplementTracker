import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Dimensions, Alert } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import * as SQLite from 'expo-sqlite';

// Deine Excel-Startdaten, falls die Datenbank noch komplett leer ist
const EXCEL_START_DATA = [
  { name: 'Magnesiumcitrat', bereich: 'Alltag', farbe: '#42A5F5', bestand: 90 },
  { name: 'Ashwagandha', bereich: 'Kraft', farbe: '#66BB6A', bestand: 60 },
  { name: 'Zink', bereich: 'Alltag', farbe: '#42A5F5', bestand: 100 },
  { name: 'K2 + D3', bereich: 'Alltag', farbe: '#42A5F5', bestand: 120 },
  { name: 'Kreatin', bereich: 'Kraft', farbe: '#66BB6A', bestand: 100 },
  { name: 'Protein Pulver', bereich: 'Kraft', farbe: '#66BB6A', bestand: 30 },
  { name: 'Rote Bete Pulver', bereich: 'Ausdauer', farbe: '#EF5350', bestand: 60 },
  { name: 'Beta Alanine', bereich: 'Ausdauer', farbe: '#EF5350', bestand: 233 },
  { name: 'L-Citrullin Malat', bereich: 'Ausdauer', farbe: '#EF5350', bestand: 100 },
  { name: 'Omega-3 (Algenöl)', bereich: 'Regeneration', farbe: '#AB47BC', bestand: 20 },
  { name: 'Sauerkirschkapseln', bereich: 'Regeneration', farbe: '#AB47BC', bestand: 30 },
  { name: 'Kollagen', bereich: 'Regeneration', farbe: '#AB47BC', bestand: 20 }
];

export default function App() {
  const [db, setDb] = useState(null);
  const [supplements, setSupplements] = useState([]);

  // 1. Verbindung zur SQLite Datenbank herstellen & Tabelle anlegen
  useEffect(() => {
    async function initDatabase() {
      try {
        const database = await SQLite.openDatabaseAsync('hybrid_stack.db');
        setDb(database);

        // Erstelle die Tabelle, falls sie noch nicht existiert
        await database.runAsync(`
          CREATE TABLE IF NOT EXISTS supplements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE,
            bereich TEXT,
            farbe TEXT,
            bestand INTEGER,
            genommen INTEGER DEFAULT 0
          );
        `);

        // Prüfen, ob schon Daten drin sind
        const countResult = await database.getFirstAsync('SELECT COUNT(*) as count FROM supplements;');
        
        // Wenn leer, füttere die SQLite DB mit deinen Excel-Werten
        if (countResult.count === 0) {
          for (const item of EXCEL_START_DATA) {
            await database.runAsync(
              'INSERT INTO supplements (name, bereich, farbe, bestand, genommen) VALUES (?, ?, ?, ?, 0);',
              [item.name, item.bereich, item.farbe, item.bestand]
            );
          }
        }

        // Daten das erste Mal auslesen und im State anzeigen
        refreshData(database);
      } catch (error) {
        console.error("Fehler bei der SQLite Initialisierung:", error);
      }
    }
    initDatabase();
  }, []);

  // 2. Hilfsfunktion: Aktuelle Daten aus der SQLite abrufen
  const refreshData = async (databaseInstance) => {
    const currentDb = databaseInstance || db;
    if (!currentDb) return;
    
    const allRows = await currentDb.getAllAsync('SELECT * FROM supplements;');
    setSupplements(allRows);
  };

  // 3. Logik per SQL-Befehl beim Klicken auf ein Supplement
  const toggleSupplement = async (item) => {
    if (!db) return;

    const neuerGenommenStatus = item.genommen === 1 ? 0 : 1;
    let neuerBestand = item.bestand;

    // Wenn abgehakt (genommen == 1) -> Eine Portion im SQLite-Bestand abziehen
    if (neuerGenommenStatus === 1) {
      neuerBestand = Math.max(0, item.bestand - 1);
      if (neuerBestand <= 10 && neuerBestand > 0) {
        Alert.alert("Nachbestellen!", `${item.name} geht bald leer aus (nur noch ${neuerBestand} Portionen)!`);
      }
    } else {
      // Wenn der Haken entfernt wird, kriegt der Bestand die Portion zurück
      neuerBestand = item.bestand + 1;
    }

    try {
      // ECHTER SQL UPDATE-BEFEHL
      await db.runAsync(
        'UPDATE supplements SET genommen = ?, bestand = ? WHERE id = ?;',
        [neuerGenommenStatus, neuerBestand, item.id]
      );
      
      // UI aktualisieren
      refreshData();
    } catch (error) {
      console.error("Fehler beim SQL Update:", error);
    }
  };

  // Berechnungen für den Fortschrittskreis
  const gesamt = supplements.length;
  const genommenCount = supplements.filter(s => s.genommen === 1).length;
  const prozent = gesamt > 0 ? genommenCount / gesamt : 0;
  
  const radius = 70;
  const strokeWidth = 12;
  const umkreis = 2 * Math.PI * radius;
  const strokeDashoffset = umkreis - (prozent * umkreis);

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Hybrid Stack Tracker (SQLite)</Text>
      
      {/* DER FORTSCHRITTSKREIS */}
      <View style={styles.circleContainer}>
        <Svg width={180} height={180}>
          <Circle cx="90" cy="90" r={radius} stroke="#E0E0E0" strokeWidth={strokeWidth} fill="none" />
          <Circle 
            cx="90" cy="90" r={radius} 
            stroke="#26A69A" strokeWidth={strokeWidth} fill="none" 
            strokeDasharray={umkreis}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform="rotate(-90 90 90)"
          />
        </Svg>
        <View style={styles.circleTextContainer}>
          <Text style={styles.circlePercent}>{Math.round(prozent * 100)}%</Text>
          <Text style={styles.circleSub}>{genommenCount} von {gesamt}</Text>
        </View>
      </View>

      {/* DIE SUPPLEMENT-LISTE AUS DER SQLITE DB */}
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {supplements.map((supp) => {
          const istGenommen = supp.genommen === 1;
          const fastLeer = supp.bestand <= 10;
          return (
            <TouchableOpacity 
              key={supp.id} 
              style={[styles.card, { borderLeftColor: supp.farbe }, istGenommen && styles.cardGenommen]} 
              onPress={() => toggleSupplement(supp)}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.suppName, istGenommen && styles.textGenommen]}>{supp.name}</Text>
                <Text style={styles.suppBereich}>{supp.bereich}</Text>
              </View>
              
              <View style={styles.bestandContainer}>
                <Text style={[styles.bestandText, fastLeer && styles.bestandWarnung]}>
                  {supp.bestand} Port.
                </Text>
              </View>

              <View style={[styles.checkbox, istGenommen && { backgroundColor: '#26A69A', borderColor: '#26A69A' }]} />
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA', paddingTop: 60, alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#1A237E', marginBottom: 20 },
  circleContainer: { justifyContent: 'center', alignItems: 'center', marginBottom: 25 },
  circleTextContainer: { position: 'absolute', alignItems: 'center' },
  circlePercent: { fontSize: 32, fontWeight: 'bold', color: '#37474F' },
  circleSub: { fontSize: 12, color: '#78909C' },
  scrollContainer: { width: Dimensions.get('window').width * 0.9 },
  card: { 
    backgroundColor: '#FFFFFF', padding: 16, borderRadius: 10, marginBottom: 10,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderLeftWidth: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 2, elevation: 2
  },
  cardGenommen: { backgroundColor: '#E8F5E9', opacity: 0.8 },
  suppName: { fontSize: 16, fontWeight: '600', color: '#263238' },
  textGenommen: { textDecorationLine: 'line-through', color: '#90A4AE' },
  suppBereich: { fontSize: 12, color: '#78909C', marginTop: 2 },
  bestandContainer: { marginRight: 15, backgroundColor: '#ECEFF1', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 5 },
  bestandText: { fontSize: 12, fontWeight: 'bold', color: '#546E7A' },
  bestandWarnung: { color: '#FF6D00' },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#CFD8DC' }
});