# Arabic YouTube Transcript Translator - Deployment Plan

## Overview
This document outlines the deployment strategy for the Arabic YouTube Transcript Translator application, including infrastructure, security, CI/CD pipeline, and cost estimation for cloud hosting.

## 1. Architecture Components

### Frontend (React Application)
- **Static web assets** (HTML, CSS, JS files)
- **Client-side routing**
- **State management** via React Context

### Backend (Node.js/Express)
- **API server**
- **Job processing system**
- **External API integrations** (YouTube, OpenAI, Azure Speech)
- **File storage** for audio files and generated documents

## 2. Recommended Cloud Platform: AWS

### Frontend Hosting
- **AWS Amplify** or **Amazon S3 + CloudFront**
  - Static file hosting with global CDN distribution
  - HTTPS support via AWS Certificate Manager
  - CI/CD integration for automated deployments from GitHub

### Backend Services
- **AWS Elastic Beanstalk** (with Node.js platform)
  - Auto-scaling based on traffic
  - Health monitoring and self-healing
  - Easy deployment with Git integration

- **Alternative**: **AWS Elastic Container Service (ECS)** with Fargate
  - Containerized deployment for better isolation
  - Simplified scaling and management
  - Higher flexibility for complex setups

### File Storage
- **Amazon S3**
  - Store uploaded audio files
  - Store generated transcripts and translations
  - Lifecycle policies for automatic cleanup of temporary files

### Database (for job tracking)
- **Amazon DynamoDB**
  - NoSQL database for storing job status and metadata
  - High availability and automatic scaling
  - Time-to-live (TTL) feature for automatic record expiration

### Queue System (for job processing)
- **Amazon SQS**
  - Reliable message queuing for job management
  - Dead letter queues for handling failures
  - Decouple job submission from processing

## 3. Infrastructure as Code (IaC)

### Terraform Configuration

Create the following Terraform files:

#### `main.tf` (Core Infrastructure)
```hcl
provider "aws" {
  region = var.aws_region
}

# S3 bucket for frontend assets
resource "aws_s3_bucket" "frontend" {
  bucket = "${var.project_name}-frontend"
  acl    = "public-read"

  website {
    index_document = "index.html"
    error_document = "index.html"
  }
}

# CloudFront distribution for frontend
resource "aws_cloudfront_distribution" "frontend_distribution" {
  origin {
    domain_name = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_id   = "S3-${aws_s3_bucket.frontend.bucket}"
  }
  
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  
  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-${aws_s3_bucket.frontend.bucket}"
    viewer_protocol_policy = "redirect-to-https"
    
    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
  }
  
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
  
  viewer_certificate {
    cloudfront_default_certificate = true
  }
  
  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
  }
}

# S3 bucket for file storage
resource "aws_s3_bucket" "storage" {
  bucket = "${var.project_name}-storage"
  acl    = "private"
  
  lifecycle_rule {
    enabled = true
    expiration {
      days = 7  # Delete files after 7 days
    }
  }
}

# DynamoDB table for job tracking
resource "aws_dynamodb_table" "jobs" {
  name         = "${var.project_name}-jobs"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "jobId"
  
  attribute {
    name = "jobId"
    type = "S"
  }
  
  ttl {
    attribute_name = "ttl"
    enabled        = true
  }
}

# SQS queue for job processing
resource "aws_sqs_queue" "job_queue" {
  name                      = "${var.project_name}-job-queue"
  message_retention_seconds = 86400  # 24 hours
  visibility_timeout_seconds = 900   # 15 minutes
}

# Dead letter queue
resource "aws_sqs_queue" "dlq" {
  name = "${var.project_name}-dlq"
}
```

#### `elastic_beanstalk.tf` (Backend Environment)
```hcl
resource "aws_elastic_beanstalk_application" "app" {
  name        = var.project_name
  description = "Arabic YouTube Transcript Translator Application"
}

resource "aws_elastic_beanstalk_environment" "backend" {
  name                = "${var.project_name}-backend"
  application         = aws_elastic_beanstalk_application.app.name
  solution_stack_name = "64bit Amazon Linux 2 v5.5.0 running Node.js 16"
  
  setting {
    namespace = "aws:autoscaling:launchconfiguration"
    name      = "InstanceType"
    value     = "t3.small"
  }
  
  setting {
    namespace = "aws:autoscaling:asg"
    name      = "MinSize"
    value     = "1"
  }
  
  setting {
    namespace = "aws:autoscaling:asg"
    name      = "MaxSize"
    value     = "3"
  }
  
  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "NODE_ENV"
    value     = "production"
  }
  
  # Add IAM role for S3 and SQS access
  setting {
    namespace = "aws:autoscaling:launchconfiguration"
    name      = "IamInstanceProfile"
    value     = aws_iam_instance_profile.eb_profile.name
  }
}
```

#### `variables.tf` (Configuration Variables)
```hcl
variable "aws_region" {
  description = "AWS region to deploy resources"
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name used for resource naming"
  default     = "arabic-transcript-translator"
}

variable "environment" {
  description = "Deployment environment (e.g., dev, staging, prod)"
  default     = "prod"
}
```

