import React from 'react';
import DTable from 'dtable-sdk';
import L from 'leaflet';
import LocationSettings from './components/location-settings';
import Loading from './components/loading';
import intl from 'react-intl-universal';
import './locale/index.js';
import  * as image  from './image/index';
import { getLocations, renderMarkByPosition, formatGeolocactionValue, getInitialMapCenter } from './utils/location-utils';
import COLORS from './marker-color';
import ViewTabs from './components/view-tabs';
import { generateSettingsByConfig } from './utils/generate-settings-config';
import { replaceSettingItemByType } from './utils/repalce-setting-item-by-type'; 
import { generatorViewId, getSelectedViewIds, replaceSettingItem, setSelectedViewIds } from './utils/common-utils';
import getConfigItemByType from './utils/get-config-item-by-type';
import onCapture from './utils/capture';
import { 
  IMAGE_PATH, 
  PLUGIN_NAME, 
  CONFIG_TYPE, 
  KEY_SELECTED_VIEW_IDS,
  GEOCODING_FORMAT
} from './constants';
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
      isFullScreen: false,
      selectedViewIdx: 0,
      settings: null
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
      let selectedViewIdx = getSelectedViewIds(KEY_SELECTED_VIEW_IDS) || 0;
      selectedViewIdx = selectedViewIdx > settings.length - 1 ? 0 : selectedViewIdx;
      const configSettings = this.initSelectedSettings(settings[selectedViewIdx]);
      const locations = getLocations(this.dtable, configSettings);
      this.setState({
        configSettings,
        isDataLoaded: true,
        locations,
        settings,
        selectedViewIdx
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
    let selectedViewIdx = getSelectedViewIds(KEY_SELECTED_VIEW_IDS) || 0;
    selectedViewIdx = selectedViewIdx > pluginSettings.length - 1 ? 0 : selectedViewIdx;
    const configSettings = this.initSelectedSettings(pluginSettings[selectedViewIdx]);
    const locations = getLocations(this.dtable, configSettings);
    this.setState({
      configSettings,
      locations,
      isDataLoaded: true,
      settings: pluginSettings,
      selectedViewIdx
    }, () => {
      this.renderMap();
    });
  }

  onDTableChanged() {
    const pluginSettings = this.initPluginSettings();
    let selectedViewIdx = getSelectedViewIds(KEY_SELECTED_VIEW_IDS) || 0;
    selectedViewIdx = selectedViewIdx > pluginSettings.length - 1 ? 0 : selectedViewIdx;
    const configSettings = this.initSelectedSettings(pluginSettings[selectedViewIdx]);
    const locations = getLocations(this.dtable, configSettings);
    this.setState({
      configSettings,
      locations,
      selectedViewIdx,
      settings: pluginSettings
    });
  }

  initPluginSettings = () => {
    let pluginSettings = this.dtable.getPluginSettings(PLUGIN_NAME);
    if (Array.isArray(pluginSettings)) {
      const newPluginSettings = pluginSettings.filter((settingItem) => {
        return this.isValidSettingItem(settingItem);
      });
      if (newPluginSettings.length !== pluginSettings.length) {
        if (newPluginSettings.length === 0) {
          newPluginSettings.push(this.getInitSettingItem());
        }
        pluginSettings = newPluginSettings;
      }
    } else {
      const initSettingItem = this.getInitSettingItem();
      if (pluginSettings && this.isValidSettingItem(pluginSettings)) {
        const { name, id } = initSettingItem;
        pluginSettings = [{...pluginSettings, name, id}];
      } else {
        pluginSettings = [initSettingItem];
      }
    }
    return pluginSettings;
  }

  getInitSettingItem = (name = intl.get('Default_View')) => {
    let activeTable = this.dtable.getActiveTable();
    let activeView = this.dtable.getActiveView();
    let pluginSettingItem = {id: generatorViewId(), name, tableName: activeTable.name, viewName: activeView.name, columnName: null, markDependence: null, directShownColumn: null};    
    return pluginSettingItem;
  }  

  isValidSettingItem = (pluginSettings) => {
    let { tableName, viewName, columnName, markDependence, directShownColumnName } = pluginSettings;
    let table = this.dtable.getTableByName(tableName);
    if (!table) return false;
    let view = this.dtable.getViewByName(table, viewName);
    if (!view) return false;
    let column = this.dtable.getColumnByName(table, columnName);
    if (!column && columnName) return false;
    let markColumn = this.dtable.getColumnByName(table, markDependence);
    if (!markColumn && markDependence && markDependence !== 'rows_color') return false;
    const directShownColumn = this.dtable.getColumnByName(table, directShownColumnName);
    if (!directShownColumn && directShownColumnName) return false;
    return true;
  }

  initSelectedSettings = (settings) => {
    let configSettings = [];
    let { tableName, viewName, columnName, markDependence, directShownColumnName } = settings;
    let activeTable = this.dtable.getTableByName(tableName);
    let tableSettings = this.getTableSettings(activeTable);
    let activeView = this.dtable.getViewByName(activeTable, viewName);
    let viewSettings = this.getViewSettings(activeTable, activeView);
    configSettings.push(tableSettings, viewSettings);
    let activeColumn = this.dtable.getColumnByName(activeTable, columnName);
    let columnSettings = this.getColumnSettings(activeTable, activeView, activeColumn);
    configSettings.push(columnSettings);
    let markColumnSettings = this.getMarkColumnSetting(activeTable, activeView, markDependence);;
    configSettings.push(markColumnSettings);
    let directShownColumn = this.dtable.getColumnByName(activeTable, directShownColumnName);
    let directShownColumnSetting = this.getDirectShownColumnSetting(activeTable, activeView, directShownColumn);
    configSettings.push(directShownColumnSetting);
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
        let directShownColumnSetting = this.getDirectShownColumnSetting(currentTable, currentView);
        let columnSetting = this.getColumnSettings(currentTable, currentView);
        return [tableSettings, viewSettings, columnSetting, markColumnSetting, directShownColumnSetting];
      }
      case CONFIG_TYPE.VIEW: {
        const tableSettings =  getConfigItemByType(configSettings, 'table');
        const tableName = tableSettings.active;
        let currentTable = this.dtable.getTableByName(tableName);
        let currentView = this.dtable.getViewByName(currentTable, option.name);
        let viewSettings = this.getViewSettings(currentTable, currentView);
        let markColumnSetting = this.getMarkColumnSetting(currentTable, currentView);
        let directShownColumnSetting = this.getDirectShownColumnSetting(currentTable, currentView);
        let columnSetting = this.getColumnSettings(currentTable, currentView);
        return [tableSettings, viewSettings, columnSetting, markColumnSetting, directShownColumnSetting];
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
      case CONFIG_TYPE.MARK_DEPENDENCE: {
        const tableName = configSettings[0].active;
        const viewName = configSettings[1].active;
        let currentTable = this.dtable.getTableByName(tableName);
        let currentView = this.dtable.getViewByName(currentTable, viewName);
        let columnSetting = this.getMarkColumnSetting(currentTable, currentView, option.name);
        replaceSettingItemByType(configSettings, 'mark_dependence', columnSetting);
        return configSettings;
      }
      case CONFIG_TYPE.DIECT_SHOWN_COLUMN: {
        const tableName = configSettings[0].active;
        const viewName = configSettings[1].active;
        let currentTable = this.dtable.getTableByName(tableName);
        let currentView = this.dtable.getViewByName(currentTable, viewName);
        let column = this.dtable.getColumnByName(currentTable, option.name);
        let directShownColumnSetting = this.getDirectShownColumnSetting(currentTable, currentView, column);
        replaceSettingItemByType(configSettings, 'direct_shown_column', directShownColumnSetting);
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

  getMarkColumnSetting = (currentTable, currentView, dependence = null) => {
    let columns = this.dtable.getShownColumns(currentTable, currentView);
    // n\ed options: checkout map column
    columns = columns.filter(column => {
      return column.type === 'single-select';
    });
    
    let columnSettings = columns.map(column => {
      return {id: column.key, name: column.name};
    });

    let active = '';
    columnSettings.unshift({id: 'not_used', name: intl.get('Not_used')}, {id: 'rows_color', name: intl.get('Row_color')});
    if (dependence === 'rows_color') {
      active = intl.get('Row_color');
    } else {
      active = dependence ? dependence : columnSettings[0].name;
    }
    return {type: 'mark_dependence', name: intl.get('Marker_colored_by'), active: active, settings: columnSettings};
  }

  getDirectShownColumnSetting = (currentTable, currentView, activeColumn = null) => {
    let columns = this.dtable.getShownColumns(currentTable, currentView);
    columns = columns.filter(column => {
      return column.type === 'text' || column.type === 'single-select';
    });
    let columnSettings = columns.map(column => {
      return {id: column.key, name: column.name};
    });
    columnSettings.unshift({id: 'not_used', name: intl.get('Not_used')});
    // need options: checkout map column
    let active = activeColumn ? activeColumn.name : columnSettings[0].name;
    return { type: 'direct_shown_column', name: intl.get('Display_field'), active: active, settings: columnSettings };
  }

  onSelectChange = (option, type) => {
    let configSettings = this.updateSelectedSettings(type, option);
    let { settings, selectedViewIdx } = this.state;
    let settingItem = generateSettingsByConfig(configSettings, settings[selectedViewIdx]);
    settings = replaceSettingItem(settings, settingItem, selectedViewIdx);
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
    setTimeout(() => {
      this.setState({showDialog: false});
    }, 500);
    window.app.onClosePlugin && window.app.onClosePlugin();
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
    if (GEOCODING_FORMAT.includes(addressType)) {
      this.geocoding(locations, 1, 0);
    } else {
      renderMarkByPosition(locations, this.addMarker);
    }
  }

  geocoding = (locations, resolutionTimes, index) => {
    const locationItem = locations[index];
    if (!locationItem) return;
    let address;
    const value = locationItem.location;
    if (GEOCODING_FORMAT.includes(locationItem.type) && typeof value === 'object') {
      address = formatGeolocactionValue(value, locationItem.type);
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
          this.addMarker(locationItem, lat, lng, address);
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

  addMarker = (location, lat, lng, address) => {
    const { color, name, directShownLabel } = location;
    if (!this.markers.find(marker => marker._latlng.lat === lat && marker._latlng.lng === lng)) {
      let describe = `<p>${address || ''}</p><p>${name}</p>`;
      let myIcon = L.icon({
        iconUrl: [image['marker']],
        iconSize: [25, 41],
      });
      if (color) {
        const colorIndex = COLORS.findIndex((item) => color === item.COLOR);
        if (colorIndex > -1) {
          myIcon = L.icon({
            iconUrl: [image['image' + (colorIndex + 1)]],
            iconSize: [25, 41],
          });
        }
      }
      let marker = new L.Marker([lat, lng], { icon: myIcon, riseOnHover: true });

      marker.bindPopup(describe);
      if (directShownLabel) {
        marker.bindTooltip(directShownLabel, {
          direction: 'right',
          permanent: true,
          offset: L.point(14, 0),
          opacity: 1,
          className: 'plugin-en-tooltip'
        }).openTooltip();
      }
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
        position: 'fixed',
        top: 0,
        left: 0,
        margin: 0
      } 
    } else {
      return {
        maxWidth: '100%'
      }
    }
  }

  onSelectView = (index) => {
    const { settings } = this.state;
    const settingItem = settings[index];
    const configSettings = this.initSelectedSettings(settingItem);
    setSelectedViewIds(KEY_SELECTED_VIEW_IDS, index);
    const locations = getLocations(this.dtable, configSettings);
    this.setState({
      configSettings,
      selectedViewIdx: index,
      locations
    });
  }

  onAddView = (name) => {
    const view = this.getInitSettingItem(name);
    const { settings } = this.state;
    settings.push(view);
    const selectedViewIdx = settings.length - 1;
    this.setState({
      selectedViewIdx,
    }, () => {
      setSelectedViewIds(KEY_SELECTED_VIEW_IDS, selectedViewIdx);
      this.dtable.updatePluginSettings(PLUGIN_NAME, settings);
      this.viewsTabs && this.viewsTabs.setViewsTabsScroll();
    });
  }

  onRenameView = (name) => {
    let { selectedViewIdx, settings } = this.state;
    const newSettingItem = Object.assign({}, settings[selectedViewIdx], {name: name});
    settings.splice(selectedViewIdx, 1, newSettingItem);
    this.dtable.updatePluginSettings(PLUGIN_NAME, settings);
  }

  onDeleteView = (index) => {
    let { selectedViewIdx, settings } = this.state;
    selectedViewIdx = settings.length - 1 === selectedViewIdx ? selectedViewIdx - 1 : selectedViewIdx;
    settings.splice(index, 1);
    this.setState({
      selectedViewIdx: selectedViewIdx
    }, () => {
      this.dtable.updatePluginSettings(PLUGIN_NAME, settings);
    });
  }
  
  render() {
    const { isDataLoaded, showSettingDialog, configSettings, isFullScreen, showDialog, settings, selectedViewIdx } = this.state;
    const mapKey = window.dtable.dtableGoogleMapKey;
    if (!showDialog) return '';
    return (
      <div className="plugin-map-dialog-en" style={this.getDialogStyle()}>
        <div className={'dtable-map-plugin-title'}>
          <div className='plugin-logo'>
            <img className="plugin-logo-icon" src={logo} alt="" />
            <span className="dtable-map-plugin-name">{intl.get('Map_plugin')}</span>
          </div>
          <div className="map-plugin-en-tabs">
            <ViewTabs
              isMobile={false}
              ref={ref => this.viewsTabs = ref}
              settings={settings}
              selectedViewIdx={selectedViewIdx}
              onAddView={this.onAddView}
              onRenameView={this.onRenameView}
              onDeleteView={this.onDeleteView}
              onSelectView={this.onSelectView}
            />
          </div>
          <div className="map-operators">
            <span className="map-operator dtable-font dtable-icon-download btn-margin-right" onClick={onCapture}></span>
            <span className={`map-operator dtable-font dtable-icon-full-screen btn-margin-right ${isFullScreen ? 'full-screen-active' : ''}`} onClick={this.toggleFullScreen}></span>
            <span className="map-operator dtable-font dtable-icon-settings btn-margin-right" onClick={this.toggleSettingDialog}></span>
            <span className="map-operator dtable-font dtable-icon-x btn-margin-right btn-close" onClick={this.toggle}></span>
          </div>
        </div>
        <div className={"map-plugin-modal-body " + (isFullScreen ? 'map-plugin-modal-body-full-screen' : '')}>
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
        </div>
      </div>
    );
  }
}

export default App;
