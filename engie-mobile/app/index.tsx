import React, { useEffect, useCallback, useRef, useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { useNavigation, useFocusEffect } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { MessageList } from '../src/components/MessageList';
import { ChatInput } from '../src/components/ChatInput';
import { ConnectionBadge } from '../src/components/ConnectionBadge';
import { useOpenClaw } from '../src/hooks/useOpenClaw';
import { colors } from '../src/theme/colors';

const ONBOARDED_KEY = 'engie_onboarded';

const WELCOME_MESSAGE = {
  id: 'onboarding-welcome',
  role: 'assistant' as const,
  text: "Hey! I'm Engie — your AI project manager. Tell me about yourself: what's your role, what do you work on, and how you'd like me to help. I'll remember everything.",
  timestamp: Date.now(),
};

export default function ChatScreen() {
  const { messages, streamText, busy, connectionState, error, sendMessage, reconnect } = useOpenClaw();
  const navigation = useNavigation();
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  const onboardCheckDone = useRef(false);

  // Check onboarding status on mount
  useEffect(() => {
    if (onboardCheckDone.current) return;
    onboardCheckDone.current = true;
    SecureStore.getItemAsync(ONBOARDED_KEY).then((val) => {
      setOnboarded(val === 'true');
    });
  }, []);

  // Mark onboarded after first user message
  useEffect(() => {
    if (onboarded === false && messages.some((m) => m.role === 'user')) {
      SecureStore.setItemAsync(ONBOARDED_KEY, 'true');
      setOnboarded(true);
    }
  }, [messages, onboarded]);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => <ConnectionBadge state={connectionState} />,
      headerRightContainerStyle: { paddingRight: 16 },
    });
  }, [navigation, connectionState]);

  // Re-connect when returning from Settings tab
  useFocusEffect(
    useCallback(() => {
      if (connectionState === 'disconnected') {
        reconnect();
      }
    }, [connectionState, reconnect])
  );

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
      >
        <MessageList
          messages={onboarded === false ? [WELCOME_MESSAGE, ...messages] : messages}
          streamText={streamText}
          busy={busy}
        />
        {error && (
          <View style={styles.errorBar}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        <ChatInput
          onSend={sendMessage}
          disabled={busy || connectionState !== 'connected'}
        />
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  flex: {
    flex: 1,
  },
  errorBar: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: colors.bgLight,
  },
  errorText: {
    color: colors.red,
    fontSize: 13,
  },
});
