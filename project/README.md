This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Chat System with Ably

This project uses [Ably](https://ably.com) for real-time messaging in the chat system. Ably provides reliable, low-latency real-time messaging with automatic reconnection and presence features.

### Environment Variables

Add the following environment variables to your `.env.local` file:

```env
ABLY_API_KEY=your_ably_api_key_here
ABLY_CHANNEL_PREFIX=conversation
NEXT_PUBLIC_ABLY_ENABLED=true
NEXT_PUBLIC_ABLY_USER_PERCENTAGE=100
```

- `ABLY_API_KEY`: Your Ably API key (get it from [ably.com](https://ably.com))
- `ABLY_CHANNEL_PREFIX`: Prefix for conversation channels (default: "conversation")
- `NEXT_PUBLIC_ABLY_ENABLED`: Enable/disable Ably (true/false)
- `NEXT_PUBLIC_ABLY_USER_PERCENTAGE`: Percentage of users to use Ably for A/B testing (0-100)

### Architecture

The chat system uses a hybrid approach supporting both Ably and Socket.IO for smooth migration:

- **Ably**: Primary real-time messaging provider with channel-based communication
- **Socket.IO**: Fallback for backward compatibility during migration
- **REST API**: Message persistence with idempotent operations using clientId

### Key Features

- **Idempotent Message Operations**: Uses clientId to prevent duplicate messages
- **Channel History**: Automatic message synchronization on reconnection
- **Presence**: Real-time online/offline user status
- **Typing Indicators**: Real-time typing state across clients
- **Read Receipts**: Message read status tracking
- **Offline Queue**: Message queuing when offline with automatic retry
- **Rate Limiting**: Built-in rate limiting for API endpoints
- **Error Handling**: Comprehensive retry logic and error recovery

### Migration Strategy

The system supports gradual migration from Socket.IO to Ably:

1. Set `NEXT_PUBLIC_ABLY_ENABLED=true`
2. Use `NEXT_PUBLIC_ABLY_USER_PERCENTAGE` to control rollout (0-100%)
3. Monitor usage with built-in monitoring tools
4. Gradually increase percentage to 100%

### Database Migration

Run the migration script to add clientId field to existing messages:

```bash
node scripts/migrate-clientId.js
```

### Monitoring

The system includes built-in Ably usage monitoring:

- Automatic quota tracking
- Alert system for approaching limits
- Usage trend analysis
- Connection health monitoring

### API Endpoints

- `POST /api/chat/messages` - Send messages with Ably integration
- `POST /api/ably/auth` - Ably token authentication
- `POST /api/ably/message-handler` - Ably webhook for server-side persistence

### Components

- `useChatSocket` - Hook for Ably real-time messaging
- `useUnifiedChatSocket` - Hook supporting both Ably and Socket.IO
- `useAblyPresence` - Hook for online/offline presence
- `useOfflineQueue` - Hook for offline message queuing
- `ConnectionStatus` - Component for connection status display

### Configuration

Configure Ably settings in `config/ably-config.ts`:

```typescript
export const ABLY_CONFIG = {
  enabled: process.env.NEXT_PUBLIC_ABLY_ENABLED === 'true',
  channelPrefix: process.env.ABLY_CHANNEL_PREFIX || 'conversation',
  connection: {
    autoConnect: true,
    recover: true,
    // ... more settings
  },
};
```

### Security

- Token-based authentication for Ably connections
- Rate limiting on all chat endpoints
- Message validation to prevent XSS and injection attacks
- Idempotent operations to prevent duplicate messages

### Troubleshooting

**Connection Issues**:
- Check ABLY_API_KEY is set correctly
- Verify network connectivity
- Check browser console for connection errors

**Message Delivery**:
- Ensure clientId is included in message data
- Check rate limiting headers in response
- Verify message validation passes

**Migration Issues**:
- Use `useUnifiedChatSocket` for dual support
- Monitor A/B testing percentage
- Check feature flags in config

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
