# Contributing to Universal App Builder

Thank you for your interest in contributing! This guide will help you get started.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Coding Standards](#coding-standards)
- [Pull Request Process](#pull-request-process)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)

## Code of Conduct

This project adheres to the [Contributor Covenant Code of Conduct](https://www.contributor-covenant.org/version/2/0/code_of_conduct/). By participating, you are expected to uphold this code.

## How Can I Contribute?

### 🐛 Reporting Bugs

Before creating bug reports, please check [existing issues](https://github.com/yourusername/universal-app-builder/issues) to avoid duplicates.

**Good bug reports include:**
- Clear, descriptive title
- Steps to reproduce
- Expected vs actual behavior
- Screenshots or error logs
- System information (OS, Node version, etc.)
- Project structure (if relevant)

**Template:**
```markdown
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
1. Import project '...'
2. Select target '...'
3. Click 'Build'
4. See error

**Expected behavior**
What you expected to happen.

**Actual behavior**
What actually happened.

**Screenshots/Logs**
If applicable, add screenshots or build logs.

**Environment:**
 - OS: [e.g., Windows 11, macOS 14, Ubuntu 22.04]
 - Node.js: [e.g., 20.10.0]
 - App Version: [e.g., 1.2.0]
 - Framework: [e.g., Flutter 3.19.0]
```

### 💡 Suggesting Features

Feature suggestions are welcome! Please provide:
- Clear description of the feature
- Use case / problem it solves
- Proposed solution (if you have one)
- Alternatives considered
- Mockups or examples (if applicable)

### 🔧 Submitting Code

1. **Fork the repository**
2. **Create a feature branch** (see naming conventions below)
3. **Make your changes**
4. **Test thoroughly**
5. **Submit a pull request**

### 📚 Improving Documentation

Documentation improvements are always welcome:
- Fix typos and grammar
- Add examples and tutorials
- Improve code comments
- Create video tutorials
- Translate documentation

## Development Setup

### Prerequisites

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **Git** ([Download](https://git-scm.com/))
- **Code Editor** (VS Code recommended)

### Initial Setup

```bash
# Clone your fork
git clone https://github.com/YOUR-USERNAME/universal-app-builder.git
cd universal-app-builder

# Install dependencies
cd app
npm install

# Run in development mode
npm start
```

### Project Structure

```
universal-app-builder/
├── app/                    # Main Electron app
│   ├── main.js            # Main process
│   ├── preload.js         # IPC bridge
│   └── src/
│       ├── renderer/      # Frontend
│       ├── services/      # Backend services
│       └── utils/         # Utilities
├── test-projects/         # Test projects
├── broken-projects/       # Error test cases
└── docs/                  # Documentation
```

### Development Workflow

1. **Start the app in dev mode:**
   ```bash
   cd app
   npm start
   ```

2. **Make changes** — The app will auto-reload for renderer changes. Main process changes require manual restart.

3. **Test your changes:**
   - Use test projects in `test-projects/`
   - Test error cases with `broken-projects/`
   - Verify on multiple platforms if possible

4. **Run linter:**
   ```bash
   npm run lint
   ```

5. **Build for production:**
   ```bash
   npm run build:win    # Windows
   npm run build:mac    # macOS
   npm run build:linux  # Linux
   ```

## Coding Standards

### JavaScript/Node.js

**Style Guide:**
- Use ES6+ features (const/let, arrow functions, async/await)
- Use 4 spaces for indentation
- Use single quotes for strings
- Add JSDoc comments for public methods
- Keep functions small and focused

**Example:**
```javascript
/**
 * Detects the framework of a project
 * @param {string} projectPath - Path to the project
 * @returns {Promise<DetectionResult>} Detection results
 */
async function detectFramework(projectPath) {
    if (!projectPath) {
        throw new Error('Project path is required');
    }
    
    const detectors = [
        detectFlutter,
        detectElectron,
        detectTauri
    ];
    
    for (const detector of detectors) {
        const result = await detector(projectPath);
        if (result) return result;
    }
    
    return null;
}
```

### HTML/CSS

**HTML:**
- Use semantic HTML5 elements
- Add ARIA labels for accessibility
- Keep markup clean and readable

**CSS:**
- Use CSS custom properties for theming
- Follow BEM naming convention
- Use flexbox/grid for layouts
- Mobile-first responsive design

### Git Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(detector): add Unity framework detection

- Detect Unity projects by checking for ProjectSettings/ProjectSettings.asset
- Extract Unity version from ProjectVersion.txt
- Add Unity builder with Windows, macOS, Linux targets

Closes #42
```

```
fix(electron-builder): handle missing electron-builder dependency

When electron-builder is not installed, show clear error message
with installation instructions instead of generic build failure.

Fixes #58
```

### Branch Naming

Use descriptive branch names:

```
feature/add-unity-support
fix/electron-build-hangs
docs/update-readme
refactor/sdk-manager
test/add-detector-tests
```

## Pull Request Process

### Before Submitting

1. **Update your fork:**
   ```bash
   git fetch upstream
   git checkout main
   git merge upstream/main
   ```

2. **Rebase your branch:**
   ```bash
   git checkout your-feature-branch
   git rebase main
   ```

3. **Test thoroughly:**
   - Run all test projects
   - Test error cases
   - Verify on your platform
   - Check for console errors

4. **Update documentation** if needed

5. **Add your changes to CHANGELOG.md** (if applicable)

### PR Template

```markdown
## Description
Brief description of changes.

## Type of Change
- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to change)
- [ ] Documentation update

## Testing
Describe how you tested your changes:
- [ ] Tested with Flutter project
- [ ] Tested with Electron project
- [ ] Tested with Tauri project
- [ ] Tested with React Native project
- [ ] Tested error cases

## Screenshots
If applicable, add screenshots showing the changes.

## Checklist
- [ ] My code follows the project's coding standards
- [ ] I have tested my changes thoroughly
- [ ] I have updated documentation (if needed)
- [ ] My changes don't break existing functionality
- [ ] I have added tests (if applicable)
```

### Review Process

1. **Automated checks** must pass (linting, tests)
2. **At least one maintainer** must approve
3. **All conversations** must be resolved
4. **Squash and merge** (maintainers will do this)

### After Merge

- Your branch will be deleted automatically
- Your contribution will be in the next release! 🎉

## Testing Guidelines

### Manual Testing

**Test Matrix:**

| Framework | Windows | macOS | Linux |
|-----------|---------|-------|-------|
| Flutter   | ✓       | ✓     | ✓     |
| Electron  | ✓       | ✓     | ✓     |
| Tauri     | ✓       | ✓     | ✓     |
| React Native | ✓ (Android) | ✓ (iOS) | ✓ (Android) |

**Test Scenarios:**
1. Import working project → Build successfully
2. Import broken project → Show clear error
3. Build with missing SDK → Show install prompt
4. Cancel build mid-process → Clean up properly
5. Build multiple targets → All succeed

### Automated Testing (Future)

We plan to add:
- Unit tests for detector logic
- Integration tests for builders
- E2E tests with Playwright
- Snapshot tests for UI

### Creating Test Projects

**Working Project:**
```bash
mkdir test-projects/my-framework-demo
cd test-projects/my-framework-demo
# Create minimal working project
# Add README with build instructions
```

**Broken Project:**
```bash
mkdir broken-projects/my-framework-broken-config
# Create project with specific error
# Document expected error in README
```

## Documentation

### Code Comments

Add JSDoc comments for:
- All public functions/methods
- Complex algorithms
- Non-obvious business logic

**Example:**
```javascript
/**
 * Validates project structure and dependencies
 * 
 * @param {string} projectPath - Absolute path to project
 * @param {Object} options - Validation options
 * @param {boolean} options.checkDependencies - Whether to check npm dependencies
 * @returns {Promise<ValidationResult>} Validation results with errors/warnings
 * 
 * @example
 * const result = await validateProject('/path/to/project', {
 *     checkDependencies: true
 * });
 * 
 * if (!result.valid) {
 *     console.error(result.errors);
 * }
 */
```

### README Updates

When adding features, update:
- Main README.md (feature list, usage)
- docs/ARCHITECTURE.md (if architectural changes)
- Inline code comments
- Test project READMEs

### Changelog

Add entries to CHANGELOG.md:

```markdown
## [Unreleased]

### Added
- Unity framework support (#42)
- Build cancellation feature (#45)

### Fixed
- Electron build hanging on Windows (#58)
- Invalid JSON error messages (#62)

### Changed
- Improved SDK detection performance
- Updated error messages to be more actionable
```

## Getting Help

- **Questions?** Open a [Discussion](https://github.com/yourusername/universal-app-builder/discussions)
- **Bugs?** Open an [Issue](https://github.com/yourusername/universal-app-builder/issues)
- **Chat?** Join our [Discord](https://discord.gg/universal-app-builder) (if available)

## Recognition

Contributors will be:
- Added to CONTRIBUTORS.md
- Mentioned in release notes
- Credited in commit messages

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing! 🎉**

Last Updated: 2024-01-15
