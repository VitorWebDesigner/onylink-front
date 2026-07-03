import { useState } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../../components/Screen';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { TextLink } from '../../components/TextLink';
import { useToast } from '../../components/feedback/toast';
import { api, ApiError } from '../../lib/api';

/**
 * Recuperação de senha em 2 passos (CLAUDE.md §6):
 *  1. pede e-mail → backend envia código TOTP (step 600s) por e-mail.
 *  2. usuário informa código (6 dígitos) + nova senha.
 */
export default function Forgot() {
  const router = useRouter();
  const toast = useToast();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function requestCode() {
    setLoading(true);
    try {
      await api.post('/web/auth/forgot_pass', { email: email.trim() });
      setStep('code');
      toast.info('Enviamos um código de 6 dígitos para o seu e-mail.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.mensagem : 'Falha ao enviar o código.');
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword() {
    setLoading(true);
    try {
      await api.post('/web/auth/new_pass', { email: email.trim(), code: code.trim(), password });
      toast.success('Senha alterada. Faça login com a nova senha.');
      router.replace('/(auth)/login');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.mensagem : 'Falha ao alterar a senha.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen className="justify-center gap-8">
      <View className="gap-1">
        <Text className="text-2xl font-extrabold text-ink-900">Recuperar senha</Text>
        <Text className="text-ink-500 text-sm">
          {step === 'email'
            ? 'Informe seu e-mail para receber um código.'
            : 'Digite o código recebido e a nova senha.'}
        </Text>
      </View>

      {step === 'email' ? (
        <View className="gap-4">
          <Input
            label="E-mail"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            placeholder="voce@empresa.com"
          />
          <Button title="Enviar código" variant="accent" onPress={requestCode} loading={loading} />
        </View>
      ) : (
        <View className="gap-4">
          <Input
            label="Código (6 dígitos)"
            keyboardType="number-pad"
            maxLength={6}
            value={code}
            onChangeText={setCode}
            placeholder="000000"
          />
          <Input
            label="Nova senha"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            placeholder="mínimo 8 caracteres"
          />
          <Button title="Alterar senha" variant="accent" onPress={resetPassword} loading={loading} />
        </View>
      )}

      <View className="flex-row justify-center">
        <TextLink href="/(auth)/login" tone="muted">Voltar para o login</TextLink>
      </View>
    </Screen>
  );
}