#### `iam.tf` (Access Control)
```hcl
# IAM role for Elastic Beanstalk
resource "aws_iam_role" "eb_role" {
  name = "${var.project_name}-eb-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
        Effect = "Allow"
      }
    ]
  })
}

# IAM policy for accessing S3 and SQS
resource "aws_iam_policy" "app_policy" {
  name        = "${var.project_name}-app-policy"
  description = "Policy for S3 and SQS access"
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.storage.arn,
          "${aws_s3_bucket.storage.arn}/*"
        ]
        Effect = "Allow"
      },
      {
        Action = [
          "sqs:SendMessage",
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes"
        ]
        Resource = [
          aws_sqs_queue.job_queue.arn,
          aws_sqs_queue.dlq.arn
        ]
        Effect = "Allow"
      },
      {
        Action = [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = aws_dynamodb_table.jobs.arn
        Effect = "Allow"
      }
    ]
  })
}

# Attach policy to role
resource "aws_iam_role_policy_attachment" "eb_policy_attachment" {
  role       = aws_iam_role.eb_role.name
  policy_arn = aws_iam_policy.app_policy.arn
}

# Instance profile for Elastic Beanstalk
resource "aws_iam_instance_profile" "eb_profile" {
  name = "${var.project_name}-eb-profile"
  role = aws_iam_role.eb_role.name
}
```

## 4. Environment Variables and Secrets Management

### AWS Systems Manager Parameter Store

Use AWS Parameter Store to securely store sensitive configuration:

```bash
# Store API keys securely (via AWS CLI or Terraform)
# Run these commands during initial setup:

# YouTube API key
aws ssm put-parameter \
  --name "/arabic-translator/YOUTUBE_API_KEY" \
  --value "your-youtube-api-key" \
  --type "SecureString" \
  --region "us-east-1"

# OpenAI API key
aws ssm put-parameter \
  --name "/arabic-translator/OPENAI_API_KEY" \
  --type "SecureString" \
  --value "your-openai-api-key" \
  --region "us-east-1"
  
# Azure Speech API key
aws ssm put-parameter \
  --name "/arabic-translator/MARKITDOWN_API_KEY" \
  --type "SecureString" \
  --value "your-azure-api-key" \
  --region "us-east-1"

# Azure Speech endpoint
aws ssm put-parameter \
  --name "/arabic-translator/MARKITDOWN_ENDPOINT" \
  --type "String" \
  --value "https://your-custom-endpoint.cognitiveservices.azure.com/" \
  --region "us-east-1"
  
# Azure Speech region
aws ssm put-parameter \
  --name "/arabic-translator/MARKITDOWN_REGION" \
  --type "String" \
  --value "eastus" \
  --region "us-east-1"
```

### Environment Variables in Elastic Beanstalk

Update the `elastic_beanstalk.tf` file to include environment variables:

```hcl
# Add these settings to the aws_elastic_beanstalk_environment resource
setting {
  namespace = "aws:elasticbeanstalk:application:environment"
  name      = "NODE_ENV"
  value     = "production"
}

setting {
  namespace = "aws:elasticbeanstalk:application:environment"
  name      = "S3_BUCKET"
  value     = aws_s3_bucket.storage.bucket
}

setting {
  namespace = "aws:elasticbeanstalk:application:environment"
  name      = "SQS_QUEUE_URL"
  value     = aws_sqs_queue.job_queue.url
}

setting {
  namespace = "aws:elasticbeanstalk:application:environment"
  name      = "DYNAMODB_TABLE"
  value     = aws_dynamodb_table.jobs.name
}

# Use SSM parameters instead of hardcoding secrets
setting {
  namespace = "aws:elasticbeanstalk:application:environment"
  name      = "YOUTUBE_API_KEY_PARAM"
  value     = "/arabic-translator/YOUTUBE_API_KEY"
}

setting {
  namespace = "aws:elasticbeanstalk:application:environment"
  name      = "OPENAI_API_KEY_PARAM"
  value     = "/arabic-translator/OPENAI_API_KEY"
}

setting {
  namespace = "aws:elasticbeanstalk:application:environment"
  name      = "MARKITDOWN_API_KEY_PARAM"
  value     = "/arabic-translator/MARKITDOWN_API_KEY"
}
```

Update the Node.js application to load parameters from SSM:

```javascript
// Add to server.js or config.js
const AWS = require('aws-sdk');
const ssm = new AWS.SSM({ region: 'us-east-1' });

async function loadSecretsFromSSM() {
  const getParam = async (name) => {
    const param = await ssm.getParameter({ Name: name, WithDecryption: true }).promise();
    return param.Parameter.Value;
  };
  
  process.env.YOUTUBE_API_KEY = await getParam(process.env.YOUTUBE_API_KEY_PARAM);
  process.env.OPENAI_API_KEY = await getParam(process.env.OPENAI_API_KEY_PARAM);
  process.env.MARKITDOWN_API_KEY = await getParam(process.env.MARKITDOWN_API_KEY_PARAM);
}

// Call this function when your app starts
lodaSecretsFromSSM().then(() => {
  console.log('Secrets loaded from SSM');
});
```

