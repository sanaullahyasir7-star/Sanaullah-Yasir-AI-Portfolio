const root = document.documentElement;
const body = document.body;
const header = document.querySelector('[data-header]');
const themeToggle = document.querySelector('[data-theme-toggle]');
const menuToggle = document.querySelector('[data-menu-toggle]');
const navigation = document.querySelector('[data-nav]');
const filters = [...document.querySelectorAll('[data-filter]')];
const projects = [...document.querySelectorAll('[data-project]')];
const resultCount = document.querySelector('[data-result-count]');
const copyButton = document.querySelector('[data-copy-email]');
const year = document.querySelector('[data-year]');
const progressBar = document.querySelector('[data-scroll-progress]');
const motionQuery = window.matchMedia
  ? window.matchMedia('(prefers-reduced-motion: reduce)')
  : { matches: false };
const pointerQuery = window.matchMedia
  ? window.matchMedia('(pointer: fine)')
  : { matches: false };
const motionToggle = document.querySelector('[data-motion-toggle]');
const readPreference = (key) => { try { return localStorage.getItem(key); } catch { return null; } };
const writePreference = (key, value) => { try { localStorage.setItem(key, value); } catch { /* Preferences are optional. */ } };
let userPaused = readPreference('sy-motion') === 'paused';
let reduceMotion = motionQuery.matches || userPaused;
let syncCanvas = () => {};

const savedTheme = readPreference('sy-theme');
if (savedTheme === 'light' || savedTheme === 'dark') root.dataset.theme = savedTheme;

function closeMenu({ returnFocus = false } = {}) {
  const wasOpen = menuToggle.getAttribute('aria-expanded') === 'true';
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.setAttribute('aria-label', 'Open navigation');
  navigation.classList.remove('is-open');
  if (returnFocus && wasOpen) menuToggle.focus();
}

menuToggle.addEventListener('click', () => {
  const willOpen = menuToggle.getAttribute('aria-expanded') !== 'true';
  menuToggle.setAttribute('aria-expanded', String(willOpen));
  menuToggle.setAttribute('aria-label', willOpen ? 'Close navigation' : 'Open navigation');
  navigation.classList.toggle('is-open', willOpen);
});

navigation.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => closeMenu()));
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeMenu({ returnFocus: true });
});
window.addEventListener('resize', () => {
  if (window.innerWidth > 980) closeMenu();
});

function syncThemeLabel() {
  const isDark = root.dataset.theme === 'dark';
  themeToggle.setAttribute('aria-label', `Switch to ${isDark ? 'light' : 'dark'} theme`);
}

syncThemeLabel();
themeToggle.addEventListener('click', () => {
  root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
  writePreference('sy-theme', root.dataset.theme);
  syncThemeLabel();
  syncCanvas();
});

const navAnchors = [...navigation.querySelectorAll('a[href^="#"]')];
const navTargets = navAnchors
  .map((link) => ({ link, target: document.querySelector(link.getAttribute('href')) }))
  .filter(({ target }) => target);
let scrollTicking = false;

function updateScrollState() {
  const scrollTop = window.scrollY;
  const scrollRange = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
  header.classList.toggle('is-scrolled', scrollTop > 18);
  progressBar.style.width = `${Math.min((scrollTop / scrollRange) * 100, 100)}%`;

  let current = navTargets[0];
  navTargets.forEach((item) => {
    if (item.target.getBoundingClientRect().top <= 170) current = item;
  });
  navAnchors.forEach((link) => {
    link.classList.toggle('is-active', current?.link === link);
    if (current?.link === link) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
  scrollTicking = false;
}

window.addEventListener('scroll', () => {
  if (!scrollTicking) {
    window.requestAnimationFrame(updateScrollState);
    scrollTicking = true;
  }
}, { passive: true });
updateScrollState();

filters.forEach((button) => {
  button.addEventListener('click', () => {
    const filter = button.dataset.filter;
    filters.forEach((item) => {
      const active = item === button;
      item.classList.toggle('is-active', active);
      item.setAttribute('aria-pressed', String(active));
    });

    let visible = 0;
    projects.forEach((project) => {
      const show = filter === 'all' || project.dataset.kind === filter;
      project.classList.toggle('is-hidden', !show);
      project.hidden = !show;
      if (show) project.classList.add('is-visible');
      if (show) visible += 1;
    });
    resultCount.textContent = visible;
  });
});

copyButton.addEventListener('click', async () => {
  const label = copyButton.querySelector('span');
  try {
    await navigator.clipboard.writeText(copyButton.dataset.email);
    label.textContent = 'Email copied';
  } catch {
    label.textContent = copyButton.dataset.email;
  }
  window.setTimeout(() => { label.textContent = 'Copy email'; }, 2200);
});

const revealObserver = typeof IntersectionObserver === 'function' ? new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.08 }) : null;

