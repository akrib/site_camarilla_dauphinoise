// =====================================================================
// Images en base64 stockées dans Firestore
// ---------------------------------------------------------------------
// Firestore limite chaque document à 1 Mo. Chaque image est donc :
//  1. réduite dans le navigateur (JPEG, côté max 1280 px par défaut),
//  2. enregistrée dans son propre document images/{uid}_{sha256},
//  3. référencée dans les fiches / tableaux / messages par "img:{id}".
// Le contenu d'une image ne change jamais (identifiant = empreinte),
// on peut donc la garder en cache dans le navigateur sans risque.
// =====================================================================
import { db, auth, fs } from './core.js';

export const LIMITE_IMAGE = 900000;           // caractères max d'une data URL
const MOTIF_REF = /^img:([A-Za-z0-9]{6,128}_[0-9a-f]{64})$/;
const cacheMemoire = new Map();

// ---------------------------------------------------------------------
// Compression
// ---------------------------------------------------------------------
function chargerImg(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image illisible'));
    img.src = src;
  });
}

function lireFichier(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(file);
  });
}

async function redessiner(src, cote, qualite, fond) {
  const img = await chargerImg(src);
  const echelle = Math.min(1, cote / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * echelle));
  const hgt = Math.max(1, Math.round(img.naturalHeight * echelle));
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = hgt;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = fond; ctx.fillRect(0, 0, w, hgt);
  ctx.drawImage(img, 0, 0, w, hgt);
  return cv.toDataURL('image/jpeg', qualite);
}

/** Réduit une data URL jusqu'à passer sous la limite Firestore. */
export async function reduireDataUrl(dataUrl, { cote = 1280, qualite = 0.82, fond = '#ffffff' } = {}) {
  if (dataUrl.length <= LIMITE_IMAGE && /^data:image\/(jpeg|png|webp|gif);base64,/.test(dataUrl)) return dataUrl;
  let c = cote, q = qualite, res = dataUrl;
  for (let i = 0; i < 8; i++) {
    res = await redessiner(dataUrl, c, q, fond);
    if (res.length <= LIMITE_IMAGE) return res;
    c = Math.round(c * 0.8); q = Math.max(0.5, q - 0.08);
  }
  throw new Error('Image trop volumineuse, même après réduction.');
}

/** Lit un fichier image choisi par l'utilisateur et le compresse. */
export async function compresserFichier(file, { cote = 1280, qualite = 0.82, fond = '#ffffff' } = {}) {
  if (!file || !/^image\//.test(file.type)) throw new Error('Ce fichier n\'est pas une image.');
  const brut = await lireFichier(file);
  const res = await redessiner(brut, cote, qualite, fond);
  return res.length <= LIMITE_IMAGE ? res : reduireDataUrl(res, { cote: Math.round(cote * 0.8), qualite, fond });
}

// ---------------------------------------------------------------------
// Enregistrement / lecture
// ---------------------------------------------------------------------
async function empreinte(texte) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texte));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Enregistre une image (data URL) et renvoie sa référence "img:{id}". */
export async function enregistrerImage(dataUrl) {
  const user = auth.currentUser;
  if (!user) throw new Error('Connexion requise pour enregistrer une image.');
  const data = await reduireDataUrl(dataUrl);
  const id = user.uid + '_' + (await empreinte(data));
  const ref = fs.doc(db, 'images', id);
  let existe = false;
  try { existe = (await fs.getDoc(ref)).exists(); } catch (e) { existe = false; }
  if (!existe) {
    // L'image et sa fiche d'index (sans le contenu) sont écrites ensemble :
    // l'index permet aux conteurs de mesurer l'espace utilisé et de
    // supprimer les images orphelines sans tout retélécharger.
    const lot = fs.writeBatch(db);
    lot.set(ref, {
      proprietaire: user.uid,
      data,
      type: data.slice(5, data.indexOf(';')),
      taille: data.length,
      creeLe: fs.serverTimestamp()
    });
    lot.set(fs.doc(db, 'images_index', id), {
      proprietaire: user.uid,
      taille: data.length,
      creeLe: fs.serverTimestamp()
    });
    await lot.commit();
  }
  cacheMemoire.set(id, data);
  cacheEcrire(id, data);
  return 'img:' + id;
}

export function estRefImage(v) { return typeof v === 'string' && MOTIF_REF.test(v); }
export function idDepuisRef(v) { const m = MOTIF_REF.exec(v || ''); return m ? m[1] : null; }

