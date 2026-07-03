import { useState } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../../components/Screen';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { TextLink } from '../../components/TextLink';
import { Logo } from '../../components/Logo';
import { SocialButton } from '../../components/SocialButton';
import { useToast } from '../../components/feedback/toast';
import { useAuth } from '../../store/auth';
import { ApiError } from '../../lib/api';

export default function Login() {
  const login = useAuth((s) => s.login);
  const router = useRouter();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace('/(tabs)/feed');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.mensagem : 'Falha ao entrar.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen className="justify-center gap-8">
      <View className="gap-2">
        <Logo size="lg" />
        <Text className="text-ink-500 text-sm">Menos distração. Mais negócio.</Text>
      </View>

      <View className="gap-4">
        <Input label="E-mail" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} placeholder="voce@empresa.com" />
        <Input label="Senha" secureTextEntry value={password} onChangeText={setPassword} placeholder="••••••••" />
        <Button title="Entrar" variant="accent" onPress={onSubmit} loading={loading} />
        <View className="flex-row items-center justify-between">
          <TextLink href="/(auth)/forgot" tone="muted">Esqueci a senha</TextLink>
          <TextLink href="/(auth)/register">Criar conta</TextLink>
        </View>
      </View>

      <View className="flex-row items-center gap-3">
        <View className="flex-1 h-px bg-surface-border" />
        <Text className="text-ink-400 text-xs">ou continue com</Text>
        <View className="flex-1 h-px bg-surface-border" />
      </View>

      <View className="flex-row items-center justify-center gap-5">
        <SocialButton provider="google" onPress={() => toast.info('Login com Google em breve.')} />
        <SocialButton provider="apple" onPress={() => toast.info('Login com Apple em breve.')} />
      </View>
    </Screen>
  );
}