document.querySelectorAll('.reveal').forEach((element, index) => {
  if (!revealObserver || reduceMotion || element.getBoundingClientRect().top < window.innerHeight) {
    element.classList.add('is-visible');
    return;
  }
  element.classList.add('will-reveal');
  element.style.transitionDelay = `${Math.min(index % 3, 2) * 60}ms`;
  revealObserver.observe(element);
});

const stageButtons = [...document.querySelectorAll('[data-stage]')];
const stageNodes = [...document.querySelectorAll('.orbit-map .node')];
const stageStatus = document.querySelector('[data-stage-status]');
const stageCount = document.querySelector('[data-stage-count]');
const stages = [
  'Hybrid retrieval combines BM25 and TF-IDF to find relevant evidence.',
  'Retrieval recall and answer F1 measure the experiment against a baseline.',
  'Controlled experiments test retrieval hypotheses and record their results.',
  'A human reviews the proposed change before it can be accepted.',
];
let activeStage = 0;
let stageTimer;
let stageSelectedByUser = false;
let systemInView = true;

function setStage(index) {
  activeStage = index;
  stageButtons.forEach((button, buttonIndex) => {
    const active = buttonIndex === index;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  stageNodes.forEach((node, nodeIndex) => node.classList.toggle('is-active', nodeIndex === index));
  document.querySelectorAll('.connections path').forEach((path, pathIndex) => path.classList.toggle('is-active', pathIndex === index));
  stageStatus.textContent = stages[index];
  stageCount.textContent = `${String(index + 1).padStart(2, '0')} / 04`;
  if (!reduceMotion && typeof stageStatus.animate === 'function') {
    stageStatus.animate([{opacity:.35,transform:'translateY(4px)'},{opacity:1,transform:'translateY(0)'}], {duration:300,easing:'ease-out'});
  }
}

function startStageCycle() {
  window.clearInterval(stageTimer);
  if (reduceMotion || document.hidden || !systemInView || stageSelectedByUser || document.querySelector('[data-system-card]').contains(document.activeElement)) return;
  stageTimer = window.setInterval(() => setStage((activeStage + 1) % stages.length), 5200);
}

stageButtons.forEach((button) => {
  button.addEventListener('click', () => {
    stageSelectedByUser = true;
    stageStatus.setAttribute('aria-live', 'polite');
    setStage(Number(button.dataset.stage));
    startStageCycle();
  });
});
setStage(0);
startStageCycle();

function syncMotion() {
  reduceMotion = motionQuery.matches || userPaused;
  root.dataset.motion = reduceMotion ? 'paused' : 'active';
  motionToggle.setAttribute('aria-pressed', String(reduceMotion));
  motionToggle.setAttribute('aria-label', motionQuery.matches ? 'Animations paused by system preference' : reduceMotion ? 'Resume animations' : 'Pause animations');
  motionToggle.querySelector('[aria-hidden]').textContent = reduceMotion ? '▷' : 'Ⅱ';
  motionToggle.querySelector('[data-motion-label]').textContent = reduceMotion ? 'Paused' : 'Motion';
  motionToggle.disabled = motionQuery.matches;
  if (reduceMotion) document.querySelectorAll('.reveal').forEach((element) => element.classList.add('is-visible'));
  startStageCycle();
  syncCanvas();
}
motionToggle.addEventListener('click', () => {
  userPaused = !userPaused;
  writePreference('sy-motion', userPaused ? 'paused' : 'active');
  syncMotion();
});
motionQuery.addEventListener?.('change', syncMotion);
document.addEventListener('visibilitychange', () => { startStageCycle(); syncCanvas(); });
if (typeof IntersectionObserver === 'function') {
  new IntersectionObserver(([entry]) => { systemInView = entry.isIntersecting; startStageCycle(); }, {threshold:0}).observe(document.querySelector('[data-system-card]'));
}
document.querySelector('[data-system-card]').addEventListener('focusin', () => { window.clearInterval(stageTimer); });
document.querySelector('[data-system-card]').addEventListener('focusout', (event) => {
  if (!event.currentTarget.contains(event.relatedTarget)) startStageCycle();
});
document.addEventListener('pointerdown', (event) => {
  if (!navigation.contains(event.target) && !menuToggle.contains(event.target)) closeMenu();
});
syncMotion();

function setMetricValue(element) {
  // Reported results remain exact; motion must not animate through invented values.
  const target = Number(element.dataset.counter);
  const prefix = element.dataset.prefix || '';
  const suffix = element.dataset.suffix || '';
  const decimals = Number.isFinite(Number(element.dataset.decimals))
    ? Number(element.dataset.decimals)
    : ((String(target).split('.')[1] || '').length);

  element.textContent = `${prefix}${target.toFixed(decimals)}${suffix}`;
}
document.querySelectorAll('[data-counter]').forEach(setMetricValue);

const spotlightElements = [
  ...document.querySelectorAll('.project-card, .system-card, .research-card, .timeline-panel, .about-card, .skills-panel'),
];
spotlightElements.forEach((element) => {
  element.setAttribute('data-spotlight', '');
  element.addEventListener('pointermove', (event) => {
    if (reduceMotion || !pointerQuery.matches) return;
    const rect = element.getBoundingClientRect();
    element.style.setProperty('--spot-x', `${event.clientX - rect.left}px`);
    element.style.setProperty('--spot-y', `${event.clientY - rect.top}px`);
  }, { passive: true });
});

if (!reduceMotion && pointerQuery.matches) {
  window.addEventListener('pointermove', (event) => {
    if (reduceMotion) return;
    body.style.setProperty('--pointer-x', `${event.clientX}px`);
    body.style.setProperty('--pointer-y', `${event.clientY}px`);
  }, { passive: true });
}

function initializeNeuralField() {
  const canvas = document.querySelector('[data-neural-field]');
  if (!canvas || typeof window.CanvasRenderingContext2D === 'undefined') return;
  const context = canvas.getContext('2d');
  if (!context) return;

  let width = 0;
  let height = 0;
  let nodes = [];
  let frameId;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = width < 700 ? 20 : 44;
    nodes = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - .5) * .12,
      vy: (Math.random() - .5) * .12,
      radius: Math.random() * 1.2 + .45,
    }));
  }

  function draw() {
    context.clearRect(0, 0, width, height);
    const dark = root.dataset.theme !== 'light';
    const lineBase = dark ? '54, 228, 218' : '54, 88, 232';
    const dotBase = dark ? '155, 135, 245' : '54, 88, 232';

    nodes.forEach((node, index) => {
      if (!reduceMotion && !document.hidden) {
        node.x += node.vx;
        node.y += node.vy;
        if (node.x < -10) node.x = width + 10;
        if (node.x > width + 10) node.x = -10;
        if (node.y < -10) node.y = height + 10;
        if (node.y > height + 10) node.y = -10;
      }

      for (let otherIndex = index + 1; otherIndex < nodes.length; otherIndex += 1) {
        const other = nodes[otherIndex];
        const distance = Math.hypot(node.x - other.x, node.y - other.y);
        if (distance < 135) {
          context.beginPath();
          context.moveTo(node.x, node.y);
          context.lineTo(other.x, other.y);
          context.strokeStyle = `rgba(${lineBase}, ${(1 - distance / 135) * .15})`;
          context.lineWidth = .7;
          context.stroke();
        }
      }

      context.beginPath();
      context.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
      context.fillStyle = `rgba(${dotBase}, .34)`;
      context.fill();
    });

    if (!reduceMotion && !document.hidden) frameId = window.requestAnimationFrame(draw);
  }

  resize();
  draw();
  syncCanvas = () => {
    window.cancelAnimationFrame(frameId);
    draw();
  };
  window.addEventListener('resize', () => {
    window.cancelAnimationFrame(frameId);
    resize();
    draw();
  }, { passive: true });
}

initializeNeuralField();
year.textContent = new Date().getFullYear();
