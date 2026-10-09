// App Main Script - Handles Screen Switching, Navigation, Buttons, and System Binding

document.addEventListener('DOMContentLoaded', () => {
  const navTabs = document.querySelectorAll('.nav-tab');
  const screens = document.querySelectorAll('.screen');

  window.switchScreen = function(targetScreenId) {
    screens.forEach(s => s.classList.remove('active'));
    navTabs.forEach(t => t.classList.remove('active'));

    const activeScreen = document.getElementById(targetScreenId);
    if (activeScreen) {
      activeScreen.classList.add('active');
    }

    const activeTab = document.querySelector(`.nav-tab[data-screen="${targetScreenId}"]`);
    if (activeTab) {
      activeTab.classList.add('active');
    }

    // Resize canvas if switching to game
    if (targetScreenId === 'game-screen' && window.gameEngine) {
      setTimeout(() => window.gameEngine.resize(), 50);
    }
  };

  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.screen;
      window.switchScreen(target);
    });
  });

  // Difficulty selection
  const diffBtns = document.querySelectorAll('.diff-btn');
  const diffDescText = document.getElementById('diff-desc-text');

  const diffDescriptions = {
    easy: "Ritmo tranquilo, notas más lentas e ideales para principiantes.",
    medium: "Velocidad moderada con mezcla de notas cortas y sostenidas.",
    hard: "Ritmo rápido con combinaciones desafiantes y patrones intensos.",
    legend: "Máxima velocidad y densidad de notas para verdaderos maestros del ritmo.",
    predator: "🔥 MODO DEPREDADOR: Desafío hiper veloz. ¡Completa la canción para ganar la 8ª Estrella Roja de Rubí!"
  };

  diffBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.classList.contains('disabled')) return;

      diffBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const diff = btn.dataset.diff;
      if (window.gameEngine) {
        window.gameEngine.setDifficulty(diff);
      }

      if (diffDescText && diffDescriptions[diff]) {
        diffDescText.textContent = diffDescriptions[diff];
      }
    });
  });

  // Start game button
  const startGameBtn = document.getElementById('start-game-btn');
  if (startGameBtn) {
    startGameBtn.addEventListener('click', () => {
      if (window.gameEngine) {
        window.gameEngine.isMultiplayer = false;
        const rivalHud = document.getElementById('rival-hud-container');
        if (rivalHud) rivalHud.classList.add('hidden');

        window.switchScreen('game-screen');
        window.gameEngine.startGame();
      }
    });
  }

  // Pause button
  const pauseBtn = document.getElementById('pause-btn');
  if (pauseBtn) {
    pauseBtn.addEventListener('click', () => {
      if (window.gameEngine) {
        window.gameEngine.pauseGame();
        pauseBtn.textContent = window.gameEngine.isPaused ? '▶' : '⏸';
      }
    });
  }

  // Results modal buttons
  const retryBtn = document.getElementById('retry-btn');
  const backHomeBtn = document.getElementById('back-home-btn');
  const resultsModal = document.getElementById('results-modal');

  if (retryBtn) {
    retryBtn.addEventListener('click', () => {
      if (resultsModal) resultsModal.classList.add('hidden');
      if (window.gameEngine) window.gameEngine.startGame();
    });
  }

  if (backHomeBtn) {
    backHomeBtn.addEventListener('click', () => {
      if (resultsModal) resultsModal.classList.add('hidden');
      window.switchScreen('home-screen');
    });
  }
});
