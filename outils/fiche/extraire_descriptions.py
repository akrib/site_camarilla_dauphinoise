"""Construit les descriptions des éléments de la fiche à partir du PDF de règles MET
(export du wiki de la FCF) et des textes de la fiche Excel.

Usage :
    python3 outils/fiche/extraire_descriptions.py regles.pdf

Lit   : assets/js/camarilla/fiche/referentiel.js, outils/fiche/sortie/textes_excel.json (facultatif :
        sans la fiche Excel, les archétypes et les faiblesses de clan sont lus dans le PDF)
Catégorie « mysteres » : connaissances communes et secrètes de chaque niveau des spécialités
        Mystères (clés « Anarch / 1 »…). Secrets de jeu : la page Comptes > Référentiel les range
        à part, lisibles des seuls conteurs, et chaque personnage ne reçoit que ses niveaux.
Écrit : outils/fiche/sortie/descriptions.json   (PRIVÉ : document confidentiel de la Fédération,
        à importer dans Firestore depuis la page Comptes > Référentiel, jamais commité)
        outils/fiche/sortie/couverture.txt       (éléments sans description)
"""
import difflib, json, re, subprocess, sys, unicodedata
from pathlib import Path

ICI = Path(__file__).resolve().parent
RACINE = ICI.parents[1]
SORTIE = ICI / 'sortie'

# ----------------------------------------------------------------------------
# Lecture du PDF
# ----------------------------------------------------------------------------
PAGE = re.compile(r'^(\d{1,3}(?:\.\d{3})*) / [\d.]+$')   # « 12 / 1.131 », « 1.021 / 1.131 »
SOUS_SECTION = re.compile(r'^(Focus\s*(?::|[\w’]+\s*:)|Succès|Système|FAQ|Score de [Tt]est|Exemple|Notes?\b|Spécial|Prérequis|'
                          r'Remarque|Option|Coût\b|Durée|Précision|Clarification|Conditions? préalables?|Approbation|Co[uû]ts?\s*:|(?:Basse|Moyenne|Haute)\b|\(.*\)$)')


def lignes(chemin):
    txt = subprocess.run(['pdftotext', chemin, '-'], capture_output=True, text=True, check=True).stdout
    page = 1
    for l in txt.replace('\f', '\n').split('\n'):
        s = l.strip()
        m = PAGE.match(s)
        if m:
            page = int(m.group(1).replace('.', '')) + 1
            continue
        if s.startswith(('Fédération Camarilla Française', 'Document confidentiel')):
            continue
        yield page, l.rstrip()


def blocs(chemin):
    courant, p0 = [], None
    for page, l in lignes(chemin):
        if l.strip() == '[sommaire]':
            if courant:
                yield p0, courant
            courant, p0 = [], None
        elif courant or l.strip():
            p0 = p0 or page
            courant.append(l)
    if courant:
        yield p0, courant


def paragraphes(texte):
    # Recolle les lignes coupées par la justification du PDF.
    texte = re.sub(r'(?<![.:!?»”"])\n(?=[a-zà-ÿ(«“"0-9,;])', ' ', texte.strip())
    return re.sub(r'\n{3,}', '\n\n', texte)


def entrees(chemin):
    """Entrées principales, dans l'ordre du document ; les sous-sections
    (Système, Focus, Succès exceptionnel, FAQ…) sont rattachées à l'entrée précédente."""
    res = []
    for page, ls in blocs(chemin):
        titre = ls[0].strip()
        corps = paragraphes('\n'.join(ls[1:]))
        if res and SOUS_SECTION.match(titre):
            res[-1]['texte'] += '\n\n' + titre + '\n' + corps
            continue
        res.append({'titre': titre, 'page': page, 'texte': corps})
    return res


