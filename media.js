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
        const isAudio = Boolean(data[f.audio] || data.isAudio || data.audioOnly || /beat|song|track/i.test(data.question || ''));
        if (data[f.image]) kinds.add('image');
        if (isAudio) kinds.add('audio');
        if (data[f.video] || (data[f.youtube] && !isAudio)) kinds.add('video');
        if (data[f.embed]) kinds.add(/spotify|soundcloud|music/i.test(data[f.embed]) ? 'audio' : 'video');
        return kinds;
    }

    function isWide(data) {
        if (!data || data.isAudio || data.audioOnly || /beat|song|track/i.test(data?.question || '')) return false;
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
        const wrap = el('div', 'media-video-wrap');
        wrap.dataset.state = 'playing';

        const frameBox = el('div', 'media-video-frame-box');
        const frame = el('div', 'video-frame');
        const video = document.createElement('video');
        video.controls = true;
        video.playsInline = true;
        video.preload = 'metadata';
        if (poster) video.poster = poster;
        video.src = src;
        frame.appendChild(video);
        frameBox.appendChild(frame);

        const playingBar = el('div', 'video-playing-bar');
        playingBar.innerHTML = `
            <span class="video-playing-indicator">
                <span class="playing-dot" aria-hidden="true"></span>
                <span>Scene Clip Playing</span>
            </span>
            <button type="button" class="btn-video-quick-replay" title="Restart clip from start">
                <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
                    <path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4.5h4.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span>Restart</span>
            </button>
        `;
        frameBox.appendChild(playingBar);
        wrap.appendChild(frameBox);

        const replayCard = el('div', 'video-replay-card');
        replayCard.innerHTML = `
            <div class="video-replay-pill">
                <span class="replay-pill-dot" aria-hidden="true"></span>
                <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2">
                    <rect x="3" y="5" width="18" height="14" rx="3"/>
                    <path d="M10 9.2v5.6l4.6-2.8L10 9.2Z" fill="currentColor"/>
                </svg>
                <span>Scene Finished</span>
            </div>
            <h4 class="video-replay-title">Ready to guess the Bollywood movie?</h4>
            <p class="video-replay-desc">Scene clip played. Need another look at the characters?</p>
            <button type="button" class="btn-replay-clip" aria-label="Play clip again">
                <svg class="btn-replay-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                    <path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4.5h4.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span>Play Clip Again</span>
            </button>
            <p class="video-replay-hint">Tip: Press <kbd class="kbd-badge">P</kbd> or <kbd class="kbd-badge">R</kbd> anytime to replay</p>
            <span class="sr-only sr-replay-status" role="status" aria-atomic="true"></span>
        `;
        wrap.appendChild(replayCard);

        const replayBtn = replayCard.querySelector('.btn-replay-clip');
        const quickReplayBtn = playingBar.querySelector('.btn-video-quick-replay');
        const start = toSeconds(clip.start);
        const end = toSeconds(clip.end);

        const triggerEnd = () => {
            video.pause();
            wrap.dataset.state = 'ended';
            const srStatus = wrap.querySelector('.sr-replay-status');
            if (srStatus) srStatus.textContent = 'Clip ended. Replay button available.';
        };

        const replay = () => {
            wrap.dataset.state = 'playing';
            video.currentTime = start;
            video.play().catch(() => {});
        };

        replayBtn.addEventListener('click', replay);
        quickReplayBtn.addEventListener('click', replay);

        video.addEventListener('loadedmetadata', () => {
            if (start) video.currentTime = start;
        });

        video.addEventListener('ended', triggerEnd);

        if (end) {
            video.addEventListener('timeupdate', () => {
                if (video.currentTime >= end) {
                    video.currentTime = end;
                    triggerEnd();
                }
            });
        }

        video.addEventListener('error', () => frame.replaceWith(errorNote(`Video not found: ${src}`)));

        return wrap;
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

    function buildVideoEmbed(id, params, start, end) {
        const wrap = el('div', 'media-video-wrap');
        wrap.dataset.state = 'playing';

        const frameBox = el('div', 'media-video-frame-box');
        const frame = el('div', 'video-frame');
        const iframe = document.createElement('iframe');
        iframe.src = `https://www.youtube.com/embed/${id}?${params}`;
        iframe.title = 'Scene clip';
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen';
        iframe.referrerPolicy = 'strict-origin-when-cross-origin';
        iframe.allowFullscreen = true;
        frame.appendChild(iframe);
        frameBox.appendChild(frame);

        // Optional quick replay during playback
        const playingBar = el('div', 'video-playing-bar');
        playingBar.innerHTML = `
            <span class="video-playing-indicator">
                <span class="playing-dot" aria-hidden="true"></span>
                <span>Scene Clip Playing</span>
            </span>
            <button type="button" class="btn-video-quick-replay" title="Restart clip from start">
                <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
                    <path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4.5h4.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span>Restart</span>
            </button>
        `;
        frameBox.appendChild(playingBar);
        wrap.appendChild(frameBox);

        // Replay Screen after clip has played
        const replayCard = el('div', 'video-replay-card');
        replayCard.innerHTML = `
            <div class="video-replay-pill">
                <span class="replay-pill-dot" aria-hidden="true"></span>
                <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2">
                    <rect x="3" y="5" width="18" height="14" rx="3"/>
                    <path d="M10 9.2v5.6l4.6-2.8L10 9.2Z" fill="currentColor"/>
                </svg>
                <span>Scene Finished</span>
            </div>
            <h4 class="video-replay-title">Ready to guess the Bollywood movie?</h4>
            <p class="video-replay-desc">Scene clip played. Need another look at the characters?</p>
            <button type="button" class="btn-replay-clip" aria-label="Play clip again">
                <svg class="btn-replay-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                    <path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4.5h4.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span>Play Clip Again</span>
            </button>
            <p class="video-replay-hint">Tip: Press <kbd class="kbd-badge">P</kbd> or <kbd class="kbd-badge">R</kbd> anytime to replay</p>
            <span class="sr-only sr-replay-status" role="status" aria-atomic="true"></span>
        `;
        wrap.appendChild(replayCard);

        if (location.protocol === 'file:') {
            wrap.appendChild(errorNote('YouTube needs the game served over http — run: python3 -m http.server 8000', 'media-note'));
        }

        const replayBtn = replayCard.querySelector('.btn-replay-clip');
        const quickReplayBtn = playingBar.querySelector('.btn-video-quick-replay');
        const clipLength = (end > start) ? (end - start) : 0;
        let watchdogTimer = null;
        let hasStarted = false;
        let isAwaitingPlay = false;

        const sendCmd = (func, args = []) => {
            try {
                iframe.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args }), '*');
            } catch {}
        };

        const registerListening = () => {
            try {
                iframe.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: 1 }), '*');
            } catch {}
        };

        const triggerEnd = () => {
            if (wrap.dataset.state === 'ended') return;
            if (watchdogTimer) {
                clearTimeout(watchdogTimer);
                watchdogTimer = null;
            }
            sendCmd('pauseVideo');
            wrap.dataset.state = 'ended';
            const srStatus = wrap.querySelector('.sr-replay-status');
            if (srStatus) srStatus.textContent = 'Clip ended. Replay button available.';
        };

        const startWatchdog = () => {
            if (watchdogTimer) clearTimeout(watchdogTimer);
            if (clipLength > 0) {
                watchdogTimer = setTimeout(triggerEnd, (clipLength + 0.35) * 1000);
            }
        };

        const replay = () => {
            if (watchdogTimer) clearTimeout(watchdogTimer);
            wrap.dataset.state = 'playing';
            isAwaitingPlay = true;
            sendCmd('seekTo', [start, true]);
            sendCmd('playVideo');
            startWatchdog();
        };

        replayBtn.addEventListener('click', replay);
        quickReplayBtn.addEventListener('click', replay);

        iframe.addEventListener('load', () => {
            registerListening();
            sendCmd('playVideo');
        });
        setTimeout(registerListening, 300);
        setTimeout(registerListening, 800);
        setTimeout(registerListening, 1500);

        const onMessage = (e) => {
            if (e.source !== iframe.contentWindow) return;
            let msg;
            try { msg = typeof e.data === 'string' ? JSON.parse(e.data) : e.data; } catch { return; }
            if (!msg) return;

            let state = null;
            let curTime = null;

            if (msg.event === 'onStateChange') {
                state = msg.info;
            } else if (msg.event === 'infoDelivery' && msg.info) {
                if (typeof msg.info.playerState !== 'undefined') state = msg.info.playerState;
                if (typeof msg.info.currentTime === 'number') curTime = msg.info.currentTime;
            }

            // state: 1 = PLAYING
            if (state === 1) {
                if (!hasStarted || isAwaitingPlay) {
                    hasStarted = true;
                    isAwaitingPlay = false;
                    wrap.dataset.state = 'playing';
                    startWatchdog();
                }
            }

            // state: 0 = ENDED
            if (state === 0) {
                triggerEnd();
            }

            // state: 2 = PAUSED after reaching end
            if (state === 2 && curTime != null && end && curTime >= end - 0.4) {
                triggerEnd();
            }

            // curTime reached end
            if (curTime != null && end && curTime >= end - 0.25) {
                triggerEnd();
            }
        };

        window.addEventListener('message', onMessage);

        wrap.dataset.cleanup = 'true';
        wrap._cleanup = () => {
            if (watchdogTimer) clearTimeout(watchdogTimer);
            window.removeEventListener('message', onMessage);
        };

        return wrap;
    }

    function buildYouTube(url, clip, data, which, altText) {
        const id = youTubeId(url);
        if (!id) return errorNote(`Couldn't read YouTube link: ${url}`);
        const params = new URLSearchParams({
            rel: '0',
            modestbranding: '1',
            playsinline: '1',
            autoplay: '1',
            enablejsapi: '1',
            iv_load_policy: '3',
            fs: '0',
            disablekb: '1'
        });
        const origin = (location.protocol === 'http:' || location.protocol === 'https:') ? location.origin : '';
        if (origin) params.set('origin', origin);

        const start = toSeconds(clip.start);
        const end = toSeconds(clip.end);
        if (start) params.set('start', Math.floor(start));
        if (end) params.set('end', Math.ceil(end));

        const catName = document.getElementById('modalCategory')?.textContent || '';
        const isAudioClue = Boolean(data && (data.isAudio || data.audioOnly || /sangeet/i.test(altText || '') || /sangeet/i.test(catName) || /beat|song|track/i.test(data.question || '')));

        if (!isAudioClue) {
            return buildVideoEmbed(id, params, start, end);
        }

        // Dedicated Diwali Music Beat Player for Sangeet clues
        const wrap = el('div', 'yt-music-player');
        wrap.dataset.state = 'buffering';
        wrap.dataset.blind = 'true';

        // Additional performance params to minimize iframe overhead
        params.set('controls', '0');
        params.set('fs', '0');
        params.set('iv_load_policy', '3');
        params.set('disablekb', '1');

        const clipLength = (end > start) ? (end - start) : (end || 8);
        const bars = Array.from({ length: 11 }, (_, i) => `<i style="--b:${i}"></i>`).join('');

        wrap.innerHTML = `
            <div class="yt-music-card">
                <div class="yt-music-header">
                    <span class="yt-music-pill">
                        <span class="yt-music-pill-dot" aria-hidden="true"></span>
                        <span class="yt-music-status-text">Buffering Beat…</span>
                    </span>
                    <span class="yt-music-timer">0:00 / ${fmtTime(clipLength)}</span>
                </div>
                <p class="yt-music-prompt">🎵 Listen closely to the beat!</p>
                <p class="yt-music-subtext">Autoplaying intro beat &bull; Stops automatically before lyrics</p>

                <div class="yt-music-eq" aria-hidden="true">${bars}</div>

                <div class="yt-music-progress-bar" aria-hidden="true">
                    <div class="yt-music-progress-fill"></div>
                </div>

                <div class="yt-music-controls">
                    <button type="button" class="yt-music-btn yt-music-btn--primary yt-music-btn-replay">
                        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4.5h4.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                        Replay Beat
                    </button>
                    <button type="button" class="yt-music-btn yt-music-btn--secondary yt-music-btn-toggle-play">
                        <span class="yt-play-icon">${ICONS.play}</span>
                        <span class="yt-pause-icon">${ICONS.pause}</span>
                        <span class="yt-toggle-label">Loading…</span>
                    </button>
                </div>
            </div>

            <div class="yt-music-video-wrap">
                <iframe src="https://www.youtube.com/embed/${id}?${params}" title="YouTube video audio" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
            </div>
        `;

        if (location.protocol === 'file:') {
            wrap.appendChild(errorNote('YouTube needs the game served over http — run: python3 -m http.server 8000', 'media-note'));
        }

        const iframe = wrap.querySelector('iframe');
        const statusText = wrap.querySelector('.yt-music-status-text');
        const timerEl = wrap.querySelector('.yt-music-timer');
        const progressFill = wrap.querySelector('.yt-music-progress-fill');
        const replayBtn = wrap.querySelector('.yt-music-btn-replay');
        const toggleBtn = wrap.querySelector('.yt-music-btn-toggle-play');
        const toggleLabel = wrap.querySelector('.yt-toggle-label');

        let elapsed = 0;
        let isPlaying = false;
        let ticker = null;
        let hasStartedPlaying = false;

        const sendCmd = (func, args = []) => {
            try {
                iframe.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args }), '*');
            } catch {}
        };

        const registerListening = () => {
            try {
                iframe.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: 1 }), '*');
            } catch {}
        };

        iframe.addEventListener('load', () => {
            registerListening();
            sendCmd('playVideo');
        });
        setTimeout(registerListening, 250);
        setTimeout(registerListening, 650);
        setTimeout(registerListening, 1200);

        const stopPlayback = () => {
            sendCmd('pauseVideo');
            isPlaying = false;
            wrap.dataset.state = 'finished';
            statusText.textContent = 'Beat Finished 🎶';
            toggleLabel.textContent = 'Play';
            progressFill.style.width = '100%';
            timerEl.textContent = `${fmtTime(clipLength)} / ${fmtTime(clipLength)}`;
            stopTicker();
        };

        const startTicker = () => {
            stopTicker();
            ticker = setInterval(() => {
                if (!isPlaying || wrap.dataset.state !== 'playing') return;
                elapsed += 0.1;
                const ratio = Math.min(elapsed / clipLength, 1);
                progressFill.style.width = `${ratio * 100}%`;
                timerEl.textContent = `${fmtTime(Math.min(elapsed, clipLength))} / ${fmtTime(clipLength)}`;
                if (elapsed >= clipLength) {
                    stopPlayback();
                }
            }, 100);
        };

        const stopTicker = () => {
            if (ticker) {
                clearInterval(ticker);
                ticker = null;
            }
        };

        const beginActivePlaying = () => {
            if (wrap.dataset.state === 'finished') return;
            hasStartedPlaying = true;
            isPlaying = true;
            wrap.dataset.state = 'playing';
            statusText.textContent = 'Playing Beat';
            toggleLabel.textContent = 'Pause';
            startTicker();
        };

        // Handle YouTube player state and position messages
        const onMessage = (e) => {
            if (e.source !== iframe.contentWindow) return;
            let msg;
            try { msg = typeof e.data === 'string' ? JSON.parse(e.data) : e.data; } catch { return; }
            if (!msg) return;

            let state = null;
            let curTime = null;

            if (msg.event === 'onStateChange') {
                state = msg.info;
            } else if (msg.event === 'infoDelivery' && msg.info) {
                if (typeof msg.info.playerState !== 'undefined') state = msg.info.playerState;
                if (typeof msg.info.currentTime === 'number') curTime = msg.info.currentTime;
            }

            // Player State: 1 = PLAYING, 2 = PAUSED, 0 = ENDED, 3 = BUFFERING
            if (state === 3) { // BUFFERING: Keep timer paused at 0
                if (wrap.dataset.state !== 'finished' && !hasStartedPlaying) {
                    wrap.dataset.state = 'buffering';
                    statusText.textContent = 'Buffering Beat…';
                    toggleLabel.textContent = 'Loading…';
                    stopTicker();
                }
            } else if (state === 1) { // SOUND IS ACTUALLY PLAYING!
                beginActivePlaying();
            } else if (state === 2) { // PAUSED
                if (wrap.dataset.state !== 'finished') {
                    isPlaying = false;
                    wrap.dataset.state = 'paused';
                    statusText.textContent = 'Beat Paused';
                    toggleLabel.textContent = 'Play';
                    stopTicker();
                }
            } else if (state === 0) { // ENDED
                stopPlayback();
            }

            // Synchronize with exact player position if provided by YouTube
            if (curTime != null && isPlaying && wrap.dataset.state === 'playing') {
                const pos = Math.max(0, curTime - start);
                elapsed = pos;
                const ratio = Math.min(pos / clipLength, 1);
                progressFill.style.width = `${ratio * 100}%`;
                timerEl.textContent = `${fmtTime(Math.min(pos, clipLength))} / ${fmtTime(clipLength)}`;
                if (curTime >= end || pos >= clipLength) {
                    stopPlayback();
                }
            }
        };
        window.addEventListener('message', onMessage);

        // Fallback: If after 3.2s YouTube message wasn't received (e.g. strict origin restrictions),
        // let the player transition so the user can play or hear it
        const fallbackWatchdog = setTimeout(() => {
            if (!hasStartedPlaying && wrap.dataset.state === 'buffering') {
                sendCmd('playVideo');
                beginActivePlaying();
            }
        }, 3200);

        replayBtn.addEventListener('click', () => {
            elapsed = 0;
            isPlaying = true;
            hasStartedPlaying = true;
            wrap.dataset.state = 'playing';
            statusText.textContent = 'Playing Beat';
            toggleLabel.textContent = 'Pause';
            progressFill.style.width = '0%';
            timerEl.textContent = `0:00 / ${fmtTime(clipLength)}`;
            sendCmd('seekTo', [start, true]);
            sendCmd('playVideo');
            startTicker();
        });

        toggleBtn.addEventListener('click', () => {
            if (isPlaying && wrap.dataset.state === 'playing') {
                sendCmd('pauseVideo');
                isPlaying = false;
                wrap.dataset.state = 'paused';
                statusText.textContent = 'Beat Paused';
                toggleLabel.textContent = 'Play';
                stopTicker();
            } else {
                if (elapsed >= clipLength) {
                    elapsed = 0;
                    sendCmd('seekTo', [start, true]);
                }
                sendCmd('playVideo');
                isPlaying = true;
                hasStartedPlaying = true;
                wrap.dataset.state = 'playing';
                statusText.textContent = 'Playing Beat';
                toggleLabel.textContent = 'Pause';
                startTicker();
            }
        });


        wrap.dataset.cleanup = 'true';
        wrap._cleanup = () => {
            clearTimeout(fallbackWatchdog);
            stopTicker();
            window.removeEventListener('message', onMessage);
        };

        return wrap;
    }

    function normalizeEmbedUrl(url) {
        if (!url) return '';
        try {
            const u = new URL(url);
            if (u.hostname.includes('spotify.com') && !u.pathname.startsWith('/embed')) {
                u.pathname = `/embed${u.pathname}`;
                return u.toString();
            }
        } catch {}
        return url;
    }

    function buildEmbed(url) {
        const normalized = normalizeEmbedUrl(url);
        const isAudio = /spotify|soundcloud|music/i.test(normalized);
        const frame = el('div', isAudio ? 'embed-frame embed-frame--audio' : 'video-frame');
        const iframe = document.createElement('iframe');
        iframe.src = normalized;
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
        if (data[f.youtube]) nodes.push(buildYouTube(data[f.youtube], clip, data, which, altText));
        // Never render spoiler embeds (Spotify, song tracks) during the question!
        // Render Spotify / music embeds only on answer reveal so players can listen to the full track after guessing.
        const embedUrl = which === 'answer'
            ? (data[f.embed] || data.answerSpotify || data.spotify)
            : (!data[f.youtube] && !data.isAudio && data[f.embed]);
        if (embedUrl) nodes.push(buildEmbed(embedUrl));
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
        slot.querySelectorAll('iframe').forEach((iframe) => {
            try {
                iframe.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }), '*');
            } catch {}
            iframe.removeAttribute('src');
        });
        slot.querySelectorAll('[data-cleanup]').forEach((el) => {
            if (typeof el._cleanup === 'function') el._cleanup();
        });
        slot.innerHTML = '';
    }

    function pauseAll(root) {
        if (!root) return;
        root.querySelectorAll('audio, video').forEach((m) => m.pause());
        root.querySelectorAll('iframe').forEach((iframe) => {
            try {
                iframe.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }), '*');
            } catch {}
        });
        root.querySelectorAll('.yt-music-player').forEach((p) => {
            p.dataset.state = 'paused';
            const status = p.querySelector('.yt-music-status-text');
            if (status && status.textContent === 'Playing Beat') status.textContent = 'Beat Paused';
            const toggle = p.querySelector('.yt-toggle-label');
            if (toggle) toggle.textContent = 'Play';
        });
    }

    /** Reveal video when answer is shown */
    function onAnswerRevealed(root, data) {
        if (!root) return;
        const ytPlayer = root.querySelector('.yt-music-player');
        if (ytPlayer) {
            ytPlayer.dataset.blind = 'false';
            ytPlayer.classList.add('is-revealed');
            const peekBtn = ytPlayer.querySelector('.yt-music-btn-peek');
            if (peekBtn) peekBtn.hidden = true;
            const statusText = ytPlayer.querySelector('.yt-music-status-text');
            if (statusText) statusText.textContent = 'Answer Revealed 🎵';
            const subtext = ytPlayer.querySelector('.yt-music-subtext');
            if (subtext) subtext.textContent = 'Official track revealed! Click below to jam to the full song with lyrics!';
            let fullBtn = ytPlayer.querySelector('.yt-music-btn-full');
            if (!fullBtn) {
                fullBtn = document.createElement('button');
                fullBtn.type = 'button';
                fullBtn.className = 'yt-music-btn yt-music-btn--primary yt-music-btn-full';
                fullBtn.innerHTML = '▶ Play Full Song with Lyrics';
                const iframe = ytPlayer.querySelector('iframe');
                fullBtn.addEventListener('click', () => {
                    if (iframe && iframe.contentWindow) {
                        iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'seekTo', args: [0, true] }), '*');
                        iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: [] }), '*');
                    }
                    ytPlayer.dataset.state = 'playing';
                    if (statusText) statusText.textContent = 'Playing Full Song 🎶';
                });
                ytPlayer.querySelector('.yt-music-controls')?.prepend(fullBtn);
            }
        }
    }

    /** Toggle the first playable media inside root (keyboard shortcut). */
    function togglePrimary(root) {
        if (!root) return false;
        const replayBtn = root.querySelector('.btn-replay-clip');
        if (replayBtn && root.querySelector('.media-video-wrap[data-state="ended"]')) {
            replayBtn.click();
            return true;
        }
        const media = [...root.querySelectorAll('audio, video')].find((m) => m.offsetParent !== null || m.tagName === 'AUDIO');
        if (media) {
            if (media.paused) media.play().catch(() => {});
            else media.pause();
            return true;
        }
        const ytToggle = root.querySelector('.yt-music-btn-toggle-play');
        if (ytToggle) {
            ytToggle.click();
            return true;
        }
        return false;
    }

    /** Only one clip plays at a time inside root. */
    function exclusivePlayback(root) {
        root.addEventListener('play', (e) => {
            root.querySelectorAll('audio, video').forEach((m) => {
                if (m !== e.target) m.pause();
            });
        }, true);
    }

    window.JeopardyMedia = { render, clear, pauseAll, togglePrimary, exclusivePlayback, kindsFor, isWide, ICONS, onAnswerRevealed };
})();
