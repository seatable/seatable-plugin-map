import React from 'react';
import DTable from 'dtable-sdk';
import { Modal, ModalBody } from 'reactstrap';
import L from 'leaflet';
import LocationSettings from './components/location-settings';
import Loading from './components/loading';
import intl from 'react-intl-universal';
import './locale/index.js';
import  * as image  from './image/index';
import { getLocations, renderMarkByPosition, formatGeolocactionValue, getInitialMapCenter } from './utils/location-utils';
import COLORS from './marker-color';
import { generateSettingsByConfig } from './utils/generate-settings-config';
import { replaceSettingItemByType } from './utils/repalce-setting-item-by-type'; 
import getConfigItemByType from './utils/get-config-item-by-type';
import onCapture from './utils/capture';
import { IMAGE_PATH, PLUGIN_NAME, CONFIG_TYPE, COLUMN_TYPES } from './constants';
import logo from './image/map.png';

import './css/common.css';
import './app.css';
import 'leaflet/dist/leaflet.css';

L.Icon.Default.imagePath = IMAGE_PATH;

class App extends React.Component {

  constructor(props) {
    super(props);
    this.dtable = null;
    this.state = {
      showDialog: props.showDialog || true,
      locations: [],
      showSettingDialog: false,
      isDataLoaded: false,
      configSettings: null,
      isFullScreen: false
    };
    this.map = null;
    this.geocoder = null;
    this.markers = [];
    this.timer = null;
  }

  componentDidMount() {
    this.dtable = new DTable();
    this.loadMapScript();
  }

  componentWillReceiveProps(nextProps) {
    this.setState({
      showDialog: nextProps.showDialog
    }, () => {
      if (nextProps.showDialog) {
        this.onDTableConnect();
      }
    });
  }

  componentDidUpdate(preProps, preState) {
    if (this.state.showSettingDialog !== preState.showSettingDialog) return;
    if (window.google && this.state.showDialog) {
      // render locations after the container rendered in the dom tree
      requestAnimationFrame(() => {
        this.renderLocations(this.state.locations);
      });
    }
  }

  onExit = () => {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.unsubscribeLocalDtableChanged();
    this.unsubscribeRemoteDtableChanged();
  }

  async initPluginDTableData() {
    if (window.app !== undefined) {
      this.dtable.initInBrowser(window.app.dtableStore);
      this.unsubscribeLocalDtableChanged = this.dtable.subscribe('local-dtable-changed', () => { this.onDTableChanged(); });
      this.unsubscribeRemoteDtableChanged = this.dtable.subscribe('remote-dtable-changed', () => { this.onDTableChanged(); });
      const settings = this.initPluginSettings();
      const configSettings = this.initSelectedSettings(settings);
      const locations = getLocations(this.dtable, configSettings);
      this.setState({
        configSettings,
        isDataLoaded: true,
        locations
      }, () => {
        this.renderMap();
        this.renderLocations(locations);
      });
    } else {
      await this.dtable.init(window.dtablePluginConfig);
      await this.dtable.syncWithServer();
      window.app = {};
      this.dtable.subscribe('dtable-connect', () => { this.onDTableConnect(); });
    }
  }

