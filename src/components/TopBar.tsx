"use client";

import { useAuth } from "../contexts/AuthContext";
import { useState, useEffect } from "react";
import { FaLock, FaExpand, FaCompress, FaBars, FaTimes } from "react-icons/fa";

interface TopBarProps {
  hideSidebar?: boolean;
  setHideSidebar?: (value: boolean) => void;
}

export default function TopBar() {
  const { user, logout } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white px-2 sm:px-4 py-2 flex items-center justify-between text-[10px] sm:text-xs shadow-lg flex-shrink-0">
      <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
          <span className="hidden sm:inline">System</span>
        </span>

        <span className="whitespace-nowrap">
          {currentTime.toLocaleDateString("el-GR", {
            weekday: "short",
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </span>
        <span className="whitespace-nowrap font-medium">
          {currentTime.toLocaleTimeString("el-GR", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
        <span className="text-amber-300 truncate max-w-[120px] sm:max-w-none">
          {user?.firstName} {user?.lastName}
        </span>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={() => logout()}
          className="p-1.5 sm:p-2 hover:bg-slate-700 rounded transition-colors flex items-center gap-1"
          title="Αλλαγή χρήστη"
        >
          <FaLock size={12} />
        </button>
        <button
          onClick={toggleFullscreen}
          className="p-1.5 sm:p-2 hover:bg-slate-700 rounded transition-colors flex items-center gap-1"
          title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
        >
          {isFullscreen ? <FaCompress size={12} /> : <FaExpand size={12} />}
        </button>
      </div>
    </div>
  );
}
