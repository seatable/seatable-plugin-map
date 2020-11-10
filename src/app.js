import React from 'react';
import DTable from 'dtable-sdk';
import { Modal, ModalBody } from 'reactstrap';
import html2canvas from 'html2canvas';
import L from 'leaflet';
import LocationSettings from './components/location-settings';
import Loading from './components/loading';
import intl from 'react-intl-universal';
import './locale/index.js';
import  * as image  from './image/index';
import COLORS from './marker-color';

import logo from './image/map.png';

import './css/common.css';
import './app.css';
import 'leaflet/dist/leaflet.css';

L.Icon.Default.imagePath = '//cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.4/images/';

const PLUGIN_NAME = 'map-en';
const CONFIG_TYPE = {
  TABLE: 'table',
  VIEW: 'view',
  COLUMN: 'column',
  MARK_COLUMN: 'mark_column'
};

class App extends React.Component {

  constructor(props) {
    super(props);
    this.dtable = null;
    this.state = {
      showDialog: props.showDialog || true,
      locations: [],
      tableName: null,
      viewName: null,
      columnName: null,
      markColumnName: null,
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
      const { tableName, viewName, columnName, markColumnName } = this.initPluginSettings();
      const configSettings = this.initSelectedSettings(tableName, viewName, columnName, markColumnName);
      const locations = this.getLocations({tableName, viewName, columnName, markColumnName});
      this.setState({
        tableName,
        viewName,
        columnName,
        markColumnName,
        configSettings,
        isDataLoaded: true,
        locations
      }, () => {
        this.loadLeafletScript();
        this.timer = setInterval(() => {
          if (window.google) {
            clearInterval(this.timer);
            this.renderMap(locations);
          }
        }, 100)
      });
    } else {
      await this.dtable.init(window.dtablePluginConfig);
      await this.dtable.syncWithServer();
      window.app = {};
      this.dtable.subscribe('dtable-connect', () => { this.onDTableConnect(); });
      this.setState({
        isDataLoaded: true
      }, () => {
        this.loadLeafletScript();
      });
    }
    this.unsubscribeLocalDtableChanged = this.dtable.subscribe('local-dtable-changed', () => { this.onDTableChanged(); });
    this.unsubscribeRemoteDtableChanged = this.dtable.subscribe('remote-dtable-changed', () => { this.onDTableChanged(); });
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
      this.loadLeafletScript();
    }
  }

  loadLeafletScript() {
    let lang = (window.dtable && window.dtable.lang) ? window.dtable.lang : 'en';
    let url = `http://mt0.google.cn/vt/lyrs=m@160000000&hl=${lang}&gl=${lang}&src=app&y={y}&x={x}&z={z}&s=Ga`;
    if (!document.getElementById('map-container')) return;
    let center = localStorage.getItem('dtable-map-plugin-center');
    let position = [20, 123], zoom = 5;
    if (center) {
      center = JSON.parse(center)
      position = [center.position.lat, center.position.lng];
      zoom = center.zoom;
    }
    this.map = L.map('map-container').setView(position, zoom).invalidateSize();
    L.tileLayer(url, {
      maxZoom: 18,
      minZoom: 2
    }).addTo(this.map);
  }

  onDTableConnect() {
    const { tableName, viewName, columnName, markColumnName } = this.initPluginSettings();
    const configSettings = this.initSelectedSettings(tableName, viewName, columnName, markColumnName);
    const locations = this.getLocations({tableName, viewName, columnName, markColumnName});
    this.setState({
      tableName,
      viewName,
      columnName,
      markColumnName,
      configSettings,
      locations
    });
  }

  onDTableChanged() {
    let { tableName, viewName, columnName, markColumnName } = this.state;
    const locations = this.getLocations({tableName, viewName, columnName, markColumnName});
    this.setState({locations});
  }

  getLocations({ tableName, viewName, columnName, markColumnName }) {
    let locations = [];
    let currentTable = this.dtable.getTableByName(tableName);
    let currentView = this.dtable.getViewByName(currentTable, viewName);
    let currentColumn = this.dtable.getColumnByName(currentTable, columnName);
    const currentMarkColumn = this.dtable.getColumnByName(currentTable, markColumnName);
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
        let color = '';
        if (currentMarkColumn) {
          color = this.getMarkColor(currentMarkColumn, row);
        }
        if (locationColumnType === 'geolocation') {
          const value = row[locationValueKey] || {};
          locations.push({name: row[locationNameKey] || '', color, type: locationColumnType, ...value});
        } else {
          const value = row[locationValueKey] || '';
          locations.push({name: row[locationNameKey] || '', color, type: locationColumnType, location: value});
        }
      });
    } else {  // view rows
      const rows = currentView.rows;
      rows.forEach(rowId => {
        let row = currentTable['id_row_map'][rowId];
        let color = '';
        if (currentMarkColumn) {
          color = this.getMarkColor(currentMarkColumn, row);
        }
        if (locationColumnType === 'geolocation') {
          const value = row[locationValueKey] || {};
          locations.push({name: row[locationNameKey] || '', color, type: locationColumnType, ...value});
        } else {
          const value = row[locationValueKey] || '';
          locations.push({name: row[locationNameKey] || '', color, type: locationColumnType, location: value});
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
    pluginSettings = {tableName: activeTable.name, viewName: activeView.name, columnName: columns[0].name, markColumnName: null};
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

  initSelectedSettings = (tableName, viewName, columnName, markColumnName) => {
    let activeTable = this.dtable.getTableByName(tableName);
    let tableSettings = this.getTableSettings(activeTable);
    let activeView = this.dtable.getViewByName(activeTable, viewName);
    let viewSettings = this.getViewSettings(activeTable, activeView);
    let activeColumn = this.dtable.getColumnByName(activeTable, columnName);
    let columnSettings = this.getColumnSettings(activeTable, activeView, activeColumn);

    let activeMarkColumn = this.dtable.getColumnByName(activeTable, markColumnName);
    let markColumnSettings = this.getMarkColumnSetting(activeTable, activeView, activeMarkColumn);
    return [tableSettings, viewSettings, columnSettings, markColumnSettings];
  }

  updateSelectedSettings = (type, option) => {
    switch(type) {
      case CONFIG_TYPE.TABLE: {
        let currentTable = this.dtable.getTableByName(option.name);
        let currentView = this.dtable.getViews(currentTable)[0];
        let tableSettings = this.getTableSettings(currentTable);
        let viewSettings = this.getViewSettings(currentTable);
        let columnSettings = this.getColumnSettings(currentTable, currentView);
        let markColumnSettings = this.getMarkColumnSetting(currentTable, currentView);
        let configSettings = [tableSettings, viewSettings, columnSettings, markColumnSettings];
        return configSettings;
      }
      case CONFIG_TYPE.VIEW: {
        let { tableName, configSettings } = this.state;
        let currentTable = this.dtable.getTableByName(tableName);
        let currentView = this.dtable.getViewByName(currentTable, option.name);
        let viewSettings = this.getViewSettings(currentTable, currentView);
        let columnSettings = this.getColumnSettings(currentTable, currentView);
        let markColumnSettings = this.getMarkColumnSetting(currentTable, currentView);
        configSettings.splice(1, 3, viewSettings, columnSettings, markColumnSettings);
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
      case CONFIG_TYPE.MARK_COLUMN: {
        let { tableName, viewName, configSettings } = this.state;
        let currentTable = this.dtable.getTableByName(tableName);
        let currentView = this.dtable.getViewByName(currentTable, viewName);
        let currentColumn = this.dtable.getColumnByName(currentTable, option.name);
        let columnSettings = this.getMarkColumnSetting(currentTable, currentView, currentColumn);
        configSettings.splice(3, 1, columnSettings);
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
      case CONFIG_TYPE.MARK_COLUMN: {
        columnName = option.name;
        let plugin_settings = this.dtable.getPluginSettings(PLUGIN_NAME);
        settings = Object.assign({}, plugin_settings, {markColumnName: columnName});
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
    const center = {};
    const position = this.map.getCenter();
    center.position = {lat: position.lat, lng: position.lng};
    center.zoom = this.map.getZoom();
    window.localStorage.setItem('dtable-map-plugin-center', JSON.stringify(center));
    this.map = null;
    this.setState({showDialog: false});
    if (window.app.onClosePlugin) {
      window.app.onClosePlugin();
    }
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
        this.addMarker(address, locationName, location.color)
      }
    });
  }

  getMarkColor = (markColumn, row) => {
    const key = markColumn.key;
    if (!markColumn.data) return '';
    const options = markColumn.data.options;
    if (!options) return '';
    
    const currentOption = options.find((option) => {
      return option.id === row[key];
    });
    if (!currentOption) return ''
    return currentOption.color;
  }

  addMarker = (address, locationName, color, time = 0) => {
    // The query is too fast and will not be found
    setTimeout(() => {
      this.geocoder.geocode({'address': address}, (points, status) => {
        switch(status) {
          case window.google.maps.GeocoderStatus.OK: {
            let lat = points[0].geometry.location.lat();
            let lng = points[0].geometry.location.lng();
            if (!this.markers.find(marker => marker._latlng.lat === lat && marker._latlng.lng === lng)) {
              let describe = `<p>${address}</p><p>${locationName}</p>`;
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
              let marker = new L.Marker([lat, lng], {icon: myIcon});

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
              this.addMarker(address, locationName, color, time);
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

  convertCanvasToImage = (canvas) => {
    const src = canvas.toDataURL("image/png", 1);
    const link = document.querySelector('.download-link');
    link.href = src;
    link.download = 'map.png';
    link.click();
    document.querySelector('.map-capture').remove();
  }

  onCapture = () => {
    html2canvas(document.querySelector("#map-container"), {
      allowTaint: true,
      taintTest: true,
      useCORS: true,
      ignoreElements: (element) => {
        if (element.className === 'leaflet-top leaflet-left') {
          return true;
        }
      }
    }).then(canvas => {
      const captureContainer = document.createElement('div');
      captureContainer.className = 'map-capture';
      const downLoadLink = document.createElement('a');
      downLoadLink.className = 'download-link';
      captureContainer.appendChild(downLoadLink);
      captureContainer.appendChild(canvas);
      document.querySelector('.dtable-map-plugin').appendChild(captureContainer);

      document.querySelector('.map-capture').appendChild(canvas);
      this.convertCanvasToImage(canvas);
    });
  }
  
  render() {
    const { isDataLoaded, showSettingDialog, configSettings, isFullScreen } = this.state;
    const mapKey = window.dtable.dtableGoogleMapKey;
    return (
      <Modal isOpen={this.state.showDialog} toggle={this.toggle} className="plugin-map-dialog-en" style={this.getDialogStyle()}>
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
            <button className="close" onClick={this.onCapture}><i className={'dtable-font dtable-icon-download'}></i></button> 
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