# ----------------------------------------------------------------------------
# Correspondance des noms
# ----------------------------------------------------------------------------
def norm(s, singulier=True):
    s = re.sub(r'\(.*?\)|\[.*?\]', ' ', str(s))
    s = s.replace('•', ' ').replace('’', "'").replace('œ', 'oe').replace('Œ', 'oe')
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower()
    s = re.sub(r"^(lignee|atout|handicap|ritus de faction|ritus|rituel)\s*[:\-]\s*", '', s.strip())
    s = re.sub(r"\b(la|le|les|l|de|du|des|d|a|au|aux|en|et)\b", ' ', re.sub(r"[^a-z0-9]+", ' ', s))
    mots = s.split()
    if singulier:
        mots = [m[:-1] if len(m) > 3 and m.endswith(('s', 'x')) else m for m in mots]
    return ' '.join(mots)


def niveau_points(titre):
    return titre.count('•')


class Index:
    def __init__(self, ents):
        self.e = ents

    def dans(self, plages):
        return [x for x in self.e if any(a <= x['page'] <= b for a, b in plages)]

    def complete(self, x):
        """Entrée au titre seul : son texte est le bloc suivant, s'il est sur la même page."""
        if x['texte'].strip():
            return x
        i = self.e.index(x)
        if i + 1 < len(self.e) and self.e[i + 1]['page'] == x['page']:
            s = self.e[i + 1]
            return {'titre': x['titre'], 'page': x['page'], 'texte': (s['titre'] + '\n' + s['texte']).strip()}
        return None

    def chercher(self, nom, plages, alias=(), approx=True, exact=False):
        x = self._chercher(nom, plages, alias, approx, exact)
        return self.complete(x) if x else None

    def titre_interne(self, nom, plages, alias=()):
        """Élément dont le titre est une ligne seule au milieu d'un bloc : texte jusqu'à la fin du bloc."""
        cibles = {norm(n) for n in (nom, *alias) if n}
        for x in self.dans(plages):
            ls = x['texte'].split('\n')
            for k, l in enumerate(ls[:-1]):
                # suivi d'une vraie phrase (pas d'une simple liste de noms)
                if len(l) < 70 and norm(l) in cibles and len(ls[k + 1].strip()) >= 40:
                    return {'titre': l.strip(), 'page': x['page'], 'texte': '\n'.join(ls[k + 1:]).strip()}
        return None

    def _chercher(self, nom, plages, alias=(), approx=True, exact=False):
        cibles = [norm(n) for n in (nom, *alias) if n]
        cand = [x for x in self.dans(plages) if x['texte'].strip() or self.complete(x)]
        for c in cibles:
            for x in cand:
                if norm(x['titre']) == c:
                    return x
        if exact:   # recherche dans tout le document : pas de rapprochement, trop de faux amis
            return None
        for c in cibles:
            for x in cand:
                t = norm(x['titre'])
                if c and (t.startswith(c + ' ') or c.startswith(t + ' ') and len(t) > 6):
                    return x
        if not approx:
            return None
        # Fautes de frappe entre la fiche et le PDF (« Explusion » / « Expulsion »…)
        meilleur, score = None, 0.0
        for c in cibles:
            for x in cand:
                r = difflib.SequenceMatcher(None, c, norm(x['titre'])).ratio()
                if r > score:
                    meilleur, score = x, r
        return meilleur if score >= 0.86 else None

    def element_en_ligne(self, nom, plages, alias=()):
        """Cherche « Nom : description » à l'intérieur des entrées (listes à puces)."""
        cibles = {norm(n) for n in (nom, *alias) if n}
        for x in self.dans(plages):
            for l in x['texte'].split('\n'):
                m = re.match(r'^\s*(?:•\s*)?([^:]{2,60}?)\s*:\s*(.+)$', l)
                if m and norm(m.group(1)) in cibles:
                    return {'titre': m.group(1), 'page': x['page'], 'texte': m.group(2).strip()}
        return None


