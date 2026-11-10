"""Extrait de la fiche Excel MET les listes et les coûts nécessaires à l'éditeur.

Usage :
    python3 outils/fiche/extraire_excel.py fiche.xlsx

Produit :
    assets/js/camarilla/fiche/referentiel.js   (public : noms, coûts, structures — aucun texte de règles)
    outils/fiche/sortie/textes_excel.json       (privé : faiblesses de clan, archétypes, qualités…)
                                                 -> à fusionner avec les descriptions du PDF, jamais commité.

La fiche Excel est utilisée uniquement pour sa structure : aucune valeur de
personnage n'est reprise.
"""
import json, re, sys, warnings
from pathlib import Path
import openpyxl

warnings.filterwarnings('ignore')
RACINE = Path(__file__).resolve().parents[2]
SORTIE_JS = RACINE / 'assets/js/camarilla/fiche/referentiel.js'
SORTIE_PRIVEE = Path(__file__).resolve().parent / 'sortie'


def nettoie(v):
    if v is None:
        return ''
    if isinstance(v, float) and v.is_integer():
        return int(v)
    return v.strip() if isinstance(v, str) else v


def colonne(ws, col, debut, fin):
    return [nettoie(ws[f'{col}{r}'].value) for r in range(debut, fin + 1)]


