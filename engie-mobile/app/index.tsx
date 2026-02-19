import React, { useEffect, useCallback } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { useNavigation, useFocusEffect } from 'expo-router';
import { MessageList } from '../src/components/MessageList';
import { ChatInput } from '../src/components/ChatInput';
import { ConnectionBadge } from '../src/components/ConnectionBadge';
import { useOpenClaw } from '../src/hooks/useOpenClaw';
import { colors } from '../src/theme/colors';

export default function ChatScreen() {
  const { messages, streamText, busy, connectionState, error, sendMessage, reconnect } = useOpenClaw();
  const navigation = useNavigation();

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
        <MessageList messages={messages} streamText={streamText} busy={busy} />
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
