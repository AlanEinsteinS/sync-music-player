// Gerenciador de reprodução de mídia
class MediaPlayer {
    constructor() {
        this.currentPlayer = null;
        this.playerType = null; // 'youtube', 'soundcloud', 'local'
        this.currentTrack = null;
        this.playlist = [];
        this.currentIndex = -1;
        this.isPlaying = false;
        this.volume = 70;
        this.loopMode = 'no-loop'; // 'no-loop', 'single-loop', 'playlist-loop'
        
        // Referências aos players
        this.youtubePlayer = null;
        this.soundcloudPlayer = null;
        this.localPlayer = document.getElementById('audio-player');
        
        // Event listeners
        this.onTrackEnd = null;
        this.onTimeUpdate = null;
        this.onStateChange = null;
        
        // YouTube API ready flag
        this.youtubeReady = false;
    }

    // Inicializar players
    init() {
        // Inicializar YouTube Player API
        window.onYouTubeIframeAPIReady = () => {
            this.youtubeReady = true;
            console.log('YouTube API pronta');
        };
        
        // Configurar eventos para o player local
        this.localPlayer.addEventListener('ended', () => {
            if (this.onTrackEnd) this.onTrackEnd();
        });
        
        this.localPlayer.addEventListener('timeupdate', () => {
            if (this.onTimeUpdate) this.onTimeUpdate(this.localPlayer.currentTime);
        });
        
        this.localPlayer.addEventListener('play', () => {
            if (this.onStateChange) this.onStateChange('playing');
        });
        
        this.localPlayer.addEventListener('pause', () => {
            if (this.onStateChange) this.onStateChange('paused');
        });
    }

    // Definir volume (0-100)
    setVolume(volume) {
        this.volume = volume;
        
        if (this.playerType === 'youtube' && this.youtubePlayer) {
            this.youtubePlayer.setVolume(volume);
        } else if (this.playerType === 'soundcloud' && this.soundcloudPlayer) {
            this.soundcloudPlayer.setVolume(volume / 100);
        } else if (this.playerType === 'local' && this.localPlayer) {
            this.localPlayer.volume = volume / 100;
        }
    }

    // Definir modo de loop
    setLoopMode(mode) {
        this.loopMode = mode;
        
        if (this.playerType === 'local') {
            this.localPlayer.loop = (mode === 'single-loop');
        }
    }

    // Carregar playlist
    loadPlaylist(playlist) {
        this.playlist = playlist;
    }

    // Carregar uma faixa específica
    loadTrack(track, autoplay = true) {
        this.currentTrack = track;
        this.cleanupCurrentPlayer();
        
        // Determinar o tipo de player com base na URL ou no tipo de mídia
        if (track.source === 'youtube') {
            this.loadYouTubeTrack(track, autoplay);
        } else if (track.source === 'soundcloud') {
            this.loadSoundCloudTrack(track, autoplay);
        } else if (track.source === 'local') {
            this.loadLocalTrack(track, autoplay);
        }
    }

    // Carregar faixa do YouTube
    loadYouTubeTrack(track, autoplay) {
        const playerElement = document.getElementById('player-frame');
        playerElement.innerHTML = '';
        
        const youtubeContainer = document.createElement('div');
        youtubeContainer.id = 'youtube-player';
        playerElement.appendChild(youtubeContainer);
        
        // Esconder player local
        document.getElementById('local-player').style.display = 'none';
        
        const videoId = this.extractYouTubeId(track.url);
        
        if (!videoId) {
            console.error('ID inválido do YouTube');
            return;
        }
        
        if (this.youtubeReady) {
            this.initYouTubePlayer(videoId, autoplay);
        } else {
            // Aguardar até que a API do YouTube esteja pronta
            const checkYouTubeReady = setInterval(() => {
                if (this.youtubeReady) {
                    clearInterval(checkYouTubeReady);
                    this.initYouTubePlayer(videoId, autoplay);
                }
            }, 100);
        }
    }

