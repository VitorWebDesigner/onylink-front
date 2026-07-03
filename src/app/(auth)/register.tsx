import { useState } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../../components/Screen';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { TextLink } from '../../components/TextLink';
import { useToast } from '../../components/feedback/toast';
import { useAuth } from '../../store/auth';
import { ApiError } from '../../lib/api';

const HANDLE_RE = /^[a-z0-9._]{3,20}$/;

export default function Register() {
  const register = useAuth((s) => s.register);
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [handle, setHandle] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    if (!HANDLE_RE.test(handle)) {
      toast.error('Escolha um @ válido: 3 a 20 caracteres (letras minúsculas, números, ponto ou _).');
      return;
    }
    setLoading(true);
    try {
      await register({ name: name.trim(), email: email.trim(), handle, password });
      // novo usuário entra pelo diagnóstico (porta de aquisição, CLAUDE.md §8)
      router.replace('/(onboarding)/diagnostic');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.mensagem : 'Falha ao cadastrar.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen className="justify-center gap-8">
      <View className="gap-1">
        <Text className="text-2xl font-extrabold text-ink-900">Criar conta</Text>
        <Text className="text-ink-500 text-sm">Comece pelo diagnóstico da sua empresa.</Text>
      </View>
      <View className="gap-4">
        <Input label="Nome" value={name} onChangeText={setName} placeholder="Seu nome" />
        <Input label="E-mail" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} placeholder="voce@empresa.com" />
        <View className="gap-1">
          <Input
            label="Seu @ (identificador único)"
            autoCapitalize="none"
            autoCorrect={false}
            value={handle}
            onChangeText={(v) => setHandle(v.toLowerCase().replace(/[^a-z0-9._]/g, '').slice(0, 20))}
            placeholder="vitormoura"
          />
          <Text className="text-ink-400 text-xs">Seu identificador na plataforma: @{handle || 'seuhandle'}</Text>
        </View>
        <Input label="Senha" secureTextEntry value={password} onChangeText={setPassword} placeholder="mínimo 8 caracteres" />
        <Button title="Cadastrar" variant="accent" onPress={onSubmit} loading={loading} />
      </View>
      <View className="flex-row justify-center">
        <TextLink href="/(auth)/login">Já tenho conta</TextLink>
      </View>
    </Screen>
  );
}
