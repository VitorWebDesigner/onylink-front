import { Redirect } from 'expo-router';

/** Grupos virou uma aba dentro de Mensagens. Mantido só como redirect. */
export default function GroupsTab() {
  return <Redirect href="/(tabs)/messages" />;
}
