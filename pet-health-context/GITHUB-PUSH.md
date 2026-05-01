# Push **PETHEALTHCARE** to GitHub

Your project folder is already prepared as a **single Git repo** at:

`Documents/PetHealthCare/`

It includes: `figma/`, `pet-health-context/`, `pet-health-backend/`, `pet-health-frontend/` (and ignores `node_modules/`, `.env`, `.cursor/`, etc.).

---

## Part A — Create the empty repo on GitHub (browser)

1. Open [https://github.com/new](https://github.com/new).
2. **Repository name:** `PETHEALTHCARE` (or `PetHealthCare` — GitHub allows both; URL will match what you choose).
3. Choose **Public** or **Private**.
4. **Do not** add README, .gitignore, or license (keeps first push simple), **or** if GitHub forces a README, use Part C below.
5. Click **Create repository**.
6. Copy the repo URL shown, e.g. `https://github.com/YOUR_USERNAME/PETHEALTHCARE.git`

---

## Part B — Link remote and push (PowerShell)

Run these from **`PetHealthCare`** (the parent folder that contains all four projects):

```powershell
cd $HOME\Documents\PetHealthCare

git init
git add .
git status
git commit -m "Initial commit: figma, context, backend, frontend"

git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/PETHEALTHCARE.git
git push -u origin main
```

Replace `YOUR_USERNAME` and the repo name if yours differs.

If Git asks to log in, use a **Personal Access Token (classic)** as the password when using HTTPS, or install [GitHub Desktop](https://desktop.github.com/) and sign in there.

---

## Part C — If the remote repo already has a README (merge first)

```powershell
git pull origin main --allow-unrelated-histories
# resolve conflicts if any, then:
git push -u origin main
```

---

## Optional — GitHub CLI later

Install [GitHub CLI](https://cli.github.com/), run `gh auth login`, then from `PetHealthCare` you can create and push in one flow next time:

```powershell
gh repo create PETHEALTHCARE --public --source=. --remote=origin --push
```

---

## Security reminder

- **Never** commit `pet-health-backend/.env` or real API keys.
- The root `.gitignore` excludes `.env`; keep using `.env.example` as the template only.

---

## Note (already done in this workspace)

Expo had created a **nested** `pet-health-frontend/.git`, which would make Git treat the app as a submodule stub. That inner `.git` was removed so **all frontend files** are tracked in this single monorepo. If you re-scaffold Expo inside a subfolder, delete `subfolder/.git` before committing from the repo root.