# ----------------------------------------------------------------------------
# Plages de pages du PDF (version du 27/10/2026)
# ----------------------------------------------------------------------------
P = {
    'clans': [(4, 67)], 'creation': [(68, 96)], 'atouts': [(97, 316), (4, 67)],
    'competences': [(317, 345), (79, 80)], 'disciplines': [(346, 583)], 'historiques': [(584, 606)],
    'anciens': [(607, 653)], 'techniques': [(654, 764)], 'equipement': [(868, 874)],
    'sang': [(894, 902)], 'ethique': [(90, 91), (903, 911), (240, 316)], 'derangements': [(918, 922)],
    'rituels_necro': [(404, 430)], 'rituels_abysse': [(460, 476)], 'rituels_thauma': [(499, 539)],
    'sabbat': [(940, 1131)], 'tout': [(1, 1131)],
}

ALIAS = {
    # éléments de la fiche -> titres du PDF
    'Caïtiff': ['Caitiff'], 'Malkavien': ['Malkavian'], 'Disciple de Set': ['Disciples de Set'],
    'Fille de la Cacophonie': ['Filles de la Cacophonie'], 'Gargouille': ['Gargouilles'],
    'Assamite - Guerrier': ['Assamite Guerrier'], 'Assamite - Vizir': ['Assamite Vizir'],
    'Assamite - Sorcier': ['Assamite Sorcier'], 'Disciple de Set - Vipère': ['Vipères'],
    'Gangrel Urbain - Coyote': ['Coyotes'], 'Gangrel - Noiad': ['Noiad'], 'Gangrel - Anda': ['Anda'],
    'Giovanni - Premascine': ['Premascine'], 'Lasombra - Corsaire': ['Corsaires'],
    'Malkavien - Ananke': ['Ananke'], 'Malkavien - Chevalier de la Lune': ['Chevalier de la Lune'],
    'Nosferatu - Rampant': ['Nosferatu : “Les Rampants”', 'Les Rampants'], 'Ravnos - Brahman': ['Brahman'],
    'Toréador - Ishtarri': ['Ishtarri'], 'Toréador - Volgirre': ['Volgirre'], 'Tremere - Telyav': ['Telyav'],
    'Tzimisce - Bratovitch': ['Bratovitch'], 'Tzimisce - Koldun': ['Koldun'], 'Ventrue - Croisé': ['Les Croisés'],
    'Erudition': ['Érudition'], 'Sous les Radar': ['Sous les Radars'], "Flutiste d'Hamelin": ["Flûtiste d'Hamelin"],
    'Gotha': ['Influences'], 'Pègre': ['Influences'], 'Renommée': ['Renommées'], 'Troupeau': ['Troupeaux'],
    'Havre': ['Havres'], 'Fausses identités': ['Fausses Identités'], 'Rituels sabbatiques': ['Rituels'],
    'Force d\'âme': ['Force d’Âme'], "V. de l'Enfant de la Tombe": ['La Voie du Né de la Tombe'],
    "Voie de l'Humanité": ['L’Humanité', 'Humanité'],
    'Numina (Vraie Foi)': ['La Vraie Foi', 'Vraie Foi'], 'Danse du Feu': ['La Danse du Feu'],
    'Contrition': ['Rite de Contrition'],
    # Rituel renommé dans les règles (même niveau, même effet : infiltrer le Sabbat)
    'Manipulation du Traitre': ['Manipulation du parjure'],
}


def nom_voie_discipline(nom):
    """« V. du Sang » -> « La Voie du Sang »."""
    return ('La Voie ' + nom[3:]) if nom.startswith('V. ') else nom


# ----------------------------------------------------------------------------
# Construction
# ----------------------------------------------------------------------------
def date_pdf(pdf):
    """Date de création du PDF (jj/mm/aaaa), pour dater le référentiel."""
    try:
        info = subprocess.run(['pdfinfo', pdf], capture_output=True, text=True, check=True).stdout
        m = re.search(r'CreationDate:\s+\w+\s+(\w+)\s+(\d+)\s+[\d:]+\s+(\d{4})', info)
        mois = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        if m and m.group(1) in mois:
            return f'{int(m.group(2)):02d}/{mois.index(m.group(1)) + 1:02d}/{m.group(3)}'
    except Exception:
        pass
    return ''


