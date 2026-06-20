import React, { createContext, useContext, useState } from 'react';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [data, setData] = useState({
    users: [],
    categories: [],
    machines: [],
    repairs: [],
    projects: [],
  });

  const updateRepair = (id, updater) => {
    setData(prev => ({
      ...prev,
      repairs: prev.repairs.map(r => r.id === id ? updater(r) : r),
    }));
  };

  const addRepair = (repair) => {
    setData(prev => ({
      ...prev,
      repairs: [repair, ...prev.repairs],
    }));
  };

  return (
    <AppContext.Provider value={{ data, setData, updateRepair, addRepair }}>
      {children}
    </AppContext.Provider>
  );
}

export const useAppData = () => useContext(AppContext);
