// =====================================================================
// Tests des règles de sécurité Firestore
// Lancement (depuis le dossier firebase/) :
//   npm install
//   npm test        -> démarre l'émulateur Firestore et lance ces tests
// =====================================================================
import { test, before, after, beforeEach, describe } from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  initializeTestEnvironment, assertSucceeds, assertFails
} from '@firebase/rules-unit-testing';
import {
  doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where, getDocs,
  serverTimestamp, Timestamp, writeBatch, arrayUnion, deleteField, Bytes
} from 'firebase/firestore';

const ici = dirname(fileURLToPath(import.meta.url));
const REGLES = readFileSync(join(ici, '..', 'firestore.rules'), 'utf8');
const [hote, port] = (process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080').split(':');

let env;
const passe = Timestamp.fromDate(new Date('2026-01-01T00:00:00Z'));

// Comptes de test
const COMPTES = {
  admin:   { email: 'admin@test.fr',   nom: 'Admin',   role: 'admin',   statut: 'actif' },
  conteur: { email: 'conteur@test.fr', nom: 'Conteur', role: 'conteur', statut: 'actif' },
  conteur2:{ email: 'c2@test.fr',      nom: 'Conteur2',role: 'conteur', statut: 'actif' },
  alice:   { email: 'alice@test.fr',   nom: 'Alice',   role: 'joueur',  statut: 'actif' },
  bob:     { email: 'bob@test.fr',     nom: 'Bob',     role: 'joueur',  statut: 'actif' },
  dan:     { email: 'dan@test.fr',     nom: 'Dan',     role: 'joueur',  statut: 'actif' },
  eve:     { email: 'eve@test.fr',     nom: 'Eve',     role: 'joueur',  statut: 'en_attente' },
  sam:     { email: 'sam@test.fr',     nom: 'Sam',     role: 'joueur',  statut: 'suspendu' }
};
const HEX = 'a'.repeat(64);
const IMG = 'data:image/jpeg;base64,' + 'QUJD'.repeat(50);

const db = (uid) => uid
  ? env.authenticatedContext(uid, { email: COMPTES[uid] ? COMPTES[uid].email : uid + '@test.fr' }).firestore()
  : env.unauthenticatedContext().firestore();

function fiche(proprietaire, extra = {}) {
  const base = {
    schema: 2, proprietaire, proprietaireNom: COMPTES[proprietaire] ? COMPTES[proprietaire].nom : '',
    nom: 'Perso de ' + proprietaire, clan: 'Brujah', secte: 'Camarilla', race: 'Vampire', age: 'Ancilla',
    typeFiche: 'Joueur', generation: 11, niveauGotha: 2, specsGotha: ['Finance'], niveauPegre: 1, specsPegre: [],
    xp: { acquise: 50, depensee: 48, restante: 2 },
    portrait: '', contenuJson: '{}', statut: 'brouillon', commentaireConteur: '',
    creeLe: passe, majLe: passe, ...extra
  };
  // La fiche complète reprend nom / clan / secte (contrôlé par les règles).
  if (!('fiche' in extra)) base.fiche = { nom: base.nom, clan: base.clan, secte: base.secte, competences: { Bagarre: 3 }, disciplines: [{ nom: 'Puissance', anciens: ['', ''] }] };
  return base;
}
function nouvelleFiche(proprietaire, extra = {}) {
  return { ...fiche(proprietaire), creeLe: serverTimestamp(), majLe: serverTimestamp(), ...extra };
}
// Tableau d'enquête d'un personnage (document tableaux/{idPersonnage})
const PERSOS = { pA: ['alice', 'Amarok'], pAv: ['alice', 'Réserve'], pB: ['bob', 'Bastien'], pD: ['dan', 'Damien'] };
function tableau(idPerso, invites = {}, extra = {}) {
  const [proprietaire, nom] = PERSOS[idPerso];
  const acces = [proprietaire];
  const droits = {};
  for (const [id, droit] of Object.entries(invites)) {
    const compte = PERSOS[id][0];
    if (!acces.includes(compte)) acces.push(compte);
    droits[compte] = droit;
  }
  const inv = Object.fromEntries(Object.entries(invites).map(([id, droit]) => [id, { nom: PERSOS[id][1], droit }]));
  return {
    proprietaire, personnage: idPerso, proprietaireNom: nom, titre: 'Enquête de ' + nom,
    acces, droits, invites: inv, contenuJson: '{"boards":[]}', version: 1,
    creeLe: passe, majLe: passe, majPar: proprietaire, majPerso: idPerso, majParNom: nom, ...extra
  };
}
// Signature d'une sauvegarde par le personnage idPerso
const signe = (idPerso) => ({ majPar: PERSOS[idPerso][0], majPerso: idPerso, majParNom: PERSOS[idPerso][1] });
function action(uid, personnageId, personnageNom, extra = {}) {
  return {
    proprietaire: uid, personnageId, personnageNom, type: 'globale', date: '2026-11-10', mois: '2026-11',
    ville: 'Grenoble', zone: '3', categorie: 'Influence Gotha', nomAction: 'Un ami dans le besoin (Gotha 1)',
    niveau: 1, specialisation: 'Finance', raisonSociale: 'Banque', cible: '', pointsAction: 1,
    descriptif: 'Je demande un prêt.', statut: 'attente', reponseConteur: '', creeLe: serverTimestamp(), ...extra
  };
}
function ticket(uid, personnageId = '', personnageNom = '', extra = {}) {
  return {
    proprietaire: uid, proprietaireNom: COMPTES[uid].nom, personnageId, personnageNom,
    categorie: 'Autre', sujet: 'Question', description: 'Bonjour', statut: 'En attente', resultat: '',
    creeLe: serverTimestamp(), ...extra
  };
}
// Panneau d'affichage
const SEG = ['j0', 'j1', 'j2', 'j3', 'j4', 'j5'];
// Une ligne du journal au nom du personnage idPerso, et l'« op » qui va avec
const ligne = (idPerso, a, t = Date.now()) => ({ t, n: PERSOS[idPerso][1], a });
const op = (a, id, idPerso) => ({ a, id, p: idPerso });
function note(extra = {}) {
  return { texte: 'Ne fais confiance à personne.', type: 'postit', police: 'georgia', x: 0.5, y: 0.25,
    rotation: 1.2, epingle: '#b94335', r: [], g: [], dechiree: false, ...extra };
}
function panneau(extra = {}) {
  const d = { notes: { n1: note() }, courant: 'j0', op: op('ajout', 'n1', 'pA') };
  SEG.forEach((j) => { d[j] = []; });
  d.j0 = [ligne('pA', 'visite', 1767225600000), ligne('pA', 'ajout', 1767225600001)];
  return { ...d, ...extra };
}

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-camarilla',
    firestore: { rules: REGLES, host: hote, port: Number(port) }
  });
});
after(async () => { if (env) await env.cleanup(); });

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const d = ctx.firestore();
    for (const [uid, c] of Object.entries(COMPTES)) {
      await setDoc(doc(d, 'utilisateurs', uid), { ...c, creeLe: passe });
    }
    await setDoc(doc(d, 'personnages', 'pA'), fiche('alice', { nom: 'Amarok', statut: 'active' }));
    await setDoc(doc(d, 'personnages', 'pA2'), fiche('alice', { nom: 'Brouillon' }));
    await setDoc(doc(d, 'personnages', 'pAv'), fiche('alice', { nom: 'Réserve', statut: 'validee' }));
    await setDoc(doc(d, 'personnages', 'pB'), fiche('bob', { nom: 'Bastien', statut: 'active' }));
    await setDoc(doc(d, 'personnages', 'pD'), fiche('dan', { nom: 'Damien', statut: 'validee' }));
    // Amarok partage en lecture avec Bastien ; Réserve partage en modification avec Bastien.
    await setDoc(doc(d, 'tableaux', 'pA'), tableau('pA', { pB: 'lecture' }));
    await setDoc(doc(d, 'tableaux', 'pAv'), tableau('pAv', { pB: 'ecriture' }));
    // Ancien enregistrement rattaché au compte (avant les personnages)
    await setDoc(doc(d, 'tableaux', 'ancien'), { proprietaire: 'alice', proprietaireNom: 'Alice', titre: 'Vieux', acces: ['alice'], droits: {},
      contenuJson: '{}', version: 1, creeLe: passe, majLe: passe, majPar: 'alice', majParNom: 'Alice' });
    await setDoc(doc(d, 'panneau', 'principal'), panneau());
    await setDoc(doc(d, 'influences', 'iA'), { ...action('alice', 'pA', 'Amarok'), creeLe: passe });
    await setDoc(doc(d, 'influences', 'iB'), { ...action('bob', 'pB', 'Bastien'), creeLe: passe });
    await setDoc(doc(d, 'tickets', 'kA'), { ...ticket('alice'), creeLe: passe });
    await setDoc(doc(d, 'images', 'alice_' + HEX), {
      proprietaire: 'alice', data: IMG, type: 'image/jpeg', taille: IMG.length, creeLe: passe
    });
  });
});

