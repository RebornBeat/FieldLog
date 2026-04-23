import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { AppProvider, useApp } from '../src/context/AppContext';
import { Toast } from '../src/components/common/UI';
import { Colors } from '../src/constants/colors';

function NotificationOverlay() {
  const { state, dispatch } = useApp();
  if (!state.notifications.length) return null;
  return (
    <View style={styles.notifContainer} pointerEvents="box-none">
      {state.notifications.map(n => (
        <Toast
          key={n.id}
          notif={n}
          onDismiss={() => dispatch({ type: 'REMOVE_NOTIF', payload: n.id })}
        />
      ))}
    </View>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProvider>
          <StatusBar style="light" backgroundColor={Colors.bg.void} />
          <Stack
            screenOptions={{
              headerShown:       false,
              contentStyle:      { backgroundColor: Colors.bg.base },
              animation:         'slide_from_right',
              animationDuration: 220,
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="stratum/[id]"
              options={{
                headerShown:   false,
                presentation:  'card',
                animation:     'slide_from_right',
              }}
            />
            <Stack.Screen
              name="new-stratum"
              options={{
                headerShown:   false,
                presentation:  'modal',
                animation:     'slide_from_bottom',
              }}
            />
            <Stack.Screen
              name="scheme-editor"
              options={{
                headerShown:   false,
                presentation:  'modal',
                animation:     'slide_from_bottom',
              }}
            />
          </Stack>
          <NotificationOverlay />
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  notifContainer: {
    position:  'absolute',
    bottom:    80,
    left:      16,
    right:     16,
    zIndex:    9999,
    pointerEvents: 'none',
  },
});
