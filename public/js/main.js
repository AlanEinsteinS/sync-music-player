// Código principal do aplicativo
document.addEventListener('DOMContentLoaded', () => {
    // Elementos de interface
    const roomIdElement = document.getElementById('room-id');
    const createRoomBtn = document.getElementById('create-room-btn');
    const joinRoomBtn = document.getElementById('join-room-btn');
    const roomCodeInput = document.getElementById('room-code-input');
    
    const playPauseBtn = document.getElementById('play-pause-btn');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const volumeSlider = document.getElementById('volume-slider');
    const loopModeSelect = document.getElementById('loop-mode');
    
    const musicUrlInput = document.getElementById('music-url');
    const addUrlBtn = document.getElementById('add-url-btn');
    const musicFileInput = document.getElementById('music-file');
    const fileNameElement = document.getElementById('file-name');
    const uploadFileBtn = document.getElementById('upload-file-btn');
    
    const playlistElement = document.getElementById('playlist');
    
    const chatMessagesElement = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const sendMessageBtn = document.getElementById('send-message-btn');
    
    // Estado do aplicativo
    let currentRoom = null;
    let playlist = [];
    let currentTrackId = null;
    let isPlaying = false;
    
    // Inicializar Socket.io e Media Player
    const serverUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:3000' 
        : window.location.origin;
    
    socketClient.connect(serverUrl);
    mediaPlayer.init();
    
    // Configurar manejadores de eventos para o socket
    setupSocketHandlers();
    
    // Configurar manejadores de eventos para a interface
    setupUIHandlers();
    
    // Configurar manejadores de eventos para o player
    setupPlayerHandlers();
    
    // Tentar carregar sala da URL se houver
    tryJoinRoomFromUrl();
    
    // Função para configurar manejadores de eventos do socket
    function setupSocketHandlers() {
        socketClient.on('onConnect', () => {
            console.log('Conectado ao servidor');
        });
        
        socketClient.on('onDisconnect', () => {
            console.log('Desconectado do servidor');
            showSystemMessage('Conexão com o servidor perdida. Tentando reconectar...');
        });
        
        socketClient.on('onRoomCreated', (data) => {
            currentRoom = data.roomId;
            roomIdElement.textContent = `Sala: ${currentRoom}`;
            
            // Atualizar URL para incluir o código da sala
            updateUrlWithRoomCode(currentRoom);
            
            showSystemMessage(`Sala criada: ${currentRoom}`);
        });
        
        socketClient.on('onRoomJoined', (data) => {
            currentRoom = data.roomId;
            roomIdElement.textContent = `Sala: ${currentRoom}`;
            
            // Atualizar URL para incluir o código da sala
            updateUrlWithRoomCode(currentRoom);
            
            // Atualizar a playlist se for fornecida
            if (data.playlist) {
                updatePlaylist(data.playlist);
            }
            
            // Atualizar modo de loop se for fornecido
            if (data.loopMode) {
                loopModeSelect.value = data.loopMode;
                mediaPlayer.setLoopMode(data.loopMode);
            }
            
            // Solicitar sincronização para se juntar à reprodução atual
            socketClient.requestSync();
            
            showSystemMessage(`Entrou na sala: ${currentRoom}`);
        });
        
        socketClient.on('onPlaylistUpdate', (data) => {
            updatePlaylist(data.playlist);
        });
        
        socketClient.on('onPlayTrack', (data) => {
            playTrack(data.trackId, data.currentTime || 0);
        });
        
        socketClient.on('onPause', () => {
            mediaPlayer.pause();
            updatePlayPauseButton(false);
        });
        
        socketClient.on('onResume', (data) => {
            mediaPlayer.seekTo(data.currentTime || 0);
            mediaPlayer.play();
            updatePlayPauseButton(true);
        });
        
        socketClient.on('onSeek', (data) => {
            mediaPlayer.seekTo(data.time);
        });
        
        socketClient.on('onVolumeChange', (data) => {
            volumeSlider.value = data.volume;
            mediaPlayer.setVolume(data.volume);
        });
        
        socketClient.on('onLoopChange', (data) => {
            loopModeSelect.value = data.mode;
            mediaPlayer.setLoopMode(data.mode);
        });
        
        socketClient.on('onChatMessage', (data) => {
            addChatMessage(data);
        });
        
        socketClient.on('onUserJoined', (data) => {
            showSystemMessage(`${data.username} entrou na sala.`);
        });
        
        socketClient.on('onUserLeft', (data) => {
            showSystemMessage(`${data.username} saiu da sala.`);
        });
        
        socketClient.on('onSyncRequest', () => {
            // Responder com o estado atual do player
            mediaPlayer.getCurrentTime((currentTime) => {
                socketClient.sendSyncResponse({
                    isPlaying: mediaPlayer.isPlaying,
                    currentTrackId: currentTrackId,
                    currentTime: currentTime,
                    loopMode: mediaPlayer.loopMode
                });
            });
        });
        
        socketClient.on('onSyncResponse', (data) => {
            // Aplicar o estado sincronizado
            if (data.currentTrackId) {
                playTrack(data.currentTrackId, data.currentTime || 0);
                
                if (!data.isPlaying) {
                    setTimeout(() => {
                        mediaPlayer.pause();
                        updatePlayPauseButton(false);
                    }, 100);
                }
            }
            
            if (data.loopMode) {
                loopModeSelect.value = data.loopMode;
                mediaPlayer.setLoopMode(data.loopMode);
            }
        });
        
        socketClient.on('onError', (error) => {
            console.error('Erro do servidor:', error);
            showSystemMessage(`Erro: ${error.message || 'Ocorreu um erro no servidor.'}`);
        });
    }
    
    // Função para configurar manejadores de eventos da interface
    function setupUIHandlers() {
        // Manipuladores para sala
        createRoomBtn.addEventListener('click', () => {
            socketClient.createRoom();
        });
        
        joinRoomBtn.addEventListener('click', () => {
            const roomCode = roomCodeInput.value.trim();
            if (roomCode) {
                socketClient.joinRoom(roomCode);
            } else {
                alert('Por favor, insira um código de sala válido.');
            }
        });
        
        // Manipuladores para controles do player
        playPauseBtn.addEventListener('click', () => {
            if (!currentTrackId && playlist.length > 0) {
                // Se não há música sendo reproduzida, começar a primeira
                socketClient.playTrack(playlist[0].id);
            } else if (mediaPlayer.isPlaying) {
                // Pausar a música atual
                socketClient.pausePlayback();
            } else {
                // Resumir a música atual
                mediaPlayer.getCurrentTime((currentTime) => {
                    socketClient.resumePlayback(currentTime);
                });
            }
        });
        
        prevBtn.addEventListener('click', () => {
            socketClient.prevTrack();
        });
        
        nextBtn.addEventListener('click', () => {
            socketClient.nextTrack();
        });
        
        volumeSlider.addEventListener('input', () => {
            const volume = parseInt(volumeSlider.value);
            mediaPlayer.setVolume(volume);
        });
        
        loopModeSelect.addEventListener('change', () => {
            const mode = loopModeSelect.value;
            socketClient.changeLoopMode(mode);
        });
        
        // Manipuladores para adicionar músicas
        addUrlBtn.addEventListener('click', () => {
            const url = musicUrlInput.value.trim();
            if (url) {
                addTrackFromUrl(url);
                musicUrlInput.value = '';
            } else {
                alert('Por favor, insira uma URL válida.');
            }
        });
        
        musicFileInput.addEventListener('change', () => {
            const file = musicFileInput.files[0];
            if (file) {
                fileNameElement.textContent = file.name;
                uploadFileBtn.disabled = false;
            } else {
                fileNameElement.textContent = 'Nenhum arquivo selecionado';
                uploadFileBtn.disabled = true;
            }
        });
        
        uploadFileBtn.addEventListener('click', () => {
            const file = musicFileInput.files[0];
            if (file) {
                uploadLocalFile(file);
            }
        });
        
        // Manipulador para o chat
        sendMessageBtn.addEventListener('click', () => {
            sendChatMessage();
        });
        
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendChatMessage();
            }
        });
    }
    
    // Função para configurar manejadores de eventos do player
    function setupPlayerHandlers() {
        mediaPlayer.onTrackEnd = () => {
            if (mediaPlayer.loopMode === 'single-loop') {
                // Loop individual é tratado dentro do próprio player
                return;
            } else if (mediaPlayer.loopMode === 'playlist-loop') {
                // Se estamos no final da playlist, voltar para a primeira música
                const currentIndex = playlist.findIndex(track => track.id === currentTrackId);
                if (currentIndex === playlist.length - 1) {
                    socketClient.playTrack(playlist[0].id);
                } else {
                    socketClient.nextTrack();
                }
            } else {
                // Sem loop, apenas avançar para a próxima música, se houver
                socketClient.nextTrack();
            }
        };
        
        mediaPlayer.onStateChange = (state) => {
            updatePlayPauseButton(state === 'playing');
        };
    }
    
    // Função para tentar entrar em uma sala a partir da URL
    function tryJoinRoomFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        const roomParam = urlParams.get('room');
        
        if (roomParam) {
            socketClient.joinRoom(roomParam);
            roomCodeInput.value = roomParam;
        }
    }
    
    // Função para atualizar a URL com o código da sala
    function updateUrlWithRoomCode(roomCode) {
        const url = new URL(window.location.href);
        url.searchParams.set('room', roomCode);
        window.history.replaceState({}, '', url);
    }
    
    // Função para atualizar a playlist na interface
    function updatePlaylist(newPlaylist) {
        playlist = newPlaylist;
        
        // Atualizar o controle de pistas anterior/próxima
        updateNavigationControls();
        
        // Limpar a lista atual
        playlistElement.innerHTML = '';
        
        if (playlist.length === 0) {
            playlistElement.innerHTML = '<li class="empty-playlist">Playlist vazia</li>';
            return;
        }
        
        // Adicionar cada faixa à lista
        playlist.forEach(track => {
            const li = document.createElement('li');
            li.className = 'playlist-item';
            if (track.id === currentTrackId) {
                li.classList.add('current');
            }
            
            li.innerHTML = `
                <div class="music-info">
                    <div class="music-title">${track.title}</div>
                    <div class="music-source">${getSourceLabel(track.source)}</div>
                </div>
                <div class="playlist-controls">
                    <button class="playlist-btn play-btn" data-id="${track.id}">
                        <i class="fas fa-play"></i>
                    </button>
                    <button class="playlist-btn remove-btn" data-id="${track.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            
            playlistElement.appendChild(li);
        });
        
        // Adicionar event listeners para os botões da playlist
        document.querySelectorAll('.play-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const trackId = e.currentTarget.getAttribute('data-id');
                socketClient.playTrack(trackId);
            });
        });
        
        document.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const trackId = e.currentTarget.getAttribute('data-id');
                socketClient.removeFromPlaylist(trackId);
            });
        });
    }
    
    // Função para atualizar os controles de navegação (anterior/próximo)
    function updateNavigationControls() {
        // Se não há playlist ou apenas uma música, desabilitar os controles
        if (playlist.length <= 1) {
            prevBtn.disabled = true;
            nextBtn.disabled = true;
            return;
        }
        
        // Se não há música selecionada, habilitar apenas "próximo"
        if (!currentTrackId) {
            prevBtn.disabled = true;
            nextBtn.disabled = false;
            return;
        }
        
        const currentIndex = playlist.findIndex(track => track.id === currentTrackId);
        
        // Verificar se podemos navegar para anterior/próximo
        if (mediaPlayer.loopMode === 'playlist-loop') {
            // Com loop de playlist, sempre podemos navegar
            prevBtn.disabled = false;
            nextBtn.disabled = false;
        } else {
            // Sem loop, verificar se estamos no início/fim da playlist
            prevBtn.disabled = (currentIndex <= 0);
            nextBtn.disabled = (currentIndex >= playlist.length - 1);
        }
    }
    
    // Função para atualizar o botão de reprodução/pausa
    function updatePlayPauseButton(isPlaying) {
        if (isPlaying) {
            playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
            playPauseBtn.disabled = false;
        } else {
            playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
            playPauseBtn.disabled = (currentTrackId === null && playlist.length === 0);
        }
    }
    
    // Função para reproduzir uma faixa específica
    function playTrack(trackId, startTime = 0) {
        const track = playlist.find(t => t.id === trackId);
        if (!track) return;
        
        currentTrackId = trackId;
        mediaPlayer.loadTrack(track, true);
        
        if (startTime > 0) {
            setTimeout(() => {
                mediaPlayer.seekTo(startTime);
            }, 500);
        }
        
        // Atualizar a interface
        updatePlayPauseButton(true);
        updateNavigationControls();
        updateCurrentTrackHighlight();
    }
    
    // Função para destacar a faixa atual na playlist
    function updateCurrentTrackHighlight() {
        document.querySelectorAll('.playlist-item').forEach(item => {
            item.classList.remove('current');
        });
        
        if (currentTrackId) {
            const currentItem = document.querySelector(`.playlist-item .play-btn[data-id="${currentTrackId}"]`);
            if (currentItem) {
                currentItem.closest('.playlist-item').classList.add('current');
            }
        }
    }
    
    // Função para adicionar uma faixa a partir de uma URL
    function addTrackFromUrl(url) {
        if (!currentRoom) {
            alert('Você precisa entrar ou criar uma sala primeiro.');
            return;
        }
        
        // Determinar o tipo de fonte com base na URL
        let source, title;
        
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
            source = 'youtube';
            title = 'Vídeo do YouTube';
        } else if (url.includes('soundcloud.com')) {
            source = 'soundcloud';
            title = 'Faixa do SoundCloud';
        } else {
            alert('URL não suportada. Por favor, use links do YouTube ou SoundCloud.');
            return;
        }
        
        // Criar objeto de faixa e adicionar à playlist
        const track = {
            id: generateId(),
            title: title,
            url: url,
            source: source
        };
        
        socketClient.addToPlaylist(track);
    }
    
    // Função para fazer upload de um arquivo local
    function uploadLocalFile(file) {
        if (!currentRoom) {
            alert('Você precisa entrar ou criar uma sala primeiro.');
            return;
        }
        
        // Verificar o tipo do arquivo
        if (!file.type.startsWith('audio/')) {
            alert('Por favor, selecione um arquivo de áudio válido.');
            return;
        }
        
        // Criar uma URL local para o arquivo
        const fileUrl = URL.createObjectURL(file);
        
        // Criar objeto de faixa e adicionar à playlist
        const track = {
            id: generateId(),
            title: file.name,
            url: fileUrl,
            source: 'local'
        };
        
        socketClient.addToPlaylist(track);
        
        // Limpar a seleção de arquivo
        musicFileInput.value = '';
        fileNameElement.textContent = 'Nenhum arquivo selecionado';
        uploadFileBtn.disabled = true;
    }
    
    // Função para enviar mensagem de chat
    function sendChatMessage() {
        const message = chatInput.value.trim();
        if (message && currentRoom) {
            socketClient.sendChatMessage(message);
            chatInput.value = '';
        }
    }
    
    // Função para adicionar mensagem ao chat
    function addChatMessage(data) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message';
        
        // Determinar classe com base no remetente
        if (data.username === socketClient.username) {
            messageDiv.classList.add('user-message');
        } else {
            messageDiv.classList.add('other-message');
        }
        
        // Formatar timestamp
        const time = new Date(data.timestamp).toLocaleTimeString();
        
        messageDiv.innerHTML = `
            <div class="message-info">
                <span class="sender-name">${data.username}</span>
                <span class="message-time">${time}</span>
            </div>
            <div class="message-content">${data.message}</div>
        `;
        
        chatMessagesElement.appendChild(messageDiv);
        
        // Rolar para a última mensagem
        chatMessagesElement.scrollTop = chatMessagesElement.scrollHeight;
    }
    
    // Função para mostrar mensagem do sistema
    function showSystemMessage(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'system-message';
        messageDiv.textContent = message;
        
        chatMessagesElement.appendChild(messageDiv);
        
        // Rolar para a última mensagem
        chatMessagesElement.scrollTop = chatMessagesElement.scrollHeight;
    }
    
    // Função para obter rótulo legível da fonte
    function getSourceLabel(source) {
        switch (source) {
            case 'youtube':
                return 'YouTube';
            case 'soundcloud':
                return 'SoundCloud';
            case 'local':
                return 'Arquivo Local';
            default:
                return 'Desconhecido';
        }
    }
    
    // Função para gerar ID único
    function generateId() {
        return 'track_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    }
});