// ---------------------------------------------------------------------
describe('Comptes', () => {
  test('un visiteur non connecté ne lit aucun profil', async () => {
    await assertFails(getDoc(doc(db(null), 'utilisateurs', 'alice')));
  });
  test('un joueur lit son profil mais pas celui des autres', async () => {
    await assertSucceeds(getDoc(doc(db('alice'), 'utilisateurs', 'alice')));
    await assertFails(getDoc(doc(db('alice'), 'utilisateurs', 'bob')));
  });
  test('seuls les conteurs listent les comptes', async () => {
    await assertSucceeds(getDocs(collection(db('conteur'), 'utilisateurs')));
    await assertFails(getDocs(collection(db('alice'), 'utilisateurs')));
  });
  test('inscription : profil joueur en attente uniquement', async () => {
    const base = { email: 'neuf@test.fr', nom: 'Neuf', role: 'joueur', statut: 'en_attente', creeLe: serverTimestamp() };
    await assertFails(setDoc(doc(db('neuf'), 'utilisateurs', 'neuf'), { ...base, role: 'conteur' }));
    await assertFails(setDoc(doc(db('neuf'), 'utilisateurs', 'neuf'), { ...base, statut: 'actif' }));
    await assertFails(setDoc(doc(db('neuf'), 'utilisateurs', 'autre'), base));
    await assertFails(setDoc(doc(db('neuf'), 'utilisateurs', 'neuf'), { ...base, email: 'faux@test.fr' }));
    await assertSucceeds(setDoc(doc(db('neuf'), 'utilisateurs', 'neuf'), base));
  });
  test('un joueur change son nom, pas son rôle ni son statut', async () => {
    await assertSucceeds(updateDoc(doc(db('alice'), 'utilisateurs', 'alice'), { nom: 'Alice B.' }));
    await assertFails(updateDoc(doc(db('alice'), 'utilisateurs', 'alice'), { role: 'conteur' }));
    await assertFails(updateDoc(doc(db('eve'), 'utilisateurs', 'eve'), { statut: 'actif' }));
  });
  test('un conteur active un joueur mais ne change ni les rôles ni les autres conteurs', async () => {
    await assertSucceeds(updateDoc(doc(db('conteur'), 'utilisateurs', 'eve'), { statut: 'actif' }));
    await assertFails(updateDoc(doc(db('conteur'), 'utilisateurs', 'eve'), { role: 'conteur' }));
    await assertFails(updateDoc(doc(db('conteur'), 'utilisateurs', 'conteur2'), { statut: 'suspendu' }));
  });
  test('un admin promeut un joueur mais ne modifie pas son propre compte', async () => {
    await assertSucceeds(updateDoc(doc(db('admin'), 'utilisateurs', 'alice'), { role: 'conteur' }));
    await assertFails(updateDoc(doc(db('admin'), 'utilisateurs', 'admin'), { statut: 'suspendu' }));
  });
  test('un compte suspendu ou en attente ne sert à rien', async () => {
    await assertFails(getDoc(doc(db('sam'), 'panneau', 'principal')));
    await assertFails(getDoc(doc(db('eve'), 'panneau', 'principal')));
    await assertFails(updateDoc(doc(db('sam'), 'utilisateurs', 'bob'), { statut: 'actif' }));
  });
  test('un joueur ne peut pas se faire passer pour conteur via le statut', async () => {
    await assertFails(getDocs(collection(db('eve'), 'utilisateurs')));
  });
});

describe('Annuaire', () => {
  test('un membre actif publie son nom et lit les autres', async () => {
    await assertSucceeds(setDoc(doc(db('alice'), 'annuaire', 'alice'), { nom: 'Alice', role: 'joueur' }));
    await assertSucceeds(getDoc(doc(db('bob'), 'annuaire', 'alice')));
  });
  test('impossible de mentir sur son rôle ou d\'écrire pour un autre', async () => {
    await assertFails(setDoc(doc(db('alice'), 'annuaire', 'alice'), { nom: 'Alice', role: 'conteur' }));
    await assertFails(setDoc(doc(db('alice'), 'annuaire', 'bob'), { nom: 'Bob', role: 'joueur' }));
    await assertFails(setDoc(doc(db('eve'), 'annuaire', 'eve'), { nom: 'Eve', role: 'joueur' }));
  });
  test('un conteur inscrit les comptes actifs, avec leur vrai nom et leur vrai rôle', async () => {
    await assertSucceeds(setDoc(doc(db('conteur'), 'annuaire', 'bob'), { nom: 'Bob', role: 'joueur' }));
    await assertSucceeds(setDoc(doc(db('conteur'), 'annuaire', 'conteur2'), { nom: 'Conteur2', role: 'conteur' }));
    await assertFails(setDoc(doc(db('conteur'), 'annuaire', 'dan'), { nom: 'Le Prince', role: 'joueur' }));
    await assertFails(setDoc(doc(db('conteur'), 'annuaire', 'dan'), { nom: 'Dan', role: 'admin' }));
    await assertFails(setDoc(doc(db('conteur'), 'annuaire', 'eve'), { nom: 'Eve', role: 'joueur' }));
    await assertFails(setDoc(doc(db('conteur'), 'annuaire', 'inconnu'), { nom: 'X', role: 'joueur' }));
    await assertFails(setDoc(doc(db('conteur'), 'annuaire', 'bob'), { nom: 'Bob', role: 'joueur', email: 'bob@test.fr' }));
  });
  test('activation et inscription à l\'annuaire dans le même lot', async () => {
    const d = db('conteur');
    const lot = writeBatch(d);
    lot.update(doc(d, 'utilisateurs', 'eve'), { statut: 'actif' });
    lot.set(doc(d, 'annuaire', 'eve'), { nom: 'Eve', role: 'joueur' });
    await assertSucceeds(lot.commit());
  });
  test('un conteur retire un compte suspendu ; un joueur ne retire que lui-même', async () => {
    await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'annuaire', 'sam'), { nom: 'Sam', role: 'joueur' }));
    await assertFails(deleteDoc(doc(db('alice'), 'annuaire', 'sam')));
    await assertSucceeds(deleteDoc(doc(db('conteur'), 'annuaire', 'sam')));
  });
});

