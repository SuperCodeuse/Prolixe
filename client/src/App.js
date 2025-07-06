// App.jsx
import React, { useState } from 'react';
import SideMenu from './components/navigation/SideMenu';
import Settings from './components/settings/Settings';
import Dashboard from './components/dashboard/Dashboard';
/*
import Journal from './components/Journal';
import Horaire from './components/Horaire';
import Skore from './components/Skore';*/

import './App.scss';
import Horaire from "./components/horaire/Horaire";
import Journal from "./components/journal/Journal";

const App = () => {
  const [currentPage, setCurrentPage] = useState('dashboard');

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'journal':
        return <Journal />;
      case 'horaire':
        return <Horaire />;/*
      case 'skore':
        return <Skore />;*/
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
      <div className="app">
        <SideMenu
            currentPage={currentPage}
            onPageChange={setCurrentPage}
        />
        <main className="main-content">
          {renderCurrentPage()}
        </main>
      </div>
  );
};

export default App;
