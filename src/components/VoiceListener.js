import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, PermissionsAndroid } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';
import { isRunningInExpoGo } from 'expo';

const SPEECH_ACTION = 'android.speech.action.RECOGNIZE_SPEECH';
const EXTRA_RESULTS = 'android.speech.extra.RESULTS';

async function ensureMicPermission() {
  if (Platform.OS !== 'android') return true;
  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    {
      title: 'Microphone',
      message: 'Ledger needs the microphone for voice expense entry.',
      buttonPositive: 'Allow',
      buttonNegative: 'Cancel',
    },
  );
  return granted === PermissionsAndroid.RESULTS.GRANTED;
}

function extractTranscript(extra) {
  if (!extra || typeof extra !== 'object') return null;

  const candidates = [
    extra[EXTRA_RESULTS],
    extra.results,
    ...Object.entries(extra)
      .filter(([key]) => key.includes('RESULTS'))
      .map(([, val]) => val),
  ];

  for (const results of candidates) {
    if (Array.isArray(results) && results[0]) return String(results[0]);
    if (typeof results === 'string' && results.trim()) return results.trim();
    if (results && typeof results === 'object') {
      const first = results[0] ?? results['0'] ?? Object.values(results)[0];
      if (first) return String(first);
    }
  }
  return null;
}

async function listenWithAndroidIntent() {
  const result = await IntentLauncher.startActivityAsync(SPEECH_ACTION, {
    extra: {
      'android.speech.extra.LANGUAGE_MODEL': 'free_form',
      'android.speech.extra.LANGUAGE': 'en-IN',
      'android.speech.extra.PROMPT': 'Say your expense — e.g. Spent 350 on lunch',
      'android.speech.extra.MAX_RESULTS': 1,
    },
  });

  if (result.resultCode === IntentLauncher.ResultCode.Canceled) {
    return { canceled: true };
  }

  const transcript = extractTranscript(result.extra);
  if (!transcript) {
    return { error: 'No speech detected — try again' };
  }
  return { transcript };
}

async function listenWithNativeModule(onPartial) {
  const mod = await import('expo-speech-recognition');
  const { ExpoSpeechRecognitionModule } = mod;

  const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
  if (!perm.granted) {
    return { error: 'Microphone permission is required for voice entry' };
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      try { ExpoSpeechRecognitionModule.stop(); } catch { /* ignore */ }
      resultSub?.remove();
      errorSub?.remove();
      endSub?.remove();
      resolve(value);
    };

    const resultSub = ExpoSpeechRecognitionModule.addListener('result', (event) => {
      const text = event.results?.[0]?.transcript;
      if (!text) return;
      if (event.isFinal) finish({ transcript: text });
      else onPartial?.(text);
    });
    const errorSub = ExpoSpeechRecognitionModule.addListener('error', (event) => {
      finish({ error: event.error === 'no-speech' ? 'No speech detected — try again' : 'Could not hear you — try again' });
    });
    const endSub = ExpoSpeechRecognitionModule.addListener('end', () => {
      finish({ error: 'No speech detected — try again' });
    });

    ExpoSpeechRecognitionModule.start({
      lang: 'en-IN',
      interimResults: true,
      continuous: false,
    });
  });
}

export function VoiceListener({ theme, onTranscript, onError }) {
  const [listening, setListening] = useState(false);
  const [lastHeard, setLastHeard] = useState('');

  const startListening = async () => {
    setListening(true);
    setLastHeard('');

    try {
      const micOk = await ensureMicPermission();
      if (!micOk) {
        onError?.('Microphone permission is required for voice entry');
        return;
      }

      let outcome;
      if (Platform.OS === 'android') {
        outcome = await listenWithAndroidIntent();
      } else if (!isRunningInExpoGo()) {
        outcome = await listenWithNativeModule((text) => setLastHeard(text));
      } else {
        onError?.('Voice entry on iPhone needs the Ledger app install — type below for now.');
        return;
      }

      if (outcome.canceled) return;
      if (outcome.error) {
        onError?.(outcome.error);
        return;
      }
      if (outcome.transcript) {
        setLastHeard(outcome.transcript);
        onTranscript?.(outcome.transcript);
      }
    } catch (err) {
      onError?.('Voice not available on this device — type your expense below.');
    } finally {
      setListening(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        style={[
          styles.btn,
          { backgroundColor: listening ? theme.goldDeep : theme.ink, borderColor: theme.line },
        ]}
        onPress={startListening}
        disabled={listening}
        activeOpacity={0.85}
      >
        <Text style={[styles.btnText, { color: theme.paper }]}>
          {listening ? '⏳ Listening…' : '🎙 Tap to speak'}
        </Text>
      </TouchableOpacity>

      <Text style={[styles.status, { color: theme.muted }]}>
        {Platform.OS === 'android'
          ? 'Opens Google voice — speak, then tap the checkmark. Or type below.'
          : 'Tap to speak, or type your expense below.'}
      </Text>

      {lastHeard ? (
        <Text style={[styles.heard, { color: theme.gold }]}>
          Heard: “{lastHeard}”
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 20, marginBottom: 16 },
  btn: { paddingVertical: 16, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
  btnText: { fontSize: 16, fontWeight: '700' },
  status: { marginTop: 10, fontSize: 13, lineHeight: 18, textAlign: 'center' },
  heard: { marginTop: 10, fontSize: 14, lineHeight: 20, textAlign: 'center', fontWeight: '600' },
});
