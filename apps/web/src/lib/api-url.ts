const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '');
const apiPort = process.env.NEXT_PUBLIC_API_PORT ?? '3334';

export const API_URL = resolveApiUrl();

function resolveApiUrl(): string {
  if (configuredApiUrl === 'same-origin') {
    return '';
  }

  if (configuredApiUrl && !isLocalDevUrl(configuredApiUrl)) {
    return configuredApiUrl;
  }

  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:${apiPort}`;
  }

  return configuredApiUrl || '';
}

function isLocalDevUrl(value: string): boolean {
  return /^https?:\/\/(localhost|127(?:\.\d{1,3}){3})(:\d+)?$/i.test(value);
}
