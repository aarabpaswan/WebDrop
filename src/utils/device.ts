export function getDeviceName(): string {
  if (typeof window === 'undefined') return 'WebDrop Device';
  
  const saved = localStorage.getItem('webdrop_device_name');
  if (saved && saved.trim()) return saved.trim();

  const ua = navigator.userAgent;
  let name = 'Device';

  if (/iPhone/.test(ua)) {
    name = 'iPhone';
  } else if (/iPad/.test(ua)) {
    name = 'iPad';
  } else if (/Macintosh|Mac OS/.test(ua)) {
    name = 'Mac';
  } else if (/Android/.test(ua)) {
    if (/Pixel/.test(ua)) name = 'Google Pixel';
    else if (/Samsung|SM-/.test(ua)) name = 'Samsung Device';
    else name = 'Android Phone';
  } else if (/Windows/.test(ua)) {
    name = 'Windows PC';
  } else if (/Linux/.test(ua)) {
    name = 'Linux Station';
  }

  // Add short unique hash so multiple devices with same OS are distinguishable
  const randSuffix = Math.floor(10 + Math.random() * 90);
  const fullName = `${name} (${randSuffix})`;
  localStorage.setItem('webdrop_device_name', fullName);
  return fullName;
}

export function setCustomDeviceName(name: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('webdrop_device_name', name.trim());
  }
}

export function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop';
  const ua = navigator.userAgent;
  if (/iPad|Tablet/i.test(ua)) return 'tablet';
  if (/Mobi|Android|iPhone/i.test(ua)) return 'mobile';
  return 'desktop';
}
