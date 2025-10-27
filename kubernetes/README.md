# LumaDesk Kubernetes Deployment

Enterprise-scale deployment of LumaDesk on Kubernetes for **1000+ concurrent users**.

## Architecture

```
┌────────────────────────────────────────────┐
│          Kubernetes Cluster                │
│                                            │
│  ┌─────────────────────────────────────┐  │
│  │  Session Broker (3 replicas)        │  │
│  │  Redis (HA)                         │  │
│  └─────────────────────────────────────┘  │
│                                            │
│  ┌─────────────────────────────────────┐  │
│  │  Desktop Servers (Auto-scaling)     │  │
│  │                                     │  │
│  │  XFCE:  5-20 pods (375-1500 users) │  │
│  │  KDE:   3-15 pods (150-750 users)  │  │
│  │  GNOME: 3-15 pods (150-750 users)  │  │
│  └─────────────────────────────────────┘  │
│                                            │
│  ┌─────────────────────────────────────┐  │
│  │  NFS Storage (Shared /home)         │  │
│  └─────────────────────────────────────┘  │
└────────────────────────────────────────────┘
```

## Prerequisites

1. **Kubernetes Cluster**
   - Version: 1.25+
   - Nodes: 10-30 (depending on scale)
   - Total Resources: 200+ cores, 500+ GB RAM

2. **Storage**
   - NFS server or distributed storage (GlusterFS, CephFS)
   - StorageClass: `nfs-client` configured

3. **Tools**
   ```bash
   kubectl
   helm (optional)
   ```

## Quick Start

### 1. Setup NFS Storage

```bash
# Install NFS provisioner
helm repo add nfs-subdir-external-provisioner \
  https://kubernetes-sigs.github.io/nfs-subdir-external-provisioner/

helm install nfs-provisioner nfs-subdir-external-provisioner/nfs-subdir-external-provisioner \
  --set nfs.server=nfs-server-ip \
  --set nfs.path=/export/lumadesk \
  --set storageClass.name=nfs-client
```

### 2. Deploy LumaDesk

```bash
# Create namespace
kubectl apply -f namespace.yaml

# Deploy Redis
kubectl apply -f redis.yaml

# Deploy Session Broker
kubectl apply -f session-broker.yaml

# Deploy Desktop Servers
kubectl apply -f desktop-xfce.yaml
kubectl apply -f desktop-kde.yaml
kubectl apply -f desktop-gnome.yaml

# Enable Auto-scaling
kubectl apply -f hpa.yaml
```

### 3. Verify Deployment

```bash
# Check all pods
kubectl get pods -n lumadesk

# Check services
kubectl get svc -n lumadesk

# Check autoscaling
kubectl get hpa -n lumadesk
```

## Capacity

**Default Configuration:**
- XFCE: 5 pods x 75 users = 375 users
- KDE: 3 pods x 50 users = 150 users
- GNOME: 3 pods x 50 users = 150 users
- **Total: 675 concurrent users**

**With Autoscaling (Max):**
- XFCE: 20 pods x 75 users = 1500 users
- KDE: 15 pods x 50 users = 750 users
- GNOME: 15 pods x 50 users = 750 users
- **Total: 3000 concurrent users**

## Scaling

### Manual Scaling

```bash
# Scale XFCE desktops to 10 replicas
kubectl scale statefulset desktop-xfce -n lumadesk --replicas=10

# Scale KDE desktops
kubectl scale statefulset desktop-kde -n lumadesk --replicas=5

# Scale GNOME desktops
kubectl scale statefulset desktop-gnome -n lumadesk --replicas=5
```

### Auto-scaling

Horizontal Pod Autoscaler (HPA) will automatically scale based on:
- CPU usage (target: 70%)
- Memory usage (target: 80%)

```bash
# Watch auto-scaling in action
watch kubectl get hpa -n lumadesk
```

## Monitoring

### Install Prometheus + Grafana

```bash
# Add helm repos
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Install Prometheus
helm install prometheus prometheus-community/kube-prometheus-stack \
  -n monitoring --create-namespace

# Access Grafana
kubectl port-forward svc/prometheus-grafana -n monitoring 3000:80

# Login: admin / prom-operator
```

### Key Metrics

