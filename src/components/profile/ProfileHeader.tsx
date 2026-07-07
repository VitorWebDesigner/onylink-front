import { useState, type ReactNode } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Avatar } from '../Avatar';
import { Badge } from '../Badge';
import { BottomSheet } from '../BottomSheet';
import { Chip } from '../Chip';
import { Icon } from '../Icon';
import { colors } from '../../theme/colors';
import { PRESSED_OPACITY } from '../../theme/tokens';
import type { UserProfile } from '../../features/users/hooks';

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
function since(createdAt: string | null): string | null {
  if (!createdAt) return null;
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return null;
  return `No OnyLink desde ${MONTHS[d.getMonth()]}/${d.getFullYear()}`;
}

const openUrl = (url: string) => { void Linking.openURL(/^https?:/i.test(url) ? url : `https://${url}`); };

/** Bio com URLs e @MENÇÕES clicáveis (URL abre no navegador; @handle abre o perfil).
 *  Linkifica também domínio SEM https:// (ex.: suaempresa.com.br). */
function BioText({ text }: { text: string }) {
  const router = useRouter();
  const parts = text.split(/(https?:\/\/\S+|www\.\S+|@[a-z0-9_.]+|\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}(?:\/\S*)?)/gi);
  return (
    <Text className="text-ink-700 leading-5 pt-2">
      {parts.map((part, i) => {
        if (part && /^(https?:\/\/|www\.)/i.test(part)) {
          return (
            <Text key={i} className="text-brand-500 font-semibold" suppressHighlighting onPress={() => openUrl(part)}>
              {part}
            </Text>
          );
        }
        if (part && /^@[a-z0-9_.]+$/i.test(part)) {
          // rota aceita handle: GET /web/users/:idOuHandle (a tela resolve o id real)
          return (
            <Text
              key={i}
              className="text-brand-500 font-semibold"
              suppressHighlighting
              onPress={() => router.push({ pathname: '/user/[id]', params: { id: part.slice(1).toLowerCase() } })}
            >
              {part}
            </Text>
          );
        }
        // domínio nu (suaempresa.com.br) — openUrl prefixa https://
        if (part && /^[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}(?:\/\S*)?$/i.test(part)) {
          return (
            <Text key={i} className="text-brand-500 font-semibold" suppressHighlighting onPress={() => openUrl(part)}>
              {part}
            </Text>
          );
        }
        return part;
      })}
    </Text>
  );
}

function MetaRow({ icon, text }: { icon: Parameters<typeof Icon>[0]['name']; text: string }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <Icon name={icon} set="light" size={14} color={colors.ink[500]} />
      <Text className="text-ink-500 text-[13px]">{text}</Text>
    </View>
  );
}

/**
 * Cabeçalho do perfil (próprio E público) — "melhor dos 3 mundos" (plano-perfil.md):
 * capa com avatar sobreposto (X), bio + links (IG), metadados com ícone (X),
 * interesses (Threads), stats row pública posts·seguidores·seguindo (decisões §5).
 * Botões de ação vêm no slot `actions` (cada tela decide os seus).
 */
