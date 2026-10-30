/* ==========================================================================
   Diwali Jeopardy — game logic & festive effects
   Question data lives in script.js (gameData) and is left untouched.
   ========================================================================== */

(() => {
    'use strict';

    const getPointValues = () => {
        const cats = Object.keys(gameData);
        if (!cats.length) return [100, 200, 300, 400, 500];
        const pts = Object.keys(gameData[cats[0]] || {}).map(Number).sort((a, b) => a - b);
        return pts.length ? pts : [100, 200, 300, 400, 500];
    };
    const FESTIVE_COLORS = ['#ffd56b', '#ffaa1f', '#ff7a1a', '#ff5c93', '#e8336f', '#fff3cf'];
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    // Game state
    const completedQuestions = new Set();
    let currentQuestion = null;
    let originCell = null;
    let isClosing = false;

    // DOM refs
    const $ = (id) => document.getElementById(id);
    const els = {};

    const rand = (min, max) => Math.random() * (max - min) + min;
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const totalQuestions = () => Object.keys(gameData).length * getPointValues().length;
    const Media = window.JeopardyMedia;
    const Teams = window.JeopardyTeams;

    /* ------------------------------------------------------------------
       Board
       ------------------------------------------------------------------ */
    function initializeGameBoard() {
        const board = els.board;
        board.innerHTML = '';
        board.classList.add('board-intro');
        setTimeout(() => board.classList.remove('board-intro'), 2200);
        const categories = Object.keys(gameData);
        board.style.gridTemplateColumns = `repeat(${categories.length}, minmax(0, 1fr))`;

        // Category headers
        categories.forEach((category, i) => {
            const header = document.createElement('div');
            header.className = 'category-header';
            header.setAttribute('role', 'columnheader');
            header.style.setProperty('--i', i);
            header.textContent = category;
            board.appendChild(header);
        });

        // Question cells (row by row so the grid lines up)
        getPointValues().forEach((points, row) => {
            categories.forEach((category, col) => {
                const cell = document.createElement('button');
                cell.type = 'button';
                cell.className = 'question-cell';
                cell.id = `${category}-${points}`;
                cell.dataset.category = category;
                cell.dataset.points = points;
                // diagonal wave entrance
                cell.style.setProperty('--i', row * 2 + col);
                renderCellContent(cell, points, completedQuestions.has(cell.id));
                cell.addEventListener('click', (e) => {
                    if (completedQuestions.has(cell.id)) return;
                    burstSparks(e.clientX || cell.getBoundingClientRect().left + cell.offsetWidth / 2,
                        e.clientY || cell.getBoundingClientRect().top + cell.offsetHeight / 2);
                    openQuestion(category, points, cell);
                });
                cell.addEventListener('pointermove', (e) => {
                    const r = cell.getBoundingClientRect();
                    cell.style.setProperty('--mx', `${e.clientX - r.left}px`);
                    cell.style.setProperty('--my', `${e.clientY - r.top}px`);
                });
                board.appendChild(cell);
            });
        });

        els.totalCount.textContent = totalQuestions();
        updateProgress();
    }

    const MEDIA_LABEL = { audio: 'audio clue', video: 'video clue' };

    function renderCellContent(cell, points, lit) {
        const category = cell.dataset.category;
        const data = gameData[category] && gameData[category][points];
        const kinds = Media.kindsFor(data);
        const mediaKind = kinds.has('video') ? 'video' : kinds.has('audio') ? 'audio' : null;
        cell.innerHTML = '';
        cell.dataset.media = mediaKind || '';

        if (lit) {
            const diya = document.createElement('span');
            diya.className = 'cell-diya';
            diya.setAttribute('aria-hidden', 'true');
            diya.innerHTML = '<span class="diya-flame"><span></span></span><span class="diya-bowl"></span>';
            cell.appendChild(diya);

            const winners = Teams.winnersFor(cell.id);
            if (winners.length) {
                const dots = document.createElement('span');
                dots.className = 'cell-winners';
                winners.forEach((t) => {
                    const dot = document.createElement('span');
                    dot.className = 'cell-winner';
                    dot.style.setProperty('--team', t.color);
                    dot.title = t.name;
                    dots.appendChild(dot);
                });
                cell.appendChild(dots);
            }

            cell.classList.add('completed');
            cell.setAttribute('aria-disabled', 'true');
            const won = winners.length ? `, won by ${winners.map((t) => t.name).join(' and ')}` : '';
            cell.setAttribute('aria-label', `${category}, ₹${points} — answered${won}`);
        } else {
            cell.classList.remove('completed', 'just-lit');
            cell.removeAttribute('aria-disabled');
            const extra = mediaKind ? ` (${MEDIA_LABEL[mediaKind]})` : '';
            cell.setAttribute('aria-label', `${category} for ₹${points}${extra}`);
            if (mediaKind) {
                const badge = document.createElement('span');
                badge.className = `cell-media cell-media--${mediaKind}`;
                badge.setAttribute('aria-hidden', 'true');
                badge.innerHTML = mediaKind === 'video' ? Media.ICONS.film : Media.ICONS.note;
                cell.appendChild(badge);
            }
        }
        const value = document.createElement('span');
        value.className = 'cell-value';
        value.textContent = `₹${points}`;
        cell.appendChild(value);
    }

    function refreshCompletedCells() {
        completedQuestions.forEach((id) => {
            const cell = $(id);
            if (cell) renderCellContent(cell, Number(cell.dataset.points), true);
        });
    }

    function updateProgress() {
        const done = completedQuestions.size;
        const total = totalQuestions();
        els.litCount.textContent = done;
        els.progressFill.style.width = `${(done / total) * 100}%`;
    }

    /* ------------------------------------------------------------------
       Question dialog
       ------------------------------------------------------------------ */
    function openQuestion(category, points, cell) {
        const questionId = `${category}-${points}`;
        if (completedQuestions.has(questionId) || els.modal.open) return;

        currentQuestion = { category, points, id: questionId };
        originCell = cell || $(questionId);
        const questionData = gameData[category][points];

        els.modalCategory.textContent = category;
        els.modalPoints.textContent = `₹${points}`;

        els.questionText.textContent = '';
        els.questionHint.textContent = '';
        els.answerText.textContent = '';

        if (questionData.question) {
            els.questionText.textContent = questionData.question;
        }

        // Images, audio, video, YouTube / other embeds (see media.js for fields)
        Media.render(els.questionMedia, questionData, 'question', `${category} clue for ₹${points}`);
        Media.clear(els.answerMedia); // answer media is built on reveal
        els.modal.classList.toggle('modal--wide', Media.isWide(questionData));

        if (questionData.hint && questionData.hint.trim() !== '') {
            if (els.hintContainer) els.hintContainer.hidden = false;
            els.questionHint.hidden = true;
            els.questionHint.textContent = questionData.hint;
            if (els.toggleHintBtn) els.toggleHintBtn.setAttribute('aria-expanded', 'false');
            if (els.hintBtnText) els.hintBtnText.textContent = 'Show Hint';
        } else {
            if (els.hintContainer) els.hintContainer.hidden = true;
            els.questionHint.hidden = true;
            els.questionHint.textContent = '';
        }

        els.answerText.textContent = questionData.answer;

        // Reset dialog state
        els.answerContent.hidden = true;
        els.revealBtn.hidden = false;
        els.closeBtn.hidden = true;
        els.closeBtn.textContent = 'Close';
        Teams.renderAwardPanel(els.awardPanel, els.awardList, questionId, points);

        isClosing = false;
        els.modal.removeAttribute('data-closing');
        els.modal.showModal();
        els.modal.classList.add('is-open');
        els.modalBody.scrollTop = 0;
        els.revealBtn.focus();

        animateOpenFrom(originCell);
    }

    function animateOpenFrom(cell) {
        const content = els.modalContent;
        if (reduceMotion.matches || !cell || !content.animate) {
            content.animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: 150 });
            return;
        }
        const from = cell.getBoundingClientRect();
        const to = content.getBoundingClientRect();
        const dx = (from.left + from.width / 2) - (to.left + to.width / 2);
        const dy = (from.top + from.height / 2) - (to.top + to.height / 2);
        const sx = Math.max(from.width / to.width, 0.05);
        const sy = Math.max(from.height / to.height, 0.05);

        content.animate([
            { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`, opacity: 0.2, filter: 'brightness(1.8)' },
            { transform: `translate(${dx * 0.15}px, ${dy * 0.15}px) scale(1.02)`, opacity: 1, filter: 'brightness(1.15)', offset: 0.7 },
            { transform: 'none', opacity: 1, filter: 'brightness(1)' }
        ], { duration: 560, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
    }

    function revealAnswer() {
        if (!els.modal.open || !els.answerContent.hidden) return;
        const questionData = currentQuestion && gameData[currentQuestion.category][currentQuestion.points];
        if (questionData) {
            const hasAnswerMedia = Media.render(els.answerMedia, questionData, 'answer', `Answer: ${questionData.answer}`);
            if (hasAnswerMedia) Media.pauseAll(els.questionMedia);
            else Media.onAnswerRevealed?.(els.questionMedia, questionData);
        }
        els.answerContent.hidden = false;
        els.revealBtn.hidden = true;
        els.closeBtn.hidden = false;
        els.closeBtn.focus();

        // keep the answer in view for long questions / tall images
        requestAnimationFrame(() => {
            els.answerContent.scrollIntoView({ block: 'nearest', behavior: reduceMotion.matches ? 'auto' : 'smooth' });
            modalSparks();
        });
        launchFirework(rand(0.2, 0.4));
        launchFirework(rand(0.6, 0.8));
    }

    // Animated close; the native 'close' event finalises state for every path.
    function closeModal() {
        if (!els.modal.open || isClosing) return;
        isClosing = true;
        els.modal.setAttribute('data-closing', '');
        Media.pauseAll(els.modalContent);

        const content = els.modalContent;
        if (reduceMotion.matches || !content.animate) {
            els.modal.close();
            return;
        }
        const anim = content.animate([
            { transform: 'none', opacity: 1 },
            { transform: 'translateY(12px) scale(0.94)', opacity: 0 }
        ], { duration: 220, easing: 'cubic-bezier(0.4, 0, 1, 1)', fill: 'forwards' });
        anim.finished.then(() => {
            els.modal.close();
            anim.cancel();
        }).catch(() => els.modal.close());
    }

    function onModalClosed() {
        isClosing = false;
        els.modal.removeAttribute('data-closing');
        els.modal.classList.remove('is-open');
        // stop audio/video and tear down embeds so nothing keeps playing
        Media.clear(els.questionMedia);
        Media.clear(els.answerMedia);

        if (currentQuestion) {
            completedQuestions.add(currentQuestion.id);
            Teams.setCompleted(completedQuestions);
            const cell = $(currentQuestion.id);
            if (cell) {
                renderCellContent(cell, currentQuestion.points, true);
                cell.classList.add('just-lit');
                const onPulseEnd = (e) => {
                    if (e && e.target !== cell) return;
                    cell.classList.remove('just-lit');
                    cell.removeEventListener('animationend', onPulseEnd);
                };
                cell.addEventListener('animationend', onPulseEnd);
                setTimeout(() => {
                    cell.classList.remove('just-lit');
                    cell.removeEventListener('animationend', onPulseEnd);
                }, 950);
                cell.focus({ preventScroll: true });
                const r = cell.getBoundingClientRect();
                burstSparks(r.left + r.width / 2, r.top + r.height / 2, 18);
            }
            currentQuestion = null;
            updateProgress();

            if (completedQuestions.size === totalQuestions()) {
                celebrate();
            }
        }
        originCell = null;
    }

    function resetGame(skipConfirm = false) {
        const msg = Teams.hasTeams()
            ? 'Reset the board? All diyas will go out and every team score goes back to ₹0.'
            : 'Reset the board? All diyas will go out.';
        if (!skipConfirm && !window.confirm(msg)) return;
        completedQuestions.clear();
        currentQuestion = null;
        if (els.modal.open) els.modal.close();
        Teams.resetScores();
        initializeGameBoard();
    }

    /* ------------------------------------------------------------------
       Micro-effects
       ------------------------------------------------------------------ */
    function burstSparks(x, y, count = 14) {
        if (reduceMotion.matches) return;
        for (let i = 0; i < count; i++) {
            const s = document.createElement('span');
            s.className = 'spark';
            const color = pick(FESTIVE_COLORS);
            s.style.setProperty('--c', color);
            s.style.left = `${x - 3}px`;
            s.style.top = `${y - 3}px`;
            document.body.appendChild(s);
            const angle = (Math.PI * 2 * i) / count + rand(-0.3, 0.3);
            const dist = rand(30, 80);
            s.animate([
                { transform: 'translate(0,0) scale(1)', opacity: 1 },
                { transform: `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist + 20}px) scale(0.2)`, opacity: 0 }
            ], { duration: rand(500, 850), easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }).onfinish = () => s.remove();
        }
    }

    function modalSparks() {
        if (reduceMotion.matches) return;
        const host = els.modalContent;
        const hostRect = host.getBoundingClientRect();
        const target = els.answerText.getBoundingClientRect();
        const cx = target.left + target.width / 2 - hostRect.left;
        const cy = target.top + target.height / 2 - hostRect.top;
        for (let i = 0; i < 28; i++) {
            const s = document.createElement('span');
            s.className = 'modal-spark';
            s.style.setProperty('--c', pick(FESTIVE_COLORS));
            s.style.setProperty('--s', `${rand(3, 7)}px`);
            s.style.left = `${cx}px`;
            s.style.top = `${cy}px`;
            host.appendChild(s);
            const angle = rand(0, Math.PI * 2);
            const dist = rand(80, 260);
            s.animate([
                { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
                { transform: `translate(calc(-50% + ${Math.cos(angle) * dist}px), calc(-50% + ${Math.sin(angle) * dist * 0.6}px)) scale(0)`, opacity: 0 }
            ], { duration: rand(700, 1200), easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }).onfinish = () => s.remove();
        }
    }

    function celebrate() {
        const wrap = document.createElement('div');
        wrap.className = 'celebration';
        wrap.setAttribute('role', 'status');
        wrap.innerHTML = '<p class="celebration-text">Shubh Deepavali!<small>EVERY DIYA IS LIT</small></p>';
        document.body.appendChild(wrap);
        setTimeout(() => wrap.remove(), 4800);
        if (reduceMotion.matches) return;
        for (let i = 0; i < 9; i++) {
            setTimeout(() => launchFirework(rand(0.1, 0.9), true), i * 280);
        }
    }

    /* ------------------------------------------------------------------
       Decorations: toran, rangoli, lanterns, embers
       ------------------------------------------------------------------ */
    const SVG_NS = 'http://www.w3.org/2000/svg';
    const svgEl = (tag, attrs = {}) => {
        const el = document.createElementNS(SVG_NS, tag);
        for (const k in attrs) el.setAttribute(k, attrs[k]);
        return el;
    };

    function buildToran() {
        const host = els.toran;
        host.innerHTML = '';
        const W = window.innerWidth;
        const H = host.clientHeight || 90;
        const small = W < 860;
        const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'none' });

        const defs = svgEl('defs');
        defs.innerHTML = `
            <radialGradient id="mg1" cx="35%" cy="35%" r="70%"><stop offset="0%" stop-color="#ffe08a"/><stop offset="60%" stop-color="#ff9d1f"/><stop offset="100%" stop-color="#c2550c"/></radialGradient>
            <radialGradient id="mg2" cx="35%" cy="35%" r="70%"><stop offset="0%" stop-color="#fff0a8"/><stop offset="60%" stop-color="#ffc21f"/><stop offset="100%" stop-color="#d2860a"/></radialGradient>
            <radialGradient id="mg3" cx="35%" cy="35%" r="70%"><stop offset="0%" stop-color="#ffb08a"/><stop offset="60%" stop-color="#ff6a2a"/><stop offset="100%" stop-color="#a8320c"/></radialGradient>
            <radialGradient id="bulbGlow"><stop offset="0%" stop-color="#fff6c8"/><stop offset="35%" stop-color="#ffd56b" stop-opacity="0.9"/><stop offset="100%" stop-color="#ff9d1f" stop-opacity="0"/></radialGradient>`;
        svg.appendChild(defs);

        // top rope
        svg.appendChild(svgEl('rect', { x: 0, y: 0, width: W, height: 5, fill: '#7a1238' }));

        const swagCount = Math.max(3, Math.round(W / (small ? 170 : 230)));
        const swagW = W / swagCount;
        const top = 4;
        const sag = small ? 26 : 38;
        const beadR = small ? 4.6 : 6;
        const step = beadR * 1.75;
        const fills = ['url(#mg1)', 'url(#mg2)', 'url(#mg3)'];

        for (let s = 0; s < swagCount; s++) {
            const x0 = s * swagW;
            const x1 = x0 + swagW;
            const cx = (x0 + x1) / 2;
            const cy = top + sag * 2;
            const approxLen = swagW + sag * 1.2;
            const n = Math.ceil(approxLen / step);
            const g = svgEl('g');
            for (let i = 0; i <= n; i++) {
                const t = i / n;
                const x = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1;
                const y = (1 - t) * (1 - t) * top + 2 * (1 - t) * t * cy + t * t * top;
                g.appendChild(svgEl('circle', {
                    class: 'bead', cx: x.toFixed(1), cy: y.toFixed(1), r: (beadR * rand(0.9, 1.08)).toFixed(2),
                    fill: fills[i % 3]
                }));
            }
            svg.appendChild(g);

            // glowing bulb at the swag's lowest point
            const bulb = svgEl('circle', { class: 'bulb', cx, cy: top + sag + beadR * 2.2, r: beadR * 2.6, fill: 'url(#bulbGlow)' });
            bulb.style.setProperty('--tw', `${rand(1.6, 3)}s`);
            bulb.style.setProperty('--td', `${rand(-3, 0)}s`);
            svg.appendChild(bulb);

            // tassel with a mango leaf at each junction
            const tassel = svgEl('g', { class: 'tassel' });
            tassel.style.setProperty('--td', `${rand(-3.6, 0)}s`);
            const tx = x0;
            const len = small ? 30 : 46;
            tassel.appendChild(svgEl('line', { x1: tx, y1: top, x2: tx, y2: top + len, stroke: '#7a1238', 'stroke-width': 1.4 }));
            [0.35, 0.6, 0.85].forEach((f, k) => {
                tassel.appendChild(svgEl('circle', { cx: tx, cy: top + len * f, r: beadR * 0.85, fill: fills[(k + s) % 3] }));
            });
            const ly = top + len + 2;
            const lw = small ? 6 : 8;
            const lh = small ? 16 : 22;
            tassel.appendChild(svgEl('path', {
                d: `M${tx} ${ly} C ${tx + lw} ${ly + lh * 0.35}, ${tx + lw * 0.6} ${ly + lh * 0.8}, ${tx} ${ly + lh} C ${tx - lw * 0.6} ${ly + lh * 0.8}, ${tx - lw} ${ly + lh * 0.35}, ${tx} ${ly} Z`,
                fill: '#2f8f4e', stroke: '#1d5e31', 'stroke-width': 0.8
            }));
            tassel.appendChild(svgEl('line', { x1: tx, y1: ly + 2, x2: tx, y2: ly + lh - 2, stroke: '#9fd6a8', 'stroke-width': 0.6, opacity: 0.7 }));
            if (s > 0) svg.appendChild(tassel);
        }
        host.appendChild(svg);
    }

    function buildRangoli() {
        const g = $('rangoliPetals');
        if (!g) return;
        const colors = ['#ff4f8b', '#ffaa1f', '#ffd56b'];
        for (let i = 0; i < 16; i++) {
            const angle = (360 / 16) * i;
            const p = svgEl('path', {
                d: 'M100 66 C 108 52, 108 36, 100 22 C 92 36, 92 52, 100 66 Z',
                fill: colors[i % 3],
                'fill-opacity': i % 2 ? 0.5 : 0.8,
                transform: `rotate(${angle} 100 100)`
            });
            g.appendChild(p);
            g.appendChild(svgEl('circle', {
                cx: 100, cy: 14, r: i % 2 ? 2 : 3, fill: '#fff3cf',
                transform: `rotate(${angle + 11.25} 100 100)`
            }));
        }
    }

    function buildSky() {
        const lanterns = els.lanterns;
        const embers = els.embers;
        lanterns.innerHTML = '';
        embers.innerHTML = '';
        if (reduceMotion.matches) return;

        const lanternCount = window.innerWidth < 700 ? 4 : 8;
        for (let i = 0; i < lanternCount; i++) {
            const l = document.createElement('span');
            l.className = 'lantern';
            const depth = Math.random();
            const dur = rand(28, 46);
            l.style.left = `${rand(2, 96)}%`;
            l.style.setProperty('--w', `${14 + depth * 20}px`);
            l.style.setProperty('--dur', `${dur}s`);
            l.style.setProperty('--delay', `${-rand(0, dur)}s`);
            l.style.setProperty('--drift', `${rand(-70, 70)}px`);
            l.style.setProperty('--blur', `${(1 - depth) * 1.6}px`);
            l.style.setProperty('--op', (0.45 + depth * 0.45).toFixed(2));
            lanterns.appendChild(l);
        }

        const emberCount = window.innerWidth < 700 ? 16 : 32;
        for (let i = 0; i < emberCount; i++) {
            const e = document.createElement('span');
            e.className = 'ember';
            const dur = rand(9, 18);
            e.style.left = `${rand(0, 100)}%`;
            e.style.setProperty('--s', `${rand(2, 4.5)}px`);
            e.style.setProperty('--c', pick(['#ffd56b', '#ffaa1f', '#ff7a1a', '#ff5c93']));
            e.style.setProperty('--dur', `${dur}s`);
            e.style.setProperty('--delay', `${-rand(0, dur)}s`);
            e.style.setProperty('--drift', `${rand(-60, 60)}px`);
            embers.appendChild(e);
        }
    }

    /* ------------------------------------------------------------------
       Fireworks (canvas)
       ------------------------------------------------------------------ */
    const fw = { ctx: null, w: 0, h: 0, dpr: 1, rockets: [], particles: [], running: false, nextAmbient: 0 };

    function resizeCanvas() {
        const c = els.canvas;
        fw.dpr = Math.min(window.devicePixelRatio || 1, 2);
        fw.w = window.innerWidth;
        fw.h = window.innerHeight;
        c.width = fw.w * fw.dpr;
        c.height = fw.h * fw.dpr;
        fw.ctx = c.getContext('2d');
        fw.ctx.setTransform(fw.dpr, 0, 0, fw.dpr, 0, 0);
    }

    function launchFirework(xFrac = Math.random(), big = false) {
        if (reduceMotion.matches || !fw.ctx) return;
        const x = fw.w * xFrac;
        fw.rockets.push({
            x, y: fw.h + 10,
            vx: rand(-0.6, 0.6),
            vy: -rand(9, 12.5) * Math.sqrt(fw.h / 900),
            targetY: fw.h * rand(0.1, 0.42),
            color: pick(FESTIVE_COLORS),
            big
        });
        startFireworks();
    }

    function explode(r) {
        const count = r.big ? 110 : rand(55, 80) | 0;
        const palette = [r.color, pick(FESTIVE_COLORS), '#fff3cf'];
        const ring = Math.random() < 0.35;
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count;
            const speed = ring ? (r.big ? 5.5 : 4.2) : rand(1, r.big ? 6.5 : 4.8);
            fw.particles.push({
                x: r.x, y: r.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1,
                decay: rand(0.010, 0.018),
                color: palette[i % palette.length],
                size: rand(1.2, 2.4),
                twinkle: Math.random() < 0.3
            });
        }
    }

    function startFireworks() {
        if (fw.running) return;
        fw.running = true;
        requestAnimationFrame(tickFireworks);
    }

    function tickFireworks(now) {
        const ctx = fw.ctx;
        // fade previous frame -> trails, keeping the canvas transparent
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
        ctx.fillRect(0, 0, fw.w, fw.h);
        ctx.globalCompositeOperation = 'lighter';

        // rockets
        for (let i = fw.rockets.length - 1; i >= 0; i--) {
            const r = fw.rockets[i];
            r.x += r.vx;
            r.y += r.vy;
            r.vy += 0.12;
            ctx.fillStyle = r.color;
            ctx.beginPath();
            ctx.arc(r.x, r.y, 2, 0, Math.PI * 2);
            ctx.fill();
            if (r.y <= r.targetY || r.vy >= 0) {
                explode(r);
                fw.rockets.splice(i, 1);
            }
        }

        // particles
        for (let i = fw.particles.length - 1; i >= 0; i--) {
            const p = fw.particles[i];
            p.vx *= 0.975;
            p.vy = p.vy * 0.975 + 0.05;
            p.x += p.vx;
            p.y += p.vy;
            p.life -= p.decay;
            if (p.life <= 0) {
                fw.particles.splice(i, 1);
                continue;
            }
            const alpha = p.twinkle ? p.life * (0.5 + Math.random() * 0.5) : p.life;
            ctx.globalAlpha = Math.max(alpha, 0);
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // ambient launches
        if (!document.hidden && now > fw.nextAmbient) {
            fw.nextAmbient = now + rand(2200, 5200);
            // favour the sides so the board stays readable
            launchFirework(Math.random() < 0.5 ? rand(0.03, 0.22) : rand(0.78, 0.97));
        }

        if (reduceMotion.matches) {
            fw.running = false;
            ctx.clearRect(0, 0, fw.w, fw.h);
            return;
        }
        requestAnimationFrame(tickFireworks);
    }

    /* ------------------------------------------------------------------
       Wiring
       ------------------------------------------------------------------ */
    function init() {
        Object.assign(els, {
            board: $('gameBoard'),
            modal: $('questionModal'),
            modalContent: document.querySelector('#questionModal .modal-content'),
            modalBody: document.querySelector('#questionModal .modal-body'),
            modalCategory: $('modalCategory'),
            modalPoints: $('modalPoints'),
            questionText: $('questionText'),
            questionMedia: $('questionMedia'),
            questionHint: $('questionHint'),
            hintContainer: $('hintContainer'),
            toggleHintBtn: $('toggleHintBtn'),
            hintBtnText: $('hintBtnText'),
            modalCloseX: $('modalCloseX'),
            answerContent: $('answerContent'),
            answerText: $('answerText'),
            answerMedia: $('answerMedia'),
            awardPanel: $('awardPanel'),
            awardList: $('awardList'),
            revealBtn: $('revealAnswerBtn'),
            closeBtn: $('closeModalBtn'),
            litCount: $('litCount'),
            totalCount: $('totalCount'),
            progressFill: $('progressFill'),
            toran: $('toran'),
            lanterns: $('lanterns'),
            embers: $('embers'),
            canvas: $('fireworks')
        });

        // Teams first so saved progress (lit diyas) can be restored onto the board
        Teams.init();
        Teams.getCompleted().forEach((id) => {
            const [category, points] = [id.slice(0, id.lastIndexOf('-')), id.slice(id.lastIndexOf('-') + 1)];
            if (gameData[category] && gameData[category][points]) completedQuestions.add(id);
        });
        Teams.onChange(refreshCompletedCells);
        Media.exclusivePlayback(els.modalContent);

        initializeGameBoard();
        buildToran();
        buildRangoli();
        buildSky();
        resizeCanvas();
        if (!reduceMotion.matches) {
            fw.nextAmbient = performance.now() + 1800;
            startFireworks();
        }

        els.revealBtn.addEventListener('click', revealAnswer);
        els.closeBtn.addEventListener('click', closeModal);
        els.modalCloseX?.addEventListener('click', closeModal);
        els.toggleHintBtn?.addEventListener('click', () => {
            const isHidden = els.questionHint.hidden;
            els.questionHint.hidden = !isHidden;
            els.toggleHintBtn.setAttribute('aria-expanded', String(isHidden));
            if (els.hintBtnText) els.hintBtnText.textContent = isHidden ? 'Hide Hint' : 'Show Hint';
        });
        $('resetBtn').addEventListener('click', () => resetGame());

        // Esc -> animated close
        els.modal.addEventListener('cancel', (e) => {
            e.preventDefault();
            closeModal();
        });
        els.modal.addEventListener('close', onModalClosed);

        // Light dismiss: click on the backdrop (outside the content box)
        els.modal.addEventListener('click', (e) => {
            if (e.target.closest('.modal-content')) return;
            closeModal();
        });

        // Dialog shortcuts: Enter/Space advance, P plays/pauses the clip
        const INTERACTIVE = new Set(['BUTTON', 'INPUT', 'AUDIO', 'VIDEO', 'IFRAME', 'A', 'TEXTAREA', 'SELECT']);
        document.addEventListener('keydown', (e) => {
            if (!els.modal.open || e.metaKey || e.ctrlKey || e.altKey) return;
            const active = document.activeElement;
            if (e.key === 'p' || e.key === 'P' || e.key === 'r' || e.key === 'R') {
                if (active && active.tagName === 'INPUT' && active.type === 'text') return;
                if (Media.togglePrimary(els.modalContent)) e.preventDefault();
                return;
            }
            if (e.key !== 'Enter' && e.key !== ' ') return;
            if (active && INTERACTIVE.has(active.tagName)) return;
            e.preventDefault();
            if (els.answerContent.hidden) revealAnswer();
            else closeModal();
        });

        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                buildToran();
                resizeCanvas();
            }, 150);
        });

        reduceMotion.addEventListener?.('change', () => {
            buildSky();
            if (!reduceMotion.matches) startFireworks();
        });
    }

    // Public API (kept for compatibility with the original script)
    window.initializeGameBoard = initializeGameBoard;
    window.openQuestion = (category, points) => openQuestion(category, points);
    window.revealAnswer = revealAnswer;
    window.closeModal = closeModal;
    window.resetGame = resetGame;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
