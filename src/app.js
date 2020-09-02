import React from 'react';
import DTable from 'dtable-sdk';
import { Modal, ModalBody } from 'reactstrap';
import LocationSettings from './components/location-settings';
import Loading from './components/loading';
import L from 'leaflet';
import intl from 'react-intl-universal';
import './locale/index.js';

import './css/common.css';
import './app.css';
import 'leaflet/dist/leaflet.css';

L.Icon.Default.imagePath = '//cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.4/images/';

const PLUGIN_NAME = 'map-en';
const CONFIG_TYPE = {
  TABLE: 'table',
  VIEW: 'view',
  COLUMN: 'column'
}

class App extends React.Component  {

  constructor(props) {
    super(props);
    this.dtable = null;
    this.state = {
      showDialog: props.showDialog || true,
      locations: [],
      tableName: null,
      viewName: null,
      columnName: null,
      showSettingDialog: false,
      isDataLoaded: false,
      configSettings: null,
      isFullScreen: false
    };
    this.map = null;
    this.geocoder = null;
    this.markers = [];
  }

  componentDidMount() {
    this.dtable = new DTable();
    this.loadMapScript();
    setTimeout(() => {
      this.initPluginDTableData();
    }, 100);
  }

  componentWillReceiveProps(nextProps) {
    this.setState({showDialog: nextProps.showDialog});
  }

  componentDidUpdate(preProps, preState) {
    if (this.state.showSettingDialog !== preState.showSettingDialog) return;
    if (window.google && this.state.showDialog) {
      // render locations after the container rendered in the dom tree
      requestAnimationFrame(() => {
        this.renderMap(this.state.locations);
      });
    }
  }

  componentWillUnmount() {
    this.unsubscribeLocalDtableChanged();
    this.unsubscribeRemoteDtableChanged();
  }

  async initPluginDTableData() {
    if (window.app !== undefined) {
      this.dtable.initInBrowser(window.app.dtableStore);
      const { tableName, viewName, columnName } = this.initPluginSettings();
      const configSettings = this.initSelectedSettings(tableName, viewName, columnName);
      const locations = this.getLocations({tableName, viewName, columnName});
      this.setState({
        tableName,
        viewName,
        columnName,
        configSettings,
        isDataLoaded: true,
        locations
      }, () => {
        this.renderMap(locations);
      });
    } else {
      await this.dtable.init(window.dtablePluginConfig);
      await this.dtable.syncWithServer();
      this.dtable.subscribe('dtable-connect', () => { this.onDTableConnect(); });
      this.setState({
        isDataLoaded: true
      });
    }
    this.unsubscribeLocalDtableChanged = this.dtable.subscribe('local-dtable-changed', () => { this.onDTableChanged(); });
    this.unsubscribeRemoteDtableChanged = this.dtable.subscribe('remote-dtable-changed', () => { this.onDTableChanged(); });
  }

