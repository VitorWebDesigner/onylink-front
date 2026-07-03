import { Stack } from 'expo-router';

/** Layout do grupo de autenticação (login, register, forgot). */
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#fff' } }} />;
}
