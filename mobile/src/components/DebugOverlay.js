import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { API_BASE_URL, API_TARGET, SHOW_DEBUG_OVERLAY } from '../config';
import { subscribeDebugLogs } from '../services/debugLog';

function shortTimestamp(isoString) {
  const date = new Date(isoString);
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

function formatDetails(details) {
  if (!details) return '';
  const parts = [];
  if (details.method) parts.push(details.method);
  if (details.status) parts.push(String(details.status));
  if (details.url) parts.push(details.url);
  if (details.message) parts.push(details.message);
  return parts.join(' | ');
}

export default function DebugOverlay() {
  const [expanded, setExpanded] = useState(false);
  const [logs, setLogs] = useState([]);

  useEffect(() => subscribeDebugLogs(setLogs), []);

  const preview = useMemo(() => logs.slice(0, 6), [logs]);

  if (!SHOW_DEBUG_OVERLAY) return null;

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <View style={styles.card}>
        <TouchableOpacity onPress={() => setExpanded((v) => !v)} style={styles.header}>
          <Text style={styles.title}>Debug API ({expanded ? 'nascondi' : 'mostra'})</Text>
          <Text style={styles.subtitle}>target={API_TARGET}</Text>
          <Text style={styles.baseUrl} numberOfLines={1}>base={API_BASE_URL}</Text>
        </TouchableOpacity>

        {expanded ? (
          <ScrollView style={styles.logList} contentContainerStyle={{ paddingBottom: 8 }}>
            {preview.length === 0 ? (
              <Text style={styles.empty}>Nessun log ancora.</Text>
            ) : (
              preview.map((log) => (
                <View key={log.id} style={styles.logItem}>
                  <Text style={styles.logTime}>{shortTimestamp(log.timestamp)} - {log.message}</Text>
                  {!!formatDetails(log.details) && (
                    <Text style={styles.logDetails}>{formatDetails(log.details)}</Text>
                  )}
                </View>
              ))
            )}
          </ScrollView>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 70,
  },
  card: {
    backgroundColor: '#0f172aee',
    borderRadius: 10,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
  },
  title: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '700',
  },
  subtitle: {
    color: '#a5b4fc',
    fontSize: 11,
  },
  baseUrl: {
    color: '#93c5fd',
    fontSize: 10,
  },
  logList: {
    maxHeight: 170,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  empty: {
    color: '#cbd5e1',
    fontSize: 11,
    padding: 10,
  },
  logItem: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  logTime: {
    color: '#f8fafc',
    fontSize: 11,
    fontWeight: '600',
  },
  logDetails: {
    color: '#cbd5e1',
    fontSize: 10,
    marginTop: 2,
  },
});