describe('Fiches de personnage', () => {
  test('un joueur lit ses fiches, pas celles des autres ; le conteur lit tout', async () => {
    await assertSucceeds(getDoc(doc(db('alice'), 'personnages', 'pA')));
    await assertFails(getDoc(doc(db('alice'), 'personnages', 'pB')));
    await assertSucceeds(getDoc(doc(db('conteur'), 'personnages', 'pB')));
  });
  test('liste : uniquement filtrée sur ses propres fiches', async () => {
    await assertSucceeds(getDocs(query(collection(db('alice'), 'personnages'), where('proprietaire', '==', 'alice'))));
    await assertFails(getDocs(collection(db('alice'), 'personnages')));
    await assertSucceeds(getDocs(collection(db('conteur'), 'personnages')));
  });
  test('création : brouillon à son nom uniquement', async () => {
    await assertSucceeds(setDoc(doc(db('alice'), 'personnages', 'n1'), nouvelleFiche('alice')));
    await assertFails(setDoc(doc(db('alice'), 'personnages', 'n2'), nouvelleFiche('alice', { statut: 'validee' })));
    await assertFails(setDoc(doc(db('alice'), 'personnages', 'n3'), nouvelleFiche('bob')));
    await assertFails(setDoc(doc(db('alice'), 'personnages', 'n4'), nouvelleFiche('alice', { commentaireConteur: 'ok' })));
    await assertFails(setDoc(doc(db('alice'), 'personnages', 'n5'), nouvelleFiche('alice', { niveauGotha: 11 })));
    await assertFails(setDoc(doc(db('alice'), 'personnages', 'n5b'), nouvelleFiche('alice', { specsGotha: Array(11).fill('x') })));
    await assertSucceeds(setDoc(doc(db('alice'), 'personnages', 'n5c'), nouvelleFiche('alice', { niveauGotha: 10, specsGotha: Array(10).fill('Port autonome') })));
    await assertFails(setDoc(doc(db('eve'), 'personnages', 'n6'), nouvelleFiche('eve')));
  });
  test('fiche MET : schéma 2, fiche cohérente avec les champs recopiés, génération plausible', async () => {
    await assertFails(setDoc(doc(db('alice'), 'personnages', 'm1'), nouvelleFiche('alice', { schema: 1 })));
    await assertFails(setDoc(doc(db('alice'), 'personnages', 'm2'), nouvelleFiche('alice', { fiche: { nom: 'Autre nom', clan: 'Brujah', secte: 'Camarilla' } })));
    await assertFails(setDoc(doc(db('alice'), 'personnages', 'm3'), nouvelleFiche('alice', { generation: 2 })));
    await assertFails(setDoc(doc(db('alice'), 'personnages', 'm4'), nouvelleFiche('alice', { xp: { acquise: 50, triche: 1 } })));
    await assertFails(setDoc(doc(db('alice'), 'personnages', 'm5'), nouvelleFiche('alice', { ville: 'Grenoble' })));
    await assertSucceeds(setDoc(doc(db('alice'), 'personnages', 'm6'), nouvelleFiche('alice', { generation: null })));
  });
  test('un brouillon se modifie et se soumet, mais ne se valide pas soi-même', async () => {
    const ref = doc(db('alice'), 'personnages', 'pA2');
    await assertSucceeds(updateDoc(ref, { nom: 'Nouveau nom', 'fiche.nom': 'Nouveau nom', majLe: serverTimestamp() }));
    await assertSucceeds(updateDoc(ref, { 'fiche.competences.Bagarre': 4, niveauGotha: 3, xp: { acquise: 50, depensee: 50, restante: 0 } }));
    await assertSucceeds(updateDoc(ref, { statut: 'soumise' }));
    await assertFails(updateDoc(ref, { statut: 'validee' }));
    await assertFails(updateDoc(ref, { commentaireConteur: 'Parfait' }));
    await assertFails(updateDoc(ref, { proprietaire: 'bob' }));
  });
  test('une fiche validée ou en jeu n\'est plus modifiable par le joueur', async () => {
    await assertFails(updateDoc(doc(db('alice'), 'personnages', 'pAv'), { niveauGotha: 5 }));
    await assertFails(updateDoc(doc(db('alice'), 'personnages', 'pA'), { nom: 'Triche' }));
    await assertFails(updateDoc(doc(db('alice'), 'personnages', 'pAv'), { statut: 'brouillon' }));
  });
  test('le conteur valide, refuse, active', async () => {
    const ref = doc(db('conteur'), 'personnages', 'pA2');
    await assertSucceeds(updateDoc(ref, { statut: 'refusee', commentaireConteur: 'Historique trop court' }));
    await assertSucceeds(updateDoc(ref, { statut: 'active', validePar: 'conteur' }));
    await assertFails(updateDoc(ref, { proprietaire: 'bob' }));
  });
  test('un joueur corrige une fiche refusée et la resoumet', async () => {
    await env.withSecurityRulesDisabled((ctx) => updateDoc(doc(ctx.firestore(), 'personnages', 'pA2'), { statut: 'refusee' }));
    await assertSucceeds(updateDoc(doc(db('alice'), 'personnages', 'pA2'), { nom: 'Corrigé', 'fiche.nom': 'Corrigé', statut: 'soumise' }));
    await assertFails(updateDoc(doc(db('alice'), 'personnages', 'pA2'), { nom: 'Incohérent' }));
  });
  test('suppression : brouillons uniquement pour le joueur', async () => {
    await assertFails(deleteDoc(doc(db('alice'), 'personnages', 'pAv')));
    await assertFails(deleteDoc(doc(db('bob'), 'personnages', 'pA2')));
    await assertSucceeds(deleteDoc(doc(db('alice'), 'personnages', 'pA2')));
  });
});

describe('Référentiel des règles', () => {
  const index = (uid) => ({ version: 'Règles MET test', avertissement: 'confidentiel', categories: { atouts: { parts: 1, nb: 1 } }, importeLe: serverTimestamp(), importePar: uid });
  test('seuls les membres actifs lisent les descriptions', async () => {
    await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'referentiel', 'atouts'), { categorie: 'atouts', partie: 1, entrees: { Robuste: { t: 'texte', p: 10 } } }));
    await assertSucceeds(getDoc(doc(db('alice'), 'referentiel', 'atouts')));
    await assertFails(getDoc(doc(db('eve'), 'referentiel', 'atouts')));
    await assertFails(getDoc(doc(db('sam'), 'referentiel', 'atouts')));
    await assertFails(getDoc(doc(db(null), 'referentiel', 'atouts')));
  });
  test('seul un administrateur importe', async () => {
    await assertFails(setDoc(doc(db('alice'), 'referentiel', 'atouts'), { categorie: 'atouts', partie: 1, entrees: {} }));
    await assertFails(setDoc(doc(db('conteur'), 'referentiel', 'index'), index('conteur')));
    await assertSucceeds(setDoc(doc(db('admin'), 'referentiel', 'atouts'), { categorie: 'atouts', partie: 1, entrees: { Robuste: { t: 'x' } } }));
    await assertSucceeds(setDoc(doc(db('admin'), 'referentiel', 'atouts--2'), { categorie: 'atouts', partie: 2, entrees: {} }));
    await assertSucceeds(setDoc(doc(db('admin'), 'referentiel', 'index'), index('admin')));
    await assertFails(setDoc(doc(db('admin'), 'referentiel', 'index'), { ...index('admin'), importePar: 'conteur' }));
    await assertFails(setDoc(doc(db('admin'), 'referentiel', 'pouvoirs'), { categorie: 'pouvoirs', entrees: {}, autre: 1 }));
    await assertSucceeds(deleteDoc(doc(db('admin'), 'referentiel', 'atouts--2')));
    await assertFails(deleteDoc(doc(db('conteur'), 'referentiel', 'atouts')));
  });
});

