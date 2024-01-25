import React from 'react';
import PropTypes from 'prop-types';
import intl from 'react-intl-universal';
import L from 'leaflet';
import 'leaflet.markercluster/dist/leaflet.markercluster-src';
import {
  getTableByName, getViewByName, getTableColumnByName, getNonArchiveViews, getViewShownColumns,
} from 'dtable-utils';
import Settings from './components/mobile/settings';
import Loading from './components/loading';
import * as image from './image/index';
import { getLocations, renderMarkByPosition, formatGeolocationValue, getInitialMapCenter } from './utils/location-utils';
import COLORS from './marker-color';
import ViewTabs from './components/view-tabs';
import { generateSettingsByConfig } from './utils/generate-settings-config';
import { replaceSettingItemByType } from './utils/repalce-setting-item-by-type';
import { generatorViewId, getSelectedViewIds, replaceSettingItem, setSelectedViewIds } from './utils/common-utils';
import onCapture from './utils/capture';
import getConfigItemByType from './utils/get-config-item-by-type';
import removeSettingByType from './utils/remove-setting-by-type';
import { IMAGE_PATH,
  PLUGIN_NAME,
  CONFIG_TYPE,
  KEY_SELECTED_VIEW_IDS,
  GEOCODING_FORMAT,
  MAP_MODE,
  EVENT_BUS_TYPE
} from './constants';
import { toaster } from 'dtable-ui-component';
import MobileLocationDetailList from './components/mobile/mobile-location-detail-list';


import './locale';

import logo from './image/map.png';

import styles from './css/mobile-en.module.css';
import 'leaflet/dist/leaflet.css';
import pluginContext from './plugin-context';
import { GoogleMap } from './map/google-map'; // Replace './path/to/GoogleMap' with the actual path to the GoogleMap module
import { eventBus } from './utils/event-bus';

L.Icon.Default.imagePath = IMAGE_PATH;