def archetypes_du_pdf(ix, noms):
    """Liste « Nom ? description » de l'entrée Archétypes (le tiret du PDF sort en « ? »)."""
    x = ix.chercher('Archétypes', P['creation'])
    if not x:
        return {}
    voulus = {norm(n): n for n in noms}
    res = {}
    for l in x['texte'].split('\n'):
        m = re.match(r'^\s*(.{2,40}?)\s+[?–—-]\s+(.+)$', l)
        if m and norm(m.group(1)) in voulus:
            res[voulus[norm(m.group(1))]] = {'titre': m.group(1), 'page': x['page'], 'texte': m.group(2).strip()}
    return res


# ----------------------------------------------------------------------------
# Faiblesses de clan : paragraphe « Faiblesse de Clan : … » du clan (ou de ses
# conseils d'interprétation, bloc suivant dans le PDF).
# ----------------------------------------------------------------------------
FAIBLESSE = re.compile(r'(?m)^(Faiblesses?(?:\s+(?:de|du)\s+(?:[Cc]lan|[Ll]ignée))?|Faiblesse alternative)\s*:\s*')
FIN_FAIBLESSE = re.compile(r'(?:\n|(?<=[.!?»]))\s*(?:Livret de [Cc]lan|Lignées?\b|Conseils d|Avantages\s*:|Disciplines de [Cc]lan|Atouts? de [Cc]lan)')
PARENT_CLAN = {'Gangrel Urbain': 'Gangrel'}


def faiblesses_des_clans(ix, ents, clans):
    debuts = []
    for nom in clans:
        x = ix._chercher(nom, P['clans'], ALIAS.get(nom, []), True, False)
        if x:
            debuts.append((ents.index(x), nom))
    debuts.sort()
    res = {}
    for k, (i, nom) in enumerate(debuts):
        suivant = next((j for j, _ in debuts[k + 1:] if j > i), i + 6)
        for e in ents[i:suivant]:
            m = FAIBLESSE.search(e['texte'])
            if not m:
                continue
            suite = e['texte'][m.start():]
            f = FIN_FAIBLESSE.search(suite)
            res[nom] = {'titre': m.group(1), 'page': e['page'], 'texte': (suite[:f.start()] if f else suite).strip()}
            break
    # « Identique à celle des X » / « En plus de la faiblesse de X » : on ajoute celle du clan parent.
    for nom, v in list(res.items()):
        parent = nom.split(' - ')[0]
        parent = PARENT_CLAN.get(parent, parent)
        if parent != nom and parent in res and re.search(r'Identique|En plus de la faiblesse', v['texte'], re.I):
            texte_parent = FAIBLESSE.sub('', res[parent]['texte'], count=1)
            v['texte'] += '\n\nFaiblesse du clan ' + parent + ' : ' + texte_parent
    return res


