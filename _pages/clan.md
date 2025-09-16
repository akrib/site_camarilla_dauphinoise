---
layout: single
title: "Clans"
section: clans
permalink: /clans/
---

Les clans vampiriques représentent les différentes lignées de vampires, chacune possédant des caractéristiques, des philosophies et des disciplines propres. Chaque clan façonne la manière dont ses membres interagissent avec le monde des vivants et des morts-vivants, et détermine leur rôle dans la société vampirique.
<style>
.carousel {
  perspective: 1000px; /* donne la profondeur */
  width: 400px; 
  height: 500px;
  margin: 50px auto;
  position: relative;
  overflow: visible;
}

.carousel__container {
  width: 100%;
  height: 100%;
  position: absolute;
  transform-style: preserve-3d;
  animation: rotate 20s infinite linear;
}

.carousel__container img {
  position: absolute;
  left: 50%;
  top: 50%;
  transform-style: preserve-3d;
  transform-origin: center center;
  width: 180px; /* largeur des images */
  height: auto;
  border-radius: 10px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}

/* Positionnement en cercle aplati */
.carousel__container img:nth-child(1) { transform: rotateY(0deg) translateZ(300px) scaleY(0.9); }
.carousel__container img:nth-child(2) { transform: rotateY(51.4deg) translateZ(300px) scaleY(0.9); }
.carousel__container img:nth-child(3) { transform: rotateY(102.8deg) translateZ(300px) scaleY(0.9); }
.carousel__container img:nth-child(4) { transform: rotateY(154.2deg) translateZ(300px) scaleY(0.9); }
.carousel__container img:nth-child(5) { transform: rotateY(205.6deg) translateZ(300px) scaleY(0.9); }
.carousel__container img:nth-child(6) { transform: rotateY(257deg) translateZ(300px) scaleY(0.9); }
.carousel__container img:nth-child(7) { transform: rotateY(308.4deg) translateZ(300px) scaleY(0.9); }

@keyframes rotate {
  from { transform: rotateY(0deg); }
  to { transform: rotateY(-360deg); }
}
</style>

<div class="carousel">
  <div class="carousel__container">
    <img src="brujah.svg" alt="">
    <img src="gangrel.svg" alt="">
    <img src="malkav.svg" alt="">
    <img src="nosferatu.svg" alt="">
    <img src="toreador.svg" alt="">
    <img src="tremere.svg" alt="">
    <img src="ventrue.svg" alt="">
  </div>
</div>

Voici un aperçu des principaux clans :
- **[Brujah]({{ site.baseurl }}/clans/brujah/)** : Des révolutionnaires passionnés, connus pour leur fougue et leur force physique.
- **[Gangrel]({{ site.baseurl }}/clans/gangrel/)** : Des solitaires proches de la nature, capables de se transformer en bêtes sauvages.
- **[Malkavian]({{ site.baseurl }}/clans/malkavian/)** : Des esprits imprévisibles, porteurs d'une sagesse étrange et souvent incomprise.
- **[Nosferatu]({{ site.baseurl }}/clans/nosferatu/)** : Des vampires dissimulés dans l’ombre, maîtres de l’information et de la discrétion.
- **[Toreador]({{ site.baseurl }}/clans/toreador/)** : Des esthètes obsédés par la beauté et l’art, souvent fascinés par la société humaine.
- **[Tremere]({{ site.baseurl }}/clans/tremere/)** : Des sorciers vampires, experts en magie et en manipulations occultes.
- **[Ventrue]({{ site.baseurl }}/clans/ventrue/)** : Des leaders nés, nobles et stratèges, qui dominent le monde des vampires.
- **[Lasombra]({{ site.baseurl }}/clans/lasombra/)** : Des manipulateurs de l’ombre et du pouvoir, redoutés pour leur influence et leur cruauté.
- **[Tzimisce]({{ site.baseurl }}/clans/tzimisce/)** : Des vampires anciens, souvent sadiques, liés à des pratiques de chair et de terreur.
- **[Giovanni]({{ site.baseurl }}/clans/giovanni/)** : Maîtres de la mort et de la nécromancie, mêlant ambition et secrets familiaux.
- **[Ravnos]({{ site.baseurl }}/clans/ravnos/)** : Voyageurs et illusionnistes, maîtres de la ruse et de l’évasion.
- **[Sethite]({{ site.baseurl }}/clans/sethite/)** : Initiés aux mystères antiques, mystérieux et manipulateurs, liés aux dieux anciens.
- **[Assamite]({{ site.baseurl }}/clans/assamite/)** : Assassins silencieux et précis, redoutables dans l’art du meurtre et de la discrétion.
