import path from 'node:path';

const excludedRootDirectories = new Set(['.git', 'node_modules', 'dist', 'build', 'artifacts', 'DerivedData', 'web-ext-artifacts']);
const signingExtensions = new Set(['.pem', '.key', '.p12', '.cer', '.mobileprovision']);

export function sourcePathAllowed(relativePath, isDirectory) {
  const normalized = relativePath.replaceAll(path.sep, '/').replace(/^\.\//, '');
  const segments = normalized.split('/').filter(Boolean);
  if (!segments.length) return false;
  if (excludedRootDirectories.has(segments[0])) return false;

  for (const name of segments) {
    if (name === '.DS_Store' || name === '__MACOSX' || name.startsWith('._')) return false;
    if (name === '__pycache__') return false;
    if (name === 'xcuserdata' || name.endsWith('.xcuserstate')) return false;
    if (/^LOCAL_.*_RELEASE_TASK\.md$/i.test(name)) return false;
  }

  const basename = segments[segments.length - 1];
  if (basename === '.web-extension-id') return false;
  if (/\.py[cod]$/i.test(basename)) return false;
  if (basename === '.env' || (basename.startsWith('.env.') && basename !== '.env.example')) return false;
  if (signingExtensions.has(path.extname(basename).toLowerCase())) return false;
  if (!isDirectory && basename.endsWith('.log')) return false;
  return true;
}
