// Gerenciador de conexão Socket.io
class SocketClient {
    constructor() {
        this.socket = null;
        this.roomId = null;
        this.username = 'Usuário_' + Math.floor(Math.random() * 1000);
        this.callbacks = {
            onConnect: () => {},
            onDisconnect: () => {},
            onRoomJoined: () => {},
            onRoomCreated: () => {},
            onPlaylistUpdate: () => {},
            onPlayTrack: () => {},
            onPause: () => {},
            onResume: () => {},
            onSeek: () => {},
            onVolumeChange: () => {},
            onLoopChange: () => {},
            onChatMessage: () => {},
            onUserJoined: () => {},
            onUserLeft: () => {},
            onSyncRequest: () => {},
            onSyncResponse: () => {},
            onError: () => {}
        };
    }

    // Iniciar conexão com o servidor
    connect(serverUrl) {
        this.socket = io(serverUrl);
        
        // Configurar eventos do socket
        this.socket.on('connect', () => {
            console.log('Conectado ao servidor');
            this.callbacks.onConnect();
        });

        this.socket.on('disconnect', () => {
            console.log('Desconectado do servidor');
            this.callbacks.onDisconnect();
        });

        this.socket.on('room:joined', (data) => {
            console.log('Entrou na sala:', data);
            this.roomId = data.roomId;
            this.callbacks.onRoomJoined(data);
        });

        this.socket.on('room:created', (data) => {
            console.log('Sala criada:', data);
            this.roomId = data.roomId;
            this.callbacks.onRoomCreated(data);
        });

        this.socket.on('playlist:update', (data) => {
            console.log('Playlist atualizada:', data);
            this.callbacks.onPlaylistUpdate(data);
        });

        this.socket.on('player:play', (data) => {
            console.log('Tocando faixa:', data);
            this.callbacks.onPlayTrack(data);
        });

        this.socket.on('player:pause', () => {
            console.log('Música pausada');
            this.callbacks.onPause();
        });

        this.socket.on('player:resume', (data) => {
            console.log('Música resumida em:', data);
            this.callbacks.onResume(data);
        });

        this.socket.on('player:seek', (data) => {
            console.log('Seek para:', data);
            this.callbacks.onSeek(data);
        });

        this.socket.on('player:volume', (data) => {
            console.log('Volume alterado para:', data);
            this.callbacks.onVolumeChange(data);
        });

        this.socket.on('player:loop', (data) => {
            console.log('Modo de loop alterado para:', data);
            this.callbacks.onLoopChange(data);
        });

        this.socket.on('chat:message', (data) => {
            console.log('Nova mensagem:', data);
            this.callbacks.onChatMessage(data);
        });

        this.socket.on('user:joined', (data) => {
            console.log('Usuário entrou:', data);
            this.callbacks.onUserJoined(data);
        });

        this.socket.on('user:left', (data) => {
            console.log('Usuário saiu:', data);
            this.callbacks.onUserLeft(data);
        });

        this.socket.on('sync:request', () => {
            console.log('Solicitação de sincronização recebida');
            this.callbacks.onSyncRequest();
        });

        this.socket.on('sync:response', (data) => {
            console.log('Resposta de sincronização:', data);
            this.callbacks.onSyncResponse(data);
        });

        this.socket.on('error', (error) => {
            console.error('Erro:', error);
            this.callbacks.onError(error);
        });
    }

    // Registrar callbacks para eventos
    on(event, callback) {
        if (this.callbacks.hasOwnProperty(event)) {
            this.callbacks[event] = callback;
        } else {
            console.warn(`Evento não suportado: ${event}`);
        }
    }

    // Criar uma nova sala
    createRoom() {
        this.socket.emit('room:create', { username: this.username });
    }

    // Entrar em uma sala existente
    joinRoom(roomId) {
        this.socket.emit('room:join', { roomId, username: this.username });
    }

    // Adicionar música à playlist
    addToPlaylist(track) {
        this.socket.emit('playlist:add', {
            roomId: this.roomId,
            track: track
        });
    }

    // Remover música da playlist
    removeFromPlaylist(trackId) {
        this.socket.emit('playlist:remove', {
            roomId: this.roomId,
            trackId: trackId
        });
    }

    // Reproduzir uma música específica da playlist
    playTrack(trackId) {
        this.socket.emit('player:play', {
            roomId: this.roomId,
            trackId: trackId
        });
    }

    // Pausar a reprodução atual
    pausePlayback() {
        this.socket.emit('player:pause', {
            roomId: this.roomId
        });
    }

    // Retomar a reprodução
    resumePlayback(currentTime) {
        this.socket.emit('player:resume', {
            roomId: this.roomId,
            currentTime: currentTime
        });
    }

    // Avançar para a próxima música
    nextTrack() {
        this.socket.emit('player:next', {
            roomId: this.roomId
        });
    }

    // Voltar para a música anterior
    prevTrack() {
        this.socket.emit('player:prev', {
            roomId: this.roomId
        });
    }

    // Alterar a posição da música atual
    seekTo(time) {
        this.socket.emit('player:seek', {
            roomId: this.roomId,
            time: time
        });
    }

    // Alterar o volume (local, sem sincronização)
    changeVolume(volume) {
        this.socket.emit('player:volume', {
            roomId: this.roomId,
            volume: volume
        });
    }

    // Alterar o modo de loop
    changeLoopMode(mode) {
        this.socket.emit('player:loop', {
            roomId: this.roomId,
            mode: mode
        });
    }

    // Enviar mensagem de chat
    sendChatMessage(message) {
        this.socket.emit('chat:message', {
            roomId: this.roomId,
            username: this.username,
            message: message,
            timestamp: new Date().toISOString()
        });
    }

    // Solicitar sincronização de estado
    requestSync() {
        this.socket.emit('sync:request', {
            roomId: this.roomId
        });
    }

    // Enviar resposta de sincronização
    sendSyncResponse(data) {
        this.socket.emit('sync:response', {
            roomId: this.roomId,
            ...data
        });
    }

    // Desconectar do servidor
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
        }
    }
}

// Exportar como uma instância singleton
const socketClient = new SocketClient();