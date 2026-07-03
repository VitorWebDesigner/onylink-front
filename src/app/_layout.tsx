import '../theme/global.css';
import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { queryClient } from '../lib/queryClient';
import { useAuth } from '../store/auth';
import { ToastProvider } from '../components/feedback/toast';
import { DialogProvider } from '../components/feedback/dialog';
import { FollowFlowProvider } from '../components/follow/FollowFlowProvider';
import { ReactionPickerProvider } from '../components/reactions/ReactionPickerProvider';
import { MediaViewerProvider } from '../components/media/MediaViewerProvider';

/** Redireciona entre área autenticada e pública conforme o status da sessão. */
function AuthGate() {
  const status = useAuth((s) => s.status);
  const bootstrap = useAuth((s) => s.bootstrap);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (status === 'loading') return;
    const inAuthArea = segments[0] === '(auth)';
    // Só guardamos o guest. A navegação de quem está logado é explícita
    // (login → feed, register → diagnóstico) para não competir com o funil
    // de aquisição: register → onboarding/diagnóstico (CLAUDE.md §8).
    if (status === 'guest' && !inAuthArea) router.replace('/(auth)/login');
  }, [status, segments, router]);

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#fff' } }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(onboarding)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="post/[id]" />
      <Stack.Screen name="user/[id]" />
      <Stack.Screen name="profile/edit" />
      <Stack.Screen name="profile/insights" />
      <Stack.Screen name="profile/settings" />
      <Stack.Screen name="group/[id]" />
      <Stack.Screen name="opportunity/[id]" />
      <Stack.Screen name="opportunity/apply/[id]" options={{ presentation: 'modal' }} />
      <Stack.Screen name="opportunity/applications/[id]" />
      <Stack.Screen name="compose" options={{ presentation: 'modal' }} />
      <Stack.Screen name="camera" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="search" />
      <Stack.Screen name="opportunity/new" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <DialogProvider>
              <FollowFlowProvider>
                <ReactionPickerProvider>
                  <MediaViewerProvider>
                    <StatusBar style="dark" />
                    <AuthGate />
                  </MediaViewerProvider>
                </ReactionPickerProvider>
              </FollowFlowProvider>
            </DialogProvider>
          </ToastProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
