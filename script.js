const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const state = {
  players: 4,
  mode: 'human',
  aiLevel: 'easy',
  names: [],
  spy: 0,
  pair: null,
  revealIndex: 0,
  timer: 180,
  timerId: null,
  aiNames: ['Agent Nova', 'Agent Cipher', 'Agent Prism', 'Agent Echo', 'Agent Frost', 'Agent Blaze', 'Agent Star']
};
const banks = {
  Places: ['Beach','Museum','Airport','Station','Hotel','Forest','Space','Island','Library','Theatre','Hospital','Park','Cafe','Market','Harbor','Temple','Castle'],
  Food: ['Pizza','Burger','Pasta','Sushi','Taco','Curry','Salad','Steak','Sandwich','Noodle','Donut','Salad','Burrito','Soup','Cake','Waffle','Pancake'],
  Animals: ['Lion','Tiger','Wolf','Fox','Whale','Dolphin','Owl','Eagle','Horse','Rabbit','Frog','Penguin','Dog','Cat','Bear','Shark','Lizard'],
  Objects: ['Phone','Watch','Book','Camera','Laptop','Tablet','Radio','Clock','Chair','Table','Bottle','Cup','Key','Wallet','Pen','Lamp','Door'],
  Transport: ['Car','Bus','Train','Boat','Plane','Rocket','Bicycle','Motorcycle','Skateboard','Tram','Helicopter','Subway','Taxi','Van','Scooter'],
  People: ['Doctor','Teacher','Chef','Pilot','Artist','Writer','Police','Baker','Farmer','Nurse','Driver','Actor','Musician','Dancer','Coach','Soldier'],
  Nature: ['Moon','Sun','Star','Cloud','Rain','Snow','Wind','Ocean','River','Mountain','Forest','Garden','Flower','Rock','Sand','Fog','Fire'],
  Entertainment: ['Movie','Song','Game','Book','Stage','Band','Festival','Puzzle','Dance','Sport','Show','Comic','Magic','Series','Video']
};
const closePairs = [
  ['Coffee','Tea'],['Gold','Silver'],['Salt','Pepper'],['Shirt','Pants'],['Mirror','Window'],['Doctor','Nurse'],['King','Queen'],['Cat','Dog'],['Ocean','River'],['Sun','Moon'],['Train','Plane'],['Cake','Pie']
];

function sound(type = 'tap') {
  if (!state.music) return;
  try {
    const audio = new AudioContext();
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.frequency.value = type === 'win' ? 620 : type === 'fail' ? 180 : 320;
    gain.gain.setValueAtTime(.05, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + .16);
    osc.start();
    osc.stop(audio.currentTime + .16);
  } catch (error) {}
}

function toast(message) {
  const node = $('#toast');
  node.textContent = message;
  node.classList.add('show');
  clearTimeout(node.hideTimeout);
  node.hideTimeout = setTimeout(() => node.classList.remove('show'), 1500);
}

function go(id) {
  $$('.screen').forEach(screen => screen.classList.remove('active'));
  $(`#${id}`).classList.add('active');
  sound();
}

document.getElementById('enterBtn').onclick = () => go('setup');
$$('[data-go]').forEach(button => button.addEventListener('click', () => go(button.dataset.go)));

const $countDots = $('#countDots');
const $playerCount = $('#playerCount');
const $namesGrid = $('#namesGrid');
const $aiLevelBlock = $('#aiLevelBlock');
let soundEnabled = true;

function updateCount() {
  $playerCount.textContent = state.players;
  $countDots.innerHTML = Array.from({ length: 7 }, (_, index) => `<i class="${index < state.players ? 'on' : ''}"></i>`).join('');
  renderNameInputs();
}

function renderNameInputs() {
  $namesGrid.innerHTML = Array.from({ length: state.players }, (_, index) => {
    const value = state.names[index] || '';
    const placeholder = state.mode === 'ai' ? `AI suspect ${index + 1}` : `Player ${index + 1}`;
    return `
      <label class="name-field">
        <span>${String(index + 1).padStart(2, '0')}</span>
        <input maxlength="18" value="${value}" placeholder="${placeholder}" aria-label="Player ${index + 1} name">
      </label>
    `;
  }).join('');
}

function setMode(mode) {
  state.mode = mode;
  $('#modeHuman').classList.toggle('active', mode === 'human');
  $('#modeAI').classList.toggle('active', mode === 'ai');
  $aiLevelBlock.style.display = mode === 'ai' ? 'block' : 'none';
  renderNameInputs();
}

function setAILevel(level) {
  state.aiLevel = level;
  $$('[data-level]').forEach(button => button.classList.toggle('active', button.dataset.level === level));
}