describe('Images', () => {
  const contenu = (uid, data = IMG) => ({ proprietaire: uid, data, type: 'image/jpeg', taille: data.length, creeLe: serverTimestamp() });
  const index = (uid, data = IMG) => ({ proprietaire: uid, taille: data.length, creeLe: serverTimestamp() });
  // Écrit l'image et son index dans le même lot, comme le site.
  function ecrire(uid, id, data = IMG, { sansIndex = false, sansImage = false, imageModif = {} } = {}) {
    const d = db(uid);
    const lot = writeBatch(d);
    if (!sansImage) lot.set(doc(d, 'images', id), { ...contenu(uid, data), ...imageModif });
    if (!sansIndex) lot.set(doc(d, 'images_index', id), index(uid, data));
    return lot.commit();
  }
  test('un membre enregistre une image sous son propre identifiant', async () => {
    await assertSucceeds(ecrire('bob', 'bob_' + 'b'.repeat(64)));
    await assertFails(ecrire('bob', 'alice_' + 'f'.repeat(64)));
    await assertFails(ecrire('bob', 'bob_court'));
    await assertFails(ecrire('eve', 'eve_' + 'b'.repeat(64)));
  });
  test('image et index vont toujours ensemble', async () => {
    await assertFails(ecrire('bob', 'bob_' + '1'.repeat(64), IMG, { sansIndex: true }));
    await assertFails(ecrire('bob', 'bob_' + '2'.repeat(64), IMG, { sansImage: true }));
  });
  test('seules les vraies images base64 sont acceptées', async () => {
    const html = 'data:text/html;base64,PHNjcmlwdD4=';
    await assertFails(ecrire('bob', 'bob_' + 'c'.repeat(64), html));
    await assertFails(ecrire('bob', 'bob_' + 'd'.repeat(64), IMG, { imageModif: { taille: 3 } }));
  });
  test('une grande image (≈900 000 caractères) passe', async () => {
    const grosse = 'data:image/jpeg;base64,' + 'A'.repeat(899000);
    await assertSucceeds(ecrire('bob', 'bob_' + 'e'.repeat(64), grosse));
  });
  test('lecture par identifiant pour les membres actifs, liste réservée aux conteurs', async () => {
    await assertSucceeds(getDoc(doc(db('bob'), 'images', 'alice_' + HEX)));
    await assertFails(getDoc(doc(db('eve'), 'images', 'alice_' + HEX)));
    await assertFails(getDocs(collection(db('bob'), 'images')));
    await assertSucceeds(getDocs(collection(db('conteur'), 'images')));
    await assertFails(getDocs(collection(db('bob'), 'images_index')));
    await assertSucceeds(getDocs(collection(db('conteur'), 'images_index')));
  });
  test('une image ne se modifie pas ; seul son propriétaire ou un conteur la supprime', async () => {
    await assertFails(updateDoc(doc(db('alice'), 'images', 'alice_' + HEX), { taille: 1 }));
    await assertFails(deleteDoc(doc(db('bob'), 'images', 'alice_' + HEX)));
    await assertSucceeds(deleteDoc(doc(db('alice'), 'images', 'alice_' + HEX)));
  });
});

describe('Tableaux d\'enquête (réservés aux personnages)', () => {
  const nouveau = (idPerso, extra = {}) => ({ ...tableau(idPerso), creeLe: serverTimestamp(), ...extra });
  test('les comptes des personnages invités lisent, les autres non', async () => {
    await assertSucceeds(getDoc(doc(db('bob'), 'tableaux', 'pA')));
    await assertFails(getDoc(doc(db('dan'), 'tableaux', 'pA')));
    await assertSucceeds(getDoc(doc(db('conteur'), 'tableaux', 'pA')));
  });
  test('liste : uniquement les tableaux où son compte est invité', async () => {
    await assertSucceeds(getDocs(query(collection(db('bob'), 'tableaux'), where('acces', 'array-contains', 'bob'))));
    await assertFails(getDocs(collection(db('bob'), 'tableaux')));
  });
  test('création : un tableau par personnage validé, à son identifiant, signé par lui', async () => {
    await assertFails(setDoc(doc(db('dan'), 'tableaux', 'dan'), { ...nouveau('pD'), personnage: 'dan' }));   // le compte, pas un personnage
    await assertFails(setDoc(doc(db('dan'), 'tableaux', 'pB'), { ...nouveau('pB'), proprietaire: 'dan', majPar: 'dan' }));   // personnage d'un autre
    await assertFails(setDoc(doc(db('dan'), 'tableaux', 'pD'), nouveau('pD', { majParNom: 'Dan' })));   // signé du nom du joueur
    await assertFails(setDoc(doc(db('dan'), 'tableaux', 'pD'), nouveau('pD', { proprietaireNom: 'Autre' })));
    await assertFails(setDoc(doc(db('dan'), 'tableaux', 'pD'), nouveau('pD', { version: 2 })));
    await assertFails(setDoc(doc(db('dan'), 'tableaux', 'autre'), nouveau('pD')));   // identifiant différent du personnage
    await assertSucceeds(setDoc(doc(db('dan'), 'tableaux', 'pD'), nouveau('pD')));
    // Le document existe : une nouvelle « création » est une mise à jour, refusée sans version + 1.
    await assertFails(setDoc(doc(db('dan'), 'tableaux', 'pD'), nouveau('pD')));
  });
  test('une fiche non validée (brouillon, archivée) n\'a pas de tableau', async () => {
    await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'personnages', 'pA2'), fiche('alice', { nom: 'Brouillon' })));
    const t = { ...nouveau('pA'), personnage: 'pA2', proprietaireNom: 'Brouillon', majPerso: 'pA2', majParNom: 'Brouillon' };
    await assertFails(setDoc(doc(db('alice'), 'tableaux', 'pA2'), t));
    await env.withSecurityRulesDisabled((ctx) => updateDoc(doc(ctx.firestore(), 'personnages', 'pD'), { statut: 'archivee' }));
    await assertFails(setDoc(doc(db('dan'), 'tableaux', 'pD'), nouveau('pD')));
  });
  test('invité en lecture : pas de modification', async () => {
    await assertFails(updateDoc(doc(db('bob'), 'tableaux', 'pA'), { contenuJson: '{}', version: 2, ...signe('pB') }));
  });
  test('invité en modification : contenu oui (au nom du personnage invité), partage non', async () => {
    const ref = doc(db('bob'), 'tableaux', 'pAv');
    await assertFails(updateDoc(ref, { contenuJson: '{"a":1}', version: 1, ...signe('pB') }));
    await assertFails(updateDoc(ref, { contenuJson: '{"a":1}', version: 2, majPar: 'bob', majPerso: '', majParNom: 'Bob' }));
    await assertFails(updateDoc(ref, { invites: {}, version: 2, ...signe('pB') }));
    await assertSucceeds(updateDoc(ref, { contenuJson: '{"a":1}', version: 2, ...signe('pB') }));
    // Une seconde écriture qui repart de la version 1 est refusée (conflit détecté).
    await assertFails(updateDoc(ref, { contenuJson: '{"a":2}', version: 2, ...signe('pB') }));
    // Personnage invité archivé : plus de modification.
    await env.withSecurityRulesDisabled((ctx) => updateDoc(doc(ctx.firestore(), 'personnages', 'pB'), { statut: 'archivee' }));
    await assertFails(updateDoc(ref, { contenuJson: '{"a":3}', version: 3, ...signe('pB') }));
  });
  test('le personnage propriétaire partage, retire des accès ; pas un autre de ses personnages', async () => {
    await assertFails(updateDoc(doc(db('alice'), 'tableaux', 'pA'), {
      acces: ['alice', 'dan'], droits: { dan: 'ecriture' }, invites: { pD: { nom: 'Damien', droit: 'ecriture' } }, version: 2, ...signe('pAv')
    }));
    await assertSucceeds(updateDoc(doc(db('alice'), 'tableaux', 'pA'), {
      acces: ['alice', 'dan'], droits: { dan: 'ecriture' }, invites: { pD: { nom: 'Damien', droit: 'ecriture' } }, version: 2, ...signe('pA')
    }));
    await assertFails(getDoc(doc(db('bob'), 'tableaux', 'pA')));
    await assertSucceeds(getDoc(doc(db('dan'), 'tableaux', 'pA')));
  });
  test('anciens enregistrements : lisibles et supprimables, plus modifiables', async () => {
    await assertSucceeds(getDoc(doc(db('alice'), 'tableaux', 'ancien')));
    await assertFails(updateDoc(doc(db('alice'), 'tableaux', 'ancien'), { contenuJson: '{"x":1}', version: 2, invites: {}, ...signe('pA') }));
    await assertSucceeds(deleteDoc(doc(db('alice'), 'tableaux', 'ancien')));
  });
  test('seul le propriétaire (ou un conteur) supprime', async () => {
    await assertFails(deleteDoc(doc(db('bob'), 'tableaux', 'pAv')));
    await assertSucceeds(deleteDoc(doc(db('alice'), 'tableaux', 'pAv')));
    await assertSucceeds(deleteDoc(doc(db('conteur'), 'tableaux', 'pA')));
  });
});

