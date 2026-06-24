/* ================================
   PokéTeam Builder — Application Logic
   ================================ */

// ============ CONSTANTS & CONFIG ============
const POKEAPI_BASE = 'https://pokeapi.co/api/v2';
const POKEMON_IMG_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/';
const POKEMON_LIMIT = 151; // Gen 1 initial load
const PER_PAGE = 40;

// Generation ranges
const GEN_RANGES = {
  '1': [1, 151], '2': [152, 251], '3': [252, 386], '4': [387, 493],
  '5': [494, 649], '6': [650, 721], '7': [722, 809], '8': [810, 905], '9': [906, 1025]
};

// Type names in Thai
const TYPE_NAMES_TH = {
  normal: 'ปกติ', fire: 'ไฟ', water: 'น้ำ', electric: 'ไฟฟ้า',
  grass: 'พืช', ice: 'น้ำแข็ง', fighting: 'ต่อสู้', poison: 'พิษ',
  ground: 'ดิน', flying: 'บิน', psychic: 'จิต', bug: 'แมลง',
  rock: 'หิน', ghost: 'ผี', dragon: 'มังกร', dark: 'มืด',
  steel: 'เหล็ก', fairy: 'แฟรี่'
};

const TYPE_ORDER = [
  'normal', 'fire', 'water', 'electric', 'grass', 'ice',
  'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug',
  'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'
];

