# SafeDrive Deployment Guide

This guide provides comprehensive instructions for deploying SafeDrive to various platforms using Docker.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Local Deployment](#local-deployment)
- [Google Cloud Run](#google-cloud-run)
- [AWS ECS](#aws-ecs)
- [Azure Container Instances](#azure-container-instances)
- [Docker Hub](#docker-hub)
- [SSL/TLS Configuration](#ssltls-configuration)
- [Monitoring and Logging](#monitoring-and-logging)
- [Troubleshooting](#troubleshooting)

## Prerequisites

- Docker installed (version 20.10 or later)
- Docker Compose installed (version 2.0 or later)
- A container registry account (Docker Hub, Google Container Registry, AWS ECR, or Azure Container Registry)
- Cloud platform account (if deploying to cloud)

## Environment Variables

SafeDrive requires the following environment variables:

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `PORT` | Port the application listens on | No | 8080 |
| `GEMINI_API_KEY` | Google Gemini API key for AI features | Yes | - |
| `NODE_ENV` | Environment (development/production) | No | production |

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
# Edit .env with your values
```

## Local Deployment

### Using Docker Compose (Recommended)

1. **Build and run the application:**
   ```bash
   docker-compose up -d
   ```

2. **Access the application:**
   Open your browser and navigate to `http://localhost:8080`

3. **View logs:**
   ```bash
   docker-compose logs -f
   ```

4. **Stop the application:**
   ```bash
   docker-compose down
   ```

### Using Docker CLI

1. **Build the Docker image:**
   ```bash
   docker build -t safedrive-app .
   ```

2. **Run the container:**
   ```bash
   docker run -d \
     -p 8080:8080 \
     -e PORT=8080 \
     -e GEMINI_API_KEY=your_api_key_here \
     --name safedrive \
     safedrive-app
   ```

3. **Check container status:**
   ```bash
   docker ps
   docker logs safedrive
   ```

4. **Stop the container:**
   ```bash
   docker stop safedrive
   docker rm safedrive
   ```

## Google Cloud Run

Google Cloud Run is a fully managed platform for deploying containerized applications.

### Prerequisites

- Google Cloud SDK installed
- Google Cloud project created
- Billing enabled on your project

### Deployment Steps

1. **Authenticate with Google Cloud:**
   ```bash
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   ```

2. **Enable required APIs:**
   ```bash
   gcloud services enable run.googleapis.com
   gcloud services enable containerregistry.googleapis.com
   ```

3. **Build and push the image:**
   ```bash
   # Tag the image
   docker tag safedrive-app gcr.io/YOUR_PROJECT_ID/safedrive-app:latest
   
   # Configure Docker to use gcloud as a credential helper
   gcloud auth configure-docker
   
   # Push the image
   docker push gcr.io/YOUR_PROJECT_ID/safedrive-app:latest
   ```

4. **Deploy to Cloud Run:**
   ```bash
   gcloud run deploy safedrive \
     --image gcr.io/YOUR_PROJECT_ID/safedrive-app:latest \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --set-env-vars GEMINI_API_KEY=your_api_key_here \
     --memory 512Mi \
     --cpu 1 \
     --max-instances 10
   ```

5. **Access your application:**
   Cloud Run will provide a URL like `https://safedrive-xxxxx-uc.a.run.app`

### Using Cloud Build (CI/CD)

Create a `cloudbuild.yaml` file:

```yaml
steps:
  # Build the container image
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/safedrive-app:$COMMIT_SHA', '.']
  
  # Push the container image
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/safedrive-app:$COMMIT_SHA']
  
  # Deploy to Cloud Run
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - 'safedrive'
      - '--image'
      - 'gcr.io/$PROJECT_ID/safedrive-app:$COMMIT_SHA'
      - '--region'
      - 'us-central1'
      - '--platform'
      - 'managed'

images:
  - 'gcr.io/$PROJECT_ID/safedrive-app:$COMMIT_SHA'
```

## AWS ECS

Amazon Elastic Container Service (ECS) is a fully managed container orchestration service.

### Prerequisites

- AWS CLI installed and configured
- AWS account with appropriate permissions
- ECR repository created

### Deployment Steps

1. **Authenticate with ECR:**
   ```bash
   aws ecr get-login-password --region us-east-1 | \
     docker login --username AWS --password-stdin \
     YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com
   ```

2. **Create ECR repository:**
   ```bash
   aws ecr create-repository --repository-name safedrive-app --region us-east-1
   ```

3. **Build and push the image:**
   ```bash
   # Tag the image
   docker tag safedrive-app:latest \
     YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/safedrive-app:latest
   
   # Push the image
   docker push YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/safedrive-app:latest
   ```

4. **Create ECS task definition:**
   
   Create a file `task-definition.json`:
   ```json
   {
     "family": "safedrive-task",
     "networkMode": "awsvpc",
     "requiresCompatibilities": ["FARGATE"],
     "cpu": "256",
     "memory": "512",
     "containerDefinitions": [
       {
         "name": "safedrive",
         "image": "YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/safedrive-app:latest",
         "portMappings": [
           {
             "containerPort": 8080,
             "protocol": "tcp"
           }
         ],
         "environment": [
           {
             "name": "PORT",
             "value": "8080"
           }
         ],
         "secrets": [
           {
             "name": "GEMINI_API_KEY",
             "valueFrom": "arn:aws:secretsmanager:region:account-id:secret:secret-name"
           }
         ],
         "logConfiguration": {
           "logDriver": "awslogs",
           "options": {
             "awslogs-group": "/ecs/safedrive",
             "awslogs-region": "us-east-1",
             "awslogs-stream-prefix": "ecs"
           }
         }
       }
     ]
   }
   ```

5. **Register the task definition:**
   ```bash
   aws ecs register-task-definition --cli-input-json file://task-definition.json
   ```

6. **Create ECS service:**
   ```bash
   aws ecs create-service \
     --cluster your-cluster-name \
     --service-name safedrive-service \
     --task-definition safedrive-task \
     --desired-count 1 \
     --launch-type FARGATE \
     --network-configuration "awsvpcConfiguration={subnets=[subnet-xxxxx],securityGroups=[sg-xxxxx],assignPublicIp=ENABLED}"
   ```

## Azure Container Instances

Azure Container Instances provides a simple way to run containers in Azure.

### Prerequisites

- Azure CLI installed
- Azure subscription

### Deployment Steps

1. **Login to Azure:**
   ```bash
   az login
   ```

2. **Create a resource group:**
   ```bash
   az group create --name safedrive-rg --location eastus
   ```

3. **Create Azure Container Registry:**
   ```bash
   az acr create --resource-group safedrive-rg \
     --name safedriveregistry --sku Basic
   ```

4. **Login to ACR:**
   ```bash
   az acr login --name safedriveregistry
   ```

5. **Tag and push the image:**
   ```bash
   docker tag safedrive-app safedriveregistry.azurecr.io/safedrive-app:latest
   docker push safedriveregistry.azurecr.io/safedrive-app:latest
   ```

6. **Deploy to Azure Container Instances:**
   ```bash
   az container create \
     --resource-group safedrive-rg \
     --name safedrive-app \
     --image safedriveregistry.azurecr.io/safedrive-app:latest \
     --cpu 1 \
     --memory 1 \
     --registry-login-server safedriveregistry.azurecr.io \
     --registry-username $(az acr credential show --name safedriveregistry --query username -o tsv) \
     --registry-password $(az acr credential show --name safedriveregistry --query passwords[0].value -o tsv) \
     --dns-name-label safedrive-unique \
     --ports 8080 \
     --environment-variables PORT=8080 GEMINI_API_KEY=your_api_key_here
   ```

7. **Access your application:**
   ```bash
   az container show --resource-group safedrive-rg \
     --name safedrive-app --query ipAddress.fqdn
   ```

## Docker Hub

### Push to Docker Hub

1. **Login to Docker Hub:**
   ```bash
   docker login
   ```

2. **Tag the image:**
   ```bash
   docker tag safedrive-app yourusername/safedrive-app:latest
   docker tag safedrive-app yourusername/safedrive-app:v1.2.0
   ```

3. **Push the image:**
   ```bash
   docker push yourusername/safedrive-app:latest
   docker push yourusername/safedrive-app:v1.2.0
   ```

## SSL/TLS Configuration

### Using Let's Encrypt with Nginx

For production deployments, you should use HTTPS. Here's how to set it up:

1. **Add Certbot to your Dockerfile** (for self-managed servers)
2. **Use cloud provider's SSL termination** (recommended for cloud deployments)

Most cloud platforms (Cloud Run, ECS with ALB, Azure Container Instances) provide automatic SSL/TLS termination.

### Cloud Run SSL

Cloud Run automatically provides HTTPS endpoints with managed SSL certificates.

### AWS Application Load Balancer

1. Request a certificate from AWS Certificate Manager
2. Attach the certificate to your Application Load Balancer
3. Configure the ALB to forward traffic to your ECS service

## Monitoring and Logging

### Health Checks

The application includes a health check endpoint at `/health`:

```bash
curl http://localhost:8080/health
```

### Docker Logs

```bash
# View logs
docker logs safedrive

# Follow logs
docker logs -f safedrive

# View last 100 lines
docker logs --tail 100 safedrive
```

### Cloud Platform Logging

- **Google Cloud Run**: Use Cloud Logging (formerly Stackdriver)
- **AWS ECS**: Use CloudWatch Logs
- **Azure**: Use Azure Monitor

### Monitoring Tools

Consider integrating with:
- Prometheus + Grafana
- Datadog
- New Relic
- Application Insights (Azure)

## Troubleshooting

### Container Won't Start

1. **Check logs:**
   ```bash
   docker logs safedrive
   ```

2. **Verify environment variables:**
   ```bash
   docker inspect safedrive | grep -A 10 Env
   ```

3. **Test nginx configuration:**
   ```bash
   docker exec safedrive nginx -t
   ```

### Application Not Accessible

1. **Check if container is running:**
   ```bash
   docker ps
   ```

2. **Verify port mapping:**
   ```bash
   docker port safedrive
   ```

3. **Test health endpoint:**
   ```bash
   curl http://localhost:8080/health
   ```

### High Memory Usage

1. **Check container stats:**
   ```bash
   docker stats safedrive
   ```

2. **Adjust memory limits in docker-compose.prod.yml**

### Build Failures

1. **Clear Docker cache:**
   ```bash
   docker builder prune
   ```

2. **Build without cache:**
   ```bash
   docker build --no-cache -t safedrive-app .
   ```

### Permission Issues

Ensure the entrypoint script is executable:
```bash
chmod +x entrypoint.sh
```

## Performance Optimization

1. **Enable gzip compression** (already configured in nginx)
2. **Use CDN** for static assets
3. **Implement caching** (already configured in nginx)
4. **Scale horizontally** using cloud platform auto-scaling

## Security Best Practices

1. **Never commit secrets** to version control
2. **Use secrets management** (AWS Secrets Manager, Google Secret Manager, Azure Key Vault)
3. **Keep base images updated**
4. **Scan images for vulnerabilities**
5. **Use read-only root filesystem** (configured in docker-compose.prod.yml)
6. **Implement rate limiting** at the load balancer level

## Backup and Disaster Recovery

1. **Tag images with version numbers**
2. **Keep multiple versions in registry**
3. **Document rollback procedures**
4. **Test disaster recovery plans regularly**

## Cost Optimization

- **Use appropriate instance sizes**
- **Implement auto-scaling**
- **Use spot instances** (AWS) or preemptible VMs (GCP) for non-critical workloads
- **Monitor and optimize resource usage**

---

For additional help, please refer to:
- [README.md](README.md) - Project overview
- [CONTRIBUTING.md](CONTRIBUTING.md) - Development guidelines
- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture
