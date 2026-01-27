# Production Deployment Guide: Database Reorganization & Caregiver Dashboard

This guide covers deploying the database reorganization and caregiver dashboard feature to production.

## Prerequisites

- Access to production database
- Backend deployment access
- Frontend deployment access (web and mobile)
- Database backup capability
- Ability to run migrations

## Pre-Deployment Checklist

- [ ] Backup production database
- [ ] Test migrations on staging/dev environment
- [ ] Verify all code changes are committed and pushed
- [ ] Review migration scripts for data safety
- [ ] Plan maintenance window (if needed)

## Step-by-Step Deployment

### Step 1: Backup Production Database

**CRITICAL: Always backup before running migrations**

```bash
# If using SQLite, copy the database file
cp /path/to/production/database.db /path/to/backup/database_$(date +%Y%m%d_%H%M%S).db

# Or use your database backup tool
# For example, if using a managed database service, use their backup feature
```

### Step 2: Deploy Backend Code

1. **Pull latest code** (if not already deployed):
   ```bash
   cd /path/to/production/backend
   git pull origin main  # or your production branch
   ```

2. **Install dependencies** (if needed):
   ```bash
   bun install
   ```

3. **Verify environment variables** are set:
   - `DATABASE_URL` or database connection string
   - `JWT_SECRET`
   - Other required env vars

### Step 3: Run Database Schema Migration

**Run the schema migration to create new tables:**

```bash
cd /path/to/production/backend
bun run src/db/migrate.ts
```

**Expected output:**
```
Running migrations...
Database migrations completed successfully!
✓ All required tables verified!
```

**Verify migration success:**
- Check that new tables exist: `organisations`, `organisation_users`, `caretakers`
- Check that `patients` table has new columns: `organisation_id`, `user_id`
- Check migration journal: The migration `0010_organisations` should be recorded

### Step 4: Run Data Migration

**Migrate existing data to new structure:**

```bash
cd /path/to/production/backend
bun run src/db/migrateData.ts
```

**Expected output:**
```
Starting data migration for organisations...
Found X patients to migrate
Created organisation "User's Organisation" (ID: 1) for user 1
Updated patient 1: organisationId=1, userId=2
...
Data migration completed successfully!
```

**Verify data migration:**
- Check that all patients have `organisation_id` set
- Check that patients have `user_id` set (where applicable)
- Check that organisations were created
- Check that caretakers were created (if any existed)

**If warnings appear:**
- `WARNING: X patients still have null organisationId` - These may need manual assignment
- `WARNING: X patients still have null userId` - These may need manual assignment

### Step 5: Restart Backend Service

**Restart your backend service to load new code:**

```bash
# If using systemd
sudo systemctl restart healthpuck-backend

# If using PM2
pm2 restart healthpuck-backend

# If using Docker
docker-compose restart backend

# If using Fly.io (already deployed via git push)
# No manual restart needed, but verify deployment
```

**Verify backend is running:**
```bash
curl http://your-backend-url/health
```

### Step 6: Deploy Web Frontend

1. **Build the web app:**
   ```bash
   cd /path/to/production/web
   npm run build
   # or
   yarn build
   ```

2. **Deploy built files:**
   - If using GitHub Pages: Push to `gh-pages` branch
   - If using a web server: Copy `build/` or `dist/` to web root
   - If using a CDN: Upload build files
   - If using Vercel/Netlify: Push to trigger deployment

3. **Verify deployment:**
   - Visit the web app
   - Test login
   - Verify routing works (caregivers see caregiver dashboard, patients see patient dashboard)

### Step 7: Deploy Mobile App

1. **Build mobile app:**
   ```bash
   cd /path/to/production/mobile
   
   # For Android
   cd android && ./gradlew assembleRelease
   
   # For iOS
   cd ios && xcodebuild -workspace Healthpuck.xcworkspace -scheme Healthpuck -configuration Release
   ```

2. **Test the build:**
   - Install on test device
   - Verify caregiver dashboard appears for caregivers
   - Verify patient dashboard appears for patients

3. **Submit to app stores:**
   - Android: Upload APK/AAB to Google Play Console
   - iOS: Upload to App Store Connect via Xcode or Transporter

### Step 8: Post-Deployment Verification

**Test the following scenarios:**

1. **Patient User:**
   - [ ] Can log in
   - [ ] Sees patient dashboard (unchanged)
   - [ ] Can view their own data
   - [ ] All existing functionality works

