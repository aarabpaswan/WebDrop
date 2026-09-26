import { useEffect, useState } from 'react';

export interface BatteryState {
  level: number; // 0 to 100
  charging: boolean;
  supported: boolean;
}

export function useBattery() {
  const [battery, setBattery] = useState<BatteryState>({
    level: 100,
    charging: false,
    supported: false,
  });

  useEffect(() => {
    let active = true;
    const nav = navigator as any;

    if (typeof window !== 'undefined' && nav.getBattery) {
      nav.getBattery().then((batt: any) => {
        if (!active) return;

        const updateBattery = () => {
          setBattery({
            level: Math.round(batt.level * 100),
            charging: batt.charging,
            supported: true,
          });
        };

        updateBattery();

        batt.addEventListener('levelchange', updateBattery);
        batt.addEventListener('chargingchange', updateBattery);

        return () => {
          batt.removeEventListener('levelchange', updateBattery);
          batt.removeEventListener('chargingchange', updateBattery);
        };
      }).catch(() => {
        // Fallback or permission rejected
        if (active) {
          setBattery((b) => ({ ...b, supported: false }));
        }
      });
    }

    return () => {
      active = false;
    };
  }, []);

  return battery;
}
