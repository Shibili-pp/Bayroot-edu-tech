# Git Setup Guide - Connect to GitHub Repository

Follow these steps to connect your local code to the GitHub repository:

## Step 1: Initialize Git (if not already done)

```bash
cd "C:\Bayroot edu"
git init
```

## Step 2: Add Remote Repository

```bash
git remote add origin https://github.com/Shibili-pp/Bayroot-edu-tech.git
```

## Step 3: Check Current Status

```bash
git status
```

## Step 4: Create .gitignore (if not exists)

Make sure you have a `.gitignore` file in the root directory with:

```
# Dependencies
node_modules/
package-lock.json
yarn.lock

# Environment variables
.env
.env.local

# Build outputs
dist/
build/
*.log

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Backend specific
backend/uploads/
backend/node_modules/

# Frontend specific
frontend/node_modules/
frontend/dist/
```

## Step 5: Add All Files

```bash
git add .
```

## Step 6: Create Initial Commit

```bash
git commit -m "Initial commit: Bayroot Edu Tech platform with backend and frontend"
```

## Step 7: Set Branch Name (if needed)

```bash
git branch -M main
```

## Step 8: Push to GitHub

```bash
git push -u origin main
```

## If Repository Already Has Content

If the repository already has files, you may need to pull first:

```bash
git pull origin main --allow-unrelated-histories
```

Then resolve any conflicts and push:

```bash
git push -u origin main
```

## Troubleshooting

### If you get authentication error:
- Use GitHub Personal Access Token instead of password
- Or use SSH: `git remote set-url origin git@github.com:Shibili-pp/Bayroot-edu-tech.git`

### If you need to update remote URL:
```bash
git remote set-url origin https://github.com/Shibili-pp/Bayroot-edu-tech.git
```

### Check remote configuration:
```bash
git remote -v
```

## Important Notes

⚠️ **Before pushing, make sure:**
1. `.env` files are in `.gitignore` (they contain sensitive data)
2. `node_modules/` folders are ignored
3. No sensitive credentials are committed

## Quick Commands Summary

```bash
# Navigate to project root
cd "C:\Bayroot edu"

# Initialize git (if needed)
git init

# Add remote
git remote add origin https://github.com/Shibili-pp/Bayroot-edu-tech.git

# Add files
git add .

# Commit
git commit -m "Initial commit: Bayroot Edu Tech platform"

# Push
git push -u origin main
```