2. **Caregiver User:**
   - [ ] Can log in
   - [ ] Sees caregiver dashboard
   - [ ] Can see organisation name
   - [ ] Can see list of patients in organisation
   - [ ] Can expand patient to see heart rate
   - [ ] Can see active alarms for patients
   - [ ] Can navigate to alarm settings

3. **API Endpoints:**
   ```bash
   # Test organisation endpoint
   curl -H "Authorization: Bearer <token>" \
     http://your-backend-url/api/organisations
   
   # Test organisation patients endpoint
   curl -H "Authorization: Bearer <token>" \
     http://your-backend-url/api/organisations/patients
   
   # Test alerts with patientId (for caregivers)
   curl -H "Authorization: Bearer <token>" \
     http://your-backend-url/api/alerts/active?patientId=1
   ```

4. **Database Verification:**
   ```sql
   -- Check organisations were created
   SELECT COUNT(*) FROM organisations;
   
   -- Check patients have organisation_id
   SELECT COUNT(*) FROM patients WHERE organisation_id IS NOT NULL;
   
   -- Check caretakers were created
   SELECT COUNT(*) FROM caretakers;
   ```

### Step 9: Monitor for Issues

**Watch for:**
- Error logs in backend
- User reports of missing data
- API errors
- Database connection issues
- Performance degradation

**Check logs:**
```bash
# Backend logs
tail -f /path/to/backend/logs/app.log

# Or if using systemd
journalctl -u healthpuck-backend -f

# Or if using Docker
docker logs -f healthpuck-backend
```

## Rollback Procedure

**If something goes wrong, follow these steps:**

### 1. Stop Backend Service
```bash
sudo systemctl stop healthpuck-backend
# or
pm2 stop healthpuck-backend
```

### 2. Restore Database Backup
```bash
# Restore from backup
cp /path/to/backup/database_YYYYMMDD_HHMMSS.db /path/to/production/database.db
```

### 3. Revert Code Changes
```bash
# Revert to previous commit
cd /path/to/production/backend
git checkout <previous-commit-hash>

# Revert frontend
cd /path/to/production/web
git checkout <previous-commit-hash>
npm run build
```

### 4. Restart Services
```bash
sudo systemctl start healthpuck-backend
# or
pm2 start healthpuck-backend
```

### 5. Verify Rollback
- Test that everything works as before
- Check that old functionality is restored

## Troubleshooting

### Migration Fails

**Issue:** Migration script fails with errors

**Solution:**
1. Check database connection
2. Verify database file permissions
3. Check for locked database (close all connections)
4. Review error message for specific issue
5. Restore from backup if needed

### Data Migration Issues

**Issue:** Some patients don't have organisation_id

**Solution:**
1. Check migration logs for warnings
2. Manually assign organisations if needed:
   ```sql
   -- Find patients without organisation
   SELECT * FROM patients WHERE organisation_id IS NULL;
   
   -- Create organisation if needed
   INSERT INTO organisations (name, created_at, updated_at)
   VALUES ('Manual Organisation', datetime('now'), datetime('now'));
   
   -- Assign patient to organisation
   UPDATE patients 
   SET organisation_id = <org_id>
   WHERE id = <patient_id>;
   ```

### API Errors After Deployment

**Issue:** Caregivers can't access organisation endpoints

**Solution:**
1. Verify user is in `caretakers` table
2. Check organisation_users table for user
3. Verify middleware is working
4. Check authentication token

### Frontend Routing Issues

**Issue:** Wrong dashboard shown

**Solution:**
1. Clear browser cache
2. Verify API calls are working
3. Check browser console for errors
4. Verify role detection logic

## Maintenance Notes

- **New patients:** Will automatically get organisation_id when created
- **New caregivers:** Need to be added to `caretakers` table manually or via future admin interface
- **Organisation management:** Currently manual via database, consider adding admin UI later

## Support Contacts

- Database issues: [Your DB admin]
- Backend issues: [Your backend dev]
- Frontend issues: [Your frontend dev]
- Deployment issues: [Your DevOps]

## Additional Notes

- The patient dashboard remains **unchanged** - existing patients will see the same interface
- Caregivers will see the new caregiver dashboard automatically
- No user action required - migration is automatic
- Data is preserved - all existing data is migrated, not deleted

---

**Last Updated:** [Date]
**Version:** 1.0
**Author:** [Your Name]