// Type effectiveness chart (attacking type → defending type)
const TYPE_CHART = {
  normal:   { rock: 0.5, ghost: 0, steel: 0.5 },
  fire:     { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
  water:    { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
  electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
  grass:    { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 },
  ice:      { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
  fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: 0.5 },
  poison:   { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
  ground:   { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
  flying:   { electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
  psychic:  { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
  bug:      { fire: 0.5, grass: 2, fighting: 0.5, poison: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5, fairy: 0.5 },
  rock:     { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
  ghost:    { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
  dragon:   { dragon: 2, steel: 0.5, fairy: 0 },
  dark:     { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
  steel:    { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
  fairy:    { fire: 0.5, poison: 0.5, fighting: 2, dragon: 2, dark: 2, steel: 0.5 }
};

// ============ STATE ============
let allPokemon = [];
let displayedPokemon = [];
let currentPage = 0;
let totalLoaded = 0;
let battleMode = '1v1'; // '1v1' or '2v2'
let teamA = [];
let teamB = [];
let currentPickerTeam = null;
let currentPickerSlot = null;
let pokemonCache = {};

// ============ DOM ELEMENTS ============
const $pokemonGrid = document.getElementById('pokemonGrid');
const $loadingContainer = document.getElementById('loadingContainer');
const $loadMoreContainer = document.getElementById('loadMoreContainer');
const $loadMoreBtn = document.getElementById('loadMoreBtn');
const $searchInput = document.getElementById('searchInput');
const $searchClear = document.getElementById('searchClear');
const $typeFilter = document.getElementById('typeFilter');
const $genFilter = document.getElementById('genFilter');
const $pokemonModal = document.getElementById('pokemonModal');
const $modalBody = document.getElementById('modalBody');
const $modalClose = document.getElementById('modalClose');
const $teamPickerModal = document.getElementById('teamPickerModal');
const $pickerGrid = document.getElementById('pickerGrid');
const $pickerSearch = document.getElementById('pickerSearch');
const $pickerClose = document.getElementById('pickerClose');
const $teamASlots = document.getElementById('teamASlots');
const $teamBSlots = document.getElementById('teamBSlots');
const $teamAnalysis = document.getElementById('teamAnalysis');
const $navbar = document.getElementById('navbar');
const $mobileToggle = document.getElementById('mobileToggle');
const $mobileNav = document.getElementById('mobileNav');
const $totalPokemon = document.getElementById('totalPokemon');

// ============ INITIALIZATION ============
document.addEventListener('DOMContentLoaded', () => {
  initParticles();
  initNavigation();
  initTypeFilter();
  buildTypeChart();
  loadPokemonList();
  initEventListeners();
  initTeamSlots();
});

// ============ PARTICLES ============
function initParticles() {
  const container = document.getElementById('bgParticles');
  const colors = ['#6366f1', '#ec4899', '#f59e0b', '#22c55e', '#3b82f6'];
  for (let i = 0; i < 30; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 6 + 2;
    p.style.width = size + 'px';
    p.style.height = size + 'px';
    p.style.left = Math.random() * 100 + '%';
    p.style.background = colors[Math.floor(Math.random() * colors.length)];
    p.style.animationDuration = (Math.random() * 20 + 15) + 's';
    p.style.animationDelay = (Math.random() * 15) + 's';
    container.appendChild(p);
  }
}

// ============ NAVIGATION ============
function initNavigation() {
  // Scroll effect
  window.addEventListener('scroll', () => {
    $navbar.classList.toggle('scrolled', window.scrollY > 50);
  });

  // Mobile toggle
  $mobileToggle.addEventListener('click', () => {
    $mobileNav.classList.toggle('open');
  });

  // Nav links - active state
  document.querySelectorAll('[data-section]').forEach(link => {
    link.addEventListener('click', (e) => {
      $mobileNav.classList.remove('open');
      document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
      const navLink = document.querySelector(`.nav-link[data-section="${link.dataset.section}"]`);
      if (navLink) navLink.classList.add('active');
    });
  });
}

// ============ TYPE FILTER OPTIONS ============
function initTypeFilter() {
  TYPE_ORDER.forEach(type => {
    const opt = document.createElement('option');
    opt.value = type;
    opt.textContent = `${TYPE_NAMES_TH[type]} (${type})`;
    $typeFilter.appendChild(opt);
  });
}

// ============ EVENT LISTENERS ============
function initEventListeners() {
  // Search
  $searchInput.addEventListener('input', debounce(() => {
    $searchClear.classList.toggle('visible', $searchInput.value.length > 0);
    filterAndDisplayPokemon();
  }, 300));

  $searchClear.addEventListener('click', () => {
    $searchInput.value = '';
    $searchClear.classList.remove('visible');
    filterAndDisplayPokemon();
  });

  // Filters
  $typeFilter.addEventListener('change', filterAndDisplayPokemon);
  $genFilter.addEventListener('change', filterAndDisplayPokemon);

  // Load more
  $loadMoreBtn.addEventListener('click', loadMorePokemon);

  // Modal close
  $modalClose.addEventListener('click', closePokemonModal);
  $pokemonModal.addEventListener('click', (e) => {
    if (e.target === $pokemonModal) closePokemonModal();
  });

  // Picker close
  $pickerClose.addEventListener('click', closeTeamPicker);
  $teamPickerModal.addEventListener('click', (e) => {
    if (e.target === $teamPickerModal) closeTeamPicker();
  });

  // Picker search
  $pickerSearch.addEventListener('input', debounce(() => {
    renderPickerGrid($pickerSearch.value.toLowerCase());
  }, 200));

  // Battle mode
  document.getElementById('mode1v1').addEventListener('click', () => setBattleMode('1v1'));
  document.getElementById('mode2v2').addEventListener('click', () => setBattleMode('2v2'));

  // Keyboard
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closePokemonModal();
      closeTeamPicker();
    }
  });
}

// ============ LOAD POKEMON LIST ============
async function loadPokemonList() {
  try {
    // Load a larger batch at once
    const res = await fetch(`${POKEAPI_BASE}/pokemon?limit=1025&offset=0`);
    const data = await res.json();

    allPokemon = data.results.map((p, i) => ({
      id: i + 1,
      name: p.name,
      url: p.url
    }));

    $totalPokemon.textContent = allPokemon.length;
    animateCounter($totalPokemon, allPokemon.length);

    filterAndDisplayPokemon();
    $loadingContainer.style.display = 'none';
  } catch (err) {
    console.error('Error loading Pokemon list:', err);
    $loadingContainer.innerHTML = `
      <div class="no-results">
        <div class="no-results-icon">❌</div>
        <p class="no-results-text">ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง</p>
      </div>`;
  }
}

function filterAndDisplayPokemon() {
  const search = $searchInput.value.toLowerCase().trim();
  const typeVal = $typeFilter.value;
  const genVal = $genFilter.value;

  let filtered = [...allPokemon];

  // Filter by generation
  if (genVal) {
    const [min, max] = GEN_RANGES[genVal];
    filtered = filtered.filter(p => p.id >= min && p.id <= max);
  }

  // Filter by search
  if (search) {
    filtered = filtered.filter(p => p.name.includes(search) || p.id.toString() === search);
  }

  displayedPokemon = filtered;
  currentPage = 0;
  $pokemonGrid.innerHTML = '';

  if (filtered.length === 0) {
    $pokemonGrid.innerHTML = `
      <div class="no-results">
        <div class="no-results-icon">🔍</div>
        <p class="no-results-text">ไม่พบโปเกมอนที่ค้นหา</p>
      </div>`;
    $loadMoreContainer.style.display = 'none';
    return;
  }

  // If type filter is selected, we need to fetch data first
  if (typeVal) {
    filterByType(filtered, typeVal);
  } else {
    renderPokemonPage();
  }
}

async function filterByType(pokemonList, type) {
  $pokemonGrid.innerHTML = `
    <div class="loading-container">
      <div class="pokeball-spinner">
        <div class="pokeball-spin-top"></div>
        <div class="pokeball-spin-center"></div>
        <div class="pokeball-spin-bottom"></div>
      </div>
      <p class="loading-text">กำลังกรองตามประเภท...</p>
    </div>`;

  try {
    const res = await fetch(`${POKEAPI_BASE}/type/${type}`);
    const data = await res.json();
    const typePokeIds = new Set(data.pokemon.map(p => {
      const parts = p.pokemon.url.split('/');
      return parseInt(parts[parts.length - 2]);
    }));

    displayedPokemon = pokemonList.filter(p => typePokeIds.has(p.id));
    currentPage = 0;
    $pokemonGrid.innerHTML = '';

    if (displayedPokemon.length === 0) {
      $pokemonGrid.innerHTML = `
        <div class="no-results">
          <div class="no-results-icon">🔍</div>
          <p class="no-results-text">ไม่พบโปเกมอนประเภท ${TYPE_NAMES_TH[type]}</p>
        </div>`;
      $loadMoreContainer.style.display = 'none';
      return;
    }

    renderPokemonPage();
  } catch (err) {
    console.error('Error filtering by type:', err);
  }
}

function renderPokemonPage() {
  const start = currentPage * PER_PAGE;
  const end = start + PER_PAGE;
  const pageItems = displayedPokemon.slice(start, end);

  pageItems.forEach((pokemon, i) => {
    const card = createPokemonCard(pokemon, i);
    $pokemonGrid.appendChild(card);
  });

  $loadMoreContainer.style.display = end < displayedPokemon.length ? 'block' : 'none';
}

function loadMorePokemon() {
  currentPage++;
  renderPokemonPage();
}

function createPokemonCard(pokemon, index) {
  const card = document.createElement('div');
  card.className = 'pokemon-card';
  card.style.animationDelay = `${index * 0.03}s`;

  const imgUrl = `${POKEMON_IMG_BASE}${pokemon.id}.png`;

  card.innerHTML = `
    <span class="pokemon-card-number">#${pokemon.id.toString().padStart(4, '0')}</span>
    <img class="pokemon-card-img" src="${imgUrl}" alt="${pokemon.name}" loading="lazy" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2280%22>❓</text></svg>'" />
    <div class="pokemon-card-name">${formatName(pokemon.name)}</div>
    <div class="pokemon-card-types" id="types-${pokemon.id}">
      <span class="type-badge" style="background:rgba(255,255,255,0.1);font-size:0.6rem;">โหลด...</span>
    </div>`;

  card.addEventListener('click', () => openPokemonDetail(pokemon.id));

  // Lazy load types
  loadPokemonTypes(pokemon.id);

  return card;
}

async function loadPokemonTypes(id) {
  try {
    const data = await fetchPokemonData(id);
    const container = document.getElementById(`types-${id}`);
    if (container && data) {
      container.innerHTML = data.types.map(t =>
        `<span class="type-badge type-${t.type.name}">${TYPE_NAMES_TH[t.type.name] || t.type.name}</span>`
      ).join('');
    }
  } catch (err) {
    // Silently fail
  }
}

// ============ POKEMON DATA FETCHING ============
async function fetchPokemonData(id) {
  if (pokemonCache[id]) return pokemonCache[id];

  try {
    const res = await fetch(`${POKEAPI_BASE}/pokemon/${id}`);
    const data = await res.json();
    pokemonCache[id] = data;
    return data;
  } catch (err) {
    console.error(`Error fetching Pokemon #${id}:`, err);
    return null;
  }
}

async function fetchPokemonSpecies(id) {
  try {
    const res = await fetch(`${POKEAPI_BASE}/pokemon-species/${id}`);
    return await res.json();
  } catch (err) {
    return null;
  }
}

// ============ POKEMON DETAIL MODAL ============
async function openPokemonDetail(id) {
  $pokemonModal.classList.add('open');
  $modalBody.innerHTML = `
    <div class="loading-container" style="padding:60px;">
      <div class="pokeball-spinner">
        <div class="pokeball-spin-top"></div>
        <div class="pokeball-spin-center"></div>
        <div class="pokeball-spin-bottom"></div>
      </div>
      <p class="loading-text">กำลังโหลดข้อมูล...</p>
    </div>`;

  const [data, species] = await Promise.all([
    fetchPokemonData(id),
    fetchPokemonSpecies(id)
  ]);

  if (!data) {
    $modalBody.innerHTML = '<p style="padding:40px;text-align:center;">ไม่สามารถโหลดข้อมูลได้</p>';
    return;
  }

  const imgUrl = `${POKEMON_IMG_BASE}${id}.png`;
  const mainType = data.types[0].type.name;

  // Get description
  let desc = '';
  if (species && species.flavor_text_entries) {
    const entry = species.flavor_text_entries.find(e => e.language.name === 'en');
    if (entry) desc = entry.flavor_text.replace(/\f|\n/g, ' ');
  }

  // Calculate weaknesses
  const weaknessData = calculateWeaknesses(data.types.map(t => t.type.name));

  // Get abilities
  const abilities = data.abilities.map(a => ({
    name: a.ability.name,
    isHidden: a.is_hidden
  }));

  // Get stats
  const stats = data.stats.map(s => ({
    name: s.stat.name,
    value: s.base_stat
  }));
  const statTotal = stats.reduce((sum, s) => sum + s.value, 0);

  // Get moves (first 30)
  const moves = data.moves.slice(0, 30).map(m => ({
    name: m.move.name,
  }));

  const statLabels = { 'hp': 'HP', 'attack': 'ATK', 'defense': 'DEF', 'special-attack': 'SpA', 'special-defense': 'SpD', 'speed': 'SPE' };
  const statColors = { 'hp': 'hp', 'attack': 'atk', 'defense': 'def', 'special-attack': 'spa', 'special-defense': 'spd', 'speed': 'spe' };

  $modalBody.innerHTML = `
    <div class="detail-header" style="background: linear-gradient(135deg, var(--type-${mainType})22, transparent);">
      <div class="detail-header-content">
        <img class="detail-img" src="${imgUrl}" alt="${data.name}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2280%22>❓</text></svg>'" />
        <div class="detail-info">
          <div class="detail-number">#${id.toString().padStart(4, '0')}</div>
          <h2 class="detail-name">${formatName(data.name)}</h2>
          <div class="detail-types">
            ${data.types.map(t => `<span class="type-badge type-${t.type.name}">${TYPE_NAMES_TH[t.type.name]}</span>`).join('')}
          </div>
          ${desc ? `<p class="detail-desc">${desc}</p>` : ''}
        </div>
      </div>
    </div>

    <!-- Stats -->
    <div class="detail-section">
      <h3 class="detail-section-title">📊 สเตตัส <span style="color:var(--text-muted);font-size:0.8rem;font-weight:400;">(รวม: ${statTotal})</span></h3>
      ${stats.map(s => `
        <div class="stat-row">
          <span class="stat-label">${statLabels[s.name] || s.name}</span>
          <div class="stat-bar-container">
            <div class="stat-bar stat-bar-${statColors[s.name]}" id="stat-bar-${s.name}" style="width:0%"></div>
          </div>
          <span class="stat-value">${s.value}</span>
        </div>
      `).join('')}
    </div>

    <!-- Abilities -->
    <div class="detail-section">
      <h3 class="detail-section-title">✨ ความสามารถ</h3>
      <div class="ability-list">
        ${abilities.map(a => `
          <span class="ability-tag ${a.isHidden ? 'hidden-ability' : ''}">
            ${formatName(a.name)}${a.isHidden ? ' (ซ่อน)' : ''}
          </span>
        `).join('')}
      </div>
    </div>

    <!-- Weaknesses -->
    <div class="detail-section">
      <h3 class="detail-section-title">🛡️ จุดอ่อน / ต้านทาน</h3>
      <div class="weakness-grid">
        ${weaknessData.map(w => {
          let cls = 'weakness-item ';
          if (w.multiplier >= 4) cls += 'super-weak';
          else if (w.multiplier >= 2) cls += 'weak';
          else if (w.multiplier === 0) cls += 'immune';
          else if (w.multiplier <= 0.25) cls += 'super-resist';
          else cls += 'resist';
          return `<span class="${cls}">
            <span class="type-badge type-${w.type}" style="font-size:0.6rem;padding:2px 6px;">${TYPE_NAMES_TH[w.type]}</span>
            ${w.multiplier}×
          </span>`;
        }).join('')}
      </div>
    </div>

    <!-- Moves -->
    <div class="detail-section">
      <h3 class="detail-section-title">⚔️ ท่าที่เรียนรู้ได้ <span style="color:var(--text-muted);font-size:0.8rem;font-weight:400;">(${data.moves.length} ท่า)</span></h3>
      <div class="moves-grid">
        ${data.moves.slice(0, 40).map(m => `
          <div class="move-item">
            <span class="move-type-dot" style="background:var(--type-normal);"></span>
            ${formatName(m.move.name)}
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Physical info -->
    <div class="detail-section">
      <h3 class="detail-section-title">📏 ข้อมูลกายภาพ</h3>
      <div style="display:flex;gap:24px;">
        <div>
          <span style="color:var(--text-muted);font-size:0.8rem;">น้ำหนัก</span>
          <div style="font-weight:700;font-size:1.1rem;">${(data.weight / 10).toFixed(1)} kg</div>
        </div>
        <div>
          <span style="color:var(--text-muted);font-size:0.8rem;">ส่วนสูง</span>
          <div style="font-weight:700;font-size:1.1rem;">${(data.height / 10).toFixed(1)} m</div>
        </div>
        <div>
          <span style="color:var(--text-muted);font-size:0.8rem;">Base EXP</span>
          <div style="font-weight:700;font-size:1.1rem;">${data.base_experience || 'N/A'}</div>
        </div>
      </div>
    </div>
  `;

  // Animate stat bars
  requestAnimationFrame(() => {
    setTimeout(() => {
      stats.forEach(s => {
        const bar = document.getElementById(`stat-bar-${s.name}`);
        if (bar) bar.style.width = `${Math.min(100, (s.value / 255) * 100)}%`;
      });
    }, 100);
  });
}

function closePokemonModal() {
  $pokemonModal.classList.remove('open');
}

// ============ TYPE EFFECTIVENESS ============
function calculateWeaknesses(types) {
  const multipliers = {};
  TYPE_ORDER.forEach(t => multipliers[t] = 1);

  types.forEach(defType => {
    TYPE_ORDER.forEach(atkType => {
      const chart = TYPE_CHART[atkType];
      if (chart && chart[defType] !== undefined) {
        multipliers[atkType] *= chart[defType];
      }
    });
  });

  return Object.entries(multipliers)
    .filter(([_, m]) => m !== 1)
    .sort((a, b) => b[1] - a[1])
    .map(([type, multiplier]) => ({ type, multiplier }));
}

function getEffectiveness(atkType, defType) {
  const chart = TYPE_CHART[atkType];
  if (chart && chart[defType] !== undefined) {
    return chart[defType];
  }
  return 1;
}

// ============ TYPE CHART TABLE ============
function buildTypeChart() {
  const thead = document.getElementById('typeChartHead');
  const tbody = document.getElementById('typeChartBody');

  // Header row
  let headerHTML = '<tr><th style="min-width:60px;">ATK↓ / DEF→</th>';
  TYPE_ORDER.forEach(type => {
    headerHTML += `<th><span class="type-header-cell" style="color:var(--type-${type})">${TYPE_NAMES_TH[type]}</span></th>`;
  });
  headerHTML += '</tr>';
  thead.innerHTML = headerHTML;

  // Body rows
  let bodyHTML = '';
  TYPE_ORDER.forEach(atkType => {
    bodyHTML += `<tr><td><span class="type-row-label" style="color:var(--type-${atkType})">${TYPE_NAMES_TH[atkType]}</span></td>`;
    TYPE_ORDER.forEach(defType => {
      const eff = getEffectiveness(atkType, defType);
      let cls = 'cell-neutral';
      let text = '';
      if (eff === 2) { cls = 'cell-super'; text = '2×'; }
      else if (eff === 0.5) { cls = 'cell-not'; text = '½'; }
      else if (eff === 0) { cls = 'cell-immune'; text = '0'; }
      else { text = ''; }
      bodyHTML += `<td class="${cls}">${text}</td>`;
    });
    bodyHTML += '</tr>';
  });
  tbody.innerHTML = bodyHTML;
}

// ============ TEAM BUILDER ============
function setBattleMode(mode) {
  battleMode = mode;
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });

  // Reset teams
  teamA = [];
  teamB = [];
  initTeamSlots();
  $teamAnalysis.style.display = 'none';
}

function initTeamSlots() {
  const slotCount = battleMode === '1v1' ? 1 : 2;

  // Ensure arrays
  teamA = teamA.slice(0, slotCount);
  teamB = teamB.slice(0, slotCount);

  renderTeamSlots('A', $teamASlots, teamA, slotCount);
  renderTeamSlots('B', $teamBSlots, teamB, slotCount);
}

function renderTeamSlots(teamId, container, team, slotCount) {
  let html = '';
  for (let i = 0; i < slotCount; i++) {
    const pokemon = team[i];
    if (pokemon) {
      const imgUrl = `${POKEMON_IMG_BASE}${pokemon.id}.png`;
      html += `
        <div class="team-slot filled" data-team="${teamId}" data-slot="${i}">
          <img class="slot-pokemon-img" src="${imgUrl}" alt="${pokemon.name}" />
          <div class="slot-pokemon-info">
            <div class="slot-pokemon-name">${formatName(pokemon.name)}</div>
            <div class="slot-pokemon-types">
              ${pokemon.types.map(t => `<span class="type-badge type-${t}" style="font-size:0.6rem;padding:2px 6px;">${TYPE_NAMES_TH[t]}</span>`).join('')}
            </div>
          </div>
          <button class="slot-remove" onclick="event.stopPropagation(); removeFromTeam('${teamId}', ${i})">✕</button>
        </div>`;
    } else {
      html += `
        <div class="team-slot empty" data-team="${teamId}" data-slot="${i}" onclick="openTeamPicker('${teamId}', ${i})">
          <div class="slot-add-icon">+</div>
          <span class="slot-label">เลือกโปเกมอน</span>
        </div>`;
    }
  }
  container.innerHTML = html;

  // Add click handlers for filled slots
  container.querySelectorAll('.team-slot.filled').forEach(slot => {
    slot.addEventListener('click', () => {
      const t = slot.dataset.team;
      const s = parseInt(slot.dataset.slot);
      openTeamPicker(t, s);
    });
  });
}

function openTeamPicker(teamId, slotIndex) {
  currentPickerTeam = teamId;
  currentPickerSlot = slotIndex;
  $pickerSearch.value = '';
  $teamPickerModal.classList.add('open');
  renderPickerGrid('');
}

function closeTeamPicker() {
  $teamPickerModal.classList.remove('open');
  currentPickerTeam = null;
  currentPickerSlot = null;
}

function renderPickerGrid(search) {
  let filtered = allPokemon;
  if (search) {
    filtered = filtered.filter(p => p.name.includes(search) || p.id.toString() === search);
  }
  filtered = filtered.slice(0, 100); // Limit for performance

  $pickerGrid.innerHTML = filtered.map(p => {
    const imgUrl = `${POKEMON_IMG_BASE}${p.id}.png`;
    return `
      <div class="picker-item" onclick="selectPokemonForTeam(${p.id})">
        <img src="${imgUrl}" alt="${p.name}" loading="lazy" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2280%22>❓</text></svg>'" />
        <span>${formatName(p.name)}</span>
      </div>`;
  }).join('');
}

async function selectPokemonForTeam(id) {
  const data = await fetchPokemonData(id);
  if (!data) return;

  const pokemon = {
    id: data.id,
    name: data.name,
    types: data.types.map(t => t.type.name),
    stats: data.stats.reduce((obj, s) => { obj[s.stat.name] = s.base_stat; return obj; }, {})
  };

  const team = currentPickerTeam === 'A' ? teamA : teamB;
  team[currentPickerSlot] = pokemon;

  closeTeamPicker();
  initTeamSlots();
  analyzeTeams();
}

function removeFromTeam(teamId, slotIndex) {
  const team = teamId === 'A' ? teamA : teamB;
  team[slotIndex] = null;
  initTeamSlots();
  analyzeTeams();
}

// ============ TEAM ANALYSIS ============
function analyzeTeams() {
  const teamAFilled = teamA.filter(Boolean);
  const teamBFilled = teamB.filter(Boolean);

  if (teamAFilled.length === 0 && teamBFilled.length === 0) {
    $teamAnalysis.style.display = 'none';
    return;
  }

  $teamAnalysis.style.display = 'block';

  // Analyze Team A
  analyzeTeamPanel('A', teamAFilled, document.getElementById('analysisContentA'));
  // Analyze Team B
  analyzeTeamPanel('B', teamBFilled, document.getElementById('analysisContentB'));

  // Prediction
  const predContent = document.getElementById('predictionContent');
  if (teamAFilled.length > 0 && teamBFilled.length > 0) {
    const scoreA = calculateTeamScore(teamAFilled, teamBFilled);
    const scoreB = calculateTeamScore(teamBFilled, teamAFilled);

    let prediction;
    if (scoreA > scoreB) {
      prediction = `<div class="prediction-result">
        <div class="prediction-winner" style="color:#3b82f6;">🏆 ทีม A มีโอกาสชนะมากกว่า!</div>
        <div class="prediction-detail">คะแนนความได้เปรียบ: ทีม A ${scoreA.toFixed(1)} vs ทีม B ${scoreB.toFixed(1)}</div>
      </div>`;
    } else if (scoreB > scoreA) {
      prediction = `<div class="prediction-result">
        <div class="prediction-winner" style="color:#ef4444;">🏆 ทีม B มีโอกาสชนะมากกว่า!</div>
        <div class="prediction-detail">คะแนนความได้เปรียบ: ทีม A ${scoreA.toFixed(1)} vs ทีม B ${scoreB.toFixed(1)}</div>
      </div>`;
    } else {
      prediction = `<div class="prediction-result">
        <div class="prediction-winner" style="color:#f59e0b;">⚖️ ทั้งสองทีมมีโอกาสเท่ากัน!</div>
        <div class="prediction-detail">คะแนนความได้เปรียบ: ${scoreA.toFixed(1)} เท่ากัน</div>
      </div>`;
    }
    predContent.innerHTML = prediction;
  } else {
    predContent.innerHTML = '<p style="text-align:center;color:var(--text-muted);">เลือกโปเกมอนให้ครบทั้งสองทีมเพื่อดูผลวิเคราะห์</p>';
  }
}

function analyzeTeamPanel(teamName, teamPokemon, container) {
  if (teamPokemon.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted);">ยังไม่ได้เลือกโปเกมอน</p>';
    return;
  }

  // Combined weaknesses
  const allTypes = teamPokemon.flatMap(p => p.types);
  const uniqueTypes = [...new Set(allTypes)];

  // Calculate combined weaknesses
  const combinedWeaknesses = {};
  const combinedResistances = {};
  const combinedImmunities = {};

  teamPokemon.forEach(p => {
    const weaknessData = calculateWeaknesses(p.types);
    weaknessData.forEach(w => {
      if (w.multiplier >= 2) {
        combinedWeaknesses[w.type] = (combinedWeaknesses[w.type] || 0) + 1;
      } else if (w.multiplier === 0) {
        combinedImmunities[w.type] = true;
      } else if (w.multiplier < 1) {
        combinedResistances[w.type] = (combinedResistances[w.type] || 0) + 1;
      }
    });
  });

  // Stat totals
  const totalStats = teamPokemon.reduce((sum, p) => {
    return sum + Object.values(p.stats).reduce((a, b) => a + b, 0);
  }, 0);

  container.innerHTML = `
    <div style="margin-bottom:12px;">
      <span class="weakness-label">⚠️ จุดอ่อนรวม:</span>
      <div class="analysis-type-list">
        ${Object.entries(combinedWeaknesses).length > 0
          ? Object.entries(combinedWeaknesses).map(([type, count]) =>
            `<span class="type-badge type-${type}" style="font-size:0.65rem;padding:2px 8px;">${TYPE_NAMES_TH[type]} (${count})</span>`
          ).join('')
          : '<span style="color:var(--text-muted);">ไม่มี</span>'
        }
      </div>
    </div>
    <div style="margin-bottom:12px;">
      <span class="strength-label">✅ ต้านทานรวม:</span>
      <div class="analysis-type-list">
        ${Object.entries(combinedResistances).length > 0
          ? Object.entries(combinedResistances).map(([type, count]) =>
            `<span class="type-badge type-${type}" style="font-size:0.65rem;padding:2px 8px;">${TYPE_NAMES_TH[type]} (${count})</span>`
          ).join('')
          : '<span style="color:var(--text-muted);">ไม่มี</span>'
        }
      </div>
    </div>
    ${Object.keys(combinedImmunities).length > 0 ? `
    <div style="margin-bottom:12px;">
      <span style="color:#94a3b8;font-weight:600;">🚫 ภูมิคุ้มกัน:</span>
      <div class="analysis-type-list">
        ${Object.keys(combinedImmunities).map(type =>
          `<span class="type-badge type-${type}" style="font-size:0.65rem;padding:2px 8px;">${TYPE_NAMES_TH[type]}</span>`
        ).join('')}
      </div>
    </div>` : ''}
    <div>
      <span style="color:var(--text-muted);">📈 สเตตัสรวม: <strong style="color:var(--text-primary);">${totalStats}</strong></span>
    </div>
  `;
}

function calculateTeamScore(myTeam, opponentTeam) {
  let score = 0;

  myTeam.forEach(myPoke => {
    opponentTeam.forEach(oppPoke => {
      // Type advantage calculation
      myPoke.types.forEach(myType => {
        oppPoke.types.forEach(oppType => {
          const eff = getEffectiveness(myType, oppType);
          if (eff >= 2) score += 2;
          else if (eff === 0) score -= 1;
          else if (eff <= 0.5) score -= 0.5;
        });
      });
    });

    // Stat bonus
    const totalStat = Object.values(myPoke.stats).reduce((a, b) => a + b, 0);
    score += totalStat / 200;
  });

  return score;
}

// ============ UTILITIES ============
function formatName(name) {
  return name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function animateCounter(element, target) {
  let current = 0;
  const increment = Math.ceil(target / 60);
  const timer = setInterval(() => {
    current += increment;
    if (current >= target) {
      current = target;
      clearInterval(timer);
    }
    element.textContent = current.toLocaleString();
  }, 30);
}

// Make openTeamPicker globally accessible
window.openTeamPicker = openTeamPicker;
window.selectPokemonForTeam = selectPokemonForTeam;
window.removeFromTeam = removeFromTeam;
