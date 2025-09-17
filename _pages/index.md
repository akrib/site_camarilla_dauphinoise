---
layout: single
title: "Bienvenue sur le site officiel de la <br/> **Camarilla Dauphinoise**"
classes: wide
permalink: /
section: index
header:
  overlay_image: /assets/images/hero-bg.jpg
  overlay_filter: 0.5 # optionnel, fonce l’image pour que le texte reste lisible
  caption: "© Camarilla Dauphinoise"
excerpt: "Quand la nuit tombe sur Grenoble, les ombres s’animent…"
feature_row:
  - image_path: /assets/images/event.jpg
    alt: "Événements"
    title: "Événements"
    excerpt: "Retrouvez nos prochaines dates et inscrivez-vous."
    url: "/events/"
    btn_label: "Voir les événements"
    btn_class: "btn--primary"
  - image_path: /assets/images/rules.jpg
    alt: "Règles"
    title: "Règles du jeu"
    excerpt: "Consultez les règles et préparez votre personnage."
    url: "/rules/"
    btn_label: "Lire les règles"
    btn_class: "btn--primary"
---

# Bienvenue à la Camarilla Dauphinoise

Notre association propose un **jeu de rôle grandeur nature (GN)** unique en son genre :  
un **huis clos théâtral et immersif** qui prend place dans un **univers contemporain et mystérieux**, en plein cœur de Grenoble.  

Plongez dans un monde parallèle où chaque ruelle dissimule un secret, chaque regard cache une vérité.  
Entre **alliances incertaines**, **intrigues troublantes** et **révélations inattendues**, vous incarnerez un personnage dans une ville qui ne dort jamais vraiment…  
Quand la nuit tombe, **Grenoble parle**. Saurez-vous écouter ce qu’elle a à vous révéler ?

---

## Nos valeurs

À la Camarilla Dauphinoise, nous plaçons au cœur de nos activités des valeurs essentielles :  

- 🤝 **Respect**  
- 🌿 **Bienveillance**  
- 🎭 **Tolérance mutuelle**  

Que vous soyez joueur débutant ou passionné confirmé, notre objectif est de vous offrir un cadre **inclusif et convivial**, où chacun peut trouver sa place et s’épanouir.  

---

## Pourquoi nous rejoindre ?

Rejoindre la Camarilla Dauphinoise, c’est partager bien plus qu’un simple loisir :  

- Vivre une expérience immersive et créative  
- Tisser des liens autour du **jeu de rôle grandeur nature**  
- Évoluer dans un esprit de **coopération, d’entraide et de partage**  

Nous veillons à ce que nos événements soient **accueillants, organisés et respectueux**, afin que **joueurs comme partenaires institutionnels** puissent avoir confiance dans la qualité de nos actions.  

---

👉 Que vous cherchiez une **aventure immersive** ou une **association culturelle sérieuse et conviviale**, la Camarilla Dauphinoise vous ouvre ses portes.

<h2>📰 Derniers articles</h2>
<ul class="post-list">
  {% for post in site.posts limit:5 %}
    <li>
      <a href="{{ post.url | relative_url }}">{{ post.title }}</a>
      <span class="post-meta">{{ post.date | date: "%d %B %Y" }}</span>
      <p>{{ post.excerpt | strip_html | truncate: 120 }}</p>
    </li>
  {% endfor %}
</ul>

