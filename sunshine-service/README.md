# LumaDesk Sunshine Service

This container runs LizardByte/Sunshine as the streaming backend for LumaDesk.

## Features

- Based on official LizardByte/Sunshine image
- Runs as non-root user for security
- Persistent configuration via volume mount
- GPU passthrough support
- Integrated with LumaDesk API for pairing management

## Configuration

### Environment Variables

- `PUID`: User ID for the sunshine process (default: 1000)
- `PGID`: Group ID for the sunshine process (default: 1000)
- `TZ`: Timezone (default: UTC)

### Volumes

- `/config`: Sunshine configuration and credentials

### Ports

- `47984`: HTTPS Web UI
- `47989`: HTTP Web UI
- `47990`: HTTP redirect
- `48010`: RTSP streaming

## GPU Passthrough

### Intel GPU

```yaml
devices:
  - /dev/dri:/dev/dri
```

### NVIDIA GPU

```yaml
devices:
  - /dev/nvidia0:/dev/nvidia0
  - /dev/nvidiactl:/dev/nvidiactl
  - /dev/nvidia-uvm:/dev/nvidia-uvm
runtime: nvidia
```

### AMD GPU

```yaml
devices:
  - /dev/dri:/dev/dri
  - /dev/kfd:/dev/kfd
```

## Security Considerations

- Sunshine runs as a non-root user
- Use `privileged: false` in production
- Limit capabilities with `cap_add` instead of full privileged mode
- Use firewall rules to restrict access to Sunshine ports
- Consider TLS termination at reverse proxy

## Pairing with Moonlight

Pairing tokens are managed through the LumaDesk API. Use the web UI to:

1. Generate a pairing token for a device
2. Enter the token in Moonlight client
3. Complete pairing process

## Troubleshooting

### Check logs

```bash
docker logs lumadesk-sunshine
docker exec lumadesk-sunshine cat /config/sunshine.log
```

### Verify GPU access

```bash
docker exec lumadesk-sunshine ls -la /dev/dri
```

### Test web UI

```bash
curl -k https://localhost:47984
```
