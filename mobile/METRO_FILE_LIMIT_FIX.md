# Fix: "EMFILE: too many open files" Error

## The Problem

Metro bundler needs to watch many files, but macOS has a low default limit (usually 256) on open file descriptors.

## Quick Fix (Current Session)

Run this in your terminal before starting Metro:

```bash
ulimit -n 4096
bun run start
```

## Permanent Fix

### Option 1: Add to Shell Config (Recommended)

I've already added this to your `~/.bash_profile`. After restarting your terminal or running:

```bash
source ~/.bash_profile
```

The limit will be set automatically.

### Option 2: System-Wide Limit (Requires Admin)

For a system-wide fix, create/edit `/etc/launchd.conf`:

```bash
sudo nano /etc/launchd.conf
```

Add:
```
limit maxfiles 65536 200000
```

Then restart your Mac (or run):
```bash
sudo launchctl limit maxfiles 65536 200000
```

### Option 3: Use Watchman (Alternative)

Install Watchman, which is more efficient for file watching:

```bash
brew install watchman
```

Then restart Metro. Watchman handles file watching more efficiently.

## Verify the Fix

Check your current limit:

```bash
ulimit -n
```

Should show: `4096` or higher

## What I Did

✅ Set `ulimit -n 4096` for current session
✅ Added `ulimit -n 4096` to `~/.bash_profile` for future sessions

## Try Again

Now run:

```bash
ulimit -n 4096
bun run start
```

Metro should start without the EMFILE error!

## If Still Having Issues

1. **Install Watchman** (best solution):
   ```bash
   brew install watchman
   ```

2. **Check for too many node_modules**:
   ```bash
   cd mobile
   find node_modules -type f | wc -l
   ```
   If this is very high (>100k), consider using `.watchmanconfig` or excluding some directories.

3. **Use npm instead of bun** (if bun has issues):
   ```bash
   npm start
   ```

