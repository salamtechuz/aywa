// Client-safe URL helper. The full storage module is server-only because it
// touches the filesystem; consumers that only need to render a download link
// import this lightweight twin instead.

export function publicUrlFor(storageKey: string): string {
  if (storageKey.startsWith("http://") || storageKey.startsWith("https://")) {
    return storageKey;
  }
  return `/${storageKey}`;
}