# ----------------------------------------------------------------------------
# Spécialités de la compétence Mystères : connaissances communes et secrètes
# de chaque niveau (chapitre « Les spécialisations de la compétence Mystère »).
# Textes secrets en jeu : importés dans une collection lisible des seuls
# conteurs, puis transmis à chaque personnage pour les niveaux qu'il connaît.
# ----------------------------------------------------------------------------
TITRE_MYSTERE = re.compile(r'^Spécialité\s+(?:Mystère\s+)?(?:du\s+|de\s+la\s+|des\s+|de\s+l[\'’]\s*)?(.+?)\s*$')
NIVEAU_MYSTERE = re.compile(r'^Niveau\s*(\d)\s*:?\s*(.*)$')
PARTIE_MYSTERE = re.compile(r'^(?:Connaissances?\s+)?(Communes?|Secr[eè]tes?)\s*:?\s*(.*)$', re.I)
BIOGRAPHIES = re.compile(r'^Biographies accessibles au niveau\s*(\d)', re.I)
# Titres du PDF -> noms de la liste « Spécialités Mystères » de la fiche
FACTIONS_PDF = {
    'Caitiffs/Panders': 'Caitiff/Panders', 'Démon': 'Démon et Infernalisme',
    'Fantôme et Outremonde': 'Fantôme Spectre et Outremonde', 'Lasombra': 'Lassombra', 'Loups-garous': 'Lupin',
    'Noddisme': 'Livre de Nod', 'Réseau Lunatique Malkavien': 'RLM', 'Salubrien': 'Salubri',
}
AUCUNE = re.compile(r'^\s*(?:Aucune?|Néant|Pas de connaissance secrète|-)?\s*\.?\s*$', re.I)


def mysteres(pdf, factions):
    brut, spec, niv, partie = {}, None, None, None
    dans = False
    for page, ls in blocs(pdf):
        t = ls[0].strip()
        corps = '\n'.join(ls[1:])
        m = TITRE_MYSTERE.match(t)
        if m and re.match(r'^Spécialité\s+(Mystère|Assamite)', t):
            dans, spec, niv, partie = True, m.group(1), None, None
            brut[spec] = {}
            continue
        if not dans:
            continue
        if t.startswith('Serviteurs (Sabbat)'):
            break
        m = NIVEAU_MYSTERE.match(t)
        if m:
            niv, partie = int(m.group(1)), None
            n = brut[spec].setdefault(niv, {'p': page, 'communes': '', 'secretes': '', 'notes': ''})
            if (m.group(2) + corps).strip():
                n['notes'] += (m.group(2) + '\n' + corps).strip() + '\n'
            continue
        m = PARTIE_MYSTERE.match(t)
        if m and niv:
            partie = 'communes' if m.group(1).lower().startswith('commun') else 'secretes'
            brut[spec][niv][partie] += (m.group(2) + '\n' + corps).strip() + '\n'
            continue
        m = BIOGRAPHIES.match(t)
        if m:
            n = brut[spec].setdefault(int(m.group(1)), {'p': page, 'communes': '', 'secretes': '', 'notes': ''})
            n['notes'] += t + '\n' + corps + '\n'
            continue
        if niv:   # sous-titre interne (annexes, notes HJ…) : rattaché à la partie en cours
            brut[spec][niv][partie or 'notes'] += t + '\n' + corps + '\n'
    res, inconnues = {}, []
    for spec, niveaux in brut.items():
        nom = FACTIONS_PDF.get(spec, spec)
        if nom not in factions:
            inconnues.append(spec)
        for n, v in sorted(niveaux.items()):
            c, x, notes = (paragraphes(v[k]) for k in ('communes', 'secretes', 'notes'))
            c, x = ('' if AUCUNE.match(c) else c), ('' if AUCUNE.match(x) else x)
            morceaux = [notes] if notes else []
            if c:
                morceaux.append('Connaissances communes :\n' + c)
            if x:
                morceaux.append('Connaissances secrètes :\n' + x)
            if not morceaux:
                continue
            res[f'{nom} / {n}'] = {'t': '\n\n'.join(morceaux), 'c': c, 'x': x, 'n': notes, 'p': v['p'],
                                   'titre': f'Spécialité Mystère {spec} — niveau {n}'}
    return res, inconnues


