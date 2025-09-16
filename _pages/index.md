---
layout: splash
title: "Bienvenue sur le site officiel de la <br/> **Camarilla Dauphinoise**"
permalink: /
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

 Plongez dans un monde parallèle où chaque ruelle dissimule un secret, chaque regard cache une vérité. Notre association vous convie à une expérience immersive et intense : un jeu semi-grandeur nature (GN théâtral, huis clos) au cœur de Grenoble, dans un cadre contemporain. Entre énigmes troublantes, alliances incertaines et révélations inattendues, vous incarnerez votre personnage dans une ville qui ne dort jamais vraiment… Quand la nuit tombe, Grenoble parle. Saurez-vous écouter ce qu’elle a à vous révéler ?


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

