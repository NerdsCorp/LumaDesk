# LumaDesk Client Runtime

The LumaDesk client runs an X server that connects to the LumaDesk X server using XDMCP.

## Architecture

Traditional X server thin client: client runs X server for display, server runs all applications.

**Client boots → X server starts → Connects via XDMCP → Login screen → User session on server**

## Key Features

✅ **Simple**: Traditional proven thin client technology
✅ **Low latency**: No video encoding
✅ **Efficient bandwidth**: For office applications
✅ **No GPU required**: CPU-only operation

⚠️ **No encryption**: Use VPN or isolated network
⚠️ **LAN-optimized**: Not for WAN/remote access

## Configuration

Environment variables:
- `XSERVER_HOST`: Server IP (default: 192.168.1.10)
- `XDMCP_PORT`: XDMCP port (default: 177)
- `API_URL`: LumaDesk API (default: http://192.168.1.10:3000)

## Testing

```bash
# Test locally
docker run --rm -it \
  -e XSERVER_HOST=192.168.1.10 \
  lumadesk-client:latest

# Or from X-enabled machine
X :1 -query 192.168.1.10
```

See main README for full documentation.
