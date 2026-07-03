import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Base64 } from 'js-base64';
import { api } from './api';

interface VideoUploadAuth {
  endpoint: string;
  libraryId: string | number;
  videoId: string;
  signature: string;
  expiration: number;
  collectionId: string;
}

/** Abre a galeria e devolve a URI local do vídeo escolhido. */
export async function pickVideo(): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new Error('Permita o acesso à galeria para adicionar vídeo.');
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], allowsMultipleSelection: false, quality: 1 });
  if (res.canceled) return null;
  return res.assets[0]?.uri ?? null;
}

/** Abre a galeria (seleção MÚLTIPLA) e devolve as URIs locais dos vídeos escolhidos. */
export async function pickVideos(limit: number): Promise<string[]> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new Error('Permita o acesso à galeria para adicionar vídeo.');
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], allowsMultipleSelection: true, selectionLimit: Math.max(1, limit), quality: 1 });
  if (res.canceled) return [];
  return res.assets.map((a) => a.uri);
}

/**
 * Cria o vídeo no Bunny Stream (backend, na coleção do usuário) e sobe os bytes
 * DIRETO pro Bunny via TUS presigned. Devolve o GUID (vira post_media.path).
 *
 * TUS feito "à mão" (POST de criação + UM PATCH) com `FileSystem.createUploadTask`,
 * que STREAMA o arquivo do disco. O tus-js-client em RN materializava o arquivo
 * inteiro como Blob em memória — vídeo curto da câmera passava, vídeo da galeria
 * (maior) falhava. Bônus: progresso REAL byte a byte nos dois casos.
 */
export async function uploadVideo(uri: string, onProgress?: (pct: number) => void): Promise<{ type: 'VIDEO'; path: string }> {
  const auth = await api.post<VideoUploadAuth>('/web/media/video/create', { kind: 'postVideo' });

  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists || !info.size) throw new Error('Não foi possível ler o vídeo selecionado.');

  const authHeaders = {
    AuthorizationSignature: auth.signature,
    AuthorizationExpire: String(auth.expiration),
    VideoId: auth.videoId,
    LibraryId: String(auth.libraryId),
  };

  // criação TUS → Location da sessão de upload
  const meta: Record<string, string> = { filetype: 'video/mp4', title: auth.videoId, collection: auth.collectionId };
  const createRes = await fetch(auth.endpoint, {
    method: 'POST',
    headers: {
      ...authHeaders,
      'Tus-Resumable': '1.0.0',
      'Upload-Length': String(info.size),
      'Upload-Metadata': Object.entries(meta).map(([k, v]) => `${k} ${Base64.encode(v)}`).join(','),
    },
  });
  const location = createRes.headers.get('location');
  if (createRes.status !== 201 || !location) throw new Error('Falha ao iniciar o upload do vídeo.');
  const origin = auth.endpoint.match(/^https?:\/\/[^/]+/)?.[0] ?? '';
  const uploadUrl = /^https?:/i.test(location) ? location : `${origin}${location.startsWith('/') ? '' : '/'}${location}`;

  // PATCH único streamado do disco (arquivo grande da galeria não passa pela RAM)
  const task = FileSystem.createUploadTask(
    uploadUrl,
    uri,
    {
      httpMethod: 'PATCH',
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: {
        ...authHeaders,
        'Tus-Resumable': '1.0.0',
        'Upload-Offset': '0',
        'Content-Type': 'application/offset+octet-stream',
      },
    },
    (p) => { if (p.totalBytesExpectedToSend > 0) onProgress?.(p.totalBytesSent / p.totalBytesExpectedToSend); },
  );
  const res = await task.uploadAsync();
  if (!res || res.status < 200 || res.status >= 300) throw new Error('Falha ao enviar o vídeo. Tente novamente.');

  return { type: 'VIDEO', path: auth.videoId };
}
