import { sha256 } from 'js-sha256';
import { Base64 } from 'js-base64';
import { config } from './config';

/**
 * Envelope payload-in-JWT do OnyLink (ver CLAUDE.md §5.1).
 * O backend usa jwt.sign({ d: data }, TRANSPORT_SECRET) com HS256.
 * Aqui implementamos HS256 em JS puro (RN-safe) para assinar requests e
 * apenas decodificamos as responses (a verificação é responsabilidade do TLS+server).
 */

const b64url = (s: string): string => Base64.encodeURI(s);

function hmacSha256Base64Url(message: string, secret: string): string {
  // js-sha256 devolve array de bytes; convertemos para base64url.
  const bytes = sha256.hmac.array(secret, message);
  return Base64.fromUint8Array(Uint8Array.from(bytes), true); // true = url-safe, sem padding
}

/** Assina { d: data } como JWT HS256 com exp de 10 min (igual ao backend). */
export function encodeRequest(data: unknown): string {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const payload = b64url(JSON.stringify({ d: data, iat: now, exp: now + 600 }));
  const signingInput = `${header}.${payload}`;
  const signature = hmacSha256Base64Url(signingInput, config.transportSecret);
  return `${signingInput}.${signature}`;
}

export interface DecodedResponse<T = unknown> {
  boleano: boolean;
  obj: T;
  mensagem: string;
}

/** Decodifica o JWT da response (sem verificar) e devolve { boleano, obj, mensagem }. */
export function decodeResponse<T = unknown>(jwtToken: string): DecodedResponse<T> {
  const parts = jwtToken.split('.');
  if (parts.length < 2) throw new Error('Resposta malformada');
  const json = Base64.decode(parts[1]);
  const parsed = JSON.parse(json) as { d: DecodedResponse<T> };
  return parsed.d;
}
