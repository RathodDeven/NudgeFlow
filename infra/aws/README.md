# AWS Bootstrap (ap-south-1)

MVP target region: `ap-south-1` (Mumbai)

## Provisioning baseline
1. VPC with private subnets for services.
2. One EC2 instance for Docker Compose MVP workloads.
3. RDS Postgres and ElastiCache Redis (phase-2 optional).
4. SSM Parameter Store for secrets.

## Minimum IAM
- `AmazonSSMManagedInstanceCore`
- Read access to Parameter Store path `/nudgeflow/*`

## Deployment
Use `bootstrap.sh` as initial host prep, then deploy with Docker Compose.