  async loadMapScript () {
    let AUTH_KEY = window.dtable.dtableGoogleMapKey;
    if (!AUTH_KEY) {
      return;
    }
    if (!window.google) {
      var script = document.createElement('script');
      // register global render function of map
      script.type = 'text/javascript';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${AUTH_KEY}&libraries=places`;
      document.body.appendChild(script);
      script.onload = () => {
        this.geocoder = new window.google.maps.Geocoder();
        this.initPluginDTableData();
      };
    } else {
      this.geocoder = new window.google.maps.Geocoder();
      this.initPluginDTableData();
    }
  }

  async renderMap() {
    let lang = (window.dtable && window.dtable.lang) ? window.dtable.lang : 'en';
    let url = `http://mt0.google.com/vt/lyrs=m@160000000&hl=${lang}&gl=${lang}&src=app&y={y}&x={x}&z={z}&s=Ga`;
    if (!document.getElementById('map-container')) return;
    const { position, zoom } = await getInitialMapCenter(this.state.locations, this.geocoder);
    if (!this.map) {
      this.map = L.map('map-container').setView(position, zoom).invalidateSize();
      L.tileLayer(url, {
        maxZoom: 18,
        minZoom: 2
      }).addTo(this.map);
    }
  }

  onDTableConnect() {
    this.unsubscribeLocalDtableChanged = this.dtable.subscribe('local-dtable-changed', () => { this.onDTableChanged(); });
    this.unsubscribeRemoteDtableChanged = this.dtable.subscribe('remote-dtable-changed', () => { this.onDTableChanged(); });
    const pluginSettings = this.initPluginSettings();
    const configSettings = this.initSelectedSettings(pluginSettings);
    const locations = getLocations(this.dtable, configSettings);
    this.setState({
      configSettings,
      locations,
      isDataLoaded: true
    }, () => {
      this.renderMap();
    });
  }

  onDTableChanged() {
    const pluginSettings = this.initPluginSettings();
    const configSettings = this.initSelectedSettings(pluginSettings);
    const locations = getLocations(this.dtable, configSettings);
    this.setState({
      locations,
      configSettings
    });
  }

  initPluginSettings = () => {
    let pluginSettings = this.dtable.getPluginSettings(PLUGIN_NAME);
    if (pluginSettings && this.isValidPluginSettings(pluginSettings)) {
      return pluginSettings;
    }

    this.setState({showSettingDialog: true});
    let activeTable = this.dtable.getActiveTable();
    let activeView = this.dtable.getActiveView();
    let columns = this.dtable.getShownColumns(activeTable, activeView);

    columns = columns.filter((column) => {
      return COLUMN_TYPES.includes(column.type);
    });

    // need option, get the column type is map
    pluginSettings = { tableName: activeTable.name, viewName: activeView.name, columnName: columns[0] ? columns[0].name : '', markColumnName: null };
    return pluginSettings;
  }

  isValidPluginSettings = (pluginSettings) => {
    let { tableName, viewName, columnName, markColumnName } = pluginSettings;
    let table = this.dtable.getTableByName(tableName);
    if (!table) return false;
    let view = this.dtable.getViewByName(table, viewName);
    if (!view) return false;
    let column = this.dtable.getColumnByName(table, columnName);
    if (!column && columnName) return false;
    let markColumn = this.dtable.getColumnByName(table, markColumnName);
    if (!markColumn && markColumnName) return false;
    return true;
  }

  initSelectedSettings = (settings) => {
    let configSettings = [];
    let { tableName, viewName, columnName, markColumnName } = settings;
    let activeTable = this.dtable.getTableByName(tableName);
    let tableSettings = this.getTableSettings(activeTable);
    let activeView = this.dtable.getViewByName(activeTable, viewName);
    let viewSettings = this.getViewSettings(activeTable, activeView);
    configSettings.push(tableSettings, viewSettings);
    let activeColumn = this.dtable.getColumnByName(activeTable, columnName);
    let columnSettings = this.getColumnSettings(activeTable, activeView, activeColumn);
    configSettings.push(columnSettings);
    let activeMarkColumn = this.dtable.getColumnByName(activeTable, markColumnName);
    let markColumnSettings = this.getMarkColumnSetting(activeTable, activeView, activeMarkColumn);
    configSettings.push(markColumnSettings);
    return configSettings;
  }

  updateSelectedSettings = (type, option) => {
    let { configSettings } = this.state;
    switch(type) {
      case CONFIG_TYPE.TABLE: {
        let currentTable = this.dtable.getTableByName(option.name);
        let currentView = this.dtable.getViews(currentTable)[0];
        let tableSettings = this.getTableSettings(currentTable);
        let viewSettings = this.getViewSettings(currentTable);
        let markColumnSetting = this.getMarkColumnSetting(currentTable, currentView);
        let columnSetting = this.getColumnSettings(currentTable, currentView);
        return [tableSettings, viewSettings, columnSetting, markColumnSetting];
      }
      case CONFIG_TYPE.VIEW: {
        const tableSettings =  getConfigItemByType(configSettings, 'table');
        const tableName = tableSettings.active;
        let currentTable = this.dtable.getTableByName(tableName);
        let currentView = this.dtable.getViewByName(currentTable, option.name);
        let viewSettings = this.getViewSettings(currentTable, currentView);
        let markColumnSetting = this.getMarkColumnSetting(currentTable, currentView);
        let columnSetting = this.getColumnSettings(currentTable, currentView);
        return [tableSettings, viewSettings, columnSetting, markColumnSetting];
      }
      case CONFIG_TYPE.COLUMN: {
        const tableName = configSettings[0].active;
        const viewName = configSettings[1].active;
        let currentTable = this.dtable.getTableByName(tableName);
        let currentView = this.dtable.getViewByName(currentTable, viewName);
        let currentColumn = this.dtable.getColumnByName(currentTable, option.name);
        let columnSettings = this.getColumnSettings(currentTable, currentView, currentColumn);
        replaceSettingItemByType(configSettings, 'column', columnSettings);
        return configSettings;
      }
      case CONFIG_TYPE.MARK_COLUMN: {
        const tableName = configSettings[0].active;
        const viewName = configSettings[1].active;
        let currentTable = this.dtable.getTableByName(tableName);
        let currentView = this.dtable.getViewByName(currentTable, viewName);
        let currentColumn = this.dtable.getColumnByName(currentTable, option.name);
        let columnSettings = this.getMarkColumnSetting(currentTable, currentView, currentColumn);
        replaceSettingItemByType(configSettings, 'mark_column', columnSettings);
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
    let active = '';
    if (columns.length === 0) {
      const column = currentTable.columns[0];
      active = column.name;
      columnSettings.unshift({id: column.key, name: column.name});
    } else {
      active = activeColumn ? activeColumn.name : columns[0].name;
    }
    return {type: CONFIG_TYPE.COLUMN, name: intl.get('Address_field'), active: active, settings: columnSettings};
  }

  getMarkColumnSetting = (currentTable, currentView, activeColumn = null) => {
    let columns = this.dtable.getShownColumns(currentTable, currentView);
    // n\ed options: checkout map column
    columns = columns.filter(column => {
      return column.type === 'single-select';
    });
    
    let columnSettings = columns.map(column => {
      return {id: column.key, name: column.name};
    });

    columnSettings.unshift({id: 'not_used', name: intl.get('Not_used')});

    // need options: checkout map column
    let active = activeColumn ? activeColumn.name : columnSettings[0].name;
    return {type: 'mark_column', name: intl.get('Color_field'), active: active, settings: columnSettings};
  }

  onSelectChange = (option, type) => {
    let configSettings = this.updateSelectedSettings(type, option);
    let settings = generateSettingsByConfig(configSettings);
    this.dtable.updatePluginSettings(PLUGIN_NAME, settings);
  }

  toggle = () => {
    const center = {};
    if (this.map) {
      const position = this.map.getCenter();
      center.position = {lat: position.lat, lng: position.lng};
      center.zoom = this.map.getZoom();
      window.localStorage.setItem('dtable-map-plugin-center', JSON.stringify(center));
    }
    this.map = null;
    this.setState({showDialog: false});
    if (window.app.onClosePlugin) {
      window.app.onClosePlugin();
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
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    const locationItem = locations[0] || {};
    const addressType = locationItem.type;
    if (!addressType) return;
    if (addressType === 'geolocation') {
      this.geocoding(locations, 1, 0);
    } else {
      renderMarkByPosition(locations, this.addMarker);
    }
  }

  geocoding = (locations, resolutionTimes, index) => {
    const locationItem = locations[index];
    if (!locationItem) return;
    let address;
    let name = locationItem.name;
    const value = locationItem.location;
    if (locationItem.type === 'geolocation' && typeof value === 'object') {
      address = formatGeolocactionValue(value);
    } else {
      address = locationItem.location;
    }
    if (!address) {
      this.geocoding(locations, 1, ++index);
      return;
    }
    const activeColumn = this.state.configSettings[2].active;
    this.geocoder.geocode({ 'address': address }, (points, status) => {
      if (locationItem.columnName !== activeColumn) return;
      switch (status) {
        case window.google.maps.GeocoderStatus.OK: {
          let lat = points[0].geometry.location.lat();
          let lng = points[0].geometry.location.lng();
          this.addMarker(lat, lng, locationItem.color, name, address);
          this.geocoding(locations, 1, ++index);
          break;
        }
        case window.google.maps.GeocoderStatus.OVER_QUERY_LIMIT: {
          this.timer =  setTimeout(() => {
            clearTimeout(this.timer);
            this.timer = null;
            if (resolutionTimes < 3) {
              this.geocoding(locations, ++resolutionTimes, index);
            } else {
              console.log(intl.get('Your_Google_Maps_key_has_exceeded_quota'));
              this.geocoding(locations, 1, ++index);
            }
          }, resolutionTimes * 1000);
          break;
        }
        case window.google.maps.GeocoderStatus.UNKNOWN_ERROR:
        case window.google.maps.GeocoderStatus.ERROR: {
          this.timer = setTimeout(() => {
            clearTimeout(this.timer);
            this.timer = null;
            this.geocoding(locations, 0, index);
          }, 1000);
          break;
        }
        case window.google.maps.GeocoderStatus.INVALID_REQUEST:
        case window.google.maps.GeocoderStatus.REQUEST_DENIED: {
          break;
        }
        default: {
          console.log(intl.get('address_was_not_found', { address: address }));
          break;
        }
      }
    });
  }

  addMarker = (lat, lng, color, name, address) => {
    if (!this.markers.find(marker => marker._latlng.lat === lat && marker._latlng.lng === lng)) {
      let describe = `<p>${address || ''}</p><p>${name}</p>`;
      let myIcon = L.icon({
        iconUrl: [image['marker']],
        iconSize: [25, 41],
      });
      if (color) {
        const colorIndex = COLORS.findIndex((item) => color === item.COLOR);
        if (colorIndex) {
          myIcon = L.icon({
            iconUrl: [image['image' + (colorIndex + 1)]],
            iconSize: [25, 41],
          });
        }
      }
      let marker = new L.Marker([lat, lng], { icon: myIcon });

      marker.bindPopup(describe);
      marker.on('mouseover', () => {
        marker.openPopup();
      });
      marker.on('mouseout', () => {
        marker.closePopup();
      });
      marker.on('click', () => {
        return;
      })
      this.markers.push(marker);
      this.map.addLayer(marker);
    }
  }

  toggleSettingDialog = () => {
    this.setState({showSettingDialog: !this.state.showSettingDialog});
  }

  toggleFullScreen = () => {
    this.setState({
      isFullScreen: !this.state.isFullScreen
    }, () => {
      this.map.invalidateSize();
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
    const { isDataLoaded, showSettingDialog, configSettings, isFullScreen, showDialog } = this.state;
    const mapKey = window.dtable.dtableGoogleMapKey;
    return (
      !showDialog ? null :
      <Modal isOpen={true} onExit={this.onExit} toggle={this.toggle} className="plugin-map-dialog-en" style={this.getDialogStyle()}>
        <div className="modal-header dtable-map-plugin-title">
          <div className="modal-title">
            <img className="dtable-map-plugin-logo" src={logo} alt=""/>
            <span className="dtable-map-plugin-name">{intl.get('Map_plugin')}</span>
          </div>
          <div>
            <button className="close" onClick={this.toggle}><i className={'dtable-font dtable-icon-x'}></i></button>
            <button onClick={this.toggleSettingDialog} className="close"><i className={'dtable-font dtable-icon-settings'}></i></button>
            <button className={"close " + (isFullScreen ? 'active-full-screen' : '')} onClick={this.toggleFullScreen}>
              <span className={(isFullScreen ? 'full-screen-active ' : '') + 'icon-container'}>
                <i className={'dtable-font dtable-icon-full-screen'}></i>
              </span>
            </button>
            <button className="close" onClick={onCapture}><i className={'dtable-font dtable-icon-download'}></i></button> 
          </div>
        </div>
        <ModalBody className={"map-plugin-modal-body " + (isFullScreen ? 'map-plugin-modal-body-full-screen' : '')}>
          {(!isDataLoaded && mapKey) && <Loading />}
          {(!mapKey) && (
            <div className='d-flex justify-content-center mt-9'>
              <span className="alert-danger">{intl.get('The_map_plugin_is_not_properly_configured_contact_the_administrator')}</span>
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