def construire(pdf):
    ref_js = (RACINE / 'assets/js/camarilla/fiche/referentiel.js').read_text(encoding='utf-8')
    REF = json.loads(ref_js[ref_js.index('{'):ref_js.rindex('}') + 1])
    chemin_excel = SORTIE / 'textes_excel.json'
    if chemin_excel.exists():
        excel = json.loads(chemin_excel.read_text(encoding='utf-8'))
    else:
        print('(textes_excel.json absent : archétypes et faiblesses de clan lus dans le PDF)')
        excel = {'clans': {}, 'archetypes': {}, 'qualites': {}}
    ents = entrees(pdf)
    ix = Index(ents)
    D, manquants = {}, {}

    def poser(cat, cle, trouve, source='Règles MET'):
        if trouve and trouve.get('texte', '').strip():
            D.setdefault(cat, {})[cle] = {'t': trouve['texte'].strip(), 'p': trouve.get('page'), 's': source, 'titre': trouve.get('titre', '')}
            return True
        manquants.setdefault(cat, []).append(cle)
        return False

    def simple(cat, noms, plages, en_ligne=False):
        for nom in noms:
            a = ALIAS.get(nom, [])
            x = ix.chercher(nom, plages, a) or (ix.element_en_ligne(nom, plages, a) if en_ligne else None) \
                or ix.titre_interne(nom, plages, a)
            poser(cat, nom, x)

    # Clans : texte du PDF ; faiblesse de la fiche Excel, sinon du PDF
    faiblesses_pdf = faiblesses_des_clans(ix, ents, [c['nom'] for c in REF['clans']])
    for c in REF['clans']:
        x = ix.chercher(c['nom'], P['clans'], ALIAS.get(c['nom'], []))
        poser('clans', c['nom'], x)
        f = excel['clans'].get(c['nom'], {}).get('t')
        if f:
            D.setdefault('faiblesses', {})[c['nom']] = {'t': f, 's': 'Fiche MET 8.0.2'}
        else:
            poser('faiblesses', c['nom'], faiblesses_pdf.get(c['nom']))
    simple('sectes', ['Camarilla', 'Anarchs', 'Sabbat', 'Aubains'], P['clans'])

    # Spécialités Mystères, niveau par niveau (connaissances communes et secrètes)
    textes, inconnues = mysteres(pdf, REF['factionsMystere'])
    if textes:
        D['mysteres'] = {k: {**v, 's': 'Règles MET'} for k, v in textes.items()}
    if inconnues:
        manquants.setdefault('mysteres', []).extend('chapitre « ' + s + ' » : spécialité absente de la fiche' for s in inconnues)
    faites = {k.split(' / ')[0] for k in textes}
    manquants.setdefault('mysteres', []).extend(f + ' (pas de chapitre dans les règles)' for f in REF['factionsMystere'] if f not in faites)

    # Archétypes, qualités d'équipement : textes de la fiche Excel (complétés par le PDF)
    for nom, v in excel['archetypes'].items():
        D.setdefault('archetypes', {})[nom] = {'t': v['t'], 's': 'Fiche MET 8.0.2'}
    if not excel['archetypes']:
        du_pdf = archetypes_du_pdf(ix, REF['archetypes'])
        for nom in REF['archetypes']:
            poser('archetypes', nom, du_pdf.get(nom))
    for t, noms in REF['qualites'].items():
        for nom in noms:
            x = ix.element_en_ligne(nom, P['equipement'])
            cle = f'{t} / {nom}'
            if nom.endswith('?'):
                continue
            if x:
                poser('qualites', cle, x)
            elif excel['qualites'].get(cle, {}).get('t'):
                D.setdefault('qualites', {})[cle] = {'t': excel['qualites'][cle]['t'], 's': 'Fiche MET 8.0.2'}
            else:
                manquants.setdefault('qualites', []).append(cle)
    simple('typesEquipement', REF['typesEquipement'], P['equipement'])

    # Attributs et focus
    simple('attributs', ['Attributs Physiques', 'Attributs Sociaux', 'Attributs Mentaux'], P['creation'])
    for cat, focus in REF['focus'].items():
        groupe = ix.chercher('Focus ' + cat, [(76, 79)])
        for nom in focus:
            x = None
            if groupe:
                morceaux = re.split(r'(?=Un personnage focalisé)', groupe['texte'])
                # paragraphe propre au focus (« Un personnage focalisé sur la Force… »), sinon le texte du groupe
                bon = next((m for m in morceaux if m.startswith('Un personnage focalisé') and nom.lower() in m[:60].lower()), None)
                x = {'page': groupe['page'], 'texte': bon or groupe['texte']}
            poser('focus', nom, x)

    # Compétences
    simple('competences', REF['competences'] + ['Sciences', 'Artisanat', 'Représentation', 'Mystères', 'Linguistique'],
           P['competences'])

    # Historiques
    simple('historiques', ['Gotha', 'Pègre', 'Génération', 'Ressources', 'Renommée', 'Fausses identités', 'Havre',
                           'Troupeau', 'Contacts', 'Alliés', 'Rituels sabbatiques', 'Historiques partagés',
                           'Serviteurs', "Emplacements d'intérêts"], P['historiques'] + [(880, 892)])
    simple('avantagesHavre', [a.split(' (')[0] for a in REF['avantagesHavre']], P['historiques'] + [(884, 888)],
           en_ligne=True)
    simple('qualitesServiteur', [q['nom'] for q in REF['qualitesServiteur']], P['historiques'], en_ligne=True)

    # Atouts / handicaps
    noms_a = {a['nom'] for a in REF['atouts']['generaux']}
    noms_h = {a['nom'] for a in REF['handicaps']['generaux']}
    for groupe in ('clan', 'secte'):
        for lst in REF['atouts'][groupe].values():
            noms_a |= {a['nom'] for a in lst}
        for lst in REF['handicaps'][groupe].values():
            noms_h |= {a['nom'] for a in lst}
    simple('atouts', sorted(noms_a), P['atouts'])
    simple('handicaps', sorted(noms_h), P['atouts'])
    simple('derangements', REF['derangements'], P['derangements'])
    simple('voies', REF['voies'], P['ethique'] + P['creation'])

    # Disciplines et pouvoirs : chaque discipline couvre les pages jusqu'à la suivante.
    debuts = []
    for d in REF['disciplines']:
        x = ix.chercher(nom_voie_discipline(d['nom']), P['disciplines'], ALIAS.get(d['nom'], [])) \
            or ix.chercher(nom_voie_discipline(d['nom']), P['tout'], ALIAS.get(d['nom'], []), approx=False)
        poser('disciplines', d['nom'], x)
        if x:
            debuts.append((ents.index(x), d))
    debuts.sort(key=lambda t: t[0])
    limites = {d['nom']: (i, debuts[k + 1][0] if k + 1 < len(debuts) else i + 400) for k, (i, d) in enumerate(debuts)}
    for d in REF['disciplines']:
        segment = ents[limites[d['nom']][0]:limites[d['nom']][1]] if d['nom'] in limites else []
        puces = [x for x in segment if '•' in x['titre']]
        autres = {norm(n) for n in d['pouvoirs'] + d['anciens'] if n}
        for niv, pouvoir in enumerate(d['pouvoirs'], 1):
            if not pouvoir:
                continue
            # Par nom ; à défaut, le pouvoir de même niveau, sauf s'il porte le nom
            # d'un autre pouvoir de la discipline (les deux sources divergent alors).
            x = next((p for p in puces if norm(p['titre']) == norm(pouvoir)), None) \
                or next((p for p in puces if niveau_points(p['titre']) == niv
                         and (norm(p['titre']) not in autres or norm(p['titre']) == norm(pouvoir))), None)
            if not x and norm(pouvoir):   # rangé parmi les pouvoirs d'ancien dans les règles
                x = ix.chercher(pouvoir, P['anciens'], approx=False)
            if not x and not norm(pouvoir) and d['nom'] in limites:   # niveaux sans nom (Vraie Foi) : texte de la discipline
                x = ents[limites[d['nom']][0]]
            poser('pouvoirs', f"{d['nom']} / {pouvoir}", x)

    # Pouvoirs d'anciens
    for d in REF['disciplines']:
        segment = ents[limites[d['nom']][0]:limites[d['nom']][1]] if d['nom'] in limites else []
        for pouvoir in d['anciens']:
            x = ix.chercher(pouvoir, P['anciens'], ALIAS.get(pouvoir, [])) \
                or next((p for p in segment if norm(p['titre']) == norm(pouvoir)), None)   # rangé parmi les pouvoirs
            poser('anciens', f"{d['nom']} / {pouvoir}", x)

    # Techniques et rituels
    simple('techniques', REF['techniques'], P['techniques'])
    plages_rituel = {'Thaumaturgie': P['rituels_thauma'], 'Nécromancie': P['rituels_necro'], 'Abysse': P['rituels_abysse']}
    for r in REF['rituels']:
        plages = plages_rituel.get(r['type'], P['tout'])
        a = ALIAS.get(r['nom'], [])
        x = ix.chercher(r['nom'], plages, a) or ix.titre_interne(r['nom'], plages, a) or ix.chercher(r['nom'], P['tout'], a, exact=True)
        poser('rituels', r['nom'], x)
    simple('rituelsSabbat', [n.split(' (')[0] for n in REF['rituelsSabbat']], P['sabbat'] + P['historiques'], en_ligne=True)

    # Notions générales de la fiche
    notions = {
        'Archétype': ('Archétypes', P['creation']), 'Volonté': ('La Volonté', P['tout']),
        'Point de sang': ('Le sang', P['sang']), 'Lien de sang': ('Lien de Sang', P['sang']),
        'Éthique': ("L’Humanité", P['ethique']), 'Voies d’Illumination': ("Les voies alternatives de l'Illumination", P['ethique']),
        'Dérangements': ('Dérangements', P['derangements']), 'Diablerie': ('La Diablerie', [(915, 916)]),
        'Génération': ('Génération', P['historiques']), 'Expérience': ('PX Gagnés', P['creation']),
        'Dépense des PX': ('Tableau de dépense des PX', P['creation']), 'Atouts et handicaps': ('Etape 8 : Choix des Atouts et Handicaps', P['creation']),
        'Focus': ('Focus', [(349, 351)]), 'Antagoniste': ('Antagoniste', P['creation']),
        'Goule': ('Jouer une Goule', P['creation']), 'Emplacements d\'intérêts': ("Emplacements d'intérêts", [(880, 892)]),
    }
    for cle, (titre, plages) in notions.items():
        poser('notions', cle, ix.chercher(titre, plages))

    return D, manquants


if __name__ == '__main__':
    D, manquants = construire(sys.argv[1])
    SORTIE.mkdir(exist_ok=True)
    total = sum(len(v) for v in D.values())
    date = date_pdf(sys.argv[1])
    (SORTIE / 'descriptions.json').write_text(json.dumps({
        'version': 'Règles MET' + (f' (export du {date})' if date else '') + ' + fiche MET 8.0.2',
        'avertissement': 'Document confidentiel de la Fédération Camarilla Française : ne pas publier.',
        'categories': D}, ensure_ascii=False), encoding='utf-8')
    lignes_rapport = [f'{total} descriptions trouvées.', '']
    for cat in sorted(set(D) | set(manquants)):
        n_ok, n_ko = len(D.get(cat, {})), len(manquants.get(cat, []))
        lignes_rapport.append(f'{cat}: {n_ok} trouvées, {n_ko} manquantes')
        if n_ko:
            lignes_rapport.append('   - ' + '\n   - '.join(manquants[cat]))
    (SORTIE / 'couverture.txt').write_text('\n'.join(lignes_rapport), encoding='utf-8')
    print('\n'.join(l for l in lignes_rapport if not l.startswith('   ')))
