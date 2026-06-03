import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Dimensions, Alert } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import * as SQLite from 'expo-sqlite';

// DEINE ECHTEN EXCEL-DATEN (Exakt nach Screenshot korrigiert)
const EXCEL_START_DATA = [
  // MORGENS
  { name: 'Zink', bereich: 'Alltag & Lifestyle', zeit: 'Morgens', menge: '1 Portion', farbe: '#42A5F5', bestand: 100, portionsPreis: 0.08, istDefizit: 0 },
  { name: 'K2 + D3', bereich: 'Alltag & Lifestyle', zeit: 'Morgens', menge: '1 Portion', farbe: '#42A5F5', bestand: 120, portionsPreis: 0.12, istDefizit: 0 },
  { name: 'Omega-3 (Algenöl)', bereich: 'Regeneration & Gelenke', zeit: 'Morgens', menge: '2 Kapseln', farbe: '#AB47BC', bestand: 20, portionsPreis: 1.18, istDefizit: 0 }, // Preis angepasst: 1.18€
  
  // VOR / NACH DEM TRAINING
  { name: 'Rote Bete Pulverextrakt', bereich: 'Ausdauer & Leistung', zeit: '2-3 Std. vorher', menge: '1 Portion', farbe: '#EF5350', bestand: 60, portionsPreis: 0.70, istDefizit: 0 }, // Preis: 0.70€
  { name: 'L-Citrullin Malat', bereich: 'Ausdauer & Leistung', zeit: 'Vor Training', menge: '8 g ', farbe: '#EF5350', bestand: 100, portionsPreis: 0.30, istDefizit: 0 }, // Preis: 0.30€
  { name: 'Kollagen', bereich: 'Regeneration & Gelenke', zeit: '45 Min. vor Training', menge: '1 Portion', farbe: '#AB47BC', bestand: 20, portionsPreis: 1.50, istDefizit: 0 }, // Kollagen Peptides Pulver: 1.50€
  { name: 'Kreatin', bereich: 'Kraftsport & Muskelaufbau', zeit: 'Nach Training', menge: '5g', farbe: '#66BB6A', bestand: 100, portionsPreis: 0.18, istDefizit: 0 },
  { name: 'Protein Pulver', bereich: 'Kraftsport & Muskelaufbau', zeit: 'Nach Training', menge: '1-2 Scoops', farbe: '#66BB6A', bestand: 30, portionsPreis: 0.95, istDefizit: 0 },
  
  // TAGSÜBER (TÄGLICH / FOKUS)
  { name: 'Beta Alanine', bereich: 'Ausdauer & Leistung', zeit: 'Tagsüber', menge: '5 g täglich', farbe: '#EF5350', bestand: 233, portionsPreis: 0.06, istDefizit: 0 },
  { name: 'Alpha GPC', bereich: 'Alltag & Lifestyle', zeit: 'Tagsüber', menge: '1 Portion', farbe: '#42A5F5', bestand: 90, portionsPreis: 0.23, istDefizit: 0 }, // Neu aus deiner Tabelle
  
  // VORM SCHLAFEN
  { name: 'Magnesiumcitrat', bereich: 'Alltag & Lifestyle', zeit: 'Vorm Schlafen', menge: '1 Portion', farbe: '#42A5F5', bestand: 90, portionsPreis: 0.34, istDefizit: 0 }, // Preis: 0.34€
  { name: 'Ashwagandha', bereich: 'Alltag & Lifestyle', zeit: 'Vorm Schlafen', menge: '1 Portion', farbe: '#42A5F5', bestand: 60, portionsPreis: 0.40, istDefizit: 0 }, // Preis: 0.40€
  { name: 'Sauerkirschkapseln', bereich: 'Regeneration & Gelenke', zeit: 'Vorm Schlafen', menge: '2 Kapseln', farbe: '#AB47BC', bestand: 30, portionsPreis: 0.89, istDefizit: 0 }, // Preis: 0.89€

  // DEFIZITE (Eigene graue Kategorie, kein Bestand, 0€ Kosten)
  { name: 'B-Vit-Komplexe', bereich: 'Vollkorn, Haferflocken, Fleisch/Fisch', zeit: 'Defizit-Ausgleich', menge: 'Ernährung', farbe: '#78909C', bestand: 999, portionsPreis: 0.0, istDefizit: 1 },
  { name: 'Vitamin C & Kalium', bereich: 'Kartoffeln, Bananen, Beeren, Brokkoli', zeit: 'Defizit-Ausgleich', menge: 'Ernährung', farbe: '#78909C', bestand: 999, portionsPreis: 0.0, istDefizit: 1 },
  { name: 'gesunde Fette', bereich: 'Avocados, Nüsse und Olivenöl', zeit: 'Defizit-Ausgleich', menge: 'Ernährung', farbe: '#78909C', bestand: 999, portionsPreis: 0.0, istDefizit: 1 }
];

