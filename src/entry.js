import React from 'react';
import ReactDOM from 'react-dom';
import App from './app';
import './locale';

class TaskList {

  static execute() {
    ReactDOM.render(<App showDialog />, document.querySelector('#plugin-wrapper'));
  }

}

export default TaskList;

window.app.registerPluginItemCallback('map-en', TaskList.execute);