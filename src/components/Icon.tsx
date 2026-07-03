import type { ComponentType } from 'react';
import * as Iconly from 'react-native-iconly';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

/**
 * Ícone único do app — biblioteca **Iconly** (react-native-iconly).
 * Use SEMPRE `<Icon name=... />`, nunca importe ícones soltos nas telas.
 * Exceções (sem equivalente no Iconly) caem no Ionicons: `insight` (lâmpada),
 * `menu` (hambúrguer). Ver CLAUDE.md §13.
 */
export type IconName =
  | 'home' | 'groups' | 'work' | 'message' | 'user'
  | 'plus' | 'heart' | 'comment' | 'repost' | 'send' | 'bookmark' | 'chat' | 'search' | 'insight'
  | 'back' | 'forward' | 'location' | 'bell' | 'more' | 'edit' | 'logout' | 'menu'
  | 'verified' | 'connector' | 'authority'
  | 'info' | 'success' | 'error'
  | 'document' | 'paper' | 'image' | 'camera'
  | 'bag' | 'wallet' | 'chart' | 'calendar'
  | 'sticker' | 'expand' | 'reply' | 'close' | 'video'
  | 'volumeOn' | 'volumeOff' | 'play' | 'pause' | 'eye' | 'trash'
  | 'link' | 'whatsapp' | 'globe';

export type IconSet = 'bold' | 'light' | 'bulk' | 'broken' | 'two-tone' | 'curved';

// Exceções renderizadas com Ionicons (Iconly não tem).
const IONICON: Partial<Record<IconName, keyof typeof Ionicons.glyphMap>> = {
  insight: 'bulb-outline',
  menu: 'menu-outline',
  more: 'ellipsis-horizontal',
  sticker: 'happy-outline',
  expand: 'expand-outline',
  reply: 'arrow-undo-outline',
  close: 'close',
  video: 'videocam-outline',
  volumeOn: 'volume-high',
  volumeOff: 'volume-mute',
  play: 'play',
  pause: 'pause',
  link: 'link-outline',
  whatsapp: 'logo-whatsapp',
  globe: 'globe-outline',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MAP: Partial<Record<IconName, ComponentType<any>>> = {
  home: Iconly.Home, groups: Iconly.People, work: Iconly.Work, message: Iconly.Message, user: Iconly.User,
  plus: Iconly.Plus, heart: Iconly.Heart, comment: Iconly.Chat, repost: Iconly.Swap, send: Iconly.Send, bookmark: Iconly.Bookmark, chat: Iconly.Chat, search: Iconly.Search,
  back: Iconly.ChevronLeft, forward: Iconly.ChevronRight, location: Iconly.Location, bell: Iconly.Notification, more: Iconly.MoreCircle, edit: Iconly.Edit, logout: Iconly.Logout,
  verified: Iconly.ShieldDone, connector: Iconly.People, authority: Iconly.Star,
  info: Iconly.InfoCircle, success: Iconly.TickSquare, error: Iconly.Danger,
  document: Iconly.Document, paper: Iconly.Paper, image: Iconly.Image, camera: Iconly.Camera,
  bag: Iconly.Bag, wallet: Iconly.Wallet, chart: Iconly.Chart, calendar: Iconly.Calendar,
  eye: Iconly.Show, trash: Iconly.Delete,
};

interface Props {
  name: IconName;
  size?: number;
  color?: string;
  /** 'bold' (cheio, padrão) ou 'light' (linha). Ignorado nas exceções Ionicons. */
  set?: IconSet;
  filled?: boolean;
}

export function Icon({ name, size = 24, color = colors.ink[900], set = 'bold', filled }: Props) {
  const ion = IONICON[name];
  if (ion) return <Ionicons name={ion} size={size} color={color} />;
  const C = MAP[name];
  if (!C) return null;
  return <C size={size} primaryColor={color} set={set} filled={filled} />;
}
