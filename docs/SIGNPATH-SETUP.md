# SignPath Code Signing Setup Guide

This document contains essential information for setting up automated code signing for the Mindmap Electron application using SignPath's free open source program.

## 📋 Prerequisites

- [x] Public GitHub repository with MIT License
- [x] Professional README with documentation
- [x] GitHub Actions workflow configured
- [x] Package-lock.json for reproducible builds
- [ ] SignPath account approval (pending)

## 🚀 Quick Start

### Step 1: Apply for SignPath Open Source Program

**Application URL:** https://signpath.io/open-source

**Form Information:**

| Field | Value |
|-------|-------|
| **Name** | Mindmap |
| **Handle** | mindmap-electron |
| **Type** | Desktop Application |
| **License** | MIT |
| **Repository URL** | https://github.com/thehighnotes/mindmap |
| **Homepage URL** | https://github.com/thehighnotes/mindmap |
| **Download URL** | https://github.com/thehighnotes/mindmap/releases |
| **Privacy Policy URL** | (Leave blank or add if created) |
| **Wikipedia URL** | (Leave blank) |
| **Tagline** | Visual brainstorming tool for organizing ideas and thoughts |
| **Description** | Mindmap is a powerful, cross-platform Electron application for visual brainstorming and organizing ideas. It features real-time collaboration, AI-powered idea generation, smart versioning, and export to multiple formats. The app works both as a desktop application and web app, supporting Windows, macOS, and Linux. |
| **Reputation** | New open source project with active development. Features comprehensive documentation, contribution guidelines, and automated CI/CD pipeline via GitHub Actions. |
| **User Full Name** | Mark Wind |
| **User Email** | (Your GitHub email) |
| **Build System** | GitHub Actions |

### Step 2: Wait for Approval

SignPath typically responds within 2-3 business days. You'll receive an email with:
- Organization ID
- Project Slug
- Instructions for setup

### Step 3: Configure GitHub Secrets

Once approved, add these secrets to your repository:

1. Go to: https://github.com/thehighnotes/mindmap/settings/secrets/actions
2. Click "New repository secret"
3. Add the following secrets:

| Secret Name | Value |
|-------------|-------|
| `SIGNPATH_ORGANIZATION_ID` | (Provided by SignPath) |
| `SIGNPATH_PROJECT_SLUG` | (Provided by SignPath) |

### Step 4: Create a Signed Release

After adding the secrets, create a new release to trigger signing:

```bash
# Update version in package.json first
git add package.json package-lock.json
git commit -m "chore: Bump version to v0.95.1"
git push origin main

# Create and push a new tag
git tag -a v0.95.1 -m "Release v0.95.1 - First signed release"
git push origin v0.95.1
```

## 🔧 GitHub Actions Workflow

The workflow (`.github/workflows/build-and-sign.yml`) is configured to:

1. **Trigger on tags** starting with `v*`
2. **Build for all platforms:**
   - Windows (NSIS installer + Portable)
   - macOS (DMG)
   - Linux (AppImage + DEB)
3. **Sign Windows binaries** via SignPath (when secrets are configured)
4. **Create GitHub releases** automatically

### Manual Release Trigger

You can also trigger a release manually:
1. Go to https://github.com/thehighnotes/mindmap/actions
2. Click on "Build and Sign" workflow
3. Click "Run workflow"
4. Select release type (draft/prerelease/release)

## 📦 Build Configuration

### Electron Builder Settings

The `package.json` contains the following signing configuration:

```json
"win": {
  "target": [
    { "target": "nsis", "arch": ["x64"] },
    { "target": "portable", "arch": ["x64"] }
  ],
  "publisherName": "Mark Wind",
  "verifyUpdateCodeSignature": true,
  "certificateSubjectName": "Mark Wind",
  "signDlls": true
}
```

### File Structure

```
mindmap/
├── .github/
│   └── workflows/
│       └── build-and-sign.yml    # CI/CD pipeline
├── electron/                      # Electron main process
├── js/                           # Application logic
├── css/                          # Styles
├── assets/                       # Icons and resources
├── LICENSE                       # MIT License
├── README.md                     # Documentation
├── CONTRIBUTING.md               # Contribution guidelines
├── package.json                  # Project configuration
├── package-lock.json            # Dependency lock file
└── SIGNPATH-SETUP.md            # This file
```

## ✅ Verification Checklist

Before applying to SignPath, ensure:

- [ ] Repository is public
- [ ] MIT License is present
- [ ] README has clear documentation
- [ ] Releases page exists
- [ ] At least one release/tag exists
- [ ] Code has meaningful commits
- [ ] Project has a clear purpose

## 🔍 Monitoring Builds

### Check Build Status
- **Actions:** https://github.com/thehighnotes/mindmap/actions
- **Releases:** https://github.com/thehighnotes/mindmap/releases

### Common Issues and Solutions

| Issue | Solution |
|-------|----------|
| SignPath action not found | Already fixed - using `SignPath/github-action-submit-signing-request@v1` |
| Missing dependency lock | Already fixed - `package-lock.json` added |
| Signing fails | Ensure SignPath secrets are correctly added |
| Build fails on Windows | Check electron-builder configuration |

## 🔒 Security Notes

1. **Never commit SignPath credentials** to the repository
2. **Keep secrets in GitHub Secrets** only
3. **Signed binaries** will show "Mark Wind" as publisher
4. **Windows SmartScreen** will trust signed executables

## 📚 Resources

- [SignPath Documentation](https://docs.signpath.io/)
- [SignPath GitHub Action](https://github.com/SignPath/github-action-submit-signing-request)
- [Electron Builder Code Signing](https://www.electron.build/code-signing)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

## 📞 Support

- **SignPath Support:** support@signpath.io
- **Project Issues:** https://github.com/thehighnotes/mindmap/issues
- **Discussions:** https://github.com/thehighnotes/mindmap/discussions

## 🎯 Next Steps After Signing is Active

1. **Announce the signed release** to users
2. **Update README** to mention code signing
3. **Create a release blog post** (optional)
4. **Share on social media** to gain users
5. **Monitor download statistics** on GitHub

## 📝 Notes

- SignPath provides **free code signing for open source** projects
- Certificates are valid for **1 year** (renewable)
- You can sign **unlimited releases**
- SignPath signs only **Windows binaries** (.exe, .msi, .dll)
- macOS and Linux don't require third-party signing for open source

---

**Last Updated:** January 2025
**Maintained by:** Mark Wind