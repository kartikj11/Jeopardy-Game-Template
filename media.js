/* ==========================================================================
   Diwali Jeopardy — media renderer
   Turns question/answer data into images, audio players, videos and embeds.

   Supported fields on any question in gameData (script.js):

     image:   "rebus/Rebus1.png"                 picture
     audio:   "media/song.mp3"                   local audio file (custom player)
     video:   "media/clip.mp4"                   local video file
     poster:  "media/clip-poster.jpg"            optional still for the video
     youtube: "https://youtu.be/VIDEO_ID"        any YouTube URL (watch / youtu.be / shorts / embed)
     embed:   "https://open.spotify.com/embed/track/…"   any other iframe URL
     start:   30                                 optional clip start (seconds)
     end:     45                                 optional clip end (seconds)

   The same fields prefixed with "answer" are shown when the answer is revealed:
     answerImage, answerAudio, answerVideo, answerYoutube, answerEmbed,
     answerStart, answerEnd
   ========================================================================== */

(() => {
    'use strict';

    const FIELDS = {
        question: { image: 'image', audio: 'audio', video: 'video', youtube: 'youtube', embed: 'embed', start: 'start', end: 'end' },
        answer: { image: 'answerImage', audio: 'answerAudio', video: 'answerVideo', youtube: 'answerYoutube', embed: 'answerEmbed', start: 'answerStart', end: 'answerEnd' }
    };

    const ICONS = {
        play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.6v12.8c0 .8.9 1.3 1.5.8l10-6.4c.6-.4.6-1.2 0-1.6l-10-6.4C8.9 4.3 8 4.8 8 5.6Z" fill="currentColor"/></svg>',
        pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="5" width="4" height="14" rx="1.2" fill="currentColor"/><rect x="13.5" y="5" width="4" height="14" rx="1.2" fill="currentColor"/></svg>',
        restart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4.5h4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        note: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V6l11-2v12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="6.5" cy="18" r="2.5" fill="currentColor"/><circle cx="17.5" cy="16" r="2.5" fill="currentColor"/></svg>',
        film: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10 9.2v5.6l4.6-2.8L10 9.2Z" fill="currentColor"/></svg>'
    };

    const el = (tag, className, html) => {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (html != null) node.innerHTML = html;
        return node;
    };

    const fmtTime = (s) => {
        if (!isFinite(s) || s < 0) s = 0;
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m}:${String(sec).padStart(2, '0')}`;
    };

    const toSeconds = (v) => {
        const n = Number(v);
        return isFinite(n) && n > 0 ? n : 0;
    };

    /** Which kinds of media a question uses (for board badges). */
    function kindsFor(data, which = 'question') {
        const f = FIELDS[which];
        const kinds = new Set();
        if (!data) return kinds;
        if (data[f.image]) kinds.add('image');
        if (data[f.audio]) kinds.add('audio');
        if (data[f.video] || data[f.youtube]) kinds.add('video');
        if (data[f.embed]) kinds.add(/spotify|soundcloud|music/i.test(data[f.embed]) ? 'audio' : 'video');
        return kinds;
    }

    function isWide(data) {
        const q = kindsFor(data, 'question');
        const a = kindsFor(data, 'answer');
        return q.has('video') || a.has('video');
    }

    /* ---------- Clip handling (start / end seconds) ---------- */
    function applyClip(media, clip) {
        const start = toSeconds(clip.start);
        const end = toSeconds(clip.end);
        const range = () => {
            const dur = isFinite(media.duration) ? media.duration : 0;
            const e = end && (!dur || end <= dur) ? end : dur;
            return { start, end: e, length: Math.max(e - start, 0) };
        };
        media.addEventListener('loadedmetadata', () => {
            if (start) media.currentTime = start;
        });
        media.addEventListener('play', () => {
            const r = range();
            if (media.currentTime < start - 0.25 || (r.end && media.currentTime >= r.end - 0.05)) {
                media.currentTime = start;
            }
        });
        if (end) {
            media.addEventListener('timeupdate', () => {
                if (media.currentTime >= end) {
                    media.pause();
                    media.currentTime = end;
                }
            });
        }
        return range;
    }

    /* ---------- Builders ---------- */
    function buildImage(src, alt) {
        const frame = el('figure', 'media-image');
        const img = document.createElement('img');
        img.src = src;
        img.alt = alt;
        img.decoding = 'async';
        img.onerror = () => frame.replaceWith(errorNote(`Image not found: ${src}`));
        frame.appendChild(img);
        return frame;
    }

    function buildAudio(src, clip) {
        const wrap = el('div', 'audio-player');
        wrap.dataset.state = 'paused';
        const bars = Array.from({ length: 9 }, (_, i) => `<i style="--b:${i}"></i>`).join('');
        wrap.innerHTML = `
            <button type="button" class="ap-play" aria-label="Play audio">
                <span class="ap-icon ap-icon--play">${ICONS.play}</span>
                <span class="ap-icon ap-icon--pause">${ICONS.pause}</span>
            </button>
            <div class="ap-main">
                <div class="ap-top">
                    <span class="ap-title">${ICONS.note}<span>Listen closely…</span></span>
                    <span class="ap-eq" aria-hidden="true">${bars}</span>
                </div>
                <input class="ap-seek" type="range" min="0" max="1000" step="1" value="0" aria-label="Seek audio">
                <div class="ap-time"><span class="ap-cur">0:00</span><span class="ap-dur">0:00</span></div>
            </div>
            <button type="button" class="ap-restart" aria-label="Restart clip">${ICONS.restart}</button>`;

        const audio = document.createElement('audio');
        audio.preload = 'metadata';
        audio.src = src;
        wrap.appendChild(audio);

        const playBtn = wrap.querySelector('.ap-play');
        const seek = wrap.querySelector('.ap-seek');
        const cur = wrap.querySelector('.ap-cur');
        const dur = wrap.querySelector('.ap-dur');
        const range = applyClip(audio, clip);
        let seeking = false;

        const sync = () => {
            const r = range();
            const pos = Math.min(Math.max(audio.currentTime - r.start, 0), r.length);
            if (!seeking) seek.value = r.length ? Math.round((pos / r.length) * 1000) : 0;
            seek.style.setProperty('--p', `${seek.value / 10}%`);
            cur.textContent = fmtTime(pos);
            dur.textContent = fmtTime(r.length);
        };

        audio.addEventListener('loadedmetadata', sync);
        audio.addEventListener('timeupdate', sync);
        audio.addEventListener('play', () => {
            wrap.dataset.state = 'playing';
            playBtn.setAttribute('aria-label', 'Pause audio');
        });
        audio.addEventListener('pause', () => {
            wrap.dataset.state = 'paused';
            playBtn.setAttribute('aria-label', 'Play audio');
        });
        audio.addEventListener('error', () => {
            wrap.classList.add('is-error');
            wrap.querySelector('.ap-title span').textContent = `Audio not found: ${src}`;
            playBtn.disabled = true;
        });

        playBtn.addEventListener('click', () => (audio.paused ? audio.play().catch(() => {}) : audio.pause()));
        wrap.querySelector('.ap-restart').addEventListener('click', () => {
            audio.currentTime = range().start;
            audio.play().catch(() => {});
        });
        seek.addEventListener('input', () => {
            seeking = true;
            const r = range();
            audio.currentTime = r.start + (seek.value / 1000) * r.length;
            seek.style.setProperty('--p', `${seek.value / 10}%`);
        });
        seek.addEventListener('change', () => { seeking = false; });

        return wrap;
    }

    function buildVideo(src, clip, poster) {
        const frame = el('div', 'video-frame');
        const video = document.createElement('video');
        video.controls = true;
        video.playsInline = true;
        video.preload = 'metadata';
        if (poster) video.poster = poster;
        video.src = src;
        applyClip(video, clip);
        video.addEventListener('error', () => frame.replaceWith(errorNote(`Video not found: ${src}`)));
        frame.appendChild(video);
        return frame;
    }

    function youTubeId(url) {
        try {
            const u = new URL(url);
            if (u.hostname.includes('youtu.be')) return u.pathname.slice(1).split('/')[0];
            if (u.searchParams.get('v')) return u.searchParams.get('v');
            const m = u.pathname.match(/\/(embed|shorts|live|v)\/([\w-]{6,})/);
            return m ? m[2] : null;
        } catch {
            return /^[\w-]{11}$/.test(url) ? url : null;
        }
    }

    function buildYouTube(url, clip) {
        const id = youTubeId(url);
        if (!id) return errorNote(`Couldn't read YouTube link: ${url}`);
        const params = new URLSearchParams({ rel: '0', modestbranding: '1', playsinline: '1' });
        const start = toSeconds(clip.start);
        const end = toSeconds(clip.end);
        if (start) params.set('start', Math.floor(start));
        if (end) params.set('end', Math.ceil(end));
        const wrap = el('div', 'media-embed');
        const frame = el('div', 'video-frame');
        const iframe = document.createElement('iframe');
        iframe.src = `https://www.youtube-nocookie.com/embed/${id}?${params}`;
        iframe.title = 'YouTube video';
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen';
        iframe.referrerPolicy = 'strict-origin-when-cross-origin';
        iframe.allowFullscreen = true;
        frame.appendChild(iframe);
        wrap.appendChild(frame);
        if (location.protocol === 'file:') {
            wrap.appendChild(errorNote('YouTube needs the game served over http — run: python3 -m http.server 8000', 'media-note'));
        }
        return wrap;
    }

    function buildEmbed(url) {
        const isAudio = /spotify|soundcloud|music/i.test(url);
        const frame = el('div', isAudio ? 'embed-frame embed-frame--audio' : 'video-frame');
        const iframe = document.createElement('iframe');
        iframe.src = url;
        iframe.title = isAudio ? 'Audio player' : 'Embedded video';
        iframe.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
        iframe.allowFullscreen = true;
        iframe.loading = 'eager';
        frame.appendChild(iframe);
        return frame;
    }

    function errorNote(text, className = 'media-error') {
        const p = el('p', className);
        p.textContent = text;
        return p;
    }

    /**
     * Render media for the question or answer into a slot.
     * @returns {boolean} true when anything was rendered
     */
    function render(slot, data, which, altText) {
        clear(slot);
        const f = FIELDS[which];
        const clip = { start: data[f.start], end: data[f.end] };
        const nodes = [];
        if (data[f.image]) nodes.push(buildImage(data[f.image], altText));
        if (data[f.audio]) nodes.push(buildAudio(data[f.audio], clip));
        if (data[f.video]) nodes.push(buildVideo(data[f.video], clip, which === 'question' ? data.poster : data.answerPoster));
        if (data[f.youtube]) nodes.push(buildYouTube(data[f.youtube], clip));
        if (data[f.embed]) nodes.push(buildEmbed(data[f.embed]));
        nodes.forEach((n) => slot.appendChild(n));
        return nodes.length > 0;
    }

    /** Stop everything inside a container (pauses media, tears down iframes). */
    function clear(slot) {
        if (!slot) return;
        slot.querySelectorAll('audio, video').forEach((m) => {
            m.pause();
            m.removeAttribute('src');
            m.load();
        });
        slot.innerHTML = '';
    }

    function pauseAll(root) {
        root.querySelectorAll('audio, video').forEach((m) => m.pause());
    }

    /** Toggle the first playable <audio>/<video> inside root (keyboard shortcut). */
    function togglePrimary(root) {
        const media = [...root.querySelectorAll('audio, video')].find((m) => m.offsetParent !== null || m.tagName === 'AUDIO');
        if (!media) return false;
        if (media.paused) media.play().catch(() => {});
        else media.pause();
        return true;
    }

    /** Only one clip plays at a time inside root. */
    function exclusivePlayback(root) {
        root.addEventListener('play', (e) => {
            root.querySelectorAll('audio, video').forEach((m) => {
                if (m !== e.target) m.pause();
            });
        }, true);
    }

    window.JeopardyMedia = { render, clear, pauseAll, togglePrimary, exclusivePlayback, kindsFor, isWide, ICONS };
})();