describe('Répertoire des personnages', () => {
  test('un joueur inscrit ses propres personnages validés, tels que sur la fiche', async () => {
    await assertSucceeds(setDoc(doc(db('alice'), 'repertoire', 'pA'), { nom: 'Amarok', proprietaire: 'alice' }));
    await assertSucceeds(setDoc(doc(db('alice'), 'repertoire', 'pAv'), { nom: 'Réserve', proprietaire: 'alice' }));
    await assertFails(setDoc(doc(db('alice'), 'repertoire', 'pA2'), { nom: 'Brouillon', proprietaire: 'alice' }));
    await assertFails(setDoc(doc(db('alice'), 'repertoire', 'pB'), { nom: 'Bastien', proprietaire: 'bob' }));
    await assertFails(setDoc(doc(db('alice'), 'repertoire', 'pA'), { nom: 'Le Prince', proprietaire: 'alice' }));
  });
  test('un conteur inscrit n\'importe quel personnage validé ; lecture par les membres actifs', async () => {
    await assertSucceeds(setDoc(doc(db('conteur'), 'repertoire', 'pB'), { nom: 'Bastien', proprietaire: 'bob' }));
    await assertSucceeds(getDoc(doc(db('dan'), 'repertoire', 'pB')));
    await assertFails(getDoc(doc(db('eve'), 'repertoire', 'pB')));
    await assertFails(deleteDoc(doc(db('alice'), 'repertoire', 'pB')));
    await assertSucceeds(deleteDoc(doc(db('bob'), 'repertoire', 'pB')));
  });
});

