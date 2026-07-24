import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';

export function StartListeningButton({ theme, onTranscript, onError }) {
  const [listening, setListening] = useState(false);

  useSpeechRecognitionEvent('start', () => setListening(true));
  useSpeechRecognitionEvent('end', () => setListening(false));
  useSpeechRecognitionEvent('result', (event) => {
    const text = event.results?.[0]?.transcript?.trim();
    if (text) onTranscript(text);
  });
  useSpeechRecognitionEvent('error', (event) => {
    setListening(false);
    onError?.(event.message || 'Could not recognize speech');
  });

  const start = async () => {
    const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!result.granted) {
      onError?.('Microphone permission is required for voice entry');
      return;
    }
    ExpoSpeechRecognitionModule.start({
      lang: 'en-IN',
      interimResults: false,
      continuous: false,
    });
  };

  const stop = () => ExpoSpeechRecognitionModule.stop();

  return (
    <TouchableOpacity
      style={[styles.btn, { backgroundColor: listening ? theme.red : theme.gold }]}
      onPress={listening ? stop : start}
      activeOpacity={0.85}
    >
      {listening ? (
        <View style={styles.row}>
          <ActivityIndicator color={theme.inkDeep} size="small" />
          <Text style={[styles.text, { color: theme.inkDeep }]}>  Listening… tap to stop</Text>
        </View>
      ) : (
        <Text style={[styles.text, { color: theme.inkDeep }]}>🎙 Start listening</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: { marginHorizontal: 20, marginBottom: 16, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  text: { fontWeight: '700', fontSize: 16 },
  row: { flexDirection: 'row', alignItems: 'center' },
});
