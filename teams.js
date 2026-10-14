/* ==========================================================================
   Diwali Jeopardy — teams & scoring
   Teams, scores and per-question awards are saved to localStorage so a
   page refresh mid-game doesn't lose anything.
   ========================================================================== */

(() => {
    'use strict';

    const STORAGE_KEY = 'diwaliJeopardy.v1';
    const MAX_TEAMS = 8;
    const MANUAL_STEP = 100;
    const TEAM_COLORS = ['#ff8a1f', '#ff4f8b', '#2fd17a', '#29b6f6', '#a77bff', '#ffd23f', '#ff5a4e', '#22d3c5'];
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    const ICONS = {
        plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" fill="none"/></svg>',
        minus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" fill="none"/></svg>',
        close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" fill="none"/></svg>',
        check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>',
        crown: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 8.5 7.5 12 12 5l4.5 7L21 8.5 19 18H5L3 8.5Z" fill="currentColor"/><rect x="5" y="19" width="14" height="2" rx="1" fill="currentColor"/></svg>'
    };

    const state = {
        teams: [],      // { id, name, color, adjust }
        awards: {},     // { [questionId]: { [teamId]: signedPoints } }
        completed: []   // question ids
    };

    const els = {};
    const listeners = { change: [] };
    const displayed = new Map(); // teamId -> number currently shown (for count animation)

    /* ---------- Persistence ---------- */
    function load() {
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
            if (saved && Array.isArray(saved.teams)) {
                state.teams = saved.teams;
                state.awards = saved.awards || {};
                state.completed = Array.isArray(saved.completed) ? saved.completed : [];
            }
        } catch { /* ignore corrupt storage */ }
    }

    function save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch { /* storage may be unavailable (private mode / file://) */ }
    }

    /* ---------- Scoring ---------- */
    function scoreOf(teamId) {
        const team = state.teams.find((t) => t.id === teamId);
        if (!team) return 0;
        let total = team.adjust || 0;
        for (const qid in state.awards) total += state.awards[qid][teamId] || 0;
        return total;
    }

    const fmtScore = (n) => `${n < 0 ? '−' : ''}₹${Math.abs(n).toLocaleString('en-IN')}`;

    function leaders() {
        if (state.teams.length < 2) return new Set();
        const scores = state.teams.map((t) => scoreOf(t.id));
        const max = Math.max(...scores);
        if (max <= 0) return new Set();
        return new Set(state.teams.filter((t) => scoreOf(t.id) === max).map((t) => t.id));
    }

    function winnersFor(questionId) {
        const a = state.awards[questionId] || {};
        return state.teams.filter((t) => (a[t.id] || 0) > 0);
    }

    function announce(team) {
        if (!els.status || !team) return;
        els.status.textContent = `${team.name}: ${fmtScore(scoreOf(team.id))}`;
    }

    function emitChange() {
        listeners.change.forEach((fn) => fn());
    }

    /* ---------- Team CRUD ---------- */
    function addTeam() {
        if (state.teams.length >= MAX_TEAMS) return;
        const used = new Set(state.teams.map((t) => t.color));
        const color = TEAM_COLORS.find((c) => !used.has(c)) || TEAM_COLORS[state.teams.length % TEAM_COLORS.length];
        const team = { id: `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, name: `Team ${state.teams.length + 1}`, color, adjust: 0 };
        state.teams.push(team);
        save();
        renderTeams();
        const input = els.list.querySelector(`[data-id="${team.id}"] .team-name`);
        if (input) {
            input.focus();
            input.select();
        }
        emitChange();
    }

    function removeTeam(teamId) {
        const team = state.teams.find((t) => t.id === teamId);
        if (!team) return;
        if (!window.confirm(`Remove ${team.name}? Their score will be lost.`)) return;
        state.teams = state.teams.filter((t) => t.id !== teamId);
        for (const qid in state.awards) delete state.awards[qid][teamId];
        displayed.delete(teamId);
        save();
        renderTeams();
        els.addBtn.focus();
        emitChange();
    }

    function renameTeam(teamId, name) {
        const team = state.teams.find((t) => t.id === teamId);
        if (!team) return;
        team.name = name.trim() || 'Unnamed team';
        save();
    }

    function adjust(teamId, delta) {
        const team = state.teams.find((t) => t.id === teamId);
        if (!team) return;
        team.adjust = (team.adjust || 0) + delta;
        save();
        refreshScores(teamId, delta);
        announce(team);
    }

    /** Toggle a correct (+1) / wrong (-1) award for a question. */
    function toggleAward(questionId, teamId, sign, points) {
        const a = (state.awards[questionId] = state.awards[questionId] || {});
        const current = a[teamId] || 0;
        const next = Math.sign(current) === sign ? 0 : sign * points;
        if (next === 0) delete a[teamId];
        else a[teamId] = next;
        if (!Object.keys(a).length) delete state.awards[questionId];
        save();
        refreshScores(teamId, next - current);
        announce(state.teams.find((t) => t.id === teamId));
        return next;
    }

    /* ---------- Completed questions (persisted alongside scores) ---------- */
    function setCompleted(ids) {
        state.completed = [...ids];
        save();
    }

    function resetScores() {
        state.awards = {};
        state.completed = [];
        state.teams.forEach((t) => { t.adjust = 0; });
        save();
        renderTeams();
    }

    /* ---------- Rendering: team dock ---------- */
    function renderTeams() {
        const list = els.list;
        list.innerHTML = '';
        const lead = leaders();

        if (!state.teams.length) {
            const empty = document.createElement('div');
            empty.className = 'team-empty';
            empty.innerHTML = '<p>No teams yet. Add teams to keep score — up to 8.</p>';
            list.appendChild(empty);
        }

        state.teams.forEach((team, i) => {
            const score = scoreOf(team.id);
            displayed.set(team.id, score);
            const card = document.createElement('article');
            card.className = 'team-card';
            card.dataset.id = team.id;
            card.style.setProperty('--team', team.color);
            card.style.setProperty('--i', i);
            card.classList.toggle('is-leader', lead.has(team.id));
            card.classList.toggle('is-negative', score < 0);
            card.innerHTML = `
                <span class="team-crown" aria-hidden="true">${ICONS.crown}</span>
                <button type="button" class="team-remove" aria-label="Remove ${escapeHtml(team.name)}">${ICONS.close}</button>
                <label class="sr-only" for="name-${team.id}">Team name</label>
                <input class="team-name" id="name-${team.id}" type="text" maxlength="24" autocomplete="off" spellcheck="false" value="${escapeHtml(team.name)}">
                <div class="team-score" aria-hidden="true">${fmtScore(score)}</div>
                <div class="team-controls">
                    <button type="button" class="team-step" data-delta="-${MANUAL_STEP}" aria-label="Subtract ${MANUAL_STEP} from ${escapeHtml(team.name)}">${ICONS.minus}</button>
                    <span class="team-step-label" aria-hidden="true">${MANUAL_STEP}</span>
                    <button type="button" class="team-step" data-delta="${MANUAL_STEP}" aria-label="Add ${MANUAL_STEP} to ${escapeHtml(team.name)}">${ICONS.plus}</button>
                </div>`;
            list.appendChild(card);
        });

        els.addBtn.disabled = state.teams.length >= MAX_TEAMS;
        els.addBtn.title = els.addBtn.disabled ? `Maximum of ${MAX_TEAMS} teams` : '';
    }

    function refreshScores(changedId, delta) {
        const lead = leaders();
        state.teams.forEach((team) => {
            const card = els.list.querySelector(`[data-id="${team.id}"]`);
            if (!card) return;
            const target = scoreOf(team.id);
            card.classList.toggle('is-leader', lead.has(team.id));
            card.classList.toggle('is-negative', target < 0);
            const scoreEl = card.querySelector('.team-score');
            const from = displayed.get(team.id) ?? target;
            if (from !== target) animateNumber(scoreEl, from, target);
            displayed.set(team.id, target);
            if (team.id === changedId && delta) floatDelta(card, delta);
        });
    }

    function animateNumber(node, from, to) {
        if (reduceMotion.matches) {
            node.textContent = fmtScore(to);
            return;
        }
        const start = performance.now();
        const dur = 650;
        node.classList.remove('bump');
        void node.offsetWidth;
        node.classList.add('bump');
        const step = (now) => {
            const t = Math.min((now - start) / dur, 1);
            const eased = 1 - Math.pow(1 - t, 3);
            node.textContent = fmtScore(Math.round(from + (to - from) * eased));
            if (t < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }

    function floatDelta(card, delta) {
        const chip = document.createElement('span');
        chip.className = `team-delta ${delta > 0 ? 'is-up' : 'is-down'}`;
        chip.setAttribute('aria-hidden', 'true');
        chip.textContent = `${delta > 0 ? '+' : '−'}₹${Math.abs(delta)}`;
        card.appendChild(chip);
        chip.addEventListener('animationend', () => chip.remove(), { once: true });
        if (reduceMotion.matches) setTimeout(() => chip.remove(), 600);
    }

    /* ---------- Rendering: award panel inside the question dialog ---------- */
    function renderAwardPanel(panel, list, questionId, points) {
        list.innerHTML = '';
        if (!state.teams.length) {
            panel.hidden = true;
            return;
        }
        panel.hidden = false;
        const a = state.awards[questionId] || {};
        state.teams.forEach((team) => {
            const status = Math.sign(a[team.id] || 0);
            const chip = document.createElement('div');
            chip.className = 'award-chip';
            chip.style.setProperty('--team', team.color);
            chip.dataset.status = status > 0 ? 'right' : status < 0 ? 'wrong' : '';
            const name = escapeHtml(team.name);
            chip.innerHTML = `
                <span class="award-dot" aria-hidden="true"></span>
                <span class="award-name">${name}</span>
                <button type="button" class="award-btn award-btn--right" data-sign="1" aria-pressed="${status > 0}" aria-label="${name} correct, add ₹${points}">${ICONS.check}</button>
                <button type="button" class="award-btn award-btn--wrong" data-sign="-1" aria-pressed="${status < 0}" aria-label="${name} wrong, subtract ₹${points}">${ICONS.close}</button>`;
            chip.querySelectorAll('.award-btn').forEach((btn) => {
                btn.addEventListener('click', () => {
                    const next = toggleAward(questionId, team.id, Number(btn.dataset.sign), points);
                    const s = Math.sign(next);
                    chip.dataset.status = s > 0 ? 'right' : s < 0 ? 'wrong' : '';
                    chip.querySelector('.award-btn--right').setAttribute('aria-pressed', String(s > 0));
                    chip.querySelector('.award-btn--wrong').setAttribute('aria-pressed', String(s < 0));
                    chip.classList.remove('pop');
                    void chip.offsetWidth;
                    chip.classList.add('pop');
                });
            });
            list.appendChild(chip);
        });
    }

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    /* ---------- Wiring ---------- */
    function init() {
        els.list = document.getElementById('teamList');
        els.addBtn = document.getElementById('addTeamBtn');
        els.status = document.getElementById('scoreStatus');
        load();
        renderTeams();

        els.addBtn.addEventListener('click', addTeam);

        els.list.addEventListener('click', (e) => {
            const card = e.target.closest('.team-card');
            if (!card) return;
            const id = card.dataset.id;
            if (e.target.closest('.team-remove')) removeTeam(id);
            const step = e.target.closest('.team-step');
            if (step) adjust(id, Number(step.dataset.delta));
        });

        els.list.addEventListener('input', (e) => {
            if (!e.target.classList.contains('team-name')) return;
            const card = e.target.closest('.team-card');
            renameTeam(card.dataset.id, e.target.value);
        });

        els.list.addEventListener('change', (e) => {
            if (!e.target.classList.contains('team-name')) return;
            const card = e.target.closest('.team-card');
            const team = state.teams.find((t) => t.id === card.dataset.id);
            if (!team) return;
            e.target.value = team.name;
            card.querySelector('.team-remove').setAttribute('aria-label', `Remove ${team.name}`);
            card.querySelectorAll('.team-step').forEach((b) => {
                const d = Number(b.dataset.delta);
                b.setAttribute('aria-label', d > 0 ? `Add ${d} to ${team.name}` : `Subtract ${-d} from ${team.name}`);
            });
            emitChange();
        });

        els.list.addEventListener('keydown', (e) => {
            if (e.target.classList.contains('team-name') && e.key === 'Enter') e.target.blur();
        });
    }

    window.JeopardyTeams = {
        init,
        renderAwardPanel,
        winnersFor,
        setCompleted,
        getCompleted: () => [...state.completed],
        resetScores,
        hasTeams: () => state.teams.length > 0,
        onChange: (fn) => listeners.change.push(fn)
    };
})();
