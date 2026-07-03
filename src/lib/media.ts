import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { api } from './api';
import { config } from './config';

/** URL de vídeo vem RELATIVA (proxy HLS no backend) — prefixa a apiUrl do app. */
export function absoluteMediaUrl(url: string): string {
  return /^https?:/.test(url) ? url : `${config.apiUrl}${url}`;
}

export interface UploadedMedia {
  type: 'IMAGE';
  path: string;
  url: string;
}

/**
 * O pull zone da Bunny Stream bloqueia requisição sem `Referer`. Players nativos
 * não mandam referer → 403. Passamos o próprio origin da URL como Referer (o
 * AVPlayer/ExoPlayer propaga pro manifesto E segmentos). Ideal: o dono também
 * liberar "no-referrer" no painel da Bunny.
 */
export function bunnyReferer(uri: string): string | undefined {
  const m = uri.match(/^https?:\/\/[^/]+/);
  return m ? `${m[0]}/` : undefined;
}
export function bunnyHeaders(uri: string): Record<string, string> | undefined {
  const ref = bunnyReferer(uri);
  return ref ? { Referer: ref } : undefined;
}

/** Tipo de imagem = pasta de destino (bate com a taxonomia do backend). */
export type ImageKind =
  | 'avatar' | 'cover' | 'companyLogo'
  | 'postImage' | 'commentImage' | 'opportunityImage' | 'storyImage' | 'messageImage';

/** Abre a galeria (seleção múltipla) e devolve as URIs locais escolhidas. */
export async function pickImages(limit: number): Promise<string[]> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new Error('Permita o acesso à galeria para adicionar fotos.');
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: Math.max(1, limit),
    quality: 1,
  });
  if (res.canceled) return [];
  return res.assets.map((a) => a.uri);
}

/**
 * Comprime/redimensiona (máx 1080px, JPEG q0.7) e sobe pro backend (Bunny),
 * devolvendo o caminho + URL pública. Compressão no cliente mantém o base64 leve.
 */
export async function uploadImage(uri: string, kind: ImageKind = 'postImage'): Promise<UploadedMedia> {
  const out = await manipulateAsync(uri, [{ resize: { width: 1080 } }], {
    compress: 0.7,
    format: SaveFormat.JPEG,
    base64: true,
  });
  if (!out.base64) throw new Error('Falha ao processar a imagem.');
  return api.post<UploadedMedia>('/web/media/image', { data: out.base64, contentType: 'image/jpeg', kind });
}
