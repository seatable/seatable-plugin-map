import React from 'react';
import ReactDOM from 'react-dom';
import DTable from 'dtable-sdk';
import './setting';
import './locale';
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
    window.app.onClosePlugin = () => {};
    window.dtableSDK = dtableSDK;
  }

  static async execute() {
    await this.init();
    ReactDOM.render(<App isDevelopment showDialog />, document.getElementById('root'));
  }

}

TaskList.execute();
