# C64 Terminal Server

A NestJS server that bridges Twitch chat (via StreamScanner's Pusher service) to Commodore 64 terminals over TCP sockets.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    NestJS Application                        │
├─────────────────────────────────────────────────────────────┤
│  PusherModule          │  C64SocketModule   │  ApiModule    │
│  - WebSocket client    │  - TCP server      │  - REST API   │
│  - Auto-reconnect      │  - Rate limiting   │  - Status     │
│  - Event handling      │  - Session mgmt    │  - Clients    │
├─────────────────────────────────────────────────────────────┤
│  PetsciiService        │  MessageService                    │
│  - Color codes         │  - Format chat messages             │
│  - Character filter    │  - Badge/role detection             │
└─────────────────────────────────────────────────────────────┘
```

## Ports

- **9000**: REST API for monitoring and status
- **10000**: TCP socket for C64 terminal clients

## Local Development

### Prerequisites

- Node.js 20+
- npm

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/neon-void/c64-terminal-new.git
   cd c64-terminal-new
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file from the template:
   ```bash
   cp .env.example .env
   ```

4. Edit `.env` with your configuration (see Environment Variables below)

5. Start the development server:
   ```bash
   npm run start:dev
   ```

### Available Scripts

- `npm run start:dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run start:prod` - Run production build
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Run ESLint with auto-fix
- `npm run format` - Run Prettier

### Testing Locally

- API status: `curl http://localhost:9000/`
- Connected clients: `curl http://localhost:9000/api/clients`
- Pusher status: `curl http://localhost:9000/api/pusher/status`
- C64 terminal test: `nc localhost 10000`

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PUSHER_KEY` | StreamScanner Pusher app key | `1abcdc382aa1ff65c7be` |
| `PUSHER_CLUSTER` | Pusher cluster region | `us3` |
| `PUSHER_CHANNEL` | Pusher channel to subscribe | `sschat_c2a6e2feefc3c81a79a80b557bddb84f` |
| `TCP_PORT` | Port for C64 terminal connections | `10000` |
| `API_PORT` | Port for REST API | `9000` |
| `ALLOWED_IPS` | Comma-separated list of allowed client IPs | `127.0.0.1` |
| `LOKI_URL` | Grafana Loki push endpoint (optional) | - |
| `LOKI_USER` | Loki username (optional) | - |
| `LOKI_TOKEN` | Loki API token (optional) | - |
| `LOKI_JOB` | Loki job label | `c64-terminal-server` |
| `NODE_ENV` | Environment (development/production) | `development` |

## Docker

### Build and Run Locally

```bash
docker build -t c64-terminal-server .
docker run -p 9000:9000 -p 10000:10000 --env-file .env c64-terminal-server
```

### Using Docker Compose

```bash
docker-compose up
```

## Deployment

The server deploys automatically to DigitalOcean when pushing to the `main` branch.

### GitHub Actions Workflow

1. **Check job**: Runs TypeScript and ESLint checks
2. **Deploy job**: Builds Docker image and deploys to droplet

### Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `DROPLET_HOST` | Droplet hostname (e.g., `c64terminal.neonvoid.live`) |
| `DROPLET_SSH_KEY` | SSH private key for deployment |
| `PUSHER_KEY` | StreamScanner Pusher app key |
| `PUSHER_CLUSTER` | Pusher cluster |
| `PUSHER_CHANNEL` | Pusher channel |
| `ALLOWED_IPS` | Allowed client IPs |
| `LOKI_URL` | Grafana Loki URL (optional) |
| `LOKI_USER` | Loki username (optional) |
| `LOKI_TOKEN` | Loki token (optional) |

### Deploy Key Setup

1. Generate an SSH key pair without passphrase:
   ```bash
   ssh-keygen -t ed25519 -f ~/.ssh/c64-terminal-deploy -N "" -C "c64-terminal-deploy@github-actions"
   ```

2. Add the public key to the droplet:
   ```bash
   cat ~/.ssh/c64-terminal-deploy.pub | ssh root@c64terminal.neonvoid.live "cat >> ~/.ssh/authorized_keys"
   ```

3. Add the private key as GitHub secret `DROPLET_SSH_KEY`:
   ```bash
   gh secret set DROPLET_SSH_KEY --repo neon-void/c64-terminal-new < ~/.ssh/c64-terminal-deploy
   ```

### Droplet Firewall (UFW)

The droplet uses UFW with the following rules:

- **SSH (22)**: Open to all (key-based authentication only)
- **9000 (API)**: Restricted to allowed IPs
- **10000 (TCP)**: Restricted to allowed IPs

To add your IP to the allowed list:
```bash
ssh root@c64terminal.neonvoid.live "ufw allow from YOUR_IP to any port 9000 && ufw allow from YOUR_IP to any port 10000"
```

### Deployment Directory

Files are deployed to `/home/c64terminal/` on the droplet:
- `docker-compose.prod.yml` - Production compose file
- `.env` - Environment variables (created by deploy script)

### Manual Deployment Commands

SSH into the droplet:
```bash
ssh root@c64terminal.neonvoid.live
```

Check container status:
```bash
cd /home/c64terminal
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml logs -f
```

Restart the service:
```bash
docker-compose -f docker-compose.prod.yml restart
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /` | Server status (uptime, clients, messages) |
| `GET /api/clients` | List connected C64 clients |
| `GET /api/clients/reset` | Disconnect all clients |
| `GET /api/pusher/status` | Pusher connection state |
| `GET /api/pusher/reconnect` | Force Pusher reconnect |

## License

MIT