    // Inicializar player do YouTube
    initYouTubePlayer(videoId, autoplay) {
        this.youtubePlayer = new YT.Player('youtube-player', {
            height: '100%',
            width: '100%',
            videoId: videoId,
            playerVars: {
                'autoplay': autoplay ? 1 : 0,
                'controls': 0,
                'showinfo': 0,
                'rel': 0,
                'iv_load_policy': 3,
                'modestbranding': 1,
                'enablejsapi': 1
            },
            events: {
                'onReady': (event) => {
                    this.playerType = 'youtube';
                    this.setVolume(this.volume);
                    this.isPlaying = autoplay;
                },
                'onStateChange': (event) => {
                    // Estado 0 = terminado, 1 = reproduzindo, 2 = pausado
                    if (event.data === YT.PlayerState.ENDED) {
                        if (this.loopMode === 'single-loop') {
                            this.youtubePlayer.seekTo(0);
                            this.youtubePlayer.playVideo();
                        } else if (this.onTrackEnd) {
                            this.onTrackEnd();
                        }
                    } else if (event.data === YT.PlayerState.PLAYING) {
                        this.isPlaying = true;
                        if (this.onStateChange) this.onStateChange('playing');
                    } else if (event.data === YT.PlayerState.PAUSED) {
                        this.isPlaying = false;
                        if (this.onStateChange) this.onStateChange('paused');
                    }
                },
                'onError': (event) => {
                    console.error('Erro ao reproduzir vídeo do YouTube:', event.data);
                }
            }
        });
    }

    // Carregar faixa do SoundCloud
    loadSoundCloudTrack(track, autoplay) {
        const playerElement = document.getElementById('player-frame');
        playerElement.innerHTML = '';
        
        // Esconder player local
        document.getElementById('local-player').style.display = 'none';
        
        const iframe = document.createElement('iframe');
        iframe.id = 'soundcloud-player';
        iframe.width = '100%';
        iframe.height = '100%';
        iframe.scrolling = 'no';
        iframe.frameborder = 'no';
        iframe.allow = 'autoplay';
        
        // Construir URL do widget SoundCloud
        const url = `https://w.soundcloud.com/player/?url=${encodeURIComponent(track.url)}&auto_play=${autoplay ? 'true' : 'false'}&buying=false&sharing=false&download=false&show_artwork=true&show_comments=false&show_playcount=false&show_user=false&hide_related=true&visual=true&callback=true`;
        
        iframe.src = url;
        playerElement.appendChild(iframe);
        
        // Inicializar API do SoundCloud
        this.soundcloudPlayer = SC.Widget(iframe);
        
        this.soundcloudPlayer.bind(SC.Widget.Events.READY, () => {
            this.playerType = 'soundcloud';
            this.setVolume(this.volume);
            this.isPlaying = autoplay;
        });
        
        this.soundcloudPlayer.bind(SC.Widget.Events.FINISH, () => {
            if (this.loopMode === 'single-loop') {
                this.soundcloudPlayer.seekTo(0);
                this.soundcloudPlayer.play();
            } else if (this.onTrackEnd) {
                this.onTrackEnd();
            }
        });
        
        this.soundcloudPlayer.bind(SC.Widget.Events.PLAY, () => {
            this.isPlaying = true;
            if (this.onStateChange) this.onStateChange('playing');
        });
        
        this.soundcloudPlayer.bind(SC.Widget.Events.PAUSE, () => {
            this.isPlaying = false;
            if (this.onStateChange) this.onStateChange('paused');
        });
        
        // Atualizar o tempo de reprodução periodicamente
        setInterval(() => {
            if (this.playerType === 'soundcloud' && this.isPlaying) {
                this.soundcloudPlayer.getPosition((position) => {
                    if (this.onTimeUpdate) this.onTimeUpdate(position / 1000); // Converter ms para segundos
                });
            }
        }, 1000);
    }

    // Carregar faixa local
    loadLocalTrack(track, autoplay) {
        const playerFrame = document.getElementById('player-frame');
        playerFrame.innerHTML = '';
        
        // Mostrar player local
        const localPlayerContainer = document.getElementById('local-player');
        localPlayerContainer.style.display = 'block';
        
        this.localPlayer.src = track.url;
        
        if (autoplay) {
            this.localPlayer.play()
                .then(() => {
                    this.isPlaying = true;
                })
                .catch(err => {
                    console.error('Erro ao reproduzir arquivo local:', err);
                    this.isPlaying = false;
                });
        }
        
        this.playerType = 'local';
        this.setVolume(this.volume);
        this.localPlayer.loop = (this.loopMode === 'single-loop');
    }