def extraire(chemin):
    wv = openpyxl.load_workbook(chemin, data_only=True)   # valeurs calculées (listes résolues)
    ref, textes = {}, {}

    # ------------------------------------------------------------------ clans
    cl = wv['Clan']
    sectes_rarete = [nettoie(cl[f'{c}2'].value) for c in 'GHIJKLMN']
    ref['clans'], textes['clans'] = [], {}
    for r in range(3, 40):
        nom = nettoie(cl[f'A{r}'].value)
        if not nom:
            continue
        ref['clans'].append({
            'nom': nom,
            'disciplines': [nettoie(cl[f'{c}{r}'].value) for c in 'BCD'],
            'coutLignee': nettoie(cl[f'F{r}'].value) or 0,
            'rarete': {s: (nettoie(cl[f'{c}{r}'].value) or 0) for s, c in zip(sectes_rarete, 'GHIJKLMN')},
        })
        textes['clans'][nom] = {'t': nettoie(cl[f'E{r}'].value), 'champ': 'faiblesse'}
    ref['sectes'] = [nettoie(cl[f'B{r}'].value) for r in range(43, 51)]
    # La formule de rareté de la fiche ne couvre que les lignes 43 à 47.
    ref['sectesAvecRarete'] = ref['sectes'][:5]

    # ------------------------------------------------------------ archétypes
    ar = wv['Archétypes']
    ref['archetypes'], textes['archetypes'] = [], {}
    for r in range(3, 243):
        nom = nettoie(ar[f'A{r}'].value)
        if nom:
            ref['archetypes'].append(nom)
            textes['archetypes'][nom] = {'t': nettoie(ar[f'B{r}'].value)}

    # ----------------------------------------------------------- disciplines
    di = wv['Disciplines']
    ref['disciplines'] = []
    for r in range(3, 42):
        nom = nettoie(di[f'B{r}'].value)
        if not nom:
            continue
        ref['disciplines'].append({
            'nom': nom,
            'pouvoirs': [nettoie(di[f'{c}{r}'].value) for c in 'CDEFG'],
            'anciens': [x for x in (nettoie(di[f'{c}{r}'].value) for c in 'HIJK') if x],
            'selectionnable': r <= 40,   # la liste déroulante de la fiche s'arrête à la ligne 40
        })
    ref['disciplinesCardinales'] = [x for x in colonne(di, 'G', 44, 51) if x]
    ref['disciplinesExotiques'] = [x for x in colonne(di, 'H', 44, 50) if x]

    # ------------------------------------------------- techniques, serviteurs
    te = wv['Techniques']
    ref['techniques'] = [nettoie(te[f'B{r}'].value) for r in range(2, 93) if nettoie(te[f'B{r}'].value)]
    ref['techniquesCelerite'] = [nettoie(te[f'B{r}'].value) for r in range(2, 93)
                                 if nettoie(te[f'B{r}'].value) and nettoie(te[f'C{r}'].value)]
    ref['qualitesServiteur'] = [{'nom': nettoie(te[f'F{r}'].value), 'points': nettoie(te[f'G{r}'].value)}
                                for r in range(2, 19) if nettoie(te[f'F{r}'].value)]

    # --------------------------------------------------------------- rituels
    ri = wv['Rituels']
    ref['rituels'] = [{'type': nettoie(ri[f'B{r}'].value), 'nom': nettoie(ri[f'D{r}'].value),
                       'niveau': nettoie(ri[f'E{r}'].value)}
                      for r in range(2, 162) if nettoie(ri[f'D{r}'].value)]
    ref['rituelsSabbat'] = [nettoie(ri[f'H{r}'].value) for r in range(2, 27) if nettoie(ri[f'H{r}'].value)]

    # ---------------------------------------------------- atouts et handicaps
    ah = wv['Atouts & Handicaps']

    def bloc_general(col_nom, col_prix, debut):
        res, r = [], debut
        while r < 200:
            nom = nettoie(ah[f'{col_nom}{r}'].value)
            if isinstance(nom, str) and nom.startswith('#####'):
                break
            if nom:
                res.append({'nom': nom, 'cout': abs(nettoie(ah[f'{col_prix}{r}'].value) or 0)})
            r += 1
        return res

    def ligne_titre(col, texte):
        for r in range(1, 200):
            if nettoie(ah[f'{col}{r}'].value) == texte:
                return r
        raise ValueError(texte)

    atouts_gen = bloc_general('F', 'G', ligne_titre('F', '##### Atouts Généraux #####') + 1)
    handicaps_gen = bloc_general('M', 'N', ligne_titre('M', '##### Handicaps Généraux #####') + 1)
    atouts_clan, handicaps_clan, atouts_secte, handicaps_secte = {}, {}, {}, {}
    for r in range(5, 304):
        clan = nettoie(ah[f'Q{r}'].value)
        if clan and clan != 'Clan / Lignée ?':
            if nettoie(ah[f'R{r}'].value):
                atouts_clan.setdefault(clan, []).append({'nom': nettoie(ah[f'R{r}'].value), 'cout': abs(nettoie(ah[f'S{r}'].value) or 0)})
            if nettoie(ah[f'T{r}'].value):
                handicaps_clan.setdefault(clan, []).append({'nom': nettoie(ah[f'T{r}'].value), 'cout': abs(nettoie(ah[f'U{r}'].value) or 0)})
        secte = nettoie(ah[f'X{r}'].value)
        if secte and secte not in ('Secte', 'Secte ?'):
            if nettoie(ah[f'Y{r}'].value):
                atouts_secte.setdefault(secte, []).append({'nom': nettoie(ah[f'Y{r}'].value), 'cout': abs(nettoie(ah[f'Z{r}'].value) or 0)})
            if nettoie(ah[f'AA{r}'].value):
                handicaps_secte.setdefault(secte, []).append({'nom': nettoie(ah[f'AA{r}'].value), 'cout': abs(nettoie(ah[f'AB{r}'].value) or 0)})
    ref['atouts'] = {'generaux': atouts_gen, 'clan': atouts_clan, 'secte': atouts_secte}
    ref['handicaps'] = {'generaux': handicaps_gen, 'clan': handicaps_clan, 'secte': handicaps_secte}

    # ------------------------------------------------------------- moralité
    mo = wv['Moralité']
    from openpyxl.utils import get_column_letter as L, column_index_from_string as I
    ref['voies'] = [nettoie(mo[f'{L(c)}2'].value) for c in range(I('C'), I('V') + 1)]
    blocs = {}
    for c in range(1, 140):
        if nettoie(mo.cell(1, c).value):
            blocs[nettoie(mo.cell(1, c).value)] = c
    couts = {}
    for secte, c0 in blocs.items():
        couts[secte] = {}
        for r in range(3, 34):
            clan = nettoie(mo[f'A{r}'].value)
            if not clan:
                continue
            ligne = {}
            for k, voie in enumerate(ref['voies']):
                v = mo.cell(r, c0 + 1 + k).value
                ligne[voie] = nettoie(v) if isinstance(nettoie(v), int) else 0
            couts[secte][clan] = ligne
    ref['coutsVoies'] = couts

    # ------------------------------------------------- tables de l'onglet Calculs
    ca = wv['Calculs']
    ref['tableGeneration'] = [{'generation': nettoie(ca[f'N{r}'].value), 'niveau': nettoie(ca[f'O{r}'].value)}
                              for r in range(61, 71)]
    ref['ressources'] = {str(nettoie(ca[f'N{r}'].value)): nettoie(ca[f'O{r}'].value) for r in range(53, 58)}

    # -------------------------------------------------------------- qualités
    qu = wv['Qualites']
    ref['qualites'], textes['qualites'] = {}, {}
    for r in range(1, 320):
        t, nom, desc = (nettoie(qu.cell(r, c).value) for c in (1, 2, 3))
        if t and nom and t != 'Type?' and not str(nom).endswith('?'):
            ref['qualites'].setdefault(t, []).append(nom)
            textes['qualites'][f'{t} / {nom}'] = {'t': desc}
    return ref, textes


