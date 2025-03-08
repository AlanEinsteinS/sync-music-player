const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

// Controlador de salas
const RoomController = require('./controllers/roomController');

// Configuração da aplicação
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// Rotas API
app.use('/api', require('./routes/api'));

// Rota principal para servir o aplicativo
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Inicializar o controlador de salas
const roomController = new RoomController();

// Configuração de Socket.io
io.on('connection', (socket) => {
    console.log('Novo cliente conectado:', socket.id);
    
    // Criar uma nova sala
    socket.on('room:create', async (data) => {
        try {
            const username = data.username || 'Anônimo';
            const roomId = uuidv4().substring(0, 8); // ID curto e legível
            
            // Criar sala no controlador
            await roomController.createRoom(roomId, socket.id, username);
            
            // Juntar-se à sala
            socket.join(roomId);
            
            // Emitir evento de sala criada
            socket.emit('room:created', { 
                roomId, 
                playlist: [], 
                loopMode: 'no-loop' 
            });
            
            console.log(`Sala criada: ${roomId} por ${username}`);
        } catch (error) {
            console.error('Erro ao criar sala:', error);
            socket.emit('error', { message: 'Erro ao criar sala' });
        }
    });
    
    // Entrar em uma sala existente
    socket.on('room:join', async (data) => {
        try {
            const { roomId, username } = data;
            
            // Verificar se a sala existe
            const room = await roomController.getRoom(roomId);
            if (!room) {
                socket.emit('error', { message: 'Sala não encontrada' });
                return;
            }
            
            // Adicionar usuário à sala
            await roomController.addUserToRoom(roomId, socket.id, username || 'Anônimo');
            
            // Juntar-se à sala
            socket.join(roomId);
            
            // Emitir evento de sala unida
            socket.emit('room:joined', {
                roomId,
                playlist: room.playlist,
                loopMode: room.loopMode
            });
            
            // Notificar outros usuários na sala
            socket.to(roomId).emit('user:joined', {
                username: username || 'Anônimo'
            });
            
            console.log(`Usuário ${username} entrou na sala ${roomId}`);
        } catch (error) {
            console.error('Erro ao entrar na sala:', error);
            socket.emit('error', { message: 'Erro ao entrar na sala' });
        }
    });
    
    // Adicionar música à playlist
    socket.on('playlist:add', async (data) => {
        try {
            const { roomId, track } = data;
            
            // Verificar se a sala existe
            const room = await roomController.getRoom(roomId);
            if (!room) {
                socket.emit('error', { message: 'Sala não encontrada' });
                return;
            }
            
            // Adicionar faixa à playlist
            await roomController.addTrackToPlaylist(roomId, track);
            
            // Obter playlist atualizada
            const updatedRoom = await roomController.getRoom(roomId);
            
            // Emitir evento de playlist atualizada para todos na sala
            io.to(roomId).emit('playlist:update', {
                playlist: updatedRoom.playlist
            });
            
            console.log(`Música adicionada à sala ${roomId}: ${track.title}`);
        } catch (error) {
            console.error('Erro ao adicionar música:', error);
            socket.emit('error', { message: 'Erro ao adicionar música' });
        }
    });
    
    // Remover música da playlist
    socket.on('playlist:remove', async (data) => {
        try {
            const { roomId, trackId } = data;
            
            // Verificar se a sala existe
            const room = await roomController.getRoom(roomId);
            if (!room) {
                socket.emit('error', { message: 'Sala não encontrada' });
                return;
            }
            
            // Remover faixa da playlist
            await roomController.removeTrackFromPlaylist(roomId, trackId);
            
            // Obter playlist atualizada
            const updatedRoom = await roomController.getRoom(roomId);
            
            // Emitir evento de playlist atualizada para todos na sala
            io.to(roomId).emit('playlist:update', {
                playlist: updatedRoom.playlist
            });
            
            console.log(`Música removida da sala ${roomId}: ${trackId}`);
        } catch (error) {
            console.error('Erro ao remover música:', error);
            socket.emit('error', { message: 'Erro ao remover música' });
        }
    });
    
    // Reproduzir uma faixa específica
    socket.on('player:play', async (data) => {
        try {
            const { roomId, trackId } = data;
            
            // Verificar se a sala existe
            const room = await roomController.getRoom(roomId);
            if (!room) {
                socket.emit('error', { message: 'Sala não encontrada' });
                return;
            }
            
            // Atualizar a faixa atual na sala
            await roomController.setCurrentTrack(roomId, trackId);
            
            // Emitir evento para todos na sala
            io.to(roomId).emit('player:play', {
                trackId,
                currentTime: 0
            });
            
            console.log(`Reproduzindo faixa ${trackId} na sala ${roomId}`);
        } catch (error) {
            console.error('Erro ao reproduzir faixa:', error);
            socket.emit('error', { message: 'Erro ao reproduzir faixa' });
        }
    });
    
    // Pausar a reprodução
    socket.on('player:pause', async (data) => {
        try {
            const { roomId } = data;
            
            // Verificar se a sala existe
            const room = await roomController.getRoom(roomId);
            if (!room) {
                socket.emit('error', { message: 'Sala não encontrada' });
                return;
            }
            
            // Emitir evento para todos na sala
            io.to(roomId).emit('player:pause');
            
            console.log(`Reprodução pausada na sala ${roomId}`);
        } catch (error) {
            console.error('Erro ao pausar reprodução:', error);
            socket.emit('error', { message: 'Erro ao pausar reprodução' });
        }
    });
    
    // Retomar a reprodução
    socket.on('player:resume', async (data) => {
        try {
            const { roomId, currentTime } = data;
            
            // Verificar se a sala existe
            const room = await roomController.getRoom(roomId);
            if (!room) {
                socket.emit('error', { message: 'Sala não encontrada' });
                return;
            }
            
            // Emitir evento para todos na sala
            io.to(roomId).emit('player:resume', {
                currentTime: currentTime || 0
            });
            
            console.log(`Reprodução resumida na sala ${roomId}`);
        } catch (error) {
            console.error('Erro ao retomar reprodução:', error);
            socket.emit('error', { message: 'Erro ao retomar reprodução' });
        }
    });
    
    // Avançar para a próxima faixa
    socket.on('player:next', async (data) => {
        try {
            const { roomId } = data;
            
            // Verificar se a sala existe
            const room = await roomController.getRoom(roomId);
            if (!room) {
                socket.emit('error', { message: 'Sala não encontrada' });
                return;
            }
            
            // Encontrar a próxima faixa
            const currentTrackIndex = room.playlist.findIndex(track => track.id === room.currentTrackId);
            let nextIndex;
            
            if (room.loopMode === 'playlist-loop') {
                nextIndex = (currentTrackIndex + 1) % room.playlist.length;
            } else {
                nextIndex = currentTrackIndex + 1;
            }
            
            if (nextIndex < room.playlist.length) {
                const nextTrackId = room.playlist[nextIndex].id;
                
                // Atualizar a faixa atual na sala
                await roomController.setCurrentTrack(roomId, nextTrackId);
                
                // Emitir evento para todos na sala
                io.to(roomId).emit('player:play', {
                    trackId: nextTrackId,
                    currentTime: 0
                });
                
                console.log(`Avançou para a próxima faixa na sala ${roomId}`);
            } else {
                console.log(`Não há próxima faixa na sala ${roomId}`);
            }
        } catch (error) {
            console.error('Erro ao avançar para a próxima faixa:', error);
            socket.emit('error', { message: 'Erro ao avançar para a próxima faixa' });
        }
    });
    
    // Voltar para a faixa anterior
    socket.on('player:prev', async (data) => {
        try {
            const { roomId } = data;
            
            // Verificar se a sala existe
            const room = await roomController.getRoom(roomId);
            if (!room) {
                socket.emit('error', { message: 'Sala não encontrada' });
                return;
            }
            
            // Encontrar a faixa anterior
            const currentTrackIndex = room.playlist.findIndex(track => track.id === room.currentTrackId);
            let prevIndex;
            
            if (room.loopMode === 'playlist-loop' && currentTrackIndex === 0) {
                prevIndex = room.playlist.length - 1;
            } else {
                prevIndex = currentTrackIndex - 1;
            }
            
            if (prevIndex >= 0) {
                const prevTrackId = room.playlist[prevIndex].id;
                
                // Atualizar a faixa atual na sala
                await roomController.setCurrentTrack(roomId, prevTrackId);
                
                // Emitir evento para todos na sala
                io.to(roomId).emit('player:play', {
                    trackId: prevTrackId,
                    currentTime: 0
                });
                
                console.log(`Voltou para a faixa anterior na sala ${roomId}`);
            } else {
                console.log(`Não há faixa anterior na sala ${roomId}`);
            }
        } catch (error) {
            console.error('Erro ao voltar para a faixa anterior:', error);
            socket.emit('error', { message: 'Erro ao voltar para a faixa anterior' });
        }
    });
    
    // Alterar posição da música (seek)
    socket.on('player:seek', async (data) => {
        try {
            const { roomId, time } = data;
            
            // Verificar se a sala existe
            const room = await roomController.getRoom(roomId);
            if (!room) {
                socket.emit('error', { message: 'Sala não encontrada' });
                return;
            }
            
            // Emitir evento para todos na sala
            io.to(roomId).emit('player:seek', {
                time: time
            });
            
            console.log(`Seek para ${time}s na sala ${roomId}`);
        } catch (error) {
            console.error('Erro ao alterar posição da música:', error);
            socket.emit('error', { message: 'Erro ao alterar posição da música' });
        }
    });
    
    // Alterar volume (local, sem sincronização)
    socket.on('player:volume', async (data) => {
        try {
            const { roomId, volume } = data;
            
            // Verificar se a sala existe
            const room = await roomController.getRoom(roomId);
            if (!room) {
                socket.emit('error', { message: 'Sala não encontrada' });
                return;
            }
            
            // Emitir evento para o próprio usuário (sem sincronização)
            socket.emit('player:volume', {
                volume: volume
            });
            
            console.log(`Volume alterado para ${volume} na sala ${roomId}`);
        } catch (error) {
            console.error('Erro ao alterar volume:', error);
            socket.emit('error', { message: 'Erro ao alterar volume' });
        }
    });
    
    // Alterar modo de loop
    socket.on('player:loop', async (data) => {
        try {
            const { roomId, mode } = data;
            
            // Verificar se a sala existe
            const room = await roomController.getRoom(roomId);
            if (!room) {
                socket.emit('error', { message: 'Sala não encontrada' });
                return;
            }
            
            // Atualizar modo de loop na sala
            await roomController.setLoopMode(roomId, mode);
            
            // Emitir evento para todos na sala
            io.to(roomId).emit('player:loop', {
                mode: mode
            });
            
            console.log(`Modo de loop alterado para ${mode} na sala ${roomId}`);
        } catch (error) {
            console.error('Erro ao alterar modo de loop:', error);
            socket.emit('error', { message: 'Erro ao alterar modo de loop' });
        }
    });
    
    // Enviar mensagem de chat
    socket.on('chat:message', async (data) => {
        try {
            const { roomId, username, message, timestamp } = data;
            
            // Verificar se a sala existe
            const room = await roomController.getRoom(roomId);
            if (!room) {
                socket.emit('error', { message: 'Sala não encontrada' });
                return;
            }
            
            // Emitir evento para todos na sala
            io.to(roomId).emit('chat:message', {
                username,
                message,
                timestamp
            });
            
            console.log(`Mensagem enviada na sala ${roomId} por ${username}`);
        } catch (error) {
            console.error('Erro ao enviar mensagem:', error);
            socket.emit('error', { message: 'Erro ao enviar mensagem' });
        }
    });
    
    // Solicitar sincronização de estado
    socket.on('sync:request', async (data) => {
        try {
            const { roomId } = data;
            
            // Verificar se a sala existe
            const room = await roomController.getRoom(roomId);
            if (!room) {
                socket.emit('error', { message: 'Sala não encontrada' });
                return;
            }
            
            // Emitir solicitação para outros usuários na sala
            socket.to(roomId).emit('sync:request');
            
            console.log(`Sincronização solicitada na sala ${roomId}`);
        } catch (error) {
            console.error('Erro ao solicitar sincronização:', error);
            socket.emit('error', { message: 'Erro ao solicitar sincronização' });
        }
    });
    
    // Enviar resposta de sincronização
    socket.on('sync:response', async (data) => {
        try {
            const { roomId, isPlaying, currentTrackId, currentTime, loopMode } = data;
            
            // Verificar se a sala existe
            const room = await roomController.getRoom(roomId);
            if (!room) {
                socket.emit('error', { message: 'Sala não encontrada' });
                return;
            }
            
            // Emitir resposta para outros usuários na sala
            socket.to(roomId).emit('sync:response', {
                isPlaying,
                currentTrackId,
                currentTime,
                loopMode
            });
            
            console.log(`Resposta de sincronização enviada na sala ${roomId}`);
        } catch (error) {
            console.error('Erro ao enviar resposta de sincronização:', error);
            socket.emit('error', { message: 'Erro ao enviar resposta de sincronização' });
        }
    });
    
    // Desconexão do cliente
    socket.on('disconnect', async () => {
        try {
            // Encontrar salas das quais o usuário é membro
            const rooms = await roomController.getRoomsByUserId(socket.id);
            
            for (const room of rooms) {
                // Obter nome de usuário
                const user = room.users.find(u => u.socketId === socket.id);
                const username = user ? user.username : 'Anônimo';
                
                // Remover usuário da sala
                await roomController.removeUserFromRoom(room.roomId, socket.id);
                
                // Se a sala ainda tiver usuários, notificar que o usuário saiu
                const updatedRoom = await roomController.getRoom(room.roomId);
                
                if (updatedRoom && updatedRoom.users.length > 0) {
                    io.to(room.roomId).emit('user:left', {
                        username: username
                    });
                }
                
                console.log(`Usuário ${username} saiu da sala ${room.roomId}`);
            }
            
            console.log('Cliente desconectado:', socket.id);
        } catch (error) {
            console.error('Erro ao processar desconexão:', error);
        }
    });
});

// Iniciar o servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});

module.exports = server;