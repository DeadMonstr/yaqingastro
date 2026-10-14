const TRANSLIT = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh', з: 'z', и: 'i', й: 'y',
  к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
  х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
  ў: 'o', қ: 'q', ғ: 'g', ҳ: 'h'
}

const MAX_LENGTH = 60
const FALLBACK = 'category'

export function slugify(text) {
  const slug = String(text ?? '')
    .toLowerCase()
    .replace(/[а-яёўқғҳ]/g, ch => TRANSLIT[ch])
    .replace(/[’‘'ʻʼ`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_LENGTH)
    .replace(/-+$/, '')
  return slug || FALLBACK
}

export function uniqueSlug(base, isTaken) {
  if (!isTaken(base)) return base
  for (let n = 2; ; n++) {
    const candidate = `${base}-${n}`
    if (!isTaken(candidate)) return candidate
  }
}
