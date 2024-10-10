import React from 'react';
import Lucide from "@/components/Base/Lucide";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import { selectDarkMode, setDarkMode } from "@/stores/darkModeSlice";

function ThemeSwitcher() {
  const dispatch = useAppDispatch();
  const darkMode = useAppSelector(selectDarkMode);

  const toggleTheme = () => {
    dispatch(setDarkMode(!darkMode));
    localStorage.setItem('darkMode', String(!darkMode));
  };

  return (
    <button
      onClick={toggleTheme}
      className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
    >
      <Lucide icon={darkMode ? "Sun" : "Moon"} className="w-5 h-5" />
    </button>
  );
}

export default ThemeSwitcher;