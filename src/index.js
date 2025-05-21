import React from 'react';
import { createRoot } from 'react-dom/client';
import DTable from 'dtable-sdk';
import './locale';
import './setting';
import App from './app';

import './index.css';

class TaskList {

  static async init() {
    const dtableSDK = new DTable();

    // local develop
    window.app = {};
    window.app.state = {};
    window.dtable = {
      ...window.dtablePluginConfig,
    };
    await dtableSDK.init(window.dtablePluginConfig);
    await dtableSDK.syncWithServer();
    await dtableSDK.dtableWebAPI.login();

    window.app.collaborators = dtableSDK.dtableStore.collaborators;
    window.app.collaboratorsCache = {};
    window.app.state.collaborators = dtableSDK.dtableStore.collaborators;
    window.dtableWebAPI = dtableSDK.dtableWebAPI;
    window.app.onClosePlugin = () => { };
    window.dtableSDK = dtableSDK;
    window.dtable = Object.assign(window.dtable, dtableSDK.config);
  }

  static async execute() {
    await this.init();
    const root = createRoot(document.getElementById('root'));
    root.render(<App isDevelopment showDialog />);
  }

}

TaskList.execute();
