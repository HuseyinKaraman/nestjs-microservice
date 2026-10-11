# Kubernetes & Helm Command Reference

> ⚠️ The Helm chart in `k8s/sleepr` still targets the old setup (MongoDB via `MONGODB_URI`, TCP ports 3002–3004). The services now use PostgreSQL (`DATABASE_URL`) and gRPC on port 5001 (`AUTH_GRPC_URL`, `PAYMENTS_GRPC_URL`, `NOTIFICATIONS_GRPC_URL`). Update the chart before deploying the current code.

## 1. Docker Image Build

All commands run from **project root** (`sleepr/`).

### Build all services

```bash
docker build -t auth:latest -f apps/auth/Dockerfile --target production .
docker build -t reservations:latest -f apps/reservations/Dockerfile --target production .
docker build -t payments:latest -f apps/payments/Dockerfile --target production .
docker build -t notifications:latest -f apps/notifications/Dockerfile --target production .
```

### Build a single service

```bash
docker build -t auth:latest -f apps/auth/Dockerfile --target production .
```

### Flag reference

| Flag | Description |
|---|---|
| `-t auth:latest` | Tag the image with name and version |
| `-f apps/auth/Dockerfile` | Path to the Dockerfile to use |
| `--target production` | Stop at this stage in a multi-stage build |
| `.` | Build context — files Docker can access during build |

### List local images

```bash
docker images
```

### Remove an image

```bash
docker rmi auth:latest
```

---

## 2. pnpm

### Install / update dependencies

```bash
pnpm install
```

> Run this after adding packages or changing any `package.json`. With `pnpm-workspace.yaml` in place, all workspace packages are installed in a single command.

### Prisma (auth / reservations)

Uses `apps/<service>/.env.local` (local Postgres on `localhost:5432`).

```bash
pnpm --filter @sleepr/auth migrate            # create & apply a migration (prisma migrate dev)
pnpm --filter @sleepr/auth generate           # regenerate the client into apps/auth/generated/prisma
pnpm --filter @sleepr/reservations migrate
pnpm --filter @sleepr/reservations generate
```

Containers run `prisma migrate deploy` on startup to apply committed migrations.

### Docker Compose (local dev)

```bash
docker compose up --build        # build and start all services + postgres
docker compose up --build -V     # also recreate anonymous node_modules volumes (after dependency changes)
docker compose logs -f auth      # follow one service's logs
docker compose down              # stop and remove containers (postgres data volume is kept)
```

---

## 3. Helm

All Helm commands run from `k8s/sleepr/`.

```bash
cd k8s/sleepr
```

### First install

```bash
helm install sleepr .
```

### Upgrade after changes (deployment.yaml, values.yaml, ingress.yaml, etc.)

```bash
helm upgrade sleepr .
```

### List installed releases

```bash
helm list
```

### Show release status

```bash
helm status sleepr
```

### Uninstall (removes all pods, services, ingress)

```bash
helm uninstall sleepr
```

### Preview rendered YAML without deploying

```bash
helm template sleepr .
```

### Validate chart syntax

```bash
helm lint .
```

---

## 4. Ingress

The Ingress routes external HTTP traffic to the correct service. It requires **NGINX Ingress Controller** to be installed.

### Install NGINX Ingress Controller (one-time, Docker Desktop)

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.12.0/deploy/static/provider/cloud/deploy.yaml
```

### Wait for the controller to be ready

```bash
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=120s
```

### Check Ingress status (ADDRESS should show localhost)

```bash
kubectl get ing
```

### Current routing rules

| Path | Service | Port |
|---|---|---|
| `http://localhost/reservations/*` | `reservations` | 3001 |
| `http://localhost/auth/*` | `auth-http` | 3000 |

### How the rewrite annotation works

```
Client: GET http://localhost/reservations/abc123
                        ↓
             Ingress strips /reservations
                        ↓
  Service receives: GET /abc123
```

The annotation `nginx.ingress.kubernetes.io/rewrite-target: /$2` combined with the capture group `(/|$)(.*)` in the path strips the prefix before forwarding to the service.

---

## 5. kubectl — Pods

### List pods

```bash
kubectl get pods
```

### Describe a pod (inspect errors, events)

```bash
kubectl describe pod <pod-name>
# Example:
kubectl describe pod auth-577d5c9774-dxhv6
```

### View pod logs

```bash
kubectl logs <pod-name>
```

### Stream logs live

```bash
kubectl logs -f deployment/auth
```

### Stream logs by label selector

```bash
kubectl logs -f $(kubectl get pod -l app=auth -o jsonpath='{.items[0].metadata.name}')
```

---

## 6. kubectl — Deployments

### List deployments

```bash
kubectl get deployments
```

### Restart a deployment (pick up new image)

```bash
kubectl rollout restart deployment/auth
kubectl rollout restart deployment/reservations
kubectl rollout restart deployment/payments
kubectl rollout restart deployment/notifications
```

### Restart all deployments

```bash
kubectl rollout restart deployment
```

### Watch rollout progress

```bash
kubectl rollout status deployment/auth
```

### Delete a deployment

```bash
kubectl delete deployment auth
```

### Apply a manifest file directly

```bash
kubectl apply -f templates/auth/deployment.yaml
```

---

## 7. kubectl — Services

### List services

```bash
kubectl get services
```

### Describe a service

```bash
kubectl describe service auth-http
```

---

## 8. kubectl — General

### List all resources

```bash
kubectl get all
```

### List namespaces

```bash
kubectl get namespaces
```

### Show current context (which cluster you are connected to)

```bash
kubectl config current-context
```

### List all contexts

```bash
kubectl config get-contexts
```

---

## 9. Common Workflows

### Update a single service after code change

```bash
# 1. Rebuild the image
docker build -t auth:latest -f apps/auth/Dockerfile --target production .

# 2. Force Kubernetes to use the new image
kubectl rollout restart deployment/auth

# 3. Check logs
kubectl logs -f deployment/auth
```

### Apply Helm config changes (deployment.yaml, values.yaml, ingress.yaml)

```bash
cd k8s/sleepr
helm upgrade sleepr .
```

### Full reset and redeploy

```bash
# 1. Remove everything
cd k8s/sleepr
helm uninstall sleepr

# 2. Rebuild all images from project root
cd ../..
docker build -t auth:latest -f apps/auth/Dockerfile --target production .
docker build -t reservations:latest -f apps/reservations/Dockerfile --target production .
docker build -t payments:latest -f apps/payments/Dockerfile --target production .
docker build -t notifications:latest -f apps/notifications/Dockerfile --target production .

# 3. Reinstall
cd k8s/sleepr
helm install sleepr .

# 4. Verify
kubectl get pods
kubectl get ing
```
