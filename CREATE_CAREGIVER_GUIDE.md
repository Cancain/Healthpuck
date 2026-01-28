# How to Set Up a User as a Caregiver

If you want to see the caregiver dashboard, you need to create an organisation for your user account. Here are the ways to do it:

## Option 1: Using the API (Recommended for Testing)

You can create an organisation via the API:

```bash
# Replace <token> with your JWT token
curl -X POST http://localhost:3001/api/organisations \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "My Organisation"}'
```

Or using the mobile/web API service:
```typescript
await apiService.createOrganisation("My Organisation");
```

## Option 2: Direct Database Insert

If you have database access, you can manually insert:

```sql
-- 1. Create organisation
INSERT INTO organisations (name, created_at, updated_at)
VALUES ('Your Organisation Name', datetime('now'), datetime('now'));

-- Get the organisation ID from the insert result, then:

-- 2. Add user to organisation_users
INSERT INTO organisation_users (organisation_id, user_id)
VALUES (<organisation_id>, <user_id>);

-- 3. Create caretaker entry
INSERT INTO caretakers (user_id, organisation_id, created_at, updated_at)
VALUES (<user_id>, <organisation_id>, datetime('now'), datetime('now'));
```

## Option 3: Using SQLite CLI

```bash
sqlite3 backend/database.db <<EOF
-- Find your user ID
SELECT id, email, name FROM users WHERE email = 'a@a.com';

-- Create organisation (replace <user_id> with actual ID)
INSERT INTO organisations (name, created_at, updated_at)
VALUES ('a''s Organisation', datetime('now'), datetime('now'));

-- Get the organisation ID
SELECT last_insert_rowid();

-- Add to organisation_users (replace <org_id> and <user_id>)
INSERT INTO organisation_users (organisation_id, user_id)
VALUES (<org_id>, <user_id>);

-- Create caretaker entry
INSERT INTO caretakers (user_id, organisation_id, created_at, updated_at)
VALUES (<user_id>, <org_id>, datetime('now'), datetime('now'));
EOF
```

## After Setup

Once you've created the organisation:
1. Restart the mobile app (or refresh the web app)
2. The app should detect you're a caregiver
3. You'll see the caregiver dashboard with an empty patient list
4. You can then add patients to your organisation

## Verify It Worked

Check the logs - you should see:
```
[PatientContext] Organisation: { organisationId: X, organisationName: '...' }
[PatientContext] Patient context set: { isCaretakerRole: true, ... }
```

And the navigation should show `CaregiverDashboardScreen` instead of `DashboardScreen`.