## 5. CI/CD Pipeline with GitHub Actions

### Frontend CI/CD Workflow

Create `.github/workflows/frontend-deploy.yml`:

```yaml
name: Frontend Deployment

on:
  push:
    branches:
      - main
    paths:
      - 'src/**'
      - 'public/**'
      - 'package.json'
      - '.github/workflows/frontend-deploy.yml'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
        
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '16'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
        
      - name: Build application
        run: npm run build
        
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v1
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
          
      - name: Deploy to S3
        run: |
          aws s3 sync dist/ s3://arabic-transcript-translator-frontend --delete
          
      - name: Invalidate CloudFront cache
        run: |
          aws cloudfront create-invalidation \
            --distribution-id ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }} \
            --paths "/*"
```

### Backend CI/CD Workflow

Create `.github/workflows/backend-deploy.yml`:

```yaml
name: Backend Deployment

on:
  push:
    branches:
      - main
    paths:
      - 'backend/**'
      - '.github/workflows/backend-deploy.yml'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
        
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '16'
          cache: 'npm'
          cache-dependency-path: 'backend/package.json'
      
      - name: Install dependencies
        run: cd backend && npm ci
        
      - name: Run tests
        run: cd backend && npm test
        
      - name: Generate deployment package
        run: |
          cd backend
          zip -r ../deploy.zip .
        
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v1
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
          
      - name: Deploy to Elastic Beanstalk
        uses: einaregilsson/beanstalk-deploy@v20
        with:
          aws_access_key: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws_secret_key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          application_name: arabic-transcript-translator
          environment_name: arabic-transcript-translator-backend
          version_label: "ver-${{ github.sha }}"
          region: us-east-1
          deployment_package: deploy.zip
```

## 6. API Configuration for Production

### YouTube Data API
- **API Key Restrictions**:
  - Restrict the API key to only the YouTube Data API v3
  - Set up HTTP referrer restrictions to your domain
  - Set appropriate quota limits (daily and per-minute)

### OpenAI API
- **Rate Limiting**:
  - Implement exponential backoff for rate limit handling
  - Set up monitoring for token usage
  - Consider using a queue system for translation requests to control costs

### Azure Speech SDK
- **Configuration**:
  - Ensure the service is configured for Arabic language support
  - Enable logging for debugging transcription issues
  - Use the appropriate service tier based on expected volume

## 7. Cost Estimation (Monthly)

| Service | Configuration | Estimated Cost (USD) |
|---------|---------------|----------------------|
| **Frontend** | | |
| S3 | 5GB storage | $0.12 |
| CloudFront | 50GB data transfer | $4.50 |
| **Backend** | | |
| Elastic Beanstalk (t3.small) | 1 instance, 24/7 | $20.00 |
| S3 Storage | 20GB for audio/documents | $0.46 |
| DynamoDB | 5M read/write, 5GB storage | $6.00 |
| SQS | 1M requests | $0.40 |
| **External APIs** | | |
| YouTube Data API | Basic tier (free) | $0.00 |
| OpenAI API | 1M tokens/month | $20.00 |
| Azure Speech Services | 50 hours/month | $60.00 |
| **Total** | | **~$111.48** |

### Cost Optimization Strategies

1. **Scale to Zero**: Use AWS Lambda for some backend processing to avoid paying for idle time
2. **Auto-scaling**: Configure Elastic Beanstalk to scale down during off-peak hours
3. **Lifecycle Policies**: Automatically delete old files from S3 to reduce storage costs
4. **Caching**: Cache common translation results to reduce API calls
5. **Reserved Instances**: Use reserved instances for predictable workloads to get discounts

## 8. Monitoring and Logging

### CloudWatch Setup

- **Custom Dashboard** for key metrics:
  - API request counts and latencies
  - Job processing times
  - Error rates
  - External API call statistics

- **Log Groups** to configure:
  - Application logs
  - Access logs
  - Error logs
  - External API interaction logs

- **Alarms** to set up:
  - High error rates
  - Slow API responses
  - Failed jobs
  - API quota approaching limits

## 9. Backup and Disaster Recovery

1. **Database Backups**: Enable point-in-time recovery for DynamoDB
2. **S3 Versioning**: Enable versioning for important S3 buckets
3. **Multi-Region Considerations**: For high availability, consider multi-region deployment
4. **Backup Testing**: Regularly test the restoration process

## 10. Security Considerations

1. **HTTPS Everywhere**: Enforce HTTPS for all connections
2. **WAF Protection**: Add AWS WAF to protect from common web vulnerabilities
3. **Regular Updates**: Keep all dependencies up to date
4. **Content Security Policy**: Implement strict CSP headers
5. **CORS Configuration**: Restrict cross-origin requests appropriately

## Next Steps

1. Set up GitHub repository with proper branch protection
2. Create AWS account and configure IAM permissions
3. Deploy Terraform infrastructure code
4. Set up CI/CD pipelines
5. Configure monitoring and alerting
6. Perform security review and penetration testing
7. Conduct load testing to ensure scalability