/** Renvoie la data URL d'une référence "img:{id}" (ou null si introuvable). */
export async function chargerImage(refImg) {
  const id = idDepuisRef(refImg);
  if (!id) return typeof refImg === 'string' && refImg.startsWith('data:image/') ? refImg : null;
  if (cacheMemoire.has(id)) return cacheMemoire.get(id);
  const enCache = await cacheLire(id);
  if (enCache) { cacheMemoire.set(id, enCache); return enCache; }
  try {
    const snap = await fs.getDoc(fs.doc(db, 'images', id));
    if (!snap.exists()) return null;
    const data = snap.data().data;
    cacheMemoire.set(id, data);
    cacheEcrire(id, data);
    return data;
  } catch (e) {
    console.warn('Image inaccessible', id, e);
    return null;
  }
}

/** Crée une balise <img> qui se remplit dès que l'image est chargée. */
export function baliseImage(refImg, attrs = {}) {
  const img = document.createElement('img');
  for (const [k, v] of Object.entries(attrs)) img.setAttribute(k, v);
  img.alt = attrs.alt || '';
  chargerImage(refImg).then((src) => { if (src) img.src = src; else img.classList.add('cam-img-absente'); });
  return img;
}

// ---------------------------------------------------------------------
// Conversion d'un JSON quelconque
// ---------------------------------------------------------------------
/** Remplace toutes les images base64 d'un objet JSON par des références. */
export async function externaliser(valeur, surProgression) {
  let n = 0;
  async function parcourir(v) {
    if (typeof v === 'string') {
      if (v.startsWith('data:image/') && v.length > 512) {
        n++; if (surProgression) surProgression(n);
        return enregistrerImage(v);
      }
      return v;
    }
    if (Array.isArray(v)) { const r = []; for (const x of v) r.push(await parcourir(x)); return r; }
    if (v && typeof v === 'object') {
      const r = {};
      for (const [k, x] of Object.entries(v)) r[k] = await parcourir(x);
      return r;
    }
    return v;
  }
  return parcourir(valeur);
}

/** Remplace toutes les références "img:{id}" par les images base64. */
export async function internaliser(valeur) {
  async function parcourir(v) {
    if (typeof v === 'string') return estRefImage(v) ? ((await chargerImage(v)) || '') : v;
    if (Array.isArray(v)) return Promise.all(v.map(parcourir));
    if (v && typeof v === 'object') {
      const r = {};
      await Promise.all(Object.entries(v).map(async ([k, x]) => { r[k] = await parcourir(x); }));
      return r;
    }
    return v;
  }
  return parcourir(valeur);
}

/** Liste les identifiants d'images référencés dans un objet ou une chaîne JSON. */
export function collecterRefs(valeur, acc = new Set()) {
  if (typeof valeur === 'string') {
    const id = idDepuisRef(valeur);
    if (id) acc.add(id);
    else if (valeur.length > 70 && valeur.includes('img:')) {
      for (const m of valeur.matchAll(/img:([A-Za-z0-9]{6,128}_[0-9a-f]{64})/g)) acc.add(m[1]);
    }
  } else if (Array.isArray(valeur)) valeur.forEach((x) => collecterRefs(x, acc));
  else if (valeur && typeof valeur === 'object') Object.values(valeur).forEach((x) => collecterRefs(x, acc));
  return acc;
}

// ---------------------------------------------------------------------
// Cache navigateur (IndexedDB), vidé à la déconnexion
// ---------------------------------------------------------------------
const NOM_BASE = 'camarilla-images';
let basePromesse = null;
function base() {
  if (!('indexedDB' in window)) return Promise.resolve(null);
  if (!basePromesse) {
    basePromesse = new Promise((resolve) => {
      const req = indexedDB.open(NOM_BASE, 1);
      req.onupgradeneeded = () => req.result.createObjectStore('images');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    });
  }
  return basePromesse;
}
async function cacheLire(id) {
  const b = await base(); if (!b) return null;
  return new Promise((resolve) => {
    try {
      const r = b.transaction('images').objectStore('images').get(id);
      r.onsuccess = () => resolve(r.result || null);
      r.onerror = () => resolve(null);
    } catch (e) { resolve(null); }
  });
}
async function cacheEcrire(id, data) {
  const b = await base(); if (!b) return;
  try { b.transaction('images', 'readwrite').objectStore('images').put(data, id); } catch (e) { /* plein ou privé */ }
}
export async function viderCacheImages() {
  cacheMemoire.clear();
  const b = await base();
  if (b) b.close();
  basePromesse = null;
  await new Promise((resolve) => {
    try {
      const r = indexedDB.deleteDatabase(NOM_BASE);
      r.onsuccess = r.onerror = r.onblocked = () => resolve();
    } catch (e) { resolve(); }
  });
}
