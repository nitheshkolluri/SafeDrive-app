# SafeDrive - Google Cloud Run Deployment Guide

This guide will walk you through deploying the SafeDrive PWA to Google Cloud Run.

## Prerequisites

Before you begin, ensure you have:

1. **Google Cloud Account**: [Sign up here](https://cloud.google.com/) if you don't have one
2. **Google Cloud SDK (gcloud CLI)**: [Install instructions](https://cloud.google.com/sdk/docs/install)
3. **Docker Desktop**: [Download here](https://www.docker.com/products/docker-desktop/)
4. **Git**: For version control (optional but recommended)

## Step-by-Step Deployment

### Step 1: Set Up Google Cloud Project

1. **Create a new project** (or use an existing one):
   ```bash
   gcloud projects create safedrive-app --name="SafeDrive"
   ```

2. **Set the project as active**:
   ```bash
   gcloud config set project safedrive-app
   ```

3. **Enable required APIs**:
   ```bash
   gcloud services enable cloudbuild.googleapis.com
   gcloud services enable run.googleapis.com
   gcloud services enable containerregistry.googleapis.com
   ```

4. **Set up billing** (required for Cloud Run):
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Navigate to Billing and link a billing account to your project

### Step 2: Configure Environment Variables

1. **Create a `.env.production` file** in your project root:
   ```bash
   VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   ```

2. **Update `vite.config.ts`** to use production env vars:
   - The current config already loads from `.env` files
   - Make sure your API keys are valid for production domains

### Step 3: Build and Test Locally

1. **Test the Docker build locally**:
   ```bash
   docker build -t safedrive-app .
   ```

2. **Run the container locally**:
   ```bash
   docker run -p 8080:8080 safedrive-app
   ```

3. **Test in browser**:
   - Open http://localhost:8080
   - Verify all features work correctly

### Step 4: Deploy to Cloud Run

#### Option A: Deploy using gcloud CLI (Recommended)

1. **Authenticate with Google Cloud**:
   ```bash
   gcloud auth login
   ```

2. **Set your region** (choose one close to your users):
   ```bash
   gcloud config set run/region us-central1
   ```
   
   Popular regions:
   - `us-central1` (Iowa, USA)
   - `us-east1` (South Carolina, USA)
   - `europe-west1` (Belgium)
   - `asia-southeast1` (Singapore)

3. **Deploy to Cloud Run**:
   ```bash
   gcloud run deploy safedrive \
     --source . \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --port 8080 \
     --memory 512Mi \
     --cpu 1 \
     --min-instances 0 \
     --max-instances 10
   ```

   **Explanation of flags**:
   - `--source .`: Build from current directory
   - `--platform managed`: Use fully managed Cloud Run
   - `--allow-unauthenticated`: Make app publicly accessible
   - `--port 8080`: Container port (matches nginx config)
   - `--memory 512Mi`: Allocate 512MB RAM
   - `--cpu 1`: Use 1 vCPU
   - `--min-instances 0`: Scale to zero when not in use (saves cost)
   - `--max-instances 10`: Maximum concurrent instances

4. **Wait for deployment** (this may take 3-5 minutes):
   - Cloud Build will build your Docker image
   - The image will be pushed to Container Registry
   - Cloud Run will deploy the service

5. **Get your app URL**:
   - The deployment will output a URL like: `https://safedrive-xxxxx-uc.a.run.app`
   - Save this URL!

#### Option B: Deploy using Google Cloud Console (GUI)

1. **Build and push Docker image manually**:
   ```bash
   # Configure Docker to use gcloud as credential helper
   gcloud auth configure-docker
   
   # Build the image
   docker build -t gcr.io/safedrive-app/safedrive:latest .
   
   # Push to Google Container Registry
   docker push gcr.io/safedrive-app/safedrive:latest
   ```

2. **Deploy via Console**:
   - Go to [Cloud Run Console](https://console.cloud.google.com/run)
   - Click "Create Service"
   - Select "Deploy one revision from an existing container image"
   - Choose your image: `gcr.io/safedrive-app/safedrive:latest`
   - Configure:
     - Service name: `safedrive`
     - Region: Choose your preferred region
     - Authentication: Allow unauthenticated invocations
     - Container port: `8080`
     - Memory: `512 MiB`
     - CPU: `1`
   - Click "Create"

### Step 5: Configure Custom Domain (Optional)

1. **Verify domain ownership**:
   ```bash
   gcloud domains verify safedrive.com
   ```

2. **Map your domain**:
   ```bash
   gcloud run domain-mappings create \
     --service safedrive \
     --domain safedrive.com \
     --region us-central1
   ```

3. **Update DNS records**:
   - Cloud Run will provide DNS records
   - Add these to your domain registrar (e.g., Google Domains, Namecheap)

### Step 6: Enable HTTPS and Security

Cloud Run automatically provides:
- ✅ **HTTPS/TLS encryption** (free SSL certificate)
- ✅ **DDoS protection**
- ✅ **Automatic scaling**

Additional security steps:

1. **Set up Cloud Armor** (optional, for advanced DDoS protection):
   ```bash
   gcloud compute security-policies create safedrive-policy
   ```

2. **Configure CORS** (if needed for API calls):
   - Update `nginx.conf` to add CORS headers

### Step 7: Monitor and Maintain

1. **View logs**:
   ```bash
   gcloud run services logs read safedrive --region us-central1
   ```

2. **Monitor metrics**:
   - Go to [Cloud Run Console](https://console.cloud.google.com/run)
   - Click on your service
   - View metrics: requests, latency, CPU, memory

3. **Set up alerts** (optional):
   ```bash
   gcloud alpha monitoring policies create \
     --notification-channels=CHANNEL_ID \
     --display-name="SafeDrive High Error Rate" \
     --condition-display-name="Error rate > 5%" \
     --condition-threshold-value=0.05
   ```

### Step 8: Update Your App

When you make changes:

1. **Redeploy**:
   ```bash
   gcloud run deploy safedrive \
     --source . \
     --region us-central1
   ```

2. **Or use CI/CD** (recommended for production):
   - Set up GitHub Actions or Cloud Build triggers
   - Auto-deploy on push to `main` branch

## Cost Estimation

Cloud Run pricing (as of 2024):

- **Free tier**: 2 million requests/month
- **After free tier**:
  - $0.40 per million requests
  - $0.00002400 per vCPU-second
  - $0.00000250 per GiB-second

**Estimated monthly cost for moderate traffic**:
- 100,000 requests/month: **~$0-2/month** (within free tier)
- 1 million requests/month: **~$5-10/month**

## Troubleshooting

### Issue: Build fails with "permission denied"
**Solution**: Ensure Docker is running and you're authenticated:
```bash
gcloud auth login
gcloud auth configure-docker
```

### Issue: App shows 404 errors for routes
**Solution**: Verify `nginx.conf` has the SPA fallback:
```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

### Issue: Environment variables not working
**Solution**: 
- Ensure `.env.production` exists
- Rebuild the Docker image
- Check that `vite.config.ts` loads the correct env file

### Issue: App is slow to start (cold start)
**Solution**: Set minimum instances:
```bash
gcloud run services update safedrive \
  --min-instances 1 \
  --region us-central1
```
*Note: This will increase costs as the instance runs 24/7*

## Additional Resources

- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Cloud Run Pricing](https://cloud.google.com/run/pricing)
- [Best Practices for Cloud Run](https://cloud.google.com/run/docs/best-practices)
- [Vite Production Build](https://vitejs.dev/guide/build.html)

## Support

For issues specific to SafeDrive deployment, check:
1. Cloud Run logs: `gcloud run services logs read safedrive`
2. Build logs: `gcloud builds list`
3. Container health: Verify `/health` endpoint returns 200

---

**Congratulations!** 🎉 Your SafeDrive PWA is now live on Google Cloud Run!