$('#minusCount').onclick = () => {
  state.players = Math.max(4, state.players - 1);
  updateCount();
  sound();
};
$('#plusCount').onclick = () => {
  state.players = Math.min(7, state.players + 1);
  updateCount();
  sound();
};
$('#modeHuman').onclick = () => setMode('human');
$('#modeAI').onclick = () => setMode('ai');
$$('[data-level]').forEach(button => button.onclick = () => setAILevel(button.dataset.level));
$('#soundFab').onclick = () => {
  state.music = !state.music;
  $('#soundFab').textContent = state.music ? '♪' : '×';
  sound();
};
$('#quitBtn').onclick = () => {
  clearInterval(state.timerId);
  go('splash');
};

function pickPair() {
  if (Math.random() < .4) return closePairs[Math.floor(Math.random() * closePairs.length)];
  const group = banks[Object.keys(banks)[Math.floor(Math.random() * Object.keys(banks).length)]];
  const i = Math.floor(Math.random() * (group.length - 2));
  const offset = 1 + Math.floor(Math.random() * Math.min(4, group.length - i - 1));
  return [group[i], group[i + offset]];
}

function startGame() {
  const inputs = Array.from($$('.name-field input'));
  state.names = inputs.map((input, index) => input.value.trim() || (state.mode === 'ai' ? state.aiNames[index] || `AI Agent ${index + 1}` : `Player ${index + 1}`));
  const lowerNames = state.names.map(name => name.toLowerCase());
  if (new Set(lowerNames).size !== lowerNames.length) {
    toast('Each player needs a unique name.');
    return;
  }
  state.spy = Math.floor(Math.random() * state.players);
  state.pair = pickPair();
  if (Math.random() < .5) state.pair.reverse();
  state.revealIndex = 0;
  go('game');
  renderRoundStart();
}

function renderRoundStart() {
  setProgress(12);
  const playersMarkup = state.names.map((name, index) => `
    <button class="player-button ${index === state.revealIndex ? 'active' : ''}" data-player="${index}">
      <span>${String(index + 1).padStart(2, '0')}</span>${escapeHtml(name)}
    </button>
  `).join('');

  const modeText = state.mode === 'ai' ? `AI Level: ${state.aiLevel}` : 'Human mode';
  $('#gameContent').innerHTML = `
    <div class="game-head">
      <div class="phase">02 · TEAM LIST</div>
      <h2>Everyone is in the room.</h2>
      <p>Tap the current player to reveal their secret word. Do not show the screen to others.</p>
    </div>
    <div class="ai-hint"><strong>${modeText}</strong> · ${state.players} players are ready.</div>
    <div class="player-grid">${playersMarkup}</div>
    <button class="primary-btn wide" id="beginRound">BEGIN PASS-&nbsp;AND-&nbsp;PLAY</button>
  `;
  $$('.player-button').forEach(button => button.onclick = event => {
    const index = Number(event.currentTarget.dataset.player);
    if (index !== state.revealIndex) {
      toast(`Tap ${state.names[state.revealIndex]} next.`);
      return;
    }
    renderHandoff();
  });
  $('#beginRound').onclick = renderHandoff;
}

function renderHandoff() {
  setProgress(22 + state.revealIndex * 8);
  const name = state.names[state.revealIndex];
  $('#gameContent').innerHTML = `
    <div class="game-head">
      <div class="phase">03 · SECRET REVEAL</div>
      <h2>Pass to ${escapeHtml(name)}</h2>
      <p>Only this player should look at the screen. Tap the card to reveal the word.</p>
    </div>
    <div class="handoff">
      <div class="player-orbit">${escapeHtml(name.charAt(0).toUpperCase())}</div>
      <button class="primary-btn" id="readyPlayer">SHOW MY WORD</button>
    </div>
  `;
  $('#readyPlayer').onclick = renderSecret;
}

function renderSecret() {
  const isSpy = state.revealIndex === state.spy;
  const word = isSpy ? state.pair[1] : state.pair[0];
  $('#gameContent').innerHTML = `
    <div class="game-head">
      <div class="phase">WHO IS THE SPY?</div>
      <h2>${escapeHtml(state.names[state.revealIndex])}, your word is…</h2>
      <p>Tap the card, memorise it, then hide it and pass the device.</p>
    </div>
    <div class="secret-card" id="secretCard">
      <div class="secret-inner">
        <div class="secret-face secret-front"><div><strong>TAP TO REVEAL</strong><p>Keep it hidden.</p></div></div>
        <div class="secret-face secret-back"><div><small>Your word</small><strong>${escapeHtml(word)}</strong><span>Describe it without saying it.</span></div></div>
      </div>
    </div>
    <button class="primary-btn wide" id="hideWord" style="visibility:hidden"><span>HIDE & PASS</span><b>→</b></button>
  `;
  $('#secretCard').onclick = () => {
    $('#secretCard').classList.add('revealed');
    $('#hideWord').style.visibility = 'visible';
    sound();
  };
  $('#hideWord').onclick = () => {
    state.revealIndex += 1;
    if (state.revealIndex < state.players) renderHandoff();
    else renderDebate();
  };
}