- CPU/Memory per desktop server
- Active sessions per server
- Session distribution
- Network bandwidth
- Storage I/O

## High Availability

### Session Broker HA

```yaml
replicas: 3  # Already configured
```

Requests distributed across 3 brokers using Kubernetes Service load balancing.

### Redis HA

For production, use Redis Sentinel or Redis Cluster:

```bash
helm install redis bitnami/redis \
  --set sentinel.enabled=true \
  --set replica.replicaCount=3 \
  -n lumadesk
```

### Desktop Server Redundancy

StatefulSets ensure:
- Stable network identifiers
- Ordered deployment/scaling
- Automatic pod replacement on failure

## Networking

### Service Exposure

**Internal (ClusterIP):**
- Session Broker
- Redis
- Desktop headless services

**External (LoadBalancer or NodePort):**
- API
- Web UI
- Desktop XDMCP/X11 (for thin clients)

### Network Policies

```bash
# Restrict desktop servers to only accept from session broker
kubectl apply -f network-policies.yaml
```

## Storage

### NFS Configuration

**Server Requirements:**
- NFS v4
- No-root-squash for user home directories
- High IOPS storage (SSD recommended)

**Mount Options:**
```
rw,sync,no_subtree_check,no_root_squash
```

### User Home Directories

All desktop servers mount same NFS share:
- User sees same files on any server
- Session can move between servers
- Shared /home/{username}

## Updates

### Rolling Updates

```bash
# Update XFCE desktop image
kubectl set image statefulset/desktop-xfce xserver=lumadesk/xserver-xfce:v2.0 -n lumadesk

# Kubernetes performs rolling update
# One pod at a time, users reconnect as needed
```

### Zero-downtime Strategy

1. Deploy new version alongside old
2. Update session broker to prefer new version
3. Let old sessions drain
4. Remove old version

## Troubleshooting

### Check Pod Status

```bash
# List all pods
kubectl get pods -n lumadesk -o wide

# Check pod logs
kubectl logs desktop-xfce-0 -n lumadesk

# Exec into pod
kubectl exec -it desktop-xfce-0 -n lumadesk -- bash
```

### Check Session Distribution

```bash
# Get session broker metrics
kubectl port-forward svc/session-broker -n lumadesk 3001:3001
curl http://localhost:3001/metrics
```

### Common Issues

**Pods Pending:**
- Check resources: `kubectl describe pod <pod> -n lumadesk`
- Verify NFS provisioner is running
- Check node capacity

**Users Can't Connect:**
- Verify LoadBalancer/NodePort is accessible
- Check network policies
- Verify session broker can reach desktop servers

**High Latency:**
- Check node network throughput
- Verify NFS performance
- Check CPU throttling

## Security

### Network Policies

Restrict traffic between components:
```bash
kubectl apply -f network-policies.yaml
```

### RBAC

Limit access to LumaDesk namespace:
```bash
kubectl apply -f rbac.yaml
```

### Pod Security

- Run containers as non-root (where possible)
- Use SecurityContext
- Limit capabilities

## Cost Optimization

### Node Autoscaling

Enable cluster autoscaling:
```bash
# AWS EKS
eksctl create nodegroup --cluster=lumadesk \
  --name=desktop-servers \
  --node-type=c5.4xlarge \
  --nodes-min=5 \
  --nodes-max=30 \
  --asg-access
```

### Spot Instances

Use spot/preemptible instances for non-critical desktop servers:
- 60-80% cost savings
- Automatic migration on termination

## Backup

### Database Backup

```bash
# PostgreSQL backup (if using)
kubectl exec postgres-0 -n lumadesk -- pg_dump -U lumadesk lumadesk > backup.sql
```

### User Data Backup

```bash
# NFS backup (from NFS server)
rsync -av /export/lumadesk/ /backup/lumadesk/
```

## Load Testing

### Simulate 1000 Users

```bash
# Deploy load testing pod
kubectl apply -f load-test.yaml

# Run test
kubectl exec load-test -n lumadesk -- ./load-test.sh 1000
```

## References

- [Kubernetes StatefulSets](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/)
- [Horizontal Pod Autoscaling](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/)
- [NFS Persistent Volumes](https://kubernetes.io/docs/concepts/storage/volumes/#nfs)
