# LumaDesk Client Runtime

The LumaDesk client is a minimal Linux-based thin client that boots via PXE and connects to the Sunshine streaming server.

## Architecture

```
┌─────────────────────────────────────┐
│   PXE Boot Process                  │
│                                     │
│  1. BIOS/UEFI PXE → iPXE            │
│  2. iPXE → Download kernel/initramfs│
│  3. Kernel boots with init system   │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│   Client Runtime Container          │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  Client Agent (Background)  │   │
│  │  - Device registration      │   │
│  │  - Heartbeat to API         │   │
│  │  - Session management       │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  X Server + Moonlight       │   │
│  │  - Video/Audio streaming    │   │
│  │  - Connects to Sunshine     │   │
│  │  - Keyboard/Mouse input     │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

## Components

### Client Agent (`lumadesk-agent`)

Background service that:
- Registers device with LumaDesk API
- Sends periodic heartbeats
- Manages session lifecycle
- Handles remote commands

### Client Init (`lumadesk-init`)

Initialization script that:
- Configures network
- Starts client agent
- Launches X server
- Starts Moonlight streaming client

### X Session (`xinitrc`)

X Window System session that:
- Starts OpenBox window manager
- Launches Moonlight in fullscreen
- Automatically reconnects on disconnect

## Building Client Image

### Build Docker Image

```bash
docker build -t lumadesk-client:latest ./client
```

### Generate Initramfs

```bash
./scripts/build-client-image.sh
```

This creates:
- `vmlinuz`: Linux kernel
- `initramfs.img`: Initial ramdisk with LumaDesk client

### Deploy to PXE Server

```bash
docker cp lumadesk-client:/boot/vmlinuz ./pxe/http/vmlinuz
docker cp lumadesk-client:/boot/initramfs.img ./pxe/http/initramfs.img
```

## Client Configuration

### Environment Variables

Set these in the initramfs or via kernel command line:

- `API_URL`: LumaDesk API endpoint (default: http://192.168.1.10:3000)
- `SUNSHINE_HOST`: Sunshine server hostname/IP (default: 192.168.1.10)
- `SESSION_TOKEN`: Session token from API (auto-provided via PXE)
- `DEVICE_ID`: Unique device identifier (auto-generated)

### Kernel Command Line

Example boot parameters:

```
quiet loglevel=3 init=/init api_url=http://192.168.1.10:3000 sunshine_host=192.168.1.10
```

## Testing

### Test Client Locally

```bash
docker run --rm -it \
  --privileged \
  -e API_URL=http://192.168.1.10:3000 \
  -e SUNSHINE_HOST=192.168.1.10 \
  lumadesk-client:latest
```

### Test with QEMU

```bash
qemu-system-x86_64 \
  -m 2048 \
  -kernel vmlinuz \
  -initrd initramfs.img \
  -append "quiet loglevel=3 init=/init" \
  -netdev user,id=net0 \
  -device e1000,netdev=net0 \
  -vga std
```

## Moonlight Client Integration

### Building Moonlight

To integrate the actual Moonlight client:

1. **Option A: Build from source**
   ```bash
   git clone https://github.com/moonlight-stream/moonlight-embedded.git
   cd moonlight-embedded
   mkdir build && cd build
   cmake ..
   make
   ```

2. **Option B: Use pre-built binaries**
   Download from Moonlight releases and include in Docker image

3. **Option C: Use Moonlight Qt**
   Use the GUI version for better user experience

### Pairing with Sunshine

The client can pair with Sunshine using:

1. **Pre-shared pairing token** (recommended)
   - Generated via LumaDesk API
   - Passed to client via session token

2. **Manual pairing**
   - User enters PIN from Sunshine web UI

3. **Certificate-based**
   - Client cert pre-installed in image

## Hardware Support

### Video

- Intel: i915 driver
- AMD: amdgpu driver
- NVIDIA: nouveau (open) or proprietary driver
- Generic: fbdev fallback

### Audio

- ALSA
- PulseAudio (optional)

### Input

- Keyboard: standard input drivers
- Mouse: evdev
- USB devices: automatic

## Customization

### Adding Applications

Edit `Dockerfile` to install additional packages:

```dockerfile
RUN apk add --no-cache firefox chromium
```

### Custom Init Scripts

Add scripts to `/etc/lumadesk/init.d/`:

```bash
#!/bin/bash
# /etc/lumadesk/init.d/custom.sh
echo "Running custom initialization..."
```

### Branding

Replace logo and splash screen:

```bash
COPY branding/logo.png /usr/share/pixmaps/lumadesk.png
COPY branding/splash.png /usr/share/lumadesk/splash.png
```

## Troubleshooting

### Client doesn't boot

- Check PXE server logs
- Verify kernel and initramfs are accessible
- Check network connectivity

### Client can't register

- Verify API URL is correct
- Check firewall rules
- Review client agent logs

### No video output

- Check X server logs: `/var/log/Xorg.0.log`
- Verify GPU drivers are loaded
- Try fbdev fallback

### Moonlight won't connect

- Verify Sunshine is running
- Check pairing status
- Review Moonlight logs

### Logs

```bash
# Client agent logs
docker exec lumadesk-client cat /var/log/lumadesk/agent.log

# X server logs
docker exec lumadesk-client cat /var/log/Xorg.0.log

# System logs
docker exec lumadesk-client dmesg
```

## Security

- Client runs with minimal privileges
- No persistent storage by default
- Credentials managed by API
- Network isolation recommended
- Use secure boot in production
- Consider TPM for attestation

## Updates

### OTA Updates

Future enhancement:

```bash
# Client pulls new image version
lumadesk-client update --version 1.2.0

# Or server-initiated push
curl -X POST ${API_URL}/api/devices/${DEVICE_ID}/update \
  -d '{"version": "1.2.0"}'
```

### Force Reimage

```bash
# From admin UI or API
curl -X POST ${API_URL}/api/devices/${DEVICE_ID}/reboot
```