// Chronologische Reihenfolge fürs UI
const ZEIT_REIHENFOLGE = { 'Morgens': 1, 'Tagsüber': 2, 'Training': 3, 'Vorm Schlafen': 4, 'Defizit-Ausgleich': 5 };

export default function App() {
  const [db, setDb] = useState(null);
  const [supplements, setSupplements] = useState([]);

  useEffect(() => {
    async function initDatabase() {
      try {
        const database = await SQLite.openDatabaseAsync('hybrid_stack_v3.db'); // Neue DB-Version für die korrigierten Daten
        setDb(database);

        await database.runAsync(`
          CREATE TABLE IF NOT EXISTS supplements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE,
            bereich TEXT,
            zeit TEXT,
            menge TEXT,
            farbe TEXT,
            bestand INTEGER,
            portionsPreis REAL,
            istDefizit INTEGER,
            genommen INTEGER DEFAULT 0
          );
        `);

        const countResult = await database.getFirstAsync('SELECT COUNT(*) as count FROM supplements;');
        
        if (countResult.count === 0) {
          for (const item of EXCEL_START_DATA) {
            await database.runAsync(
              'INSERT INTO supplements (name, bereich, zeit, menge, farbe, bestand, portionsPreis, istDefizit, genommen) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0);',
              [item.name, item.bereich, item.zeit, item.menge, item.farbe, item.bestand, item.portionsPreis, item.istDefizit]
            );
          }
        }

        refreshData(database);
      } catch (error) {
        console.error("SQLite Fehler:", error);
      }
    }
    initDatabase();
  }, []);

  const refreshData = async (databaseInstance) => {
    const currentDb = databaseInstance || db;
    if (!currentDb) return;
    
    const allRows = await currentDb.getAllAsync('SELECT * FROM supplements;');
    const sortedRows = allRows.sort((a, b) => ZEIT_REIHENFOLGE[a.zeit] - ZEIT_REIHENFOLGE[b.zeit]);
    setSupplements(sortedRows);
  };

  const toggleSupplement = async (item) => {
    if (!db) return;

    const neuerGenommenStatus = item.genommen === 1 ? 0 : 1;
    let neuerBestand = item.bestand;

    // Bestandslogik (nur für echte Supps, nicht für Defizite)
    if (item.istDefizit === 0) {
      if (neuerGenommenStatus === 1) {
        neuerBestand = Math.max(0, item.bestand - 1);
        if (neuerBestand <= 10 && neuerBestand > 0) {
          Alert.alert("Nachbestellen!", `${item.name} geht bald leer aus (nur noch ${neuerBestand} Portionen)!`);
        }
      } else {
        neuerBestand = item.bestand + 1;
      }
    }

    try {
      await db.runAsync(
        'UPDATE supplements SET genommen = ?, bestand = ? WHERE id = ?;',
        [neuerGenommenStatus, neuerBestand, item.id]
      );
      refreshData();
    } catch (error) {
      console.error("SQL Update Fehler:", error);
    }
  };

  // Berechnungen
  const gesamt = supplements.length;
  const genommenCount = supplements.filter(s => s.genommen === 1).length;
  const prozent = gesamt > 0 ? genommenCount / gesamt : 0;
  
  // Geld-Counter rechnet nur echte Supps zusammen (Defizite kosten 0)
  const geldHeute = supplements
    .filter(s => s.genommen === 1)
    .reduce((sum, item) => sum + item.portionsPreis, 0);

  const radius = 75;
  const strokeWidth = 12;
  const umkreis = 2 * Math.PI * radius;
  const strokeDashoffset = umkreis - (prozent * umkreis);

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Hybrid Stack Tracker</Text>
      
      {/* DER FORTSCHRITTSKREIS */}
      <View style={styles.circleContainer}>
        <Svg width={190} height={190}>
          <Circle cx="95" cy="95" r={radius} stroke="#E0E0E0" strokeWidth={strokeWidth} fill="none" />
          <Circle 
            cx="95" cy="95" r={radius} 
            stroke="#26A69A" strokeWidth={strokeWidth} fill="none" 
            strokeDasharray={umkreis}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform="rotate(-90 95 95)"
          />
        </Svg>
        <View style={styles.circleTextContainer}>
          <Text style={styles.circlePercent}>{Math.round(prozent * 100)}%</Text>
          <Text style={styles.circleSub}>{genommenCount} von {gesamt} erledigt</Text>
          <View style={styles.moneyBadge}>
            <Text style={styles.moneyText}>+{geldHeute.toFixed(2)} € heute</Text>
          </View>
        </View>
      </View>

      {/* CHRONOLOGISCHE LISTE */}
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {supplements.map((supp) => {
          const istGenommen = supp.genommen === 1;
          const fastLeer = supp.bestand <= 10 && supp.istDefizit === 0;
          
          return (
            <TouchableOpacity 
              key={supp.id} 
              style={[styles.card, { borderLeftColor: supp.farbe }, istGenommen && styles.cardGenommen]} 
              onPress={() => toggleSupplement(supp)}
            >
              <View style={{ flex: 1 }}>
                <View style={styles.row}>
                  <Text style={[styles.suppName, istGenommen && styles.textGenommen]}>{supp.name}</Text>
                  <Text style={styles.mengeText}>({supp.menge})</Text>
                </View>
                <Text style={styles.suppBereich}>{supp.zeit} • {supp.bereich}</Text>
              </View>
              
              {/* Rechte Anzeige: Entweder Portionen oder Info bei Defiziten */}
              {supp.istDefizit === 0 ? (
                <View style={styles.bestandContainer}>
                  <Text style={[styles.bestandText, fastLeer && styles.bestandWarnung]}>
                    {supp.bestand} Port.
                  </Text>
                  <Text style={styles.preisSubText}>{supp.portionsPreis.toFixed(2)}€/P.</Text>
                </View>
              ) : (
                <View style={[styles.bestandContainer, { backgroundColor: '#ECEFF1' }]}>
                  <Text style={[styles.bestandText, { color: '#78909C' }]}>Defizit</Text>
                </View>
              )}

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
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#1A237E', marginBottom: 15 },
  circleContainer: { justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  circleTextContainer: { position: 'absolute', alignItems: 'center' },
  circlePercent: { fontSize: 34, fontWeight: 'bold', color: '#37474F' },
  circleSub: { fontSize: 11, color: '#78909C', marginBottom: 4 },
  moneyBadge: { backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, borderColor: '#A5D6A7', borderWidth: 1 },
  moneyText: { fontSize: 13, fontWeight: '700', color: '#2E7D32' },
  scrollContainer: { width: Dimensions.get('window').width * 0.92 },
  card: { 
    backgroundColor: '#FFFFFF', padding: 14, borderRadius: 10, marginBottom: 8,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderLeftWidth: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 2, elevation: 2
  },
  cardGenommen: { backgroundColor: '#F1F8E9', opacity: 0.75 },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  suppName: { fontSize: 15, fontWeight: '600', color: '#263238' },
  mengeText: { fontSize: 12, fontWeight: 'bold', color: '#546E7A', marginLeft: 6 },
  textGenommen: { textDecorationLine: 'line-through', color: '#90A4AE' },
  suppBereich: { fontSize: 11, color: '#78909C', marginTop: 2 },
  bestandContainer: { marginRight: 12, alignItems: 'flex-end', backgroundColor: '#ECEFF1', paddingHorizontal: 6, paddingVertical: 4, borderRadius: 5 },
  bestandText: { fontSize: 11, fontWeight: 'bold', color: '#546E7A' },
  bestandWarnung: { color: '#FF6D00' },
  preisSubText: { fontSize: 9, color: '#90A4AE', marginTop: 1 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#CFD8DC' }
});