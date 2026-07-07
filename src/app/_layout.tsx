import '../theme/global.css';
import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { queryClient } from '../lib/queryClient';
import { startChatSocket, stopChatSocket } from '../lib/chatSocket';
import { useAuth } from '../store/auth';
import { ToastProvider } from '../components/feedback/toast';
import { DialogProvider } from '../components/feedback/dialog';
import { FollowFlowProvider } from '../components/follow/FollowFlowProvider';
import { ReactionPickerProvider } from '../components/reactions/ReactionPickerProvider';
import { MediaViewerProvider } from '../components/media/MediaViewerProvider';

/** Redireciona entre área autenticada e pública conforme o status da sessão. */
function AuthGate() {
  const status = useAuth((s) => s.status);
  const userId = useAuth((s) => s.user?.id ?? null);
  const bootstrap = useAuth((s) => s.bootstrap);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  // WebSocket do chat: liga com a sessão, cai fora no logout
  useEffect(() => {
    if (status === 'authenticated' && userId) startChatSocket(userId);
    else if (status === 'guest') stopChatSocket();
    return () => { if (status === 'authenticated') stopChatSocket(); };
  }, [status, userId]);

  // tocar num PUSH → navega pro deep link (data.url) — inclusive com o app fechado
  useEffect(() => {
    const openFromData = (data: unknown) => {
      const url = (data as { url?: string } | null)?.url;
      if (typeof url === 'string' && url.startsWith('/')) router.push(url as never);
    };
    void Notifications.getLastNotificationResponseAsync().then((r) => {
      if (r) openFromData(r.notification.request.content.data);
    });
    const sub = Notifications.addNotificationResponseReceivedListener((r) => {
      openFromData(r.notification.request.content.data);
    });
    // push RECEBIDO com o app aberto → refetch imediato dos caches sociais:
    // badges (Mensagens/comunidades), sino e feeds refletem NA HORA, sem
    // esperar o próximo polling (exigência de UX do dono — tempo real).
    const recv = Notifications.addNotificationReceivedListener(() => {
      for (const key of [
        ['groups'], ['group'], ['group-posts'],          // comunidades (posts novos, aprovação de entrada)
        ['notifications'], ['notifications-unread'],      // sino
        ['opportunity-applications'], ['my-opportunities'], // candidaturas
        ['user'],                                          // contadores do perfil (follow)
        ['conversations'], ['chat-messages'],              // chat: msg chega JUNTO do push
      ]) void queryClient.invalidateQueries({ queryKey: key });
    });
    return () => { sub.remove(); recv.remove(); };
  }, [router]);

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
      <Stack.Screen name="group/new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="group/edit" />
      <Stack.Screen name="group/details" />
      <Stack.Screen name="chat/[id]" />
      <Stack.Screen name="chat/new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="chat/details" />
      <Stack.Screen name="opportunity/[id]" />
      <Stack.Screen name="opportunity/apply/[id]" options={{ presentation: 'modal' }} />
      <Stack.Screen name="opportunity/applications/[id]" />
      <Stack.Screen name="compose" options={{ presentation: 'modal' }} />
      <Stack.Screen name="camera" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="search" />
      <Stack.Screen name="notifications" />
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