function renderDebate() {
  setProgress(62);
  state.timer = 180;
  $('#gameContent').innerHTML = `
    <div class="game-head">
      <div class="phase">04 · DISCUSSION</div>
      <h2>Ask your questions.</h2>
      <p>Discuss every clue and look for the one player whose word feels different.</p>
    </div>
    <div class="ai-hint">${state.mode === 'ai' ? generateAIComment() : 'Take turns describing your word without naming it.'}</div>
    <div class="timer" id="timer">03:00</div>
    <div class="timer-controls">
      <button class="secondary-btn" id="timerToggle">PAUSE</button>
      <button class="primary-btn secondary-btn" id="voteNow">VOTE NOW →</button>
    </div>
  `;
  startTimer();
  $('#timerToggle').onclick = () => {
    if (state.timerId) {
      clearInterval(state.timerId);
      state.timerId = null;
      $('#timerToggle').textContent = 'RESUME';
    } else {
      startTimer();
      $('#timerToggle').textContent = 'PAUSE';
    }
  };
  $('#voteNow').onclick = renderVote;
}

function startTimer() {
  clearInterval(state.timerId);
  state.timerId = setInterval(() => {
    state.timer -= 1;
    if ($('#timer')) {
      const minutes = String(Math.floor(state.timer / 60)).padStart(2, '0');
      const seconds = String(state.timer % 60).padStart(2, '0');
      $('#timer').textContent = `${minutes}:${seconds}`;
    }
    if (state.timer <= 0) {
      clearInterval(state.timerId);
      state.timerId = null;
      renderVote();
    }
  }, 1000);
}

function renderVote() {
  clearInterval(state.timerId);
  setProgress(84);
  $('#gameContent').innerHTML = `
    <div class="game-head">
      <div class="phase">05 · THE VERDICT</div>
      <h2>Who is the spy?</h2>
      <p>Agree as a group and tap the suspect you think is hiding the second word.</p>
    </div>
    <div class="vote-grid">
      ${state.names.map((name, index) => `
        <button class="vote-btn" data-vote="${index}">
          <span>${String(index + 1).padStart(2, '0')}</span>${escapeHtml(name)}
        </button>
      `).join('')}
    </div>
  `;
  $$('[data-vote]').forEach(button => button.onclick = () => renderResult(+button.dataset.vote));
}

function renderResult(vote) {
  setProgress(100);
  const correct = vote === state.spy;
  const title = correct ? 'The room wins.' : 'The spy escaped.';
  const subtitle = correct ? 'The group found the spy and exposed the secret.' : 'The wrong suspect was chosen. Try again.';
  sound(correct ? 'win' : 'fail');
  const aiLine = state.mode === 'ai' ? `AI comment: ${generateAIComment(true)}` : '';
  $('#gameContent').innerHTML = `
    <div class="game-head">
      <div class="phase">FINAL RESULT</div>
      <h2>${title}</h2>
      <p>${subtitle}</p>
    </div>
    <div class="result-seal"><span>${correct ? '✓' : '×'}</span></div>
    <div class="result-info">
      <div class="result-pill">THE SPY <strong>${escapeHtml(state.names[state.spy])}</strong></div>
      <div class="result-pill">GROUP WORD <strong>${escapeHtml(state.pair[0])}</strong></div>
      <div class="result-pill">SPY WORD <strong>${escapeHtml(state.pair[1])}</strong></div>
      ${aiLine ? `<div class="result-pill">AI NOTE <strong>${escapeHtml(aiLine)}</strong></div>` : ''}
    </div>
    <button class="primary-btn wide" id="playAgain"><span>${correct ? 'PLAY AGAIN' : 'RESTART ROUND'}</span><b>↻</b></button>
    <button class="secondary-btn wide" id="newGame">CHANGE PLAYERS</button>
  `;
  $('#playAgain').onclick = () => {
    state.spy = Math.floor(Math.random() * state.players);
    state.pair = pickPair();
    if (Math.random() < .5) state.pair.reverse();
    state.revealIndex = 0;
    renderRoundStart();
  };
  $('#newGame').onclick = () => {
    go('setup');
    renderNameInputs();
  };
}

function generateAIComment(final = false) {
  const easy = [
    'One player sounded unsure.',
    'The spy used a softer phrase.',
    'Someone gave a very short clue.'
  ];
  const medium = [
    'I suspect the spy is staying quiet.',
    'The chosen word was close but not exact.',
    'Watch the person who avoids details.'
  ];
  const hard = [
    'The spy is intentionally blending in.',
    'There is one clue that does not match the room.',
    'The hidden word appears slightly different.'
  ];
  const pool = state.aiLevel === 'easy' ? easy : state.aiLevel === 'medium' ? medium : hard;
  const phrase = pool[Math.floor(Math.random() * pool.length)];
  return final ? phrase : `AI says: ${phrase}`;
}

function setProgress(value) {
  const bar = $('#progressFill');
  if (bar) bar.style.width = `${value}%`;
}

function escapeHtml(text) {
  return String(text).replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[char]);
}

function init() {
  updateCount();
  setMode('human');
  setAILevel('easy');
  $('#startGameBtn').onclick = startGame;
}

init();
