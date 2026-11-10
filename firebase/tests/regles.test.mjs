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
  serverTimestamp, Timestamp, writeBatch
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
function tableau(proprietaire, acces, droits, extra = {}) {
  return {
    proprietaire, proprietaireNom: COMPTES[proprietaire].nom, titre: 'Enquête',
    acces, droits, contenuJson: '{"boards":[]}', version: 1,
    creeLe: passe, majLe: passe, majPar: proprietaire, majParNom: COMPTES[proprietaire].nom, ...extra
  };
}
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
function message(uid, extra = {}) {
  return {
    auteur: uid, auteurNom: COMPTES[uid].nom, auteurRole: COMPTES[uid].role, categorie: 'rp',
    titre: 'Avis', texte: 'Recherche témoin.', image: '', epingle: false, creeLe: serverTimestamp(), ...extra
  };
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
    await setDoc(doc(d, 'tableaux', 'tLecture'), tableau('alice', ['alice', 'bob'], { bob: 'lecture' }));
    await setDoc(doc(d, 'tableaux', 'tEcriture'), tableau('alice', ['alice', 'bob'], { bob: 'ecriture' }));
    await setDoc(doc(d, 'affichage', 'm1'), { ...message('alice'), creeLe: passe });
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
    await assertFails(getDocs(collection(db('sam'), 'affichage')));
    await assertFails(getDoc(doc(db('eve'), 'affichage', 'm1')));
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

describe('Tableaux d\'enquête', () => {
  test('les invités lisent, les autres non', async () => {
    await assertSucceeds(getDoc(doc(db('bob'), 'tableaux', 'tLecture')));
    await assertFails(getDoc(doc(db('dan'), 'tableaux', 'tLecture')));
    await assertSucceeds(getDoc(doc(db('conteur'), 'tableaux', 'tLecture')));
  });
  test('liste : uniquement les tableaux où l\'on est invité', async () => {
    await assertSucceeds(getDocs(query(collection(db('bob'), 'tableaux'), where('acces', 'array-contains', 'bob'))));
    await assertFails(getDocs(collection(db('bob'), 'tableaux')));
  });
  test('création avec version 1 et soi-même dans les accès', async () => {
    const t = { ...tableau('dan', ['dan'], {}), creeLe: serverTimestamp() };
    await assertSucceeds(setDoc(doc(db('dan'), 'tableaux', 'tDan'), t));
    await assertFails(setDoc(doc(db('dan'), 'tableaux', 'tDan2'), { ...t, acces: ['bob'] }));
    await assertFails(setDoc(doc(db('dan'), 'tableaux', 'tDan3'), { ...t, proprietaire: 'bob' }));
    await assertFails(setDoc(doc(db('dan'), 'tableaux', 'tDan4'), { ...t, majParNom: 'Conteur' }));
  });
  test('invité en lecture : pas de modification', async () => {
    await assertFails(updateDoc(doc(db('bob'), 'tableaux', 'tLecture'), {
      contenuJson: '{}', version: 2, majPar: 'bob', majParNom: 'Bob'
    }));
  });
  test('invité en écriture : contenu oui, partage non, version obligatoire', async () => {
    const ref = doc(db('bob'), 'tableaux', 'tEcriture');
    await assertFails(updateDoc(ref, { contenuJson: '{"a":1}', version: 1, majPar: 'bob', majParNom: 'Bob' }));
    await assertFails(updateDoc(ref, { acces: ['alice', 'bob', 'dan'], version: 2, majPar: 'bob', majParNom: 'Bob' }));
    await assertSucceeds(updateDoc(ref, { contenuJson: '{"a":1}', version: 2, majPar: 'bob', majParNom: 'Bob' }));
    // Une seconde écriture qui repart de la version 1 est refusée (conflit détecté).
    await assertFails(updateDoc(ref, { contenuJson: '{"a":2}', version: 2, majPar: 'bob', majParNom: 'Bob' }));
  });
  test('le propriétaire partage et retire des accès', async () => {
    await assertSucceeds(updateDoc(doc(db('alice'), 'tableaux', 'tLecture'), {
      acces: ['alice', 'dan'], droits: { dan: 'ecriture' }, version: 2, majPar: 'alice', majParNom: 'Alice'
    }));
    await assertFails(getDoc(doc(db('bob'), 'tableaux', 'tLecture')));
  });
  test('seul le propriétaire supprime', async () => {
    await assertFails(deleteDoc(doc(db('bob'), 'tableaux', 'tEcriture')));
    await assertSucceeds(deleteDoc(doc(db('alice'), 'tableaux', 'tEcriture')));
  });
});

describe('Tableau d\'affichage', () => {
  test('un joueur publie en RP/HRP, pas d\'annonce ni d\'épinglage', async () => {
    await assertSucceeds(setDoc(doc(db('bob'), 'affichage', 'n1'), message('bob')));
    await assertFails(setDoc(doc(db('bob'), 'affichage', 'n2'), message('bob', { categorie: 'annonce' })));
    await assertFails(setDoc(doc(db('bob'), 'affichage', 'n3'), message('bob', { epingle: true })));
    await assertFails(setDoc(doc(db('bob'), 'affichage', 'n4'), message('bob', { auteurNom: 'Le Prince' })));
    await assertFails(setDoc(doc(db('bob'), 'affichage', 'n5'), message('bob', { auteurRole: 'conteur' })));
  });
  test('un conteur publie une annonce épinglée', async () => {
    await assertSucceeds(setDoc(doc(db('conteur'), 'affichage', 'a1'), message('conteur', { categorie: 'annonce', epingle: true })));
  });
  test('chacun modifie ses messages ; le conteur modère', async () => {
    await assertSucceeds(updateDoc(doc(db('alice'), 'affichage', 'm1'), { texte: 'Modifié' }));
    await assertFails(updateDoc(doc(db('alice'), 'affichage', 'm1'), { epingle: true }));
    await assertFails(updateDoc(doc(db('bob'), 'affichage', 'm1'), { texte: 'Piraté' }));
    await assertSucceeds(updateDoc(doc(db('conteur'), 'affichage', 'm1'), { epingle: true }));
    await assertFails(deleteDoc(doc(db('bob'), 'affichage', 'm1')));
    await assertSucceeds(deleteDoc(doc(db('conteur'), 'affichage', 'm1')));
  });
  test('réponses : à son nom uniquement', async () => {
    const rep = { auteur: 'bob', auteurNom: 'Bob', auteurRole: 'joueur', texte: 'Moi !', creeLe: serverTimestamp() };
    await assertSucceeds(setDoc(doc(db('bob'), 'affichage', 'm1', 'reponses', 'r1'), rep));
    await assertFails(setDoc(doc(db('bob'), 'affichage', 'm1', 'reponses', 'r2'), { ...rep, auteurNom: 'Alice' }));
    await assertFails(setDoc(doc(db('eve'), 'affichage', 'm1', 'reponses', 'r3'), { ...rep, auteur: 'eve', auteurNom: 'Eve' }));
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