  async loadMapScript() {
    let AUTH_KEY = 'AIzaSyDJW4jsPlNKgv6jFm3B5Edp5ywgdqLWdmc';
    if (!AUTH_KEY) {
      return;
    }
    if (!window.google) {
      var script = document.createElement('script');
      // register global render function of map
      script.type = 'text/javascript';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${AUTH_KEY}&libraries=places`;
      document.body.appendChild(script);
      this.loadLeafletScript();
    }
  }

  loadLeafletScript() {
    let lang = (window.dtable && window.dtable.lang) ? window.dtable.lang : 'en';
    let url = `http://mt0.google.cn/vt/lyrs=m@160000000&hl=${lang}&gl=${lang}&src=app&y={y}&x={x}&z={z}&s=Ga`;
    if (!document.getElementById('map-container')) return;
    this.map = L.map('map-container').setView([20, 123], 5);
    L.tileLayer(url, {
      maxZoom: 18,
      minZoom: 2
    }).addTo(this.map);
    // Map showing current location area
    this.map.locate({
      setView: true,
      zoom: 2
    });
  }

  onDTableConnect() {
    const { tableName, viewName, columnName } = this.initPluginSettings();
    const configSettings = this.initSelectedSettings(tableName, viewName, columnName);
    const locations = this.getLocations({tableName, viewName, columnName});
    this.setState({
      tableName,
      viewName,
      columnName,
      configSettings,
      locations
    });
  }

  onDTableChanged() {
    let { tableName, viewName, columnName } = this.state;
    const locations = this.getLocations({tableName, viewName, columnName});
    this.setState({locations});
  }

  getLocations({ tableName, viewName, columnName }) {
    let locations = [];
    let currentTable = this.dtable.getTableByName(tableName);
    let currentView = this.dtable.getViewByName(currentTable, viewName);
    let currentColumn = this.dtable.getColumnByName(currentTable, columnName);
    // current view has none column
    if (!currentColumn) {
      return locations;
    }
    
    // table's rows length is 0
    if (currentTable.rows.length === 0) {
      return locations;
    }

    let locationNameKey = currentTable.columns[0].key;
    let locationValueKey = currentColumn.key;
    let locationColumnType = currentColumn.type;
    if (currentView.rows.length === 0) { // table rows
      const rows = currentTable.rows;
      rows.forEach(row => {
        if (locationColumnType === 'geolocation') {
          const value = row[locationValueKey] || {};
          locations.push({name: row[locationNameKey] || '', type: locationColumnType, ...value});
        } else {
          const value = row[locationValueKey] || '';
          locations.push({name: row[locationNameKey] || '', type: locationColumnType, location: value});
        }
      });
    } else {  // view rows
      const rows = currentView.rows;
      rows.forEach(rowId => {
        let row = currentTable['id_row_map'][rowId];
        if (locationColumnType === 'geolocation') {
          const value = row[locationValueKey] || {};
          locations.push({name: row[locationNameKey] || '', type: locationColumnType, ...value});
        } else {
          const value = row[locationValueKey] || '';
          locations.push({name: row[locationNameKey] || '', type: locationColumnType, location: value});
        }
      });
    }
    return locations;
  }

  // plugin_settings: {tableName: '', viewName: '', columnName: ''}
  initPluginSettings = () => {
    let pluginSettings = this.dtable.getPluginSettings(PLUGIN_NAME);
    if (pluginSettings && this.isValidPluginSettings(pluginSettings)) {
      return pluginSettings;
    }

    this.setState({showSettingDialog: true});
    let activeTable = this.dtable.getActiveTable();
    let activeView = this.dtable.getActiveView();
    let columns = this.dtable.getShownColumns(activeTable, activeView);

    // need option, get the column type is map
    pluginSettings = {tableName: activeTable.name, viewName: activeView.name, columnName: columns[0].name};
    this.dtable.updatePluginSettings(PLUGIN_NAME, pluginSettings);
    return pluginSettings;
  }

  isValidPluginSettings = (pluginSettings) => {
    let { tableName, viewName, columnName } = pluginSettings;
    let table = this.dtable.getTableByName(tableName);
    if (!table) return false;
    let view = this.dtable.getViewByName(table, viewName);
    if (!view) return false;
    let column = this.dtable.getColumnByName(table, columnName);
    if (!column) return false;
    return true;
  }

  initSelectedSettings = (tableName, viewName, columnName) => {
    let activeTable = this.dtable.getTableByName(tableName);
    let tableSettings = this.getTableSettings(activeTable);
    let activeView = this.dtable.getViewByName(activeTable, viewName);
    let viewSettings = this.getViewSettings(activeTable, activeView);
    let activeColumn = this.dtable.getColumnByName(activeTable, columnName);
    let columnSettings = this.getColumnSettings(activeTable, activeView, activeColumn);
    return [tableSettings, viewSettings, columnSettings];
  }

  updateSelectedSettings = (type, option) => {
    switch(type) {
      case CONFIG_TYPE.TABLE: {
        let currentTable = this.dtable.getTableByName(option.name);
        let currentView = this.dtable.getViews(currentTable)[0];
        let tableSettings = this.getTableSettings(currentTable);
        let viewSettings = this.getViewSettings(currentTable);
        let columnSettings = this.getColumnSettings(currentTable, currentView);
        let configSettings = [tableSettings, viewSettings, columnSettings];
        return configSettings;
      }
      case CONFIG_TYPE.VIEW: {
        let { tableName, configSettings } = this.state;
        let currentTable = this.dtable.getTableByName(tableName);
        let currentView = this.dtable.getViewByName(currentTable, option.name);
        let viewSettings = this.getViewSettings(currentTable, currentView);
        let columnSettings = this.getColumnSettings(currentTable, currentView);
        configSettings.splice(1, 2, viewSettings, columnSettings);
        return configSettings;
      }
      case CONFIG_TYPE.COLUMN: {
        let { tableName, viewName, configSettings } = this.state;
        let currentTable = this.dtable.getTableByName(tableName);
        let currentView = this.dtable.getViewByName(currentTable, viewName);
        let currentColumn = this.dtable.getColumnByName(currentTable, option.name);
        let columnSettings = this.getColumnSettings(currentTable, currentView, currentColumn);
        configSettings.splice(2, 1, columnSettings);
        return configSettings;
      }
      default: {
        return this.state.configSettings;
      }
    }
  }

  getTableSettings = (activeTable = null) => {
    let tables = this.dtable.getTables();
    let tableSettings = tables.map(table => {
      return {id: table._id, name: table.name};
    });
    let active = activeTable ? activeTable.name : tables[0].name;
    return {type: CONFIG_TYPE.TABLE, name: intl.get('Table'), active: active, settings: tableSettings}
  }

  getViewSettings = (currentTable, activeView = null) => {
    let views = this.dtable.getViews(currentTable);
    let viewSettings = views.map(view => {
      return {id: view._id, name: view.name};
    });
    let active = activeView ? activeView.name : views[0].name;
    return {type: CONFIG_TYPE.VIEW, name: intl.get('View'), active: active, settings: viewSettings};
  }

  getColumnSettings = (currentTable, currentView, activeColumn = null) => {
    let columns = this.dtable.getShownColumns(currentTable, currentView);

    // need options: checkout map column
    columns = columns.filter(column => {
      return column.type === 'text' || column.type === 'geolocation';
    });
    let columnSettings = columns.map(column => {
      return {id: column.key, name: column.name};
    });
    
    // need options: checkout map column
    let active = activeColumn ? activeColumn.name : columns[0].name;
    return {type: CONFIG_TYPE.COLUMN, name: intl.get('Address_field'), active: active, settings: columnSettings};
  }

  onSelectChange = (option, type) => {
    let tableName, viewName, columnName, settings;
    let configSettings = this.updateSelectedSettings(type, option);
    switch(type) {
      case CONFIG_TYPE.TABLE: {
        tableName = option.name;
        viewName = configSettings[1].settings[0].name;
        columnName = configSettings[2].settings[0].name;
        settings = { tableName, viewName, columnName };
        break;
      }
      case CONFIG_TYPE.VIEW: {
        viewName = option.name;
        columnName = configSettings[2].settings[0].name;
        let plugin_settings = this.dtable.getPluginSettings(PLUGIN_NAME);
        settings = Object.assign({}, plugin_settings, {viewName, columnName});
        break;
      }
      case CONFIG_TYPE.COLUMN: {
        columnName = option.name;
        let plugin_settings = this.dtable.getPluginSettings(PLUGIN_NAME);
        settings = Object.assign({}, plugin_settings, {columnName});
        break;
      }
      default: {
        return;
      }
    }
    this.dtable.updatePluginSettings(PLUGIN_NAME, settings);
    let locations = this.getLocations(settings);
    this.setState({...settings, configSettings, locations});
  }

  toggle = () => {
    this.map = null;
    this.setState({showDialog: false});
    window.app.onClosePlugin();
  }
  
  renderMap = (locations) => {
    if (window.google && window.google.maps) {
      if (!this.map) {
        this.loadLeafletScript();
      }
      this.renderLocations(locations);
    }
  }

  removeLayers = () => {
    if (this.markers.length > 0) {
      this.markers.forEach((m) => {
        m.remove();
      })
      this.markers = [];
    }
  } 

  renderLocations = (locations) => {
    // clear previous layers
    this.removeLayers();
    if (!this.geocoder) {
      this.geocoder = new window.google.maps.Geocoder();
    }
    locations.forEach((location) => {
      let address;
      let locationName = location.name;
      if (location.type === 'geolocation') {
        address = this.formatGeolocationValue(location);
      } else {
        address = location.location;
      }
      if (address) {
        this.addMarker(address, locationName)
      }
    });
  }

  addMarker = (address, locationName, time = 0) => {
    // The query is too fast and will not be found
    setTimeout(() => {
      this.geocoder.geocode({'address': address}, (points, status) => {
        switch(status) {
          case window.google.maps.GeocoderStatus.OK: {
            let lat = points[0].geometry.location.lat();
            let lng = points[0].geometry.location.lng();
            if (!this.markers.find(marker => marker._latlng.lat === lat && marker._latlng.lng === lng)) {
              let describe = `<p>${address}</p><p>${locationName}</p>`;
              let marker = new L.Marker([lat, lng]);
              marker.bindPopup(describe);
              marker.on('mouseover', () => {
                marker.openPopup();
              })
              marker.on('mouseout', () => {
                marker.closePopup();
              })
              marker.on('click', () => {
                return;
              })
              this.markers.push(marker);
              this.map.addLayer(marker);
            }
            break;
          }
          case window.google.maps.GeocoderStatus.OVER_QUERY_LIMIT: {
            console.log(intl.get('Your_Google_Maps_key_has_exceeded_quota'));
            break;
          }
          case window.google.maps.GeocoderStatus.UNKNOWN_ERROR:
          case window.google.maps.GeocoderStatus.ERROR: {
            if (time < 5) {
              time += 1;
              this.addMarker(address, locationName, time);
            }
            break;
          }
          case window.google.maps.GeocoderStatus.INVALID_REQUEST:
          case window.google.maps.GeocoderStatus.REQUEST_DENIED: {
            break;
          }
          default: {
            console.log(intl.get('address_not_be_found', {address: address}));
            break;
          }
        }
      });
    }, 1000);
  }

  formatGeolocationValue = (value) => {
    let district = value.district === 'other' ? '' : value.district;
    let city = value.city === 'other' ? '' : value.city;
    let province = value.province === 'other' ? '' : value.province;
    return `${province || ''}${city || ''}${district || ''}${value.detail || ''}`;
  }

  toggleSettingDialog = () => {
    this.setState({showSettingDialog: !this.state.showSettingDialog});
  }

  toggleFullScreen = () => {
    this.setState({
      isFullScreen: !this.state.isFullScreen
    });
  }

  getDialogStyle = () => {
    const { isFullScreen } = this.state;
    if (isFullScreen) {
      return {
        maxWidth: '100%',
        height: '100%',
        margin: 0
      } 
    } else {
      return {
        maxWidth: 1180
      }
    }
  }
  
  render() {
    const { isDataLoaded, showSettingDialog, configSettings, isFullScreen } = this.state;
    const mapKey = 'AIzaSyDJW4jsPlNKgv6jFm3B5Edp5ywgdqLWdmc';
    return (
      <Modal isOpen={this.state.showDialog} toggle={this.toggle} className="plugin-map-dialog" style={this.getDialogStyle()}>
        <div className={'modal-header dtable-map-plugin-title'}>
          <h5 className="modal-title dtable-map-plugin-name">{intl.get('Map_plugin')}</h5>
          <div>
            <button className="close" onClick={this.toggle}><i className={'dtable-font dtable-icon-x'}></i></button>
            <button onClick={this.toggleSettingDialog} className="close"><i className={'dtable-font dtable-icon-settings'}></i></button>
            <button className={"close " + (isFullScreen ? 'active-full-screen' : '')} onClick={this.toggleFullScreen}>
              <span className={(isFullScreen ? 'full-screen-active ' : '') + 'icon-container'}>
                <i className={'dtable-font dtable-icon-full-screen'}></i>
              </span>
            </button>
          </div>
        </div>
        <ModalBody className={"map-plugin-modal-body " + (isFullScreen ? 'map-plugin-modal-body-full-screen' : '')}>
          {!isDataLoaded && <Loading />}
          {(isDataLoaded && !mapKey) && (
            <div className='d-flex justify-content-center mt-9'>
              <span className="alert-danger">{intl.get('You_have_not_configured_the_map_application_please_contact_the_administrator_for_related_configuration')}</span>
            </div>
          )}
          {(isDataLoaded && mapKey) && (
            <div className="App dtable-map-plugin">
              <div id="map-container" className="map-container"></div>
              
            </div>
          )}
          {showSettingDialog && (
            <LocationSettings 
              configSettings={configSettings} 
              onSelectChange={this.onSelectChange} 
              onHideMapSettings={this.toggleSettingDialog}
            /> 
          )}
        </ModalBody>
      </Modal>
    );
  }
}

export default App;