describe('Panneau d\'affichage', () => {
  const ref = (uid) => doc(db(uid), 'panneau', 'principal');
  const vider = () => env.withSecurityRulesDisabled((ctx) => deleteDoc(doc(ctx.firestore(), 'panneau', 'principal')));

  test('lecture réservée aux membres actifs', async () => {
    await assertSucceeds(getDoc(ref('bob')));
    await assertFails(getDoc(ref('eve')));
    await assertFails(getDoc(ref(null)));
  });
  test('création : panneau vide, une seule ligne de visite à son nom', async () => {
    await vider();
    const neuf = () => { const d = { notes: {}, courant: 'j0', op: op('visite', '', 'pB') }; SEG.forEach((j) => { d[j] = []; }); d.j0 = [ligne('pB', 'visite')]; return d; };
    await assertFails(setDoc(ref('bob'), { ...neuf(), j0: [{ t: Date.now(), n: 'Bob', a: 'visite' }] }));   // nom du joueur, pas du personnage
    await assertFails(setDoc(ref('bob'), { ...neuf(), notes: { n1: note() } }));
    await assertFails(setDoc(ref('bob'), { ...neuf(), j0: [ligne('pA', 'visite')], op: op('visite', '', 'pA') }));   // personnage d'un autre
    await assertFails(setDoc(ref('eve'), { ...neuf(), j0: [{ t: Date.now(), n: 'Eve', a: 'visite' }], op: op('visite', '', '') }));
    await assertFails(setDoc(doc(db('bob'), 'panneau', 'autre'), neuf()));
    await assertSucceeds(setDoc(ref('bob'), neuf()));
  });
  test('une action sans ligne de journal, ou avec une ligne au nom d\'un autre, est refusée', async () => {
    await assertFails(updateDoc(ref('bob'), { 'notes.n2': note(), op: op('ajout', 'n2', 'pB') }));
    await assertFails(updateDoc(ref('bob'), { 'notes.n2': note(), op: op('ajout', 'n2', 'pA'), j0: arrayUnion(ligne('pA', 'ajout')) }));
    await assertFails(updateDoc(ref('bob'), { 'notes.n2': note(), op: op('ajout', 'n2', 'pB'), j0: arrayUnion({ ...ligne('pB', 'ajout'), t: 1000 }) }));
    await assertSucceeds(updateDoc(ref('bob'), { 'notes.n2': note(), op: op('ajout', 'n2', 'pB'), j0: arrayUnion(ligne('pB', 'ajout')) }));
  });
  test('réservé aux personnages validés du membre ; un conteur peut agir sous son nom', async () => {
    await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'personnages', 'pA2'), fiche('alice', { nom: 'Brouillon' })));
    await assertFails(updateDoc(ref('alice'), { op: op('visite', '', 'pA2'), j0: arrayUnion({ t: Date.now(), n: 'Brouillon', a: 'visite' }) }));
    await assertFails(updateDoc(ref('alice'), { op: op('visite', '', ''), j0: arrayUnion({ t: Date.now(), n: 'Alice', a: 'visite' }) }));
    await assertFails(updateDoc(ref('alice'), { op: op('visite', '', 'pA'), j0: arrayUnion({ t: Date.now(), n: 'Réserve', a: 'visite' }) }));
    await assertSucceeds(updateDoc(ref('alice'), { op: op('visite', '', 'pAv'), j0: arrayUnion(ligne('pAv', 'visite')) }));
    await assertSucceeds(updateDoc(ref('conteur'), { op: op('visite', '', ''), j0: arrayUnion({ t: Date.now(), n: 'Conteur', a: 'visite' }) }));
  });
  test('l\'action annoncée doit correspondre à la modification', async () => {
    // « visite » qui modifie une note
    await assertFails(updateDoc(ref('bob'), { 'notes.n1.x': 0.9, op: op('visite', '', 'pB'), j0: arrayUnion(ligne('pB', 'visite')) }));
    // « déplacement » qui change le texte
    await assertFails(updateDoc(ref('bob'), { 'notes.n1.texte': 'Autre texte', op: op('deplacement', 'n1', 'pB'), j0: arrayUnion(ligne('pB', 'deplacement')) }));
    // « déplacement » hors du liège
    await assertFails(updateDoc(ref('bob'), { 'notes.n1.x': 1.5, op: op('deplacement', 'n1', 'pB'), j0: arrayUnion(ligne('pB', 'deplacement')) }));
    await assertSucceeds(updateDoc(ref('bob'), { 'notes.n1.x': 0.9, 'notes.n1.y': 0.1, op: op('deplacement', 'n1', 'pB'), j0: arrayUnion(ligne('pB', 'deplacement')) }));
    await assertSucceeds(updateDoc(ref('bob'), { op: op('interet', '', 'pB'), j0: arrayUnion(ligne('pB', 'interet')) }));
  });
  test('caviardage, coloriage, déchirure, retrait', async () => {
    await assertFails(updateDoc(ref('bob'), { 'notes.n1.texte': '███ fais confiance à personne.', op: op('caviardage', 'n1', 'pB'), j0: arrayUnion(ligne('pB', 'caviardage')) }));
    await assertSucceeds(updateDoc(ref('bob'), { 'notes.n1.texte': '███ fais confiance à personne.', 'notes.n1.r': arrayUnion({ s: 0, e: 3 }), op: op('caviardage', 'n1', 'pB'), j0: arrayUnion(ligne('pB', 'caviardage')) }));
    await assertSucceeds(updateDoc(ref('alice'), { 'notes.n1.texte': '███ ████ confiance à personne.', 'notes.n1.g': arrayUnion({ s: 4, e: 8 }), op: op('coloriage', 'n1', 'pA'), j0: arrayUnion(ligne('pA', 'coloriage', Date.now() + 1)) }));
    await assertFails(updateDoc(ref('bob'), { 'notes.n1.dechiree': true, op: op('dechirure', 'n1', 'pB'), j0: arrayUnion(ligne('pB', 'dechirure')) }));
    await assertSucceeds(updateDoc(ref('bob'), { 'notes.n1.texte': '███ ████', 'notes.n1.dechiree': true, op: op('dechirure', 'n1', 'pB'), j0: arrayUnion(ligne('pB', 'dechirure', Date.now() + 2)) }));
    await assertFails(updateDoc(ref('bob'), { 'notes.n1.texte': '███', op: op('dechirure', 'n1', 'pB'), j0: arrayUnion(ligne('pB', 'dechirure', Date.now() + 3)) }));
    await assertSucceeds(updateDoc(ref('dan'), { 'notes.n1': deleteField(), op: op('retrait', 'n1', 'pD'), j0: arrayUnion(ligne('pD', 'retrait')) }));
  });
  test('le journal ne se réécrit pas et ne s\'efface pas (sauf par un conteur)', async () => {
    await assertFails(updateDoc(ref('bob'), { j0: [ligne('pB', 'visite')], op: op('visite', '', 'pB') }));
    await assertFails(updateDoc(ref('bob'), { j0: [ligne('pA', 'visite', 1767225600000), ligne('pB', 'visite')], op: op('visite', '', 'pB') }));
    await assertFails(updateDoc(ref('bob'), { j1: arrayUnion(ligne('pB', 'visite')), op: op('visite', '', 'pB') }));
    const vide = { courant: 'j0', op: op('effacement', '', 'pB') }; SEG.forEach((j) => { vide[j] = []; });
    await assertFails(updateDoc(ref('bob'), vide));
    await assertSucceeds(updateDoc(ref('conteur'), vide));
  });
  test('segment plein : on passe au suivant (vidé), pas avant, pas ailleurs', async () => {
    const plein = Array.from({ length: 100 }, (_, i) => ligne('pA', 'visite', 1767225600000 + i));
    await env.withSecurityRulesDisabled((ctx) => updateDoc(doc(ctx.firestore(), 'panneau', 'principal'), { j0: plein, j1: [ligne('pA', 'visite', 1700000000000)] }));
    await assertFails(updateDoc(ref('bob'), { courant: 'j2', j2: [ligne('pB', 'visite')], op: op('visite', '', 'pB') }));
    await assertFails(updateDoc(ref('bob'), { courant: 'j1', j1: [ligne('pB', 'visite')], j0: [], op: op('visite', '', 'pB') }));
    await assertSucceeds(updateDoc(ref('bob'), { courant: 'j1', j1: [ligne('pB', 'visite')], op: op('visite', '', 'pB') }));
    // j1 n'a qu'une ligne : impossible de repasser déjà au segment suivant.
    await assertFails(updateDoc(ref('bob'), { courant: 'j2', j2: [ligne('pB', 'interet')], op: op('interet', '', 'pB') }));
  });
  test('au plus 80 notes, texte limité, seuls les types prévus', async () => {
    await assertFails(updateDoc(ref('bob'), { 'notes.n9': note({ texte: 'x'.repeat(1201) }), op: op('ajout', 'n9', 'pB'), j0: arrayUnion(ligne('pB', 'ajout')) }));
    await assertFails(updateDoc(ref('bob'), { 'notes.n9': note({ type: 'affiche' }), op: op('ajout', 'n9', 'pB'), j0: arrayUnion(ligne('pB', 'ajout')) }));
    await assertFails(updateDoc(ref('bob'), { 'notes.n9': note({ dechiree: true }), op: op('ajout', 'n9', 'pB'), j0: arrayUnion(ligne('pB', 'ajout')) }));
    const beaucoup = {}; for (let i = 0; i < 80; i++) beaucoup['m' + i] = note();
    await env.withSecurityRulesDisabled((ctx) => updateDoc(doc(ctx.firestore(), 'panneau', 'principal'), { notes: beaucoup }));
    await assertFails(updateDoc(ref('bob'), { 'notes.n9': note(), op: op('ajout', 'n9', 'pB'), j0: arrayUnion(ligne('pB', 'ajout')) }));
  });
});

describe('Notifications', () => {
  const notifTableau = (extra = {}) => ({
    type: 'tableau', destinataire: 'bob', auteur: 'alice', auteurNom: 'Amarok', personnage: 'pB', personnageNom: 'Bastien',
    tableau: 'pA', titre: 'Enquête de Amarok', droit: 'lecture', creeLe: serverTimestamp(), ...extra
  });
  const notifFiche = (extra = {}) => ({
    type: 'fiche', destinataire: 'alice', auteur: 'conteur', auteurNom: 'Conteur', personnage: 'pA', personnageNom: 'Amarok',
    statut: 'validee', message: 'Bienvenue à Grenoble.', creeLe: serverTimestamp(), ...extra
  });
  test('partage de tableau : par son propriétaire, vers un personnage invité', async () => {
    await assertSucceeds(setDoc(doc(db('alice'), 'notifications', 't1'), notifTableau()));
    await assertFails(setDoc(doc(db('alice'), 'notifications', 't2'), notifTableau({ destinataire: 'dan', personnage: 'pD', personnageNom: 'Damien' })));
    await assertFails(setDoc(doc(db('bob'), 'notifications', 't3'), notifTableau({ auteur: 'bob', destinataire: 'alice' })));
    await assertFails(setDoc(doc(db('alice'), 'notifications', 't4'), notifTableau({ auteurNom: 'Alice' })));
  });
  test('résultat de validation : par un conteur, au propriétaire de la fiche', async () => {
    await assertSucceeds(setDoc(doc(db('conteur'), 'notifications', 'f1'), notifFiche()));
    await assertFails(setDoc(doc(db('alice'), 'notifications', 'f2'), notifFiche({ auteur: 'alice', auteurNom: 'Alice' })));
    await assertFails(setDoc(doc(db('conteur'), 'notifications', 'f3'), notifFiche({ destinataire: 'bob' })));
    await assertFails(setDoc(doc(db('conteur'), 'notifications', 'f4'), notifFiche({ message: 'x'.repeat(2001) })));
    await assertFails(setDoc(doc(db('conteur'), 'notifications', 'f5'), notifFiche({ statut: 'brouillon' })));
  });
  test('lecture par le destinataire (et l\'auteur), suppression une fois lue', async () => {
    await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'notifications', 'n1'), { ...notifTableau(), creeLe: passe }));
    await assertSucceeds(getDocs(query(collection(db('bob'), 'notifications'), where('destinataire', '==', 'bob'))));
    await assertFails(getDocs(collection(db('bob'), 'notifications')));
    await assertFails(getDoc(doc(db('dan'), 'notifications', 'n1')));
    await assertSucceeds(getDocs(query(collection(db('alice'), 'notifications'), where('auteur', '==', 'alice'))));
    await assertFails(deleteDoc(doc(db('dan'), 'notifications', 'n1')));
    await assertSucceeds(deleteDoc(doc(db('bob'), 'notifications', 'n1')));
  });
});

