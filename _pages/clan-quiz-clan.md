---
title: "Quel clan de la Camarilla es-tu ?"
permalink: /clan/quiz-clan/
layout: single
---

<div id="clan-quiz" style="max-width: 600px; margin: 2em auto; padding: 1em; border: 2px solid #ccc; border-radius: 8px; background: #f9f9f9;">
  <h2>Quel clan de la Camarilla te correspond ?</h2>
  
  <div id="quiz-content">
    <div class="question" data-q="0">
      <p>1. Quand tu arrives à une fête, que fais-tu en premier ?</p>
      <button data-value="brujah">Faire connaissance avec tout le monde et m’amuser</button>
      <button data-value="ventrue">Observer et repérer les leaders et opportunités</button>
      <button data-value="toreador">Admirer la décoration et la musique</button>
      <button data-value="nosferatu">Rester discret et observer les interactions</button>
      <button data-value="malkavian">Faire quelque chose de surprenant et original</button>
      <button data-value="gangrel">Profiter de la nature et être indépendant</button>
      <button data-value="tremere">Étudier et découvrir des secrets mystérieux</button>
    </div>

    <div class="question" data-q="1" style="display:none;">
      <p>2. Quelle activité te plaît le plus ?</p>
      <button data-value="brujah">Sport, aventure, défis physiques</button>
      <button data-value="ventrue">Stratégie, planification, résolution de problèmes</button>
      <button data-value="toreador">Art, musique, création</button>
      <button data-value="nosferatu">Enquêtes, énigmes, exploration secrète</button>
      <button data-value="malkavian">Idées folles et perspectives uniques</button>
      <button data-value="gangrel">Randonnée, survie et lien avec la nature</button>
      <button data-value="tremere">Étudier la magie et le mystère</button>
    </div>

    <div class="question" data-q="2" style="display:none;">
      <p>3. Quelle qualité est la plus importante pour toi ?</p>
      <button data-value="brujah">Énergie et courage</button>
      <button data-value="ventrue">Influence et organisation</button>
      <button data-value="toreador">Sens artistique et esthétique</button>
      <button data-value="nosferatu">Discrétion et observation</button>
      <button data-value="malkavian">Créativité et intuition</button>
      <button data-value="gangrel">Autonomie et résilience</button>
      <button data-value="tremere">Discipline et curiosité</button>
    </div>

    <div class="question" data-q="3" style="display:none;">
      <p>4. Que veux-tu apprendre ou développer en jouant ?</p>
      <button data-value="brujah">Travailler en équipe et prendre des initiatives</button>
      <button data-value="ventrue">Comprendre la stratégie et la diplomatie</button>
      <button data-value="toreador">Exprimer ma créativité et mon sens esthétique</button>
      <button data-value="nosferatu">Développer mon sens de l’observation et de l’ingéniosité</button>
      <button data-value="malkavian">Explorer ma créativité et mon imagination</button>
      <button data-value="gangrel">Renforcer mon autonomie et mon lien avec la nature</button>
      <button data-value="tremere">Acquérir de la discipline et maîtriser des connaissances</button>
    </div>
  </div>

  <div id="quiz-result" style="display:none; margin-top: 1em; padding: 1em; border: 2px solid #aaa; border-radius: 8px; background: #fff;">
    <h3>Ton clan idéal :</h3>
    <p id="result-text"></p>
  </div>
</div>

<script>
(function(){
  const buttons = document.querySelectorAll('#clan-quiz button');
  const answers = [];
  buttons.forEach(btn => {
    btn.addEventListener('click', function() {
      const questionDiv = this.parentElement;
      const qIndex = parseInt(questionDiv.getAttribute('data-q'));
      answers[qIndex] = this.getAttribute('data-value');

      // Passer à la question suivante
      questionDiv.style.display = 'none';
      const nextQ = document.querySelector(`.question[data-q="${qIndex + 1}"]`);
      if(nextQ){
        nextQ.style.display = 'block';
      } else {
        showResult();
      }
    });
  });

  function showResult(){
    const counts = {};
    answers.forEach(ans => counts[ans] = (counts[ans] || 0) + 1);
    let max = 0, clan = '';
    for(const c in counts){
      if(counts[c] > max){ max = counts[c]; clan = c; }
    }

    const descriptions = {
      brujah: "💪 **Brujah** : Tu es dynamique et audacieux ! Ce clan t’aidera à développer la collaboration, le courage et la capacité à relever des défis en équipe.",
      ventrue: "🧠 **Ventrue** : Tu es stratégique et observateur. Ce clan t’enseignera l’organisation, la diplomatie et la gestion d’influences.",
      toreador: "🎨 **Toreador** : Tu es créatif et sensible à l’esthétique. Ce clan favorise le sens artistique, l’expression et l’inspiration.",
      nosferatu: "🕵️ **Nosferatu** : Tu es discret et observateur. Ce clan t’encourage à développer l’ingéniosité, l’observation et la résolution de mystères.",
      malkavian: "🤪 **Malkavian** : Tu es intuitif et original ! Ce clan t’aidera à développer ta créativité mentale, ton sens de l’originalité et ta perception du monde différemment.",
      gangrel: "🌿 **Gangrel** : Tu es indépendant et proche de la nature. Ce clan favorise l’autonomie, la résilience et le lien avec l’environnement.",
      tremere: "🔮 **Tremere** : Tu es studieux et mystique. Ce clan t’apprendra la discipline, l’étude et la maîtrise de connaissances spécialisées."
    };

    document.getElementById('result-text').innerHTML = descriptions[clan];
    document.getElementById('quiz-result').style.display = 'block';
  }
})();
</script>
<style>
  #clan-quiz button {
    display: inline-block;
    width: 100%;          /* Tous les boutons prennent toute la largeur de leur conteneur */
    max-width: 280px;     /* Limite la largeur sur grand écran */
    padding: 12px 20px;   /* Hauteur uniforme */
    margin: 8px auto;     /* Espacement entre boutons */
    border: 2px solid #444;
    border-radius: 8px;
    background-color: #eee;
    color: #222;
    font-size: 16px;
    cursor: pointer;
    text-align: center;
    transition: all 0.2s ease;
    box-sizing: border-box;
  }

  #clan-quiz button:hover {
    background-color: #444;
    color: #fff;
    transform: scale(1.05);
  }

  /* Centrer les boutons dans leur conteneur */
  .question {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  /* Assurer une uniformité sur petits écrans */
  @media (max-width: 480px) {
    #clan-quiz button {
      font-size: 14px;
      padding: 10px 16px;
    }
  }
</style>
