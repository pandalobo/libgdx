// Profile, Shop, Coins & Persistence Manager

class ProfileShopManager {
  constructor() {
    this.storageKey = 'piano_beats_user_data_v1';

    this.data = {
      name: 'Jugador',
      avatar: '😎',
      coins: 100,
      totalStars: 0,
      rubyStars: 0,
      gamesPlayed: 0,
      perfectHits: 0,
      equippedSkin: 'default',
      unlockedSkins: ['default']
    };

    this.shopItems = [
      { id: 'default', name: 'Original', price: 0, color: '#00f2fe', icon: '🟦', desc: 'Aspecto clásico neón celeste' },
      { id: 'neon', name: 'Cyber Neon', price: 150, color: '#ff007f', icon: '💖', desc: 'Estilo vibrante rosa ciberpunk' },
      { id: 'golden', name: 'Dorado Real', price: 300, color: '#ffd700', icon: '🌟', desc: 'Brillo imperial de oro puro' },
      { id: 'ruby', name: 'Rubí Depredador', price: 500, color: '#ff1e27', icon: '🔴', desc: 'Efecto ardiente carmesí' }
    ];

    this.loadData();
    this.initUI();
  }

  loadData() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        this.data = { ...this.data, ...JSON.parse(saved) };
      }
    } catch(e) {
      console.warn('LocalStorage error:', e);
    }
    this.updateHeaderUI();
  }

  saveData() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.data));
    } catch(e) {
      console.warn('LocalStorage save error:', e);
    }
    this.updateHeaderUI();
  }

  updateHeaderUI() {
    const coinElem = document.getElementById('coin-count');
    const starElem = document.getElementById('star-count');
    const avatarIcon = document.getElementById('user-avatar-icon');
    const displayName = document.getElementById('user-display-name');

    if (coinElem) coinElem.textContent = this.data.coins;
    if (starElem) starElem.textContent = this.data.totalStars + this.data.rubyStars;
    if (avatarIcon) avatarIcon.textContent = this.data.avatar;
    if (displayName) displayName.textContent = this.data.name;

    // Profile screen stats
    const gamesPlayedElem = document.getElementById('stat-games-played');
    const perfectsElem = document.getElementById('stat-perfects');
    const starsElem = document.getElementById('stat-stars');
    const rubyStarsElem = document.getElementById('stat-ruby-stars');

    if (gamesPlayedElem) gamesPlayedElem.textContent = this.data.gamesPlayed;
    if (perfectsElem) perfectsElem.textContent = this.data.perfectHits;
    if (starsElem) starsElem.textContent = this.data.totalStars;
    if (rubyStarsElem) rubyStarsElem.textContent = this.data.rubyStars;
  }

  initUI() {
    // Name change
    const nameInput = document.getElementById('player-name-input');
    const saveBtn = document.getElementById('save-profile-btn');
    const avatarPreview = document.getElementById('profile-avatar-preview');

    if (nameInput) nameInput.value = this.data.name;
    if (avatarPreview) avatarPreview.textContent = this.data.avatar;

    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        if (nameInput) this.data.name = nameInput.value.trim() || 'Jugador';
        this.saveData();
        alert('¡Perfil actualizado con éxito!');
      });
    }

    // Avatar selector
    const avatarOpts = document.querySelectorAll('.avatar-opt');
    avatarOpts.forEach(btn => {
      btn.addEventListener('click', () => {
        this.data.avatar = btn.getAttribute('data-avatar');
        if (avatarPreview) avatarPreview.textContent = this.data.avatar;
        this.saveData();
      });
    });

    this.renderShop();
  }

  renderShop() {
    const container = document.getElementById('shop-items-container');
    if (!container) return;

    container.innerHTML = '';

    this.shopItems.forEach(item => {
      const isUnlocked = this.data.unlockedSkins.includes(item.id);
      const isEquipped = this.data.equippedSkin === item.id;

      const card = document.createElement('div');
      card.className = 'shop-card';

      card.innerHTML = `
        <div class="shop-card-preview" style="background:${item.color}22; border: 2px solid ${item.color};">
          ${item.icon}
        </div>
        <h3>${item.name}</h3>
        <p class="subtitle">${item.desc}</p>
        <div class="shop-card-action">
          ${
            isEquipped
              ? `<button class="btn btn-secondary disabled" disabled>Equipado</button>`
              : isUnlocked
                ? `<button class="btn btn-primary equip-btn" data-id="${item.id}">Equipar</button>`
                : `<button class="btn btn-primary buy-btn" data-id="${item.id}" data-price="${item.price}">Comprar (${item.price} 🪙)</button>`
          }
        </div>
      `;

      container.appendChild(card);
    });

    // Event listeners
    container.querySelectorAll('.equip-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const skinId = e.target.getAttribute('data-id');
        this.data.equippedSkin = skinId;
        this.saveData();
        this.renderShop();
      });
    });

    container.querySelectorAll('.buy-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const skinId = e.target.getAttribute('data-id');
        const price = parseInt(e.target.getAttribute('data-price'), 10);

        if (this.data.coins >= price) {
          this.data.coins -= price;
          this.data.unlockedSkins.push(skinId);
          this.data.equippedSkin = skinId;
          this.saveData();
          this.renderShop();
          alert('¡Compra realizada con éxito y aspecto equipado!');
        } else {
          alert(`No tienes suficientes monedas. Necesitas ${price} 🪙 (Tienes ${this.data.coins} 🪙)`);
        }
      });
    });
  }

  addGameResults(earnedCoins, earnedStars, isRuby, perfects) {
    this.data.coins += earnedCoins;
    if (isRuby) {
      this.data.rubyStars += 1;
    } else {
      this.data.totalStars += earnedStars;
    }
    this.data.gamesPlayed += 1;
    this.data.perfectHits += perfects;

    this.saveData();
  }

  getEquippedSkinColor() {
    const item = this.shopItems.find(i => i.id === this.data.equippedSkin);
    return item ? item.color : '#00f2fe';
  }
}

window.profileShop = new ProfileShopManager();
