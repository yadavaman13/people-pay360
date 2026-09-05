import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const currentDir = import.meta.dirname;
const clientDir = path.resolve(currentDir, '../../client');
const targetPublicDir = path.resolve(currentDir, '../src/public');

console.log('[build-client] Starting client build process...');
console.log(`Client Directory: ${clientDir}`);
console.log(`Output Directory: ${targetPublicDir}`);

if (!fs.existsSync(clientDir)) {
    console.error(`Error: Client directory not found at ${clientDir}`);
    process.exit(1);
}

try {
    // 1. Ensure client dependencies are installed
    const clientNodeModules = path.join(clientDir, 'node_modules');
    if (!fs.existsSync(clientNodeModules)) {
        console.log('Installing client dependencies...');
        execSync('npm install --include=dev', {
            cwd: clientDir,
            stdio: 'inherit',
            shell: true,
        });
    }

    // 2. Ensure target server/src/public directory exists
    if (!fs.existsSync(targetPublicDir)) {
        fs.mkdirSync(targetPublicDir, { recursive: true });
    }

    // 3. Run Vite build targeting server/src/public
    console.log('Building client assets with Vite...');
    const outDirArg = JSON.stringify(targetPublicDir);
    execSync(`npx vite build --outDir ${outDirArg} --emptyOutDir`, {
        cwd: clientDir,
        stdio: 'inherit',
        shell: true,
    });

    console.log('[build-client] Successfully built client assets into server/src/public!');
} catch (error) {
    console.error('[build-client] Build failed:', error.message);
    process.exit(1);
}