# Valeurs fixes des listes déroulantes de l'onglet Personnage (validations de données).
LISTES_FIXES = {
    'version': 'MET 8.0.2',
    'typesFiche': ['Antagoniste', 'Antagoniste C1 (XP Joueur)', 'Ancien Joueur/Antagoniste', 'Joueur'],
    'races': ['Vampire', 'Humain'],
    'ages': ['Nouveau-Né', 'Ancilla', 'Ancien', 'Vénérable', 'Goule', 'Autre'],
    'generations': [15, 14, 13, 12, 11, 10, 9, 8, 7, 6],
    'focus': {
        'Physique': ['Force', 'Dextérité', 'Vigueur'],
        'Social': ['Charisme', 'Manipulation', 'Apparence'],
        'Mental': ['Perception', 'Intelligence', 'Astuce'],
    },
    'derangements': ['Compulsion', 'Croyance', 'Destruction', 'Incapacité', 'Obsession', 'Phobie'],
    'coutsDerangement': [0, 2, 3],
    'donsInfernaux': ['Feu Démoniaque', 'Contrat du Profane', 'Régénération Impie'],
    'typesDiscipline': ['C', 'H', 'G'],
    'factionsMystere': ['Anarch', 'Camarilla', 'Sabbat', 'Ashirra', 'Assamite', 'Baali', 'Brujah', 'Cappadocien',
                        'Caitiff/Panders', 'Gangrel', 'Gargouille', 'Giovanni', 'Lassombra', 'Malkavien', 'Nosfératu',
                        'Ravnos', 'Salubri', 'Séthite', 'Toréador', 'Tremere', 'Tzimisce', 'Ventrue',
                        'Démon et Infernalisme', 'Fae', 'Fantôme Spectre et Outremonde', 'Golconde', 'Inconnu',
                        'Inquisition', 'Livre de Nod', 'Lupin', 'Mage', 'RLM', "Tal'Mahe'Ra", 'Umbra', 'Vampire'],
    # Compétences de base, dans l'ordre de la fiche (colonne A).
    'competences': ['Erudition', 'Conduite', 'Animaux', 'Armes à feu', 'Athlétisme', 'Bagarre', 'Commandement',
                    'Empathie', 'Esquive', 'Expérience de la Rue', 'Furtivité / Discrétion', 'Informatique',
                    'Intimidation', 'Investigation', 'Larcin / Sécurité', 'Médecine', 'Mêlée', 'Occultisme',
                    'Subterfuge', 'Survie', 'Vigilance'],
    'avantagesHavre': ['Vigiles', 'Bibliothèque', 'Emplacement', 'Raffinement', 'Superficie', 'Employés de maison',
                       'Sécurité (gratuit si cpt sécurité > 0)', 'Occultisme (Compétence Occultime obligatoire)'],
    'typesServiteur': ['Humain', 'Goule', 'Animal', 'Fantome', 'Autre'],
    'typesEquipement': ['Armes de mêlée', 'Armes à distance', 'Armure', 'Équipement divers'],
    'artsEquipement': ['Classique', "Oeuvre d'art", "Chef d'oeuvre"],
    # Coûts en XP par niveau de génération (onglet Calculs, B3:G14). 'X' = interdit.
    'coutsXp': {
        'attribut': [0, 3, 3, 3, 3, 3],
        'disciplineClan': [0, 3, 3, 3, 3, 3],
        'disciplineHorsClan': [0, 4, 4, 4, 4, 5],
        'ancienClan': [0, 'X', 'X', 18, 18, 18],
        'ancienHorsClan': [0, 'X', 'X', 24, 24, 30],
        'humanite': [0, 10, 10, 10, 10, 10],
        'rituel': [0, 2, 2, 2, 2, 2],
        'historique': [0, 1, 2, 2, 2, 2],
        'competence': [0, 1, 2, 2, 2, 2],
        'technique': [0, 12, 12, 20, 'X', 'X'],
    },
    # Réserve de sang par génération (onglet Calculs, N61:Q70) : [avec Estomac sensible, normal], sang par tour.
    'sangParGeneration': {
        '15': [4, 6, 1], '14': [6, 8, 1], '13': [8, 10, 1], '12': [8, 10, 1], '11': [8, 10, 1],
        '10': [10, 12, 2], '9': [10, 12, 2], '8': [12, 15, 3], '7': [15, 20, 4], '6': [20, 30, 5],
    },
}


def ecrire(ref):
    SORTIE_JS.parent.mkdir(parents=True, exist_ok=True)
    data = {**LISTES_FIXES, **ref}
    js = ('// Généré par outils/fiche/extraire_excel.py à partir de la fiche Excel MET 8.0.2.\n'
          '// Noms et coûts uniquement : les textes de règles sont stockés dans Firestore\n'
          '// (collection referentiel, réservée aux membres). Ne pas modifier à la main.\n'
          'export const REF = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n')
    SORTIE_JS.write_text(js, encoding='utf-8')


if __name__ == '__main__':
    ref, textes = extraire(sys.argv[1])
    ecrire(ref)
    SORTIE_PRIVEE.mkdir(exist_ok=True)
    (SORTIE_PRIVEE / 'textes_excel.json').write_text(json.dumps(textes, ensure_ascii=False, indent=1), encoding='utf-8')
    print('clans', len(ref['clans']), '| archétypes', len(ref['archetypes']), '| disciplines', len(ref['disciplines']),
          '| techniques', len(ref['techniques']), '| rituels', len(ref['rituels']),
          '| atouts gén.', len(ref['atouts']['generaux']), 'clan', sum(map(len, ref['atouts']['clan'].values())),
          'secte', sum(map(len, ref['atouts']['secte'].values())),
          '| handicaps gén.', len(ref['handicaps']['generaux']), '| voies', len(ref['voies']),
          '| qualités', {k: len(v) for k, v in ref['qualites'].items()})
