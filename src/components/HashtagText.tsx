import { Text } from 'react-native';

// #palavra (aceita acentos pt-BR). Hermes não tem \p{L}, então uso faixa latina.
const HASHTAG = /(#[A-Za-zÀ-ÿ0-9_]+)/g;

interface Props {
  text: string;
  className?: string;
  numberOfLines?: number;
}

/** Renderiza texto destacando #hashtags (cor da marca). */
export function HashtagText({ text, className, numberOfLines }: Props) {
  const parts = text.split(HASHTAG);
  return (
    <Text className={className} numberOfLines={numberOfLines}>
      {parts.map((p, i) =>
        p.startsWith('#') ? (
          <Text key={i} className="text-brand-500 font-semibold">{p}</Text>
        ) : (
          p
        ),
      )}
    </Text>
  );
}
