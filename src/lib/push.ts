import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { api } from './api';
import { config } from './config';

/**
 * Push (Expo Push Service). Fluxo: pede permissão → pega o ExpoPushToken →
 * registra no back (POST /web/notifications/push-token). O back enfileira o
 * envio no BullMQ quando uma notificação in-app é criada.
 *
 * ⚠️ Expo Go NÃO recebe push remoto (SDK 53+): o registro só funciona em
 * DEVELOPMENT BUILD / build de loja. Aqui tudo é best-effort e silencioso —
 * no Expo Go simplesmente não registra.
 */

// como exibir push com o app ABERTO (banner discreto, sem som)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
});

let currentToken: string | null = null;

/** projectId do EAS (aparece no app.json/app.config depois do `eas init`). */
function easProjectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId;
}

/** Registra o aparelho para push. Chame após autenticar. */
export async function registerPush(): Promise<void> {
  try {
    if (config.mock.notifications || !Device.isDevice) return;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Notificações',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    const perm = await Notifications.getPermissionsAsync();
    const granted = perm.granted || (await Notifications.requestPermissionsAsync()).granted;
    if (!granted) return;

    const projectId = easProjectId();
    if (!projectId) return; // ainda sem `eas init` → não há como gerar token

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    currentToken = token;
    await api.post('/web/notifications/push-token', { token, platform: Platform.OS });
  } catch {
    // best-effort: Expo Go / permissão negada / sem rede — nunca quebra o login
  }
}

/** Desregistra o aparelho (chame ANTES de limpar a sessão no logout). */
export async function unregisterPush(): Promise<void> {
  try {
    if (!currentToken) return;
    await api.delete('/web/notifications/push-token', { token: currentToken, platform: Platform.OS });
    currentToken = null;
  } catch {
    // best-effort
  }
}
