import { Redirect } from 'expo-router';

/** Rota "fantasma" da aba +. O tabPress é interceptado (abre /compose), então
 *  isto só renderiza se alguém cair aqui direto — manda pro feed. */
export default function CreateTab() {
  return <Redirect href="/(tabs)/feed" />;
}
