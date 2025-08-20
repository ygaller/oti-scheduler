#!/usr/bin/env node

/**
 * Release automation script for OTI Scheduler
 * 
 * Usage:
 * node scripts/release.js --version 1.2.0 --type patch
 * node scripts/release.js --version 1.2.0 --type minor --signed
 * node scripts/release.js --version 1.2.0-beta.1 --prerelease
 * 
 * Options:
 * --version: Version to release (e.g., 1.2.0)
 * --type: Release type (patch, minor, major)
 * --signed: Create signed production release (triggers code signing workflow)
 * --prerelease: Create a prerelease (for beta/testing versions)
 * --dry-run: Show what would be done without executing
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const getArg = (name) => {
  const index = args.indexOf(`--${name}`);
  return index !== -1 ? args[index + 1] : null;
};
const hasFlag = (name) => args.includes(`--${name}`);

const version = getArg('version');
const type = getArg('type') || 'patch';
const prerelease = hasFlag('prerelease');
const signed = hasFlag('signed');
const dryRun = hasFlag('dry-run');

if (!version) {
  console.error('❌ Version is required. Use --version 1.2.0');
  process.exit(1);
}

// Validate version format
const versionRegex = /^\d+\.\d+\.\d+$/;
if (!versionRegex.test(version)) {
  console.error('❌ Invalid version format. Use semantic versioning (e.g., 1.2.0)');
  process.exit(1);
}

console.log(`🚀 Preparing release v${version}`);
console.log(`📦 Release type: ${type}${prerelease ? ' (prerelease)' : ''}${signed ? ' (signed)' : ''}`);
console.log(`🧪 Dry run: ${dryRun ? 'Yes' : 'No'}`);
console.log('');

const run = (command, description) => {
  console.log(`📋 ${description}`);
  if (dryRun) {
    console.log(`   Would run: ${command}`);
  } else {
    try {
      execSync(command, { stdio: 'inherit' });
    } catch (error) {
      console.error(`❌ Failed to ${description.toLowerCase()}`);
      process.exit(1);
    }
  }
  console.log('');
};

const updatePackageJson = (filePath, newVersion) => {
  console.log(`📝 Updating ${filePath}`);
  if (!dryRun) {
    const packagePath = path.join(__dirname, '..', filePath);
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    packageJson.version = newVersion;
    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
  } else {
    console.log(`   Would update version to ${newVersion} in ${filePath}`);
  }
  console.log('');
};

const main = async () => {
  try {
    // 1. Check if working directory is clean
    console.log('🔍 Checking working directory status...');
    if (!dryRun) {
      try {
        execSync('git diff --exit-code', { stdio: 'pipe' });
        execSync('git diff --cached --exit-code', { stdio: 'pipe' });
      } catch (error) {
        console.error('❌ Working directory is not clean. Please commit or stash changes.');
        process.exit(1);
      }
    }
    console.log('✅ Working directory is clean');
    console.log('');

    // 2. Ensure dependencies and run tests
    run('npm run setup', 'Ensuring all dependencies are installed');
    run('npm test', 'Running tests');

    // 3. Update package.json files
    updatePackageJson('package.json', version);
    updatePackageJson('client/package.json', version);
    updatePackageJson('server/package.json', version);

    // 4. Build the application
    run('npm run prepare:electron', 'Building application for release');

    // 5. Commit version changes
    run(`git add package.json client/package.json server/package.json package-lock.json client/package-lock.json server/package-lock.json`, 'Staging version changes');
    run(`git commit -m "chore: bump version to ${version}"`, 'Committing version changes');

    // 6. Create and push tag
    const useSigned = signed || prerelease; // Support both flags for backward compatibility
    const tagName = `v${version}${useSigned ? '-release' : ''}`;
    run(`git tag -a ${tagName} -m "Release ${version}"`, `Creating tag ${tagName}`);
    run(`git push origin master`, 'Pushing changes to remote');
    run(`git push origin ${tagName}`, 'Pushing tag to remote');

    // 7. Success message
    console.log('🎉 Release process completed successfully!');
    console.log('');
    console.log(`📦 Version: ${version}`);
    console.log(`🏷️  Tag: ${tagName}`);
    console.log(`🔗 GitHub Actions will now build and publish the release`);
    console.log(`📱 Check progress at: https://github.com/ygaller/oti-scheduler/actions`);
    console.log('');

    if (prerelease) {
      console.log('⚠️  This is a prerelease. Use for testing only.');
    } else if (signed || useSigned) {
      console.log('🔒 This is a signed production release.');
    } else {
      console.log('✨ This is an unsigned production release.');
    }

  } catch (error) {
    console.error('❌ Release process failed:', error.message);
    process.exit(1);
  }
};

// Show help
if (hasFlag('help') || hasFlag('h')) {
  console.log(`
OTI Scheduler Release Script

Usage:
  node scripts/release.js --version <version> [options]

Options:
  --version <version>    Version to release (required, e.g., 1.2.0)
  --type <type>         Release type: patch, minor, major (default: patch)
  --signed              Create signed production release (triggers code signing)
  --prerelease          Create a prerelease for beta/testing versions
  --dry-run             Show what would be done without executing
  --help, -h            Show this help message

Examples:
  node scripts/release.js --version 1.2.0                    # Unsigned production release
  node scripts/release.js --version 1.3.0 --signed          # Signed production release  
  node scripts/release.js --version 2.0.0-beta.1 --prerelease # Beta release for testing
  node scripts/release.js --version 1.2.1 --dry-run         # Preview what would happen

The script will:
1. Check that the working directory is clean
2. Run tests to ensure quality
3. Update version in all package.json files
4. Build the application
5. Commit version changes
6. Create and push a git tag
7. Trigger GitHub Actions to build and release

For signed releases, use the --signed flag. This creates a tag 
with '-release' suffix which triggers the signed build workflow.

For beta/testing versions, use the --prerelease flag. This should be 
used with version numbers like '1.0.0-beta.1' or '1.0.0-rc.1'.

Note: For backward compatibility, --prerelease also triggers signed builds.
`);
  process.exit(0);
}

main();
