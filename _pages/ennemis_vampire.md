---
layout: single
title: "Les Ennemis des Vampires"
permalink: /ennemis_vampire/
---

Les Ennemis des Vampires
Les vampires ne règnent pas seuls dans le Monde des Ténèbres. Ils font face à de nombreux ennemis :

Les Loups-garous (Garous) : Protecteurs de la nature, ennemis jurés des vampires.
<br/>
Les Chasseurs : Humains conscients de la menace vampirique, armés de foi ou de technologie.
<br/>
Les Mages : Maîtres de la réalité, méfiants envers les vampires.
<br/>
Les Spectres et fantômes : Âmes tourmentées liées au monde des morts.
<br/>
Les Inquisiteurs et sociétés secrètes humaines : Organisation de l’ombre traquant les créatures surnaturelles.

```mermaid
graph TD
    C[Camarilla]:::camarilla

    C --> A[Anarchs]
    C --> S[Sabbat]
    C --> I[Indépendants]
    C --> H[Hunters (Inquisiteurs humains)]
    C --> L[Lupins (Garous)]
    C --> F[Fées et autres créatures]
    C --> B[Baas Internes (Ambitions personnelles, intrigues des clans)]

    classDef camarilla fill:#800000,stroke:#000,stroke-width:2px,color:#fff;
    classDef ennemis fill:#111,stroke:#800000,stroke-width:1px,color:#fff;
    class A,S,I,H,L,F,B ennemis;
```