    // Reproduzir
    play() {
        if (this.playerType === 'youtube' && this.youtubePlayer) {
            this.youtubePlayer.playVideo();
        } else if (this.playerType === 'soundcloud' && this.soundcloudPlayer) {
            this.soundcloudPlayer.play();
        } else if (this.playerType === 'local' && this.localPlayer) {
            this.localPlayer.play();
        }
        this.isPlaying = true;
    }

    // Pausar
    pause() {
        if (this.playerType === 'youtube' && this.youtubePlayer) {
            this.youtubePlayer.pauseVideo();
        } else if (this.playerType === 'soundcloud' && this.soundcloudPlayer) {
            this.soundcloudPlayer.pause();
        } else if (this.playerType === 'local' && this.localPlayer) {
            this.localPlayer.pause();
        }
        this.isPlaying = false;
    }

    // Alternar entre reproduzir e pausar
    togglePlay() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    // Avançar para um tempo específico (em segundos)
    seekTo(time) {
        if (this.playerType === 'youtube' && this.youtubePlayer) {
            this.youtubePlayer.seekTo(time, true);
        } else if (this.playerType === 'soundcloud' && this.soundcloudPlayer) {
            this.soundcloudPlayer.seekTo(time * 1000); // SoundCloud usa milissegundos
        } else if (this.playerType === 'local' && this.localPlayer) {
            this.localPlayer.currentTime = time;
        }
    }

    // Obter o tempo atual de reprodução (em segundos)
    getCurrentTime(callback) {
        if (this.playerType === 'youtube' && this.youtubePlayer) {
            const time = this.youtubePlayer.getCurrentTime();
            callback(time);
        } else if (this.playerType === 'soundcloud' && this.soundcloudPlayer) {
            this.soundcloudPlayer.getPosition((position) => {
                callback(position / 1000); // Converter ms para segundos
            });
        } else if (this.playerType === 'local' && this.localPlayer) {
            callback(this.localPlayer.currentTime);
        } else {
            callback(0);
        }
    }

    // Limpar o player atual
    cleanupCurrentPlayer() {
        if (this.playerType === 'youtube' && this.youtubePlayer) {
            this.youtubePlayer.stopVideo();
            this.youtubePlayer.destroy();
            this.youtubePlayer = null;
        } else if (this.playerType === 'soundcloud' && this.soundcloudPlayer) {
            this.soundcloudPlayer.unbindAll();
            this.soundcloudPlayer = null;
        } else if (this.playerType === 'local' && this.localPlayer) {
            this.localPlayer.pause();
            this.localPlayer.src = '';
        }
        
        this.playerType = null;
    }

    // Extrair ID do vídeo do YouTube a partir da URL
    extractYouTubeId(url) {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    }

    // Carregar faixa por índice da playlist
    loadTrackByIndex(index, autoplay = true) {
        if (index >= 0 && index < this.playlist.length) {
            this.currentIndex = index;
            this.loadTrack(this.playlist[index], autoplay);
            return true;
        }
        return false;
    }

    // Próxima faixa
    nextTrack() {
        let nextIndex;
        
        if (this.loopMode === 'playlist-loop') {
            nextIndex = (this.currentIndex + 1) % this.playlist.length;
        } else {
            nextIndex = this.currentIndex + 1;
        }
        
        if (nextIndex < this.playlist.length) {
            return this.loadTrackByIndex(nextIndex);
        }
        
        return false;
    }

    // Faixa anterior
    prevTrack() {
        let prevIndex;
        
        if (this.loopMode === 'playlist-loop' && this.currentIndex === 0) {
            prevIndex = this.playlist.length - 1;
        } else {
            prevIndex = this.currentIndex - 1;
        }
        
        if (prevIndex >= 0) {
            return this.loadTrackByIndex(prevIndex);
        }
        
        return false;
    }
    
    // Destruir o player e liberar recursos
    destroy() {
        this.cleanupCurrentPlayer();
        this.onTrackEnd = null;
        this.onTimeUpdate = null;
        this.onStateChange = null;
    }
}

// Exportar como uma instância singleton
const mediaPlayer = new MediaPlayer();