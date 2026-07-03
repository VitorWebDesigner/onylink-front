import { Redirect } from 'expo-router';

/** A navegação real é decidida pelo AuthGate em _layout.tsx. */
export default function Index() {
  return <Redirect href="/(tabs)/feed" />;
}
