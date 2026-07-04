import { Redirect } from 'expo-router';

/** Comunidades viraram aba dentro de Mensagens (decisão do dono). Redirect mantido. */
export default function GroupsTab() {
  return <Redirect href="/(tabs)/messages" />;
}