export function ProfileHeader({ p, actions, onPressFollowers, onPressFollowing }: {
  p: UserProfile;
  actions?: ReactNode;
  onPressFollowers?: () => void;
  onPressFollowing?: () => void;
}) {
  const where = [p.city, p.state].filter(Boolean).join(' · ');
  const joined = since(p.createdAt);
  const [seloOpen, setSeloOpen] = useState(false);

  return (
    <View>
      {/* capa edge-to-edge; sem capa → faixa navy suave */}
      <View className="h-36" style={{ backgroundColor: p.coverPath ? undefined : 'rgba(10,16,48,0.06)' }}>
        {p.coverPath ? <Image source={{ uri: p.coverPath }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : null}
      </View>

      <View className="px-4">
        {/* avatar sobreposto à capa (estilo X) */}
        <View className="-mt-10 self-start rounded-full border-4 border-surface bg-surface">
          <Avatar name={p.name} uri={p.avatarPath} size="xl" />
        </View>

        <View className="gap-0.5 pt-2">
          <View className="flex-row items-center gap-1.5">
            <Text className="text-ink-900 font-extrabold text-[22px] shrink" numberOfLines={1}>{p.name}</Text>
            {/* selo de ADMIN do app (navy) antes do verificado (lime) */}
            {p.admin ? <Icon name="verified" set="bold" size={19} color={colors.brand[500]} /> : null}
            {p.verified ? (
              <Pressable onPress={() => setSeloOpen(true)} hitSlop={8} style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}>
                <Icon name="verified" set="bold" size={19} color={colors.accent[500]} />
              </Pressable>
            ) : null}
          </View>
          <Text className="text-ink-400 text-sm">@{p.handle}</Text>
          {p.roleTitle || p.companyName ? (
            <Text className="text-ink-700 text-sm pt-0.5">{[p.roleTitle, p.companyName].filter(Boolean).join(' · ')}</Text>
          ) : null}
        </View>

        {/* selos automáticos por regra (Fase 4) */}
        {p.badgeConnector || p.badgeAuthority ? (
          <View className="flex-row flex-wrap gap-2 pt-2">
            {p.badgeConnector ? <Badge label="Conector" icon="connector" tone="accent" /> : null}
            {p.badgeAuthority ? <Badge label="Autoridade" icon="authority" tone="navy" /> : null}
          </View>
        ) : null}

        {p.bio ? <BioText text={p.bio} /> : null}

        {/* links externos (profiles.links) */}
        {p.links.length ? (
          <View className="flex-row flex-wrap gap-x-4 gap-y-1 pt-2">
            {p.links.map((l) => (
              <Pressable key={l.url} onPress={() => openUrl(l.url)} hitSlop={6} style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}>
                <View className="flex-row items-center gap-1">
                  <Icon name="link" size={14} color={colors.brand[500]} />
                  <Text className="text-brand-500 text-[13px] font-semibold">{l.label || l.url.replace(/^https?:\/\//i, '')}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        ) : null}

        {/* metadados com ícone (estilo X) */}
        <View className="flex-row flex-wrap gap-x-4 gap-y-1 pt-2">
          {where ? <MetaRow icon="location" text={where} /> : null}
          {p.segment ? <MetaRow icon="work" text={p.segment} /> : null}
          {joined ? <MetaRow icon="calendar" text={joined} /> : null}
        </View>

        {/* interesses (estilo Threads) — leitura; editor vem na Fase 4 */}
        {p.interests.length ? (
          <View className="flex-row flex-wrap gap-2 pt-3">
            {p.interests.map((i) => <Chip key={i} label={`#${i}`} />)}
          </View>
        ) : null}

        {/* stats row pública (decisão §5.2/5.5: sem pontos; seguindo público).
            Seguidores/seguindo tocáveis → listas (Fase 3). */}
        <View className="flex-row items-center gap-4 pt-3">
          <Text className="text-ink-500 text-sm"><Text className="text-ink-900 font-bold">{p.postsCount.toLocaleString('pt-BR')}</Text> publicações</Text>
          <Pressable onPress={onPressFollowers} hitSlop={6} style={({ pressed }) => ({ opacity: pressed && onPressFollowers ? PRESSED_OPACITY : 1 })}>
            <Text className="text-ink-500 text-sm"><Text className="text-ink-900 font-bold">{p.followersCount.toLocaleString('pt-BR')}</Text> seguidores</Text>
          </Pressable>
          <Pressable onPress={onPressFollowing} hitSlop={6} style={({ pressed }) => ({ opacity: pressed && onPressFollowing ? PRESSED_OPACITY : 1 })}>
            <Text className="text-ink-500 text-sm"><Text className="text-ink-900 font-bold">{p.followingCount.toLocaleString('pt-BR')}</Text> seguindo</Text>
          </Pressable>
        </View>

        {actions ? <View className="pt-4">{actions}</View> : null}
      </View>

      {/* info do selo de verificação (toque no selo) */}
      <BottomSheet visible={seloOpen} onClose={() => setSeloOpen(false)}>
        <View className="items-center gap-3 px-6 pb-4">
          <Icon name="verified" set="bold" size={44} color={colors.accent[500]} />
          <Text className="text-ink-900 text-lg font-extrabold">Conta verificada</Text>
          <Text className="text-ink-500 text-sm leading-5 text-center">
            Este perfil teve a identidade confirmada pelo OnyLink. O selo ajuda a
            comunidade a reconhecer empresários e empresas reais, dando mais
            credibilidade a conexões e negócios.
          </Text>
        </View>
      </BottomSheet>
    </View>
  );
}