class App extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      showDialog: props.showDialog || true,
      locations: [],
      showSettingDialog: false,
      isDataLoaded: false,
      configSettings: null,
      isFullScreen: false,
      selectedViewIdx: 0,
      settings: null,
      clickPoint: {},
      showLocationDetail: false,
      isShowSameLocationDetails: false,

    };
    this.map = null;
    this.geocoder = null;
    this.markers = [];
    this.timer = null;
    this.clusterMarkers = null;
    this.userInfo = null;
    this.cellValueUtils = pluginContext.cellValueUtils;
    this.mapInstance = new GoogleMap({ mapKey: window.dtable.dtableGoogleMapKey, errorHandler: toaster.danger });

  }

  async componentDidMount() {
    this.unsubscribeShowDetails = eventBus.subscribe(EVENT_BUS_TYPE.SHOW_LOCATION_DETAILS, this.showLocationDetails);
    // load google map
    await this.mapInstance.loadMap();
    this.initPluginDTableData();
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    this.setState({
      showDialog: nextProps.showDialog
    }, () => {
      if (nextProps.showDialog) {
        this.onDTableConnect();
      }
    });
  }

  componentDidUpdate(preProps, preState) {
    const { showLocationDetail, clickPoint, locations, configSettings } = this.state;
    const { showLocationDetail: preShowLocationDetail, clickPoint: prevClickPoint } = preState;
    if (this.state.showSettingDialog !== preState.showSettingDialog) return;

    if ((window.google && this.state.showDialog) && (showLocationDetail === preShowLocationDetail) && (clickPoint === prevClickPoint)) {
      // render locations after the container rendered in the dom tree
      requestAnimationFrame(() => {
        this.resetLocationDetails();
        this.mapInstance.renderLocations(locations, configSettings);
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
  };

  getLocations = (configSettings) => {
    const tables = window.dtableSDK.getTables();
    return getLocations(tables, configSettings, {
      collaborators: window.app.state.collaborators,
    });
  };

  // all init settings
  getInitPluginSettings = () => {
    const { showSettingDialog, pluginSettings: settings, selectedViewSettings, selectedViewIdx } = pluginContext.initPluginSettings();
    const configSettings = pluginContext.initSelectedSettings(selectedViewSettings);
    const locations = this.getLocations(configSettings);
    if (showSettingDialog) {
      this.setState({ showSettingDialog });
    }
    return { settings, configSettings, selectedViewSettings, locations, selectedViewIdx };
  };

  async initPluginDTableData() {
    if (this.props.isDevelopment) {
      this.unsubscribeLocalDtableChanged = window.dtableSDK.subscribe('local-dtable-changed', () => { this.onDTableChanged(); });
      this.unsubscribeRemoteDtableChanged = window.dtableSDK.subscribe('remote-dtable-changed', () => { this.onDTableChanged(); });
      // const settings = this.initPluginSettings();
      // let selectedViewIdx = getSelectedViewIds(KEY_SELECTED_VIEW_IDS) || 0;
      // selectedViewIdx = selectedViewIdx > settings.length - 1 ? 0 : selectedViewIdx;
      // const configSettings = this.initSelectedSettings(settings[selectedViewIdx]);
      // const locations = this.getLocations(configSettings);
      const { settings, configSettings, selectedViewSettings, locations, selectedViewIdx } = this.getInitPluginSettings();
      this.setState({
        configSettings,
        isDataLoaded: true,
        locations,
        settings,
        selectedViewIdx
      }, async () => {
        await this.mapInstance.renderMap(locations);
      });
    } else {
      this.unsubscribeLocalDtableChanged = window.dtableSDK.subscribe('local-dtable-changed', () => { this.onDTableChanged(); });
      this.unsubscribeRemoteDtableChanged = window.dtableSDK.subscribe('remote-dtable-changed', () => { this.onDTableChanged(); });
      // const settings = this.initPluginSettings();
      // let selectedViewIdx = getSelectedViewIds(KEY_SELECTED_VIEW_IDS) || 0;
      // selectedViewIdx = selectedViewIdx > settings.length - 1 ? 0 : selectedViewIdx;
      // const configSettings = this.initSelectedSettings(settings[selectedViewIdx]);
      // const locations = this.getLocations(configSettings);
      const { settings, configSettings, selectedViewSettings, locations, selectedViewIdx } = this.getInitPluginSettings();
      this.setState({
        configSettings,
        isDataLoaded: true,
        locations,
        settings,
        selectedViewIdx
      }, async () => {
        await this.renderMap();
        this.renderLocations(locations);
      });
    }
  }

  async loadMapScript() {
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
    window.L = L;
    const { position, zoom } = await getInitialMapCenter(this.state.locations, this.geocoder);
    if (!this.map) {
      this.map = L.map('map-container', {
        center: position,
        zoom: zoom,
        maxBounds: [[-90, -180], [90, 180]],
        maxBoundsViscosity: 1.0 // prevent the user from dragging outside the bounds
      })
        .invalidateSize();
      L.tileLayer(url, {
        maxZoom: 18,
        minZoom: 2
      }).addTo(this.map);
    }
  }

  onDTableConnect() {
    this.unsubscribeLocalDtableChanged = window.dtableSDK.subscribe('local-dtable-changed', () => { this.onDTableChanged(); });
    this.unsubscribeRemoteDtableChanged = window.dtableSDK.subscribe('remote-dtable-changed', () => { this.onDTableChanged(); });
    // const pluginSettings = this.initPluginSettings();
    // let selectedViewIdx = getSelectedViewIds(KEY_SELECTED_VIEW_IDS) || 0;
    // selectedViewIdx = selectedViewIdx > pluginSettings.length - 1 ? 0 : selectedViewIdx;
    // const configSettings = this.initSelectedSettings(pluginSettings[selectedViewIdx]);
    // const locations = this.getLocations(configSettings);
    const { settings, configSettings, locations, selectedViewIdx } = this.getInitPluginSettings();
    this.setState({
      configSettings,
      locations,
      isDataLoaded: true,
      settings,
      selectedViewIdx
    }, () => {
      this.renderMap();
    });
  }

  onDTableChanged() {
    // const pluginSettings = this.initPluginSettings();
    // let selectedViewIdx = getSelectedViewIds(KEY_SELECTED_VIEW_IDS) || 0;
    // selectedViewIdx = selectedViewIdx > pluginSettings.length - 1 ? 0 : selectedViewIdx;
    // const configSettings = this.initSelectedSettings(pluginSettings[selectedViewIdx]);
    // const locations = this.getLocations(configSettings);
    const { settings, configSettings, locations, selectedViewIdx } = this.getInitPluginSettings();
    this.setState({
      locations,
      configSettings,
      selectedViewIdx,
      settings
    });
  }

  // initPluginSettings = () => {
  //   let pluginSettings = window.dtableSDK.getPluginSettings(PLUGIN_NAME);
  //   if (Array.isArray(pluginSettings)) {
  //     const newPluginSettings = pluginSettings.filter((settingItem) => {
  //       return this.isValidSettingItem(settingItem);
  //     });
  //     if (newPluginSettings.length !== pluginSettings.length) {
  //       if (newPluginSettings.length === 0) {
  //         newPluginSettings.push(this.getInitSettingItem());
  //       }
  //       pluginSettings = newPluginSettings;
  //     }
  //   } else {
  //     const initSettingItem = this.getInitSettingItem();
  //     if (pluginSettings && this.isValidSettingItem(pluginSettings)) {
  //       const { name, id } = initSettingItem;
  //       pluginSettings = [{ ...pluginSettings, name, id }];
  //     } else {
  //       pluginSettings = [initSettingItem];
  //     }
  //   }
  //   return pluginSettings;
  // };

  // getInitSettingItem = (name = intl.get('Default_View')) => {
  //   const activeTable = window.dtableSDK.getActiveTable();
  //   const activeView = window.dtableSDK.getActiveView();
  //   return {
  //     id: generatorViewId(),
  //     tableName: activeTable.name,
  //     viewName: activeView.name,
  //     columnName: null,
  //     markDependence: null,
  //     directShownColumn: null,
  //     name,
  //   };
  // };

  // isValidSettingItem = (pluginSettings) => {
  //   const { mapMode, tableName, viewName, columnName, markDependence, directShownColumnName, imageColumnName } = pluginSettings;
  //   const tables = window.dtableSDK.getTables();
  //   const table = getTableByName(tables, tableName);
  //   if (!table) return false;
  //   const view = getViewByName(table.views, viewName);
  //   if (!view || view.type === 'archive') return false;
  //   const column = getTableColumnByName(table, columnName);
  //   if (!column && columnName) return false;
  //   if (mapMode === MAP_MODE.DEFAULT) {
  //     const markColumn = getTableColumnByName(table, markDependence);
  //     if (!markColumn && markDependence && markDependence !== 'rows_color') return false;
  //     const directShownColumn = getTableColumnByName(table, directShownColumnName);
  //     if (!directShownColumn && directShownColumnName) return false;
  //   } else {
  //     const imageColumn = getTableColumnByName(table, imageColumnName);
  //     if (!imageColumn && imageColumnName) return false;
  //   }
  //   return true;
  // };

  // initSelectedSettings = (settings) => {
  //   const tables = window.dtableSDK.getTables();
  //   let configSettings = [];
  //   let { mapMode, tableName, viewName, columnName, markDependence, directShownColumnName, imageColumnName } = settings;
  //   const mapSettings = this.getMapSetting(mapMode);
  //   configSettings.push(mapSettings);
  //   let activeTable = getTableByName(tables, tableName);
  //   let tableSettings = this.getTableSettings(activeTable);
  //   let activeView = getViewByName(activeTable.views, viewName);
  //   let viewSettings = this.getViewSettings(activeTable, activeView);
  //   configSettings.push(tableSettings, viewSettings);
  //   let activeColumn = getTableColumnByName(activeTable, columnName);
  //   let columnSettings = this.getColumnSettings(activeTable, activeView, activeColumn);
  //   configSettings.push(columnSettings);
  //   if (mapMode === MAP_MODE.IMAGE) {
  //     let activeImageColumn = getTableColumnByName(activeTable, imageColumnName);
  //     const imageColumnSettings = this.getImageColumnsSetting(activeTable, activeView, activeImageColumn);
  //     configSettings.push(imageColumnSettings);
  //     return configSettings;
  //   }
  //   let markColumnSettings = this.getMarkColumnSetting(activeTable, activeView, markDependence);
  //   let directShownColumn = getTableColumnByName(activeTable, directShownColumnName);
  //   let directShownColumnSetting = this.getDirectShownColumnSetting(activeTable, activeView, directShownColumn);
  //   configSettings.push(markColumnSettings, directShownColumnSetting);
  //   return configSettings;
  // };

  // updateSelectedSettings = (type, option) => {
  //   let { configSettings } = this.state;
  //   const tables = window.dtableSDK.getTables();
  //   switch (type) {
  //     case CONFIG_TYPE.MAP_MODE: {
  //       const tableName = getConfigItemByType(configSettings, 'table').active;
  //       const viewName = getConfigItemByType(configSettings, 'view').active;
  //       const mapMode = option.name;
  //       const currentMapMode = configSettings[0].active;
  //       const currentTable = getTableByName(tables, tableName);
  //       const currentView = getViewByName(currentTable.views, viewName);
  //       if (currentMapMode === mapMode) return configSettings;
  //       let newConfigSettings = [];
  //       const mapSettings = this.getMapSetting(mapMode);
  //       configSettings[0] = mapSettings;
  //       if (mapMode === MAP_MODE.IMAGE) {
  //         const imageColumnSetting = this.getImageColumnsSetting(currentTable, currentView, );
  //         configSettings.forEach((setting) => {
  //           const type = setting.type;
  //           if (type === 'column') {
  //             newConfigSettings.push(setting, imageColumnSetting);
  //             return;
  //           }
  //           newConfigSettings.push(setting);
  //         });
  //         newConfigSettings = removeSettingByType(newConfigSettings, [CONFIG_TYPE.MARK_DEPENDENCE, CONFIG_TYPE.DIECT_SHOWN_COLUMN]);
  //       } else {
  //         newConfigSettings = removeSettingByType(configSettings, CONFIG_TYPE.IMAGE_COLUMN);
  //         newConfigSettings.push(this.getMarkColumnSetting(currentTable, currentView), this.getDirectShownColumnSetting(currentTable, currentView));
  //       }
  //       return newConfigSettings;
  //     }
  //     case CONFIG_TYPE.TABLE: {
  //       const mapModeSettings = getConfigItemByType(configSettings, CONFIG_TYPE.MAP_MODE);
  //       let currentTable = getTableByName(tables, option.name);
  //       let currentView = getNonArchiveViews(currentTable.views)[0];
  //       let tableSettings = this.getTableSettings(currentTable);
  //       let viewSettings = this.getViewSettings(currentTable);
  //       let columnSetting = this.getColumnSettings(currentTable, currentView);
  //       if (configSettings[0].active === MAP_MODE.IMAGE) {
  //         let imageColumnSetting = this.getImageColumnsSetting(currentTable, currentView);
  //         return [mapModeSettings, tableSettings, viewSettings, columnSetting, imageColumnSetting];
  //       }
  //       let markColumnSetting = this.getMarkColumnSetting(currentTable, currentView);
  //       let directShownColumnSetting = this.getDirectShownColumnSetting(currentTable, currentView);
  //       return [mapModeSettings, tableSettings, viewSettings, columnSetting, markColumnSetting, directShownColumnSetting];
  //     }
  //     case CONFIG_TYPE.VIEW: {
  //       const mapModeSettings = getConfigItemByType(configSettings, CONFIG_TYPE.MAP_MODE);
  //       const tableSettings = getConfigItemByType(configSettings, 'table');
  //       const tableName = tableSettings.active;
  //       let currentTable = getTableByName(tables, tableName);
  //       let currentView = getViewByName(currentTable.views, option.name);
  //       let viewSettings = this.getViewSettings(currentTable, currentView);
  //       let columnSetting = this.getColumnSettings(currentTable, currentView);
  //       if (configSettings[0].active === MAP_MODE.IMAGE) {
  //         let imageColumnSetting = this.getImageColumnsSetting(currentTable, currentView);
  //         return [mapModeSettings, tableSettings, viewSettings, columnSetting, imageColumnSetting];
  //       }
  //       let markColumnSetting = this.getMarkColumnSetting(currentTable, currentView);
  //       let directShownColumnSetting = this.getDirectShownColumnSetting(currentTable, currentView);
  //       return [mapModeSettings, tableSettings, viewSettings, columnSetting, markColumnSetting, directShownColumnSetting];
  //     }
  //     case CONFIG_TYPE.COLUMN: {
  //       const tableName = getConfigItemByType(configSettings, 'table').active;
  //       const viewName = getConfigItemByType(configSettings, 'view').active;
  //       let currentTable = getTableByName(tables, tableName);
  //       let currentView = getViewByName(currentTable.views, viewName);
  //       let currentColumn = getTableColumnByName(currentTable, option.name);
  //       let columnSettings = this.getColumnSettings(currentTable, currentView, currentColumn);
  //       replaceSettingItemByType(configSettings, 'column', columnSettings);
  //       return configSettings;
  //     }
  //     case CONFIG_TYPE.MARK_DEPENDENCE: {
  //       const tableName = getConfigItemByType(configSettings, 'table').active;
  //       const viewName = getConfigItemByType(configSettings, 'view').active;
  //       let currentTable = getTableByName(tables, tableName);
  //       let currentView = getViewByName(currentTable.views, viewName);
  //       let columnSetting = this.getMarkColumnSetting(currentTable, currentView, option.name);
  //       replaceSettingItemByType(configSettings, 'mark_dependence', columnSetting);
  //       return configSettings;
  //     }
  //     case CONFIG_TYPE.DIECT_SHOWN_COLUMN: {
  //       const tableName = getConfigItemByType(configSettings, 'table').active;
  //       const viewName = getConfigItemByType(configSettings, 'view').active;
  //       let currentTable = getTableByName(tables, tableName);
  //       let currentView = getViewByName(currentTable.views, viewName);
  //       let column = getTableColumnByName(currentTable, option.name);
  //       let directShownColumnSetting = this.getDirectShownColumnSetting(currentTable, currentView, column);
  //       replaceSettingItemByType(configSettings, 'direct_shown_column', directShownColumnSetting);
  //       return configSettings;
  //     }
  //     case CONFIG_TYPE.IMAGE_COLUMN: {
  //       const tableName = getConfigItemByType(configSettings, 'table').active;
  //       const viewName = getConfigItemByType(configSettings, 'view').active;
  //       let currentTable = getTableByName(tables, tableName);
  //       let currentView = getViewByName(currentTable.views, viewName);
  //       let column = getTableColumnByName(currentTable, option.name);
  //       let imageColumnSetting = this.getImageColumnsSetting(currentTable, currentView, column);
  //       replaceSettingItemByType(configSettings, CONFIG_TYPE.IMAGE_COLUMN, imageColumnSetting);
  //       return configSettings;
  //     }
  //     default: {
  //       return this.state.configSettings;
  //     }
  //   }
  // };

  // getMapSetting = (mapType = MAP_MODE.DEFAULT) => {
  //   return { name: intl.get('Map_type'), active: mapType, type: 'map_mode', settings: [{ name: MAP_MODE.DEFAULT, id: 'map' }, { name: MAP_MODE.IMAGE, id: 'image' }] };
  // };

  // getTableSettings = (activeTable = null) => {
  //   const tables = window.dtableSDK.getTables();
  //   let tableSettings = tables.map(table => {
  //     return { id: table._id, name: table.name };
  //   });
  //   let active = activeTable ? activeTable.name : tables[0].name;
  //   return {
  //     type: CONFIG_TYPE.TABLE,
  //     name: intl.get('Table'),
  //     settings: tableSettings,
  //     active,
  //   };
  // };

  // getViewSettings = (currentTable, activeView = null) => {
  //   const views = getNonArchiveViews(currentTable.views);
  //   let viewSettings = views.map(view => {
  //     return { id: view._id, name: view.name };
  //   }).filter(Boolean);
  //   let active = activeView ? activeView.name : views[0].name;
  //   return {
  //     type: CONFIG_TYPE.VIEW,
  //     name: intl.get('View'),
  //     settings: viewSettings,
  //     active,
  //   };
  // };

  // getColumnSettings = (currentTable, currentView, activeColumn = null) => {
  //   let columns = getViewShownColumns(currentView, currentTable.columns);

  //   // need options: checkout map column
  //   columns = columns.filter(column => {
  //     return column.type === 'text' || column.type === 'geolocation';
  //   });
  //   let columnSettings = columns.map(column => {
  //     return { id: column.key, name: column.name };
  //   });
  //   let active = '';
  //   if (columns.length === 0) {
  //     const column = currentTable.columns[0];
  //     active = column.name;
  //     columnSettings.unshift({ id: column.key, name: column.name });
  //   } else {
  //     active = activeColumn ? activeColumn.name : columns[0].name;
  //   }
  //   return {
  //     type: CONFIG_TYPE.COLUMN,
  //     name: intl.get('Address_field'),
  //     settings: columnSettings,
  //     active,
  //   };
  // };

  // getMarkColumnSetting = (currentTable, currentView, dependence = null) => {
  //   let columns = getViewShownColumns(currentView, currentTable.columns);
  //   columns = columns.filter(column => {
  //     return column.type === 'single-select';
  //   });

  //   let columnSettings = columns.map(column => {
  //     return { id: column.key, name: column.name };
  //   });

  //   let active = '';
  //   columnSettings.unshift({ id: 'not_used', name: intl.get('Not_used') }, { id: 'rows_color', name: intl.get('Row_color') });
  //   if (dependence === 'rows_color') {
  //     active = intl.get('Row_color');
  //   } else {
  //     active = dependence ? dependence : columnSettings[0].name;
  //   }
  //   return {
  //     type: 'mark_dependence',
  //     name: intl.get('Marker_colored_by'),
  //     settings: columnSettings,
  //     active,
  //   };
  // };

  // getDirectShownColumnSetting = (currentTable, currentView, activeColumn = null) => {
  //   let columns = getViewShownColumns(currentView, currentTable.columns);
  //   columns = columns.filter(column => {
  //     return column.type === 'text' || column.type === 'single-select';
  //   });
  //   let columnSettings = columns.map(column => {
  //     return { id: column.key, name: column.name };
  //   });
  //   columnSettings.unshift({ id: '', name: intl.get('Not_used') });

  //   // need options: checkout map column
  //   let active = activeColumn ? activeColumn.name : columnSettings[0].name;
  //   return {
  //     type: 'direct_shown_column',
  //     name: intl.get('Display_field'),
  //     settings: columnSettings,
  //     active,
  //   };
  // };

  // getImageColumnsSetting = (currentTable, currentView, activeColumn = null) => {
  //   let columns = getViewShownColumns(currentView, currentTable.columns);
  //   columns = columns.filter(column => {
  //     return column.type === 'image';
  //   });
  //   let columnSettings = columns.map(column => {
  //     return { id: column.key, name: column.name };
  //   });

  //   columnSettings.unshift({ id: 'not_used', name: intl.get('Not_used') });
  //   let active = activeColumn ? activeColumn.name : columnSettings[0].name;
  //   return {
  //     type: 'image_column',
  //     name: intl.get('Image_field'),
  //     settings: columnSettings,
  //     active,
  //   };
  // };

  showLocationDetail = (point) => {
    const { clickPoint, showLocationDetail } = this.state;
    if (clickPoint.lng === point.lng && clickPoint.lat === point.lat) {
      this.setState({
        showLocationDetail: !this.state.showLocationDetail
      });
      return;
    }
    if (showLocationDetail) {
      this.setState({
        clickPoint: point
      });
    } else {
      this.setState({
        showLocationDetail: !this.state.showLocationDetail,
        clickPoint: point
      });
    }
  };

  closeLocationDetail = () => {
    if (!this.state.showLocationDetail) return;
    this.setState({ showLocationDetail: false });
  };

  showLocationDetailToggle = () => {
    this.setState({
      showLocationDetail: !this.state.showLocationDetail,
    });
  };

  resetLocationDetails = () => {
    this.mapInstance.sameLocationList = {};
    if (this.state.showLocationDetail) {
      this.setState({
        showLocationDetail: false
      });
    }
  };

  onSelectChange = (type, option) => {
    option = { name: option };
    let { settings, selectedViewIdx, configSettings: oldConfigSettings } = this.state;
    let configSettings = pluginContext.updateSelectedSettings(type, option, oldConfigSettings);
    let settingItem = generateSettingsByConfig(configSettings, settings[selectedViewIdx]);
    settings = replaceSettingItem(settings, settingItem, selectedViewIdx);
    window.dtableSDK.updatePluginSettings(PLUGIN_NAME, settings);
    this.setState({ configSettings: [...configSettings], settings });
  };

  onSaveSetting = () => {
    let { selectedViewIdx, configSettings } = this.state;
    const settingItem = generateSettingsByConfig(configSettings, this.state.settings[selectedViewIdx]);
    const settings = replaceSettingItem(this.state.settings, settingItem, selectedViewIdx);
    this.toggleSettingDialog();
    window.dtableSDK.updatePluginSettings(PLUGIN_NAME, settings);
  };

  toggle = () => {
    const center = {};
    if (this.map) {
      const position = this.map.getCenter();
      center.position = { lat: position.lat, lng: position.lng };
      center.zoom = this.map.getZoom();
      window.localStorage.setItem('dtable-map-plugin-center', JSON.stringify(center));
    }
    this.map = null;
    setTimeout(() => {
      this.setState({ showDialog: false });
    }, 500);
    window.app.onClosePlugin && window.app.onClosePlugin();
  };

  getRowByConfigSettings = (cfgSettings, rowId) => {
    const tableName = getConfigItemByType(cfgSettings, 'table').active;
    const currentTable = pluginContext.getTableByName(tableName);
    const row = pluginContext.getRow(currentTable, rowId);
    return row;
  };


  onMoveColumn = (sourceColumnName, columnName) => {
    this.resetLocationDetails();
    const { configSettings } = this.state;
    const shownColumnSetting = getConfigItemByType(configSettings, 'shown_columns');
    let columns = shownColumnSetting.settings;
    let sourceIndex, targetIndex, movedColumnName, unMovedColumnsName = [];
    columns.forEach((column, index) => {
      if (column.columnName === sourceColumnName) {
        sourceIndex = index;
        movedColumnName = column;
      } else {
        if (column.columnName === columnName) {
          targetIndex = index;
        }
        unMovedColumnsName.push(column);
      }
    });

    let target_index = unMovedColumnsName.findIndex(column => column.columnName === columnName);

    if (sourceIndex < targetIndex) {
      target_index = target_index + 1;
    }

    unMovedColumnsName.splice(target_index, 0, movedColumnName);
    shownColumnSetting.settings = unMovedColumnsName;
    let { settings, selectedViewIdx } = this.state;
    const settingItem = generateSettingsByConfig(configSettings, settings[selectedViewIdx]);
    settings = replaceSettingItem(settings, settingItem, selectedViewIdx);
    this.setState({
      configSettings: [...configSettings],
      settings
    });
  };

  onColumnItemClick = (column, value) => {
    this.resetLocationDetails();
    const { configSettings } = this.state;
    column.active = value;
    let { settings, selectedViewIdx } = this.state;
    const settingItem = generateSettingsByConfig(configSettings, settings[selectedViewIdx]);
    settings = replaceSettingItem(settings, settingItem, selectedViewIdx);
    this.setState({
      configSettings: [...configSettings],
      settings
    });
  };


  toggleAllColumns = (isSelectAll) => {
    this.resetLocationDetails();
    const { configSettings } = this.state;
    const showColumnSettings = getConfigItemByType(configSettings, 'hover_display_columns');
    const columnSettings = showColumnSettings.settings;
    columnSettings.forEach((columnSetting) => {
      columnSetting.active = !isSelectAll;
    });
    let { settings, selectedViewIdx } = this.state;
    const settingItem = generateSettingsByConfig(configSettings, settings[selectedViewIdx]);
    settings = replaceSettingItem(settings, settingItem, selectedViewIdx);

    this.setState({
      configSettings: [...configSettings],
      settings
    });
  };

  toggleSettingDialog = () => {
    this.setState({ showSettingDialog: !this.state.showSettingDialog });
  };

  // move view, update `selectedViewIdx`
  onMoveView = (targetViewID, targetIndexViewID, relativePosition) => {
    // the 'names' and setting data structure in this plugin are different from the others.
    let { settings: plugin_settings, selectedViewIdx } = this.state;
    let updatedViews = plugin_settings;

    let viewIDMap = {};
    updatedViews.forEach((view, index) => {
      viewIDMap[view.id] = view;
    });
    const targetView = viewIDMap[targetViewID];
    const targetIndexView = viewIDMap[targetIndexViewID];
    const selectedView = updatedViews[selectedViewIdx];

    const originalIndex = updatedViews.indexOf(targetView);
    let targetIndex = updatedViews.indexOf(targetIndexView);
    // `relativePosition`: 'before'|'after'
    targetIndex += relativePosition === 'before' ? 0 : 1;

    if (originalIndex < targetIndex) {
      if (targetIndex < updatedViews.length) {
        updatedViews.splice(targetIndex, 0, targetView);
      } else {
        // drag it to the end
        updatedViews.push(targetView);
      }
      updatedViews.splice(originalIndex, 1);
    } else {
      updatedViews.splice(originalIndex, 1);
      updatedViews.splice(targetIndex, 0, targetView);
    }

    const newSelectedViewIndex = updatedViews.indexOf(selectedView);

    // plugin_settings.views = updatedViews;
    this.setState({
      settings: plugin_settings,
      selectedViewIdx: newSelectedViewIndex
    }, () => {
      setSelectedViewIds(KEY_SELECTED_VIEW_IDS, newSelectedViewIndex);
      window.dtableSDK.updatePluginSettings(PLUGIN_NAME, plugin_settings);
    });
  };

  onSelectView = (index) => {
    const { settings } = this.state;
    const settingItem = settings[index];
    const configSettings = this.initSelectedSettings(settingItem);
    setSelectedViewIds(KEY_SELECTED_VIEW_IDS, index);
    const locations = this.getLocations(configSettings);
    this.setState({
      configSettings,
      selectedViewIdx: index,
      locations
    });
  };

  onAddView = (name) => {
    const view = this.getInitSettingItem(name);
    const { settings } = this.state;
    settings.push(view);
    const selectedViewIdx = settings.length - 1;
    this.setState({
      selectedViewIdx,
    }, () => {
      setSelectedViewIds(KEY_SELECTED_VIEW_IDS, selectedViewIdx);
      window.dtableSDK.updatePluginSettings(PLUGIN_NAME, settings);
      this.viewsTabs && this.viewsTabs.setViewsTabsScroll();
    });
  };

  onRenameView = (name) => {
    let { selectedViewIdx, settings } = this.state;
    const newSettingItem = Object.assign({}, settings[selectedViewIdx], { name: name });
    settings.splice(selectedViewIdx, 1, newSettingItem);
    window.dtableSDK.updatePluginSettings(PLUGIN_NAME, settings);
  };

  onDeleteView = (index) => {
    let { selectedViewIdx, settings } = this.state;
    selectedViewIdx = settings.length - 1 === selectedViewIdx ? selectedViewIdx - 1 : selectedViewIdx;
    settings.splice(index, 1);
    this.setState({
      selectedViewIdx: selectedViewIdx
    }, () => {
      window.dtableSDK.updatePluginSettings(PLUGIN_NAME, settings);
    });
  };

  showLocationDetails = (point) => {
    const { clickPoint, isShowSameLocationDetails } = this.state;
    if (clickPoint.lng === point.lng && clickPoint.lat === point.lat) {
      this.setState({
        isShowSameLocationDetails: !this.state.isShowSameLocationDetails,
        clickPoint: {}
      });
      return;
    }
    if (isShowSameLocationDetails) {
      this.setState({
        clickPoint: point
      });
    } else {
      this.setState({
        isShowSameLocationDetails: !this.state.isShowSameLocationDetails,
        clickPoint: point
      });
    }
  };

  showLocationDetailsToggle = () => {
    this.setState({
      isShowSameLocationDetails: !this.state.isShowSameLocationDetails,
      clickPoint: {}
    });
  };

  // show user location toggle
  onShowUserPositionToggle = async (value) => {
    // if (!this.currentMap) return;
    const checked = value.currentTarget.checked;
    const selectedViewSetting = this.state.settings[this.state.selectedViewIdx];
    selectedViewSetting.showUserLocation = checked;
    const { settings } = this.state;
    window.dtableSDK.updatePluginSettings(PLUGIN_NAME, settings);
    // the first time ,do locate and init marker
    if (!this.userInfo) {
      this.userInfo = await pluginContext.getUserInfo();
      // TODO
      // this.currentMap.setUserInfo(this.userInfo);
      this.setState({
        showUserLocationChecked: checked,
      }, () => {
        this.currentMap.locateAndInitMarker();
      });
      return;
    }
    // after mark inited ,add them to the map
    this.setState({
      showUserLocationChecked: checked,
    });
  };



  render() {
    const { showSettingDialog, showDialog, configSettings, isDataLoaded, settings, selectedViewIdx, showUserLocationChecked, isShowSameLocationDetails } = this.state;
    const mapKey = window.dtable.dtableGoogleMapKey;
    const { useGeocoder } = this.mapInstance;
    if (!showDialog) return null;
    return (
      <div className={styles['mobile-map-container']}>
        <div className={styles['dtable-map-plugin-title']}>
          <div className={styles['title']}>
            <img className={styles['dtable-map-plugin-logo']} src={logo} alt="" />
            <span className={styles['dtable-map-plugin-name']}>{intl.get('Map_plugin')}</span>
          </div>
          <div className="map-plugin-en-tabs">
            <ViewTabs
              isMobile
              ref={ref => this.viewsTabs = ref}
              settings={settings}
              selectedViewIdx={selectedViewIdx}
              onAddView={this.onAddView}
              onRenameView={this.onRenameView}
              onDeleteView={this.onDeleteView}
              onSelectView={this.onSelectView}
              onMoveView={this.onMoveView}
            />
          </div>
          <div className={styles['map-tool-container']}>
            <span className={`close ${styles['title-button']}`} onClick={this.toggle}>
              <i className={'dtable-font dtable-icon-x'}></i>
            </span>
            <span onClick={this.toggleSettingDialog} className={`close ${styles['title-button']}`}>
              <i className={'dtable-font dtable-icon-settings'}></i>
            </span>
            <span className={`close ${styles['title-button']}`} onTouchEnd={onCapture}>
              <i className={'dtable-font dtable-icon-download'}></i>
            </span>
          </div>
        </div>
        <div className={styles['map-wrapper']}>
          {(!isDataLoaded && mapKey) && <div className={styles['plugin-map-loading']}><Loading /></div>}
          {(!mapKey) && (
            <div className='d-flex justify-content-center mt-9'>
              <span className="alert-danger">{intl.get('The_map_plugin_is_not_properly_configured_contact_the_administrator')}</span>
            </div>
          )}
          {mapKey && <div id="map-container" className={styles['map-container']}></div>}
          {
            showSettingDialog &&
            <Settings
              toggleSettingDialog={this.toggleSettingDialog}
              configSettings={configSettings}
              onMoveColumn={this.onMoveColumn}
              onColumnItemClick={this.onColumnItemClick}
              onSelectChange={this.onSelectChange}
              toggleAllColumns={this.toggleAllColumns}
              onSaveSetting={this.onSaveSetting}
              onSwitchChange={this.onShowUserPositionToggle}
              showUserLocationChecked={showUserLocationChecked}
            />
          }
          {isShowSameLocationDetails &&
            <MobileLocationDetailList
              toggle={this.showLocationDetailsToggle}
              sameLocationList={this.mapInstance.sameLocationList}
              clickPoint={this.state.clickPoint}
              configSettings={configSettings}
              cellValueUtils={this.cellValueUtils}
              getLocation={useGeocoder}
            />
          }
        </div>
      </div>
    );
  }
}

App.propTypes = {
  isDevelopment: PropTypes.bool,
  showDialog: PropTypes.bool,
};

export default App;