describe('Challenges demandés', () => {
  const defi = (extra = {}) => ({
    conteur: 'conteur', conteurNom: 'Conteur', destinataire: 'bob', personnage: 'pB', personnageNom: 'Bastien',
    titre: 'Crocheter la serrure', message: 'Le notaire dort.', statut: 'en_attente', resultats: [],
    challenges: [{ libelle: 'Serrure', manches: 3, puits: true, bombe: false, main: [] }, { libelle: 'Fuite', manches: 1, puits: false, bombe: false, main: ['pierre'] }],
    creeLe: serverTimestamp(), ...extra
  });
  const resultats = [{ v: 2, e: 0, d: 1, m: [] }, { v: 1, e: 0, d: 0, m: [] }];
  test('seul un conteur propose, à un personnage validé de ce joueur', async () => {
    await assertSucceeds(setDoc(doc(db('conteur'), 'defis', 'd1'), defi()));
    await assertFails(setDoc(doc(db('alice'), 'defis', 'd2'), defi({ conteur: 'alice', conteurNom: 'Alice' })));
    await assertFails(setDoc(doc(db('conteur'), 'defis', 'd3'), defi({ destinataire: 'alice' })));
    await assertFails(setDoc(doc(db('conteur'), 'defis', 'd4'), defi({ destinataire: 'alice', personnage: 'pA2', personnageNom: 'Brouillon' })));
    await assertFails(setDoc(doc(db('conteur'), 'defis', 'd5'), defi({ challenges: [] })));
    await assertFails(setDoc(doc(db('conteur'), 'defis', 'd6'), defi({ statut: 'joue' })));
  });
  test('le personnage le résout une seule fois ; le conteur supprime', async () => {
    await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'defis', 'd1'), { ...defi(), creeLe: passe }));
    await assertSucceeds(getDoc(doc(db('bob'), 'defis', 'd1')));
    await assertFails(getDoc(doc(db('alice'), 'defis', 'd1')));
    await assertFails(updateDoc(doc(db('alice'), 'defis', 'd1'), { statut: 'joue', resultats, joueLe: serverTimestamp() }));
    await assertFails(updateDoc(doc(db('bob'), 'defis', 'd1'), { statut: 'joue', resultats: resultats.slice(0, 1), joueLe: serverTimestamp() }));
    await assertFails(updateDoc(doc(db('bob'), 'defis', 'd1'), { statut: 'joue', resultats, joueLe: serverTimestamp(), titre: 'Autre' }));
    await assertSucceeds(updateDoc(doc(db('bob'), 'defis', 'd1'), { statut: 'joue', resultats, joueLe: serverTimestamp() }));
    await assertFails(updateDoc(doc(db('bob'), 'defis', 'd1'), { resultats, joueLe: serverTimestamp() }));
    await assertFails(deleteDoc(doc(db('bob'), 'defis', 'd1')));
    await assertSucceeds(deleteDoc(doc(db('conteur'), 'defis', 'd1')));
  });
  test('un personnage archivé ne résout plus', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'defis', 'd1'), { ...defi(), creeLe: passe });
      await updateDoc(doc(ctx.firestore(), 'personnages', 'pB'), { statut: 'archivee' });
    });
    await assertFails(updateDoc(doc(db('bob'), 'defis', 'd1'), { statut: 'joue', resultats, joueLe: serverTimestamp() }));
  });
});

describe('Influences', () => {
  test('une action n\'est possible que pour son personnage en jeu', async () => {
    await assertSucceeds(setDoc(doc(db('alice'), 'influences', 'n1'), action('alice', 'pA', 'Amarok')));
    await assertFails(setDoc(doc(db('alice'), 'influences', 'n2'), action('alice', 'pA2', 'Brouillon')));
    await assertFails(setDoc(doc(db('alice'), 'influences', 'n3'), action('alice', 'pB', 'Bastien')));
    await assertFails(setDoc(doc(db('alice'), 'influences', 'n4'), action('alice', 'pA', 'Faux nom')));
    await assertFails(setDoc(doc(db('alice'), 'influences', 'n5'), action('alice', 'pA', 'Amarok', { reponseConteur: 'Réussi' })));
    await assertFails(setDoc(doc(db('alice'), 'influences', 'n6'), action('bob', 'pB', 'Bastien')));
  });
  test('chacun ne voit que ses actions ; le conteur voit tout', async () => {
    await assertSucceeds(getDoc(doc(db('alice'), 'influences', 'iA')));
    await assertFails(getDoc(doc(db('alice'), 'influences', 'iB')));
    await assertSucceeds(getDocs(query(collection(db('alice'), 'influences'),
      where('proprietaire', '==', 'alice'), where('personnageId', '==', 'pA'))));
    await assertFails(getDocs(query(collection(db('alice'), 'influences'), where('personnageId', '==', 'pB'))));
    await assertSucceeds(getDocs(query(collection(db('conteur'), 'influences'), where('mois', '==', '2026-11'))));
  });
  test('seul le conteur répond ; le joueur retire une action en attente', async () => {
    await assertFails(updateDoc(doc(db('alice'), 'influences', 'iA'), { reponseConteur: 'Réussi', statut: 'traitee' }));
    await assertSucceeds(updateDoc(doc(db('conteur'), 'influences', 'iA'), { reponseConteur: 'Réussi', statut: 'traitee' }));
    await assertFails(deleteDoc(doc(db('alice'), 'influences', 'iA')));
    await assertSucceeds(deleteDoc(doc(db('bob'), 'influences', 'iB')));
  });
  test('raisons sociales : pour son personnage en jeu uniquement', async () => {
    const rs = (pid, nomP) => ({ proprietaire: 'alice', personnageId: pid, personnageNom: nomP, nom: 'AFP Isère',
      ville: 'Grenoble', zone: '2', categorie: 'Influence Gotha', description: '', creeLe: serverTimestamp() });
    await assertSucceeds(setDoc(doc(db('alice'), 'raisons_sociales', 'r1'), rs('pA', 'Amarok')));
    await assertFails(setDoc(doc(db('alice'), 'raisons_sociales', 'r2'), rs('pB', 'Bastien')));
    await assertFails(getDoc(doc(db('bob'), 'raisons_sociales', 'r1')));
  });
});

