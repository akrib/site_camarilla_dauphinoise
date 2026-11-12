// =====================================================================
// Compression des textes longs stockés dans Firestore (Unishox2)
//
// Un texte long (descriptif d'action, réponse du conteur, ticket, message…)
// est enregistré soit tel quel (chaîne), soit compressé dans un champ
// « octets » (Bytes) : 1 octet de format, puis les données compressées.
//   format 1 = Unishox2 (préréglage par défaut)
// On ne compresse que si le texte est assez long ET que l'on gagne au moins
// 10 % ; sinon la chaîne est gardée (les anciens documents restent lisibles).
// Chaque compression est vérifiée (décompression et comparaison) avant
// d'être utilisée.
//
// Lecture : donneesDoc(instantané) remplace tous les champs compressés de
// premier niveau par leur texte ; le reste du code manipule des chaînes.
// =====================================================================
import { fs } from './core.js';
import { unishox2_compress_simple, unishox2_decompress_simple } from './lib/unishox2.js';

const FORMAT_UNISHOX2 = 1;
const SEUIL = 160;            // caractères : en dessous, le gain ne vaut pas la peine
const octetsUtf8 = (s) => new TextEncoder().encode(s).length;

// Valeur à enregistrer dans Firestore pour un texte : chaîne ou Bytes.
export function compresser(texte) {
  const s = String(texte == null ? '' : texte);
  if (s.length < SEUIL || s.includes('\u0000')) return s;
  try {
    const tampon = new Uint8Array(s.length * 4 + 16);
    const n = Math.ceil(unishox2_compress_simple(s, s.length, tampon));
    if (!(n > 0) || n >= tampon.length) return s;
    const sortie = new Uint8Array(n + 1);
    sortie[0] = FORMAT_UNISHOX2;
    sortie.set(tampon.subarray(0, n), 1);
    if (sortie.length > octetsUtf8(s) * 0.9) return s;
    if (unishox2_decompress_simple(sortie.subarray(1), n) !== s) return s;
    return fs.Bytes.fromUint8Array(sortie);
  } catch (e) {
    console.warn('Compression impossible, texte gardé tel quel :', e);
    return s;
  }
}

export const estCompresse = (v) => !!v && typeof v === 'object' && typeof v.toUint8Array === 'function';

// Texte lisible à partir d'une valeur Firestore (chaîne, Bytes ou rien).
export function decompresser(v) {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (!estCompresse(v)) return String(v);
  const o = v.toUint8Array();
  if (o[0] === FORMAT_UNISHOX2) {
    try { return unishox2_decompress_simple(o.subarray(1), o.length - 1); }
    catch (e) { console.error('Texte compressé illisible', e); return '[texte illisible]'; }
  }
  return '[format de texte inconnu]';
}

// Objet { id, ...champs } d'un instantané, textes compressés décompressés.
export function donneesDoc(snap) {
  const d = snap.data() || {};
  const r = { id: snap.id };
  for (const [k, v] of Object.entries(d)) r[k] = estCompresse(v) ? decompresser(v) : v;
  return r;
}

// Copie d'un objet dont les champs indiqués sont compressés (pour l'écriture).
export function compresserChamps(objet, champs) {
  const r = { ...objet };
  champs.forEach((k) => { if (typeof r[k] === 'string') r[k] = compresser(r[k]); });
  return r;
}
