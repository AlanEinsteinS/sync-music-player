# Reprodutor de Música Sincronizada

Um aplicativo web que permite a reprodução sincronizada de músicas entre vários usuários em uma sala compartilhada.

## Funcionalidades

- Reprodução sincronizada de músicas para todos os usuários na mesma sala
- Suporte para links do YouTube, SoundCloud e arquivos MP3 locais
- Controles de reprodução: play, pause, anterior, próximo
- Modos de loop: desativado, música única, playlist completa
- Chat em tempo real para comunicação entre os usuários
- Criação de salas com códigos compartilháveis
- Sincronização automática para usuários que entram no meio de uma música

## Tecnologias Utilizadas

- **Front-end:** HTML, CSS, JavaScript
- **Back-end:** Node.js, Express
- **Comunicação em Tempo Real:** Socket.io
- **APIs de Mídia:** YouTube Iframe API, SoundCloud Widget API

## Pré-requisitos

- Node.js (v14 ou superior)
- npm (v6 ou superior)

## Instalação

1. Clone o repositório:
   ```
   git clone https://github.com/seu-usuario/sync-music-player.git
   cd sync-music-player
   ```

2. Instale as dependências:
   ```
   npm install
   ```

3. Inicie o servidor:
   ```
   npm start
   ```

4. Abra o navegador e acesse:
   ```
   http://localhost:3000
   ```

## Uso

1. Crie uma nova sala ou entre em uma existente usando o código da sala
2. Adicione músicas do YouTube ou SoundCloud colando o link correspondente
3. Faça upload de arquivos MP3 do seu computador
4. Use os controles para reproduzir, pausar, avançar ou retroceder músicas
5. Selecione o modo de loop desejado no seletor de loop
6. Ajuste o volume conforme necessário
7. Compartilhe o código da sala com seus amigos para que possam entrar
8. Use o chat para conversar com outros usuários na mesma sala

## Contribuição

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues ou pull requests.

## Licença

Este projeto está licenciado sob a Licença MIT.