describe('Tickets', () => {
  test('création au nom du joueur, avec ou sans personnage', async () => {
    await assertSucceeds(setDoc(doc(db('alice'), 'tickets', 't1'), ticket('alice')));
    await assertSucceeds(setDoc(doc(db('alice'), 'tickets', 't2'), ticket('alice', 'pA2', 'Brouillon')));
    await assertFails(setDoc(doc(db('alice'), 'tickets', 't3'), ticket('alice', 'pB', 'Bastien')));
    await assertFails(setDoc(doc(db('alice'), 'tickets', 't4'), ticket('alice', '', '', { statut: 'Complété' })));
  });
  test('le joueur annule ou complète ; le conteur traite', async () => {
    await assertFails(updateDoc(doc(db('alice'), 'tickets', 'kA'), { statut: 'Complété' }));
    await assertSucceeds(updateDoc(doc(db('conteur'), 'tickets', 'kA'), { statut: 'Informations demandées', resultat: 'Précisez' }));
    await assertFails(updateDoc(doc(db('alice'), 'tickets', 'kA'), { resultat: 'Je me réponds' }));
    await assertSucceeds(updateDoc(doc(db('alice'), 'tickets', 'kA'), { description: 'Bonjour, voici les précisions', statut: 'En attente' }));
    await assertSucceeds(updateDoc(doc(db('alice'), 'tickets', 'kA'), { statut: 'Annulé' }));
    await assertFails(getDoc(doc(db('bob'), 'tickets', 'kA')));
  });
});

// ---------------------------------------------------------------------
// Calendrier des parties et fenêtres d'influences
// ---------------------------------------------------------------------
const JOUR = 86400000;
function calendrier(anticipation = false) {
  const t = Date.now();
  return {
    parties: {
      '2026-10': { date: '2026-10-17', limite: '2026-10-10', titre: '', ouverture: t - 60 * JOUR, fermeture: t - 30 * JOUR },
      '2026-11': { date: '2026-11-21', limite: '2026-11-14', titre: 'Élysée', ouverture: t - 10 * JOUR, fermeture: t + 5 * JOUR },
      '2026-12': { date: '2026-12-19', limite: '2026-12-12', titre: '', ouverture: t + 10 * JOUR, fermeture: t + 30 * JOUR }
    },
    anticipation, majPar: 'conteur', majLe: serverTimestamp()
  };
}
async function poserCalendrier(anticipation = false) {
  await env.withSecurityRulesDisabled(async (ctx) => { await setDoc(doc(ctx.firestore(), 'calendrier', 'parties'), calendrier(anticipation)); });
}
const octets = (n) => Bytes.fromUint8Array(new Uint8Array(n).fill(7).map((x, i) => (i === 0 ? 1 : x)));

describe('Calendrier des parties', () => {
  test('lu par les membres actifs, écrit par les conteurs seulement', async () => {
    await assertFails(setDoc(doc(db('alice'), 'calendrier', 'parties'), { ...calendrier(), majPar: 'alice' }));
    await assertSucceeds(setDoc(doc(db('conteur'), 'calendrier', 'parties'), calendrier()));
    await assertFails(setDoc(doc(db('conteur'), 'calendrier', 'autre'), calendrier()));
    await assertFails(setDoc(doc(db('conteur'), 'calendrier', 'parties'), { ...calendrier(), majPar: 'conteur2' }));
    await assertSucceeds(getDoc(doc(db('alice'), 'calendrier', 'parties')));
    await assertFails(getDoc(doc(db('eve'), 'calendrier', 'parties')));
  });
});

describe('Influences et calendrier', () => {
  test('création seulement pendant la fenêtre de la partie visée', async () => {
    await poserCalendrier();
    await assertSucceeds(setDoc(doc(db('alice'), 'influences', 'o1'), action('alice', 'pA', 'Amarok', { mois: '2026-11' })));
    await assertFails(setDoc(doc(db('alice'), 'influences', 'o2'), action('alice', 'pA', 'Amarok', { mois: '2026-10' })));
    await assertFails(setDoc(doc(db('alice'), 'influences', 'o3'), action('alice', 'pA', 'Amarok', { mois: '2026-12' })));
    await assertFails(setDoc(doc(db('alice'), 'influences', 'o4'), action('alice', 'pA', 'Amarok', { mois: '2027-05' })));
  });
  test('préparation anticipée : parties à venir permises, parties closes toujours refusées', async () => {
    await poserCalendrier(true);
    await assertSucceeds(setDoc(doc(db('alice'), 'influences', 'o3'), action('alice', 'pA', 'Amarok', { mois: '2026-12' })));
    await assertFails(setDoc(doc(db('alice'), 'influences', 'o2'), action('alice', 'pA', 'Amarok', { mois: '2026-10' })));
  });
  test('le joueur modifie texte et lieu tant que la fenêtre est ouverte et sans réponse', async () => {
    await poserCalendrier();
    await assertSucceeds(updateDoc(doc(db('alice'), 'influences', 'iA'), { descriptif: 'Nouveau texte', lieu: { lng: 5.72, lat: 45.18 }, majLe: serverTimestamp() }));
    await assertSucceeds(updateDoc(doc(db('alice'), 'influences', 'iA'), { lieu: deleteField() }));
    await assertFails(updateDoc(doc(db('alice'), 'influences', 'iA'), { lieu: { lng: 500, lat: 45 } }));
    await assertFails(updateDoc(doc(db('alice'), 'influences', 'iA'), { lieu: { lng: 5.7, lat: 45.1, z: 1 } }));
    await assertFails(updateDoc(doc(db('alice'), 'influences', 'iA'), { nomAction: 'Autre chose' }));
    await assertFails(updateDoc(doc(db('alice'), 'influences', 'iA'), { pointsAction: 9 }));
    await assertFails(updateDoc(doc(db('alice'), 'influences', 'iA'), { mois: '2026-10' }));
    await assertFails(updateDoc(doc(db('bob'), 'influences', 'iA'), { descriptif: 'Pas à moi' }));
    await assertSucceeds(updateDoc(doc(db('conteur'), 'influences', 'iA'), { reponseConteur: 'Réussi', statut: 'traitee' }));
    await assertFails(updateDoc(doc(db('alice'), 'influences', 'iA'), { descriptif: 'Après la réponse' }));
  });
  test('fenêtre close : ni modification ni retrait par le joueur ; le conteur répond toujours', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'calendrier', 'parties'), calendrier());
      await setDoc(doc(ctx.firestore(), 'influences', 'iVieux'), { ...action('alice', 'pA', 'Amarok', { mois: '2026-10' }), creeLe: passe });
    });
    await assertFails(updateDoc(doc(db('alice'), 'influences', 'iVieux'), { descriptif: 'Trop tard' }));
    await assertFails(deleteDoc(doc(db('alice'), 'influences', 'iVieux')));
    await assertSucceeds(updateDoc(doc(db('conteur'), 'influences', 'iVieux'), { reponseConteur: 'Échec', statut: 'traitee' }));
  });
  test('sans calendrier, comme avant : tous les mois', async () => {
    await assertSucceeds(setDoc(doc(db('alice'), 'influences', 'o5'), action('alice', 'pA', 'Amarok', { mois: '2025-01' })));
  });
});

describe('Textes longs compressés (octets)', () => {
  test('descriptif, réponse, ticket et message acceptés en octets, dans les mêmes limites', async () => {
    await assertSucceeds(setDoc(doc(db('alice'), 'influences', 'c1'), action('alice', 'pA', 'Amarok', { descriptif: octets(300) })));
    await assertFails(setDoc(doc(db('alice'), 'influences', 'c2'), action('alice', 'pA', 'Amarok', { descriptif: octets(1) })));
    await assertFails(setDoc(doc(db('alice'), 'influences', 'c3'), action('alice', 'pA', 'Amarok', { descriptif: octets(4001) })));
    await assertSucceeds(updateDoc(doc(db('conteur'), 'influences', 'iA'), { reponseConteur: octets(500), statut: 'traitee' }));
    await assertSucceeds(setDoc(doc(db('alice'), 'tickets', 'c4'), ticket('alice', '', '', { description: octets(800) })));
    await assertSucceeds(updateDoc(doc(db('conteur'), 'personnages', 'pA2'), { commentaireConteur: octets(200) }));
  });
});

