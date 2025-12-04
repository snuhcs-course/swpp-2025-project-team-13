# Real-time Streaming Setup Guide

The recommendation streaming feature requires a server that supports true HTTP response streaming. Django's development server (WSGIServer) buffers the entire response before sending it, which prevents real-time data delivery.

## Option 1: Use Gunicorn (Recommended for Development)

Gunicorn can handle streaming responses properly with the right configuration.

### Setup

1. Install Gunicorn:
```bash
cd server
pip install gunicorn
```

2. Run with streaming support:
```bash
gunicorn --workers 1 --worker-class sync --timeout 300 --bind 0.0.0.0:8000 config.wsgi:application
```

**Key flags:**
- `--workers 1` - Single worker (prevents multi-process issues with streaming)
- `--worker-class sync` - Use synchronous worker (streaming works better)
- `--timeout 300` - 5 minute timeout (recommendations can take time)

3. Test the streaming endpoint:
- Start the frontend as usual
- Make a recommendation request
- Watch the backend logs - you should see "Stored reason features for..." messages appear progressively
- Watch the frontend logs - you should see "🍽️ Streamed menu:" messages appearing as the backend processes each menu
- The UI should display menus incrementally in real-time

## Option 2: Use Daphne (ASGI Server)

For even better streaming support and async capabilities, use Daphne (ASGI server).

### Setup

1. Install Daphne and async dependencies:
```bash
cd server
pip install daphne djangorestframework[async]
```

2. Run Daphne:
```bash
daphne -b 0.0.0.0 -p 8000 config.asgi:application
```

3. Verify it works:
- The frontend should see real-time menu updates
- This is the most reliable option for streaming

## Option 3: Alternative - Server-Sent Events (SSE)

If neither Gunicorn nor Daphne is available, we can implement Server-Sent Events instead of HTTP streaming. This provides a cleaner streaming API and works with all WSGI servers.

Contact the development team if you want to implement this alternative.

## Verifying Streaming Works

Watch the server logs and frontend console simultaneously:

**Backend** should show:
```
Stored reason features for menu=xxx, restaurant=yyy  <- Menu 1
Stored reason features for menu=xxx, restaurant=yyy  <- Menu 2
Stored reason features for menu=xxx, restaurant=yyy  <- Menu 3
...
```

**Frontend** should show real-time logs like:
```
LOG 🍽️ Streamed menu: Menu 1 Name
LOG 🍽️ Received menu 1: Menu 1 Name
LOG 🍽️ Streamed menu: Menu 2 Name
LOG 🍽️ Received menu 2: Menu 2 Name
...
```

The key difference from the current behavior:
- **Before:** All "Stored reason features..." logs appear first (entire backend processing complete), then all frontend logs appear at once
- **After:** Logs appear interleaved - a backend log followed by corresponding frontend logs, repeating for each menu

## Current Status

- ✅ Backend streaming: Working (generates NDJSON stream)
- ✅ Frontend parsing: Working (parses and displays data)
- ⚠️ Real-time delivery: Limited by WSGI server buffering
- ✅ Solution: Use Gunicorn or Daphne as described above
