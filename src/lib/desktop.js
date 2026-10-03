export const isDesktop = Boolean(window.shiyueDesktop);

if (isDesktop) {
  window.shiyueDesktop.onFiles((files) => window.dispatchEvent(new CustomEvent('shiyue-desktop-files', { detail: files })));
  window.shiyueDesktop.onCommand((command) => window.dispatchEvent(new CustomEvent('shiyue-desktop-command', { detail: command })));
}
export function desktopRequest(message) {
  if (!isDesktop) return Promise.reject(new Error('桌面接口未就绪。'));
  return window.shiyueDesktop.request(message);
}
export function desktopFiles(payload) {
  return payload.map((item) => {
    const bytes = Uint8Array.from(atob(item.base64), (character) => character.charCodeAt(0));
    const file = new File([bytes], item.name, { type: item.mime || 'application/octet-stream' });
    if (item.relativePath) Object.defineProperty(file, 'webkitRelativePath', { value: item.relativePath });
    return file;
  });
}
