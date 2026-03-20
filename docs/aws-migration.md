# AWS migration notes (after local docker-compose)

## Proposed free-tier-friendly setup
- **Backend**: AWS Elastic Beanstalk (single instance) or ECS Fargate (smallest task)
- **Database**: PostgreSQL on Amazon RDS free tier (if available in your region)
- **Email**: Amazon SES (API con AWS SDK) oppure SES SMTP
- **Frontend**: S3 + CloudFront for static hosting, or keep it containerized in ECS/Beanstalk

## Suggested path
1. Keep using local docker-compose for functional validation.
2. Provision RDS PostgreSQL and migrate backend env vars.
3. Configure mail mode:
   - `APP_MAIL_PROVIDER=ses` + `APP_MAIL_SES_*` (API mode), oppure
   - `APP_MAIL_PROVIDER=smtp` + `SPRING_MAIL_*` (SMTP mode, anche SES SMTP).
4. Deploy backend first, then deploy frontend with `VITE_API_BASE_URL` set to backend public URL.
5. Enable HTTPS and lock CORS to production domain.

## Backend packaging note
- In locale, il backend viene costruito da `docker-compose.yml` usando `backend/Dockerfile.local`.
- Per Elastic Beanstalk resta valido `backend/Dockerfile`, che si aspetta un jar gia' compilato.
- Flusso consigliato prima del deploy:
  1. `cd backend && mvn clean package`
  2. `cd backend && bash package-beanstalk.sh`
  3. usa `backend-beanstalk.zip` per il deploy

## Minimal environment variables in AWS
- `APP_DB_PROVIDER=rds`
- `APP_DB_RDS_URL`
- `APP_DB_RDS_USERNAME`
- `APP_DB_RDS_PASSWORD`
- `APP_MAIL_ENABLED=true`
- `APP_MAIL_FROM`
- `APP_MAIL_PROVIDER`
- if `APP_MAIL_PROVIDER=ses`: `APP_MAIL_SES_REGION`, `APP_MAIL_SES_ACCESS_KEY`, `APP_MAIL_SES_SECRET_KEY`
- if `APP_MAIL_PROVIDER=smtp`: `SPRING_MAIL_HOST`, `SPRING_MAIL_PORT`, `SPRING_MAIL_USERNAME`, `SPRING_MAIL_PASSWORD`
- `APP_CORS_ALLOWED_ORIGINS`

## SES admin flows (web/mobile)
- Verify request: `POST /api/admin/ses-verify-email`
- Verification status: `GET /api/admin/ses-verification-status?email=...`
- UI capability check: `GET /api/admin/mail-config`

Se il target mobile e' `local`, ricordare che `EXPO_PUBLIC_API_BASE_URL_LOCAL` deve puntare all'IP LAN del PC/Mac, non a `localhost`.

