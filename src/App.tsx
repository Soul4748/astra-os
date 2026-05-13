import { useState, useCallback, useEffect } from "react";
import { BootLoader } from "./components/BootLoader";
import { DesktopIcon } from "./components/DesktopIcon";
import { Window } from "./components/Window";
import { Taskbar } from "./components/Taskbar";
import { NetworkApp } from "./components/apps/NetworkApp";
import { SettingsApp } from "./components/apps/SettingsApp";
import { NotesApp } from "./components/apps/NotesApp";
import { DESKTOP_ICONS, WALLPAPERS } from "./utils/constants";
import { WindowState, SystemSettings } from "./types";

const DEFAULT_SETTINGS: SystemSettings = {
  wallpaper: WALLPAPERS[0].url,
  accentColor: "#7dd3fc",
  rgbMode: false,
  blurIntensity: 20,
  transparency: 0.8,
  showClock: true,
  fontSize: 14,
  animationsEnabled: true,
};

const STORAGE_KEY = "astra-os-settings";

function loadSettings(): SystemSettings {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (e) {
    console.error("Failed to load settings:", e);
  }
  return DEFAULT_SETTINGS;
}

function saveSettings(settings: SystemSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error("Failed to save settings:", e);
  }
}

export default function App() {
  const [windows, setWindows] = useState<WindowState[]>([]);
  const [nextZIndex, setNextZIndex] = useState(1000);
  const [settings, setSettings] = useState<SystemSettings>(loadSettings);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const launchApp = useCallback(
    (name: string) => {
      setWindows((prev) => {
        const existing = prev.find((w) => w.name === name);
        if (existing) {
          setNextZIndex((z) => z + 1);
          return prev.map((w) =>
            w.id === existing.id
              ? { ...w, isMinimized: false, zIndex: nextZIndex + 1 }
              : w
          );
        }

        const size =
          name === "Network"
            ? { width: 900, height: 600 }
            : name === "Settings"
            ? { width: 700, height: 500 }
            : { width: 480, height: 420 };

        const newWindow: WindowState = {
          id: `win-${name}-${Date.now()}`,
          name,
          isOpen: true,
          isMinimized: false,
          zIndex: nextZIndex,
          position: { x: 150 + prev.length * 30, y: 80 + prev.length * 30 },
          size,
        };

        setNextZIndex((z) => z + 1);
        return [...prev, newWindow];
      });
    },
    [nextZIndex]
  );

  const closeWindow = useCallback((id: string) => {
    setWindows((prev) => prev.filter((w) => w.id !== id));
  }, []);

  const minimizeWindow = useCallback((id: string) => {
    setWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, isMinimized: true } : w))
    );
  }, []);

  const focusWindow = useCallback(
    (id: string) => {
      setNextZIndex((z) => z + 1);
      setWindows((prev) =>
        prev.map((w) =>
          w.id === id ? { ...w, zIndex: nextZIndex + 1, isMinimized: false } : w
        )
      );
    },
    [nextZIndex]
  );

  const handleReboot = useCallback(() => {
    window.location.reload();
  }, []);

  const renderAppContent = (window: WindowState) => {
    switch (window.name) {
      case "Network":
        return <NetworkApp />;
      case "Settings":
        return (
          <SettingsApp
            settings={settings}
            onSettingsChange={setSettings}
            onReboot={handleReboot}
          />
        );
      case "Notes":
        return <NotesApp />;
      default:
        return <div className="p-8 text-white">Unknown App</div>;
    }
  };

  return (
    <div
      className={`h-screen w-screen bg-cover bg-center bg-no-repeat overflow-hidden relative ${
        settings.rgbMode ? "rgb-active" : ""
      }`}
      style={{
        backgroundImage: `url('${settings.wallpaper}')`,
        backgroundColor: "#000",
        fontSize: settings.fontSize,
      }}
    >
      <style>{`
        @keyframes rgb-glow {
          0% { border-color: #ff0000; box-shadow: 0 0 15px #ff0000; }
          33% { border-color: #00ff00; box-shadow: 0 0 15px #00ff00; }
          66% { border-color: #0000ff; box-shadow: 0 0 15px #0000ff; }
          100% { border-color: #ff0000; box-shadow: 0 0 15px #ff0000; }
        }
        .rgb-active .window {
          animation: rgb-glow 3s linear infinite !important;
          border: 2px solid !important;
        }
      `}</style>

      <BootLoader />

      <div className="absolute inset-0 p-10">
        {DESKTOP_ICONS.map((icon) => (
          <DesktopIcon
            key={icon.id}
            icon={icon}
            onClick={launchApp}
            accentColor={settings.accentColor}
          />
        ))}
      </div>

      {windows.map((win) => (
        <Window
          key={win.id}
          window={win}
          onClose={closeWindow}
          onMinimize={minimizeWindow}
          onFocus={focusWindow}
          settings={settings}
        >
          {renderAppContent(win)}
        </Window>
      ))}

      <Taskbar
        windows={windows}
        onWindowFocus={focusWindow}
        isRGBActive={settings.rgbMode}
        showClock={settings.showClock}
        accentColor={settings.accentColor}
      />
    </div>
  );
}
