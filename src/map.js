import React from 'react';
import PropTypes from 'prop-types';
import intl from 'react-intl-universal';
import L from 'leaflet';
import 'leaflet.markercluster/dist/leaflet.markercluster-src';
import {
  getTableByName, getViewByName, getTableColumnByName, getNonArchiveViews, getViewShownColumns,
} from 'dtable-utils';
import LocationSettings from './components/location-settings';
import Loading from './components/loading';
import * as image  from './image/index';
import { getLocations, renderMarkByPosition, formatGeolocactionValue, getInitialMapCenter } from './utils/location-utils';
import COLORS from './marker-color';
import ViewTabs from './components/view-tabs';
import { generateSettingsByConfig } from './utils/generate-settings-config';
import { replaceSettingItemByType } from './utils/repalce-setting-item-by-type';
import { generatorViewId, getSelectedViewIds, replaceSettingItem, setSelectedViewIds } from './utils/common-utils';
import getConfigItemByType from './utils/get-config-item-by-type';
import onCapture from './utils/capture';
import removeSettingByType from './utils/remove-setting-by-type';
import {
  IMAGE_PATH,
  PLUGIN_NAME,
  CONFIG_TYPE,
  KEY_SELECTED_VIEW_IDS,
  GEOCODING_FORMAT,
  MAP_MODE
} from './constants';

import './locale';

import logo from './image/map.png';

import './css/common.css';
import './app.css';
import 'leaflet/dist/leaflet.css';

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
      settings: null
    };
    this.map = null;
    this.geocoder = null;
    this.markers = [];
    this.timer = null;
    this.clusterMarkers = null;
    this.geocodingLocations = [];
  }

  componentDidMount() {
    this.loadMapScript();
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
    if (this.props.isDevelopment) {
      window.dtableSDK.subscribe('dtable-connect', () => { this.onDTableConnect(); });
    } else {
      this.unsubscribeLocalDtableChanged = window.dtableSDK.subscribe('local-dtable-changed', () => { this.onDTableChanged(); });
      this.unsubscribeRemoteDtableChanged = window.dtableSDK.subscribe('remote-dtable-changed', () => { this.onDTableChanged(); });
      const settings = this.initPluginSettings();
      let selectedViewIdx = getSelectedViewIds(KEY_SELECTED_VIEW_IDS) || 0;
      selectedViewIdx = selectedViewIdx > settings.length - 1 ? 0 : selectedViewIdx;
      const configSettings = this.initSelectedSettings(settings[selectedViewIdx]);
      const locations = this.getLocations(configSettings);
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

  async loadMapScript () {
    const AUTH_KEY = window.dtable.dtableGoogleMapKey;
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
    const lang = (window.dtable && window.dtable.lang) ? window.dtable.lang : 'en';
    const url = `http://mt0.google.com/vt/lyrs=m@160000000&hl=${lang}&gl=${lang}&src=app&y={y}&x={x}&z={z}&s=Ga`;
    if (!document.getElementById('map-container')) return;
    window.L = L;
    const { position, zoom } = await getInitialMapCenter(this.state.locations, this.geocoder);
    if (!this.map) {
      this.map = L
        .map('map-container', {
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

  getLocations = (configSettings) => {
    const tables = window.dtableSDK.getTables();
    return getLocations(tables, configSettings);
  }

  onDTableConnect() {
    this.unsubscribeLocalDtableChanged = window.dtableSDK.subscribe('local-dtable-changed', () => { this.onDTableChanged(); });
    this.unsubscribeRemoteDtableChanged = window.dtableSDK.subscribe('remote-dtable-changed', () => { this.onDTableChanged(); });
    const pluginSettings = this.initPluginSettings();
    let selectedViewIdx = getSelectedViewIds(KEY_SELECTED_VIEW_IDS) || 0;
    selectedViewIdx = selectedViewIdx > pluginSettings.length - 1 ? 0 : selectedViewIdx;
    const configSettings = this.initSelectedSettings(pluginSettings[selectedViewIdx]);
    const locations = this.getLocations(configSettings);
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
    const locations = this.getLocations(configSettings);
    this.setState({
      configSettings,
      locations,
      selectedViewIdx,
      settings: pluginSettings
    });
  }

  initPluginSettings = () => {
    let pluginSettings = window.dtableSDK.getPluginSettings(PLUGIN_NAME);
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
    let activeTable = window.dtableSDK.getActiveTable();
    let activeView = window.dtableSDK.getActiveView();
    let pluginSettingItem = {id: generatorViewId(), name, tableName: activeTable.name, viewName: activeView.name, columnName: null, markDependence: null, directShownColumn: null};
    return pluginSettingItem;
  }

  isValidSettingItem = (pluginSettings) => {
    const { mapMode, tableName, viewName, columnName, markDependence, directShownColumnName, imageColumnName } = pluginSettings;
    const tables = window.dtableSDK.getTables();
    const table = getTableByName(tables, tableName);
    if (!table) return false;
    const view = getViewByName(table.views, viewName);
    if (!view || view.type === 'archive') return false;
    const column = getTableColumnByName(table, columnName);
    if (!column && columnName) return false;
    if (mapMode === MAP_MODE.DEFAULT) {
      const markColumn = getTableColumnByName(table, markDependence);
      if (!markColumn && markDependence && markDependence !== 'rows_color') return false;
      const directShownColumn = getTableColumnByName(table, directShownColumnName);
      if (!directShownColumn && directShownColumnName) return false;
    } else {
      const imageColumn = getTableColumnByName(table, imageColumnName);
      if (!imageColumn && imageColumnName) return false;
    }
    return true;
  }

  initSelectedSettings = (settings) => {
    const tables = window.dtableSDK.getTables();
    let configSettings = [];
    let { mapMode, tableName, viewName, columnName, markDependence, directShownColumnName, imageColumnName } = settings;
    const mapSettings = this.getMapSetting(mapMode);
    configSettings.push(mapSettings);
    let activeTable = getTableByName(tables, tableName);
    let tableSettings = this.getTableSettings(activeTable);
    let activeView = getViewByName(activeTable.views, viewName);
    let viewSettings = this.getViewSettings(activeTable, activeView);
    configSettings.push(tableSettings, viewSettings);
    let activeColumn = getTableColumnByName(activeTable, columnName);
    let columnSettings = this.getColumnSettings(activeTable, activeView, activeColumn);
    configSettings.push(columnSettings);
    if (mapMode === MAP_MODE.IMAGE) {
      let activeImageColumn = getTableColumnByName(activeTable, imageColumnName);
      const imageColumnSettings = this.getImageColumnsSetting(activeTable, activeView, activeImageColumn);
      configSettings.push(imageColumnSettings);
      return configSettings;
    }
    let markColumnSettings = this.getMarkColumnSetting(activeTable, activeView, markDependence);
    configSettings.push(markColumnSettings);
    let directShownColumn = getTableColumnByName(activeTable, directShownColumnName);
    let directShownColumnSetting = this.getDirectShownColumnSetting(activeTable, activeView, directShownColumn);
    configSettings.push(directShownColumnSetting);
    return configSettings;
  }

  updateSelectedSettings = (type, option) => {
    let { configSettings } = this.state;
    const tables = window.dtableSDK.getTables();
    switch(type) {
      case CONFIG_TYPE.MAP_MODE: {
        const tableName = getConfigItemByType(configSettings, 'table').active;
        const viewName = getConfigItemByType(configSettings, 'view').active;
        const mapMode = option.name;
        const currentMapMode = configSettings[0].active;
        let currentTable = getTableByName(tables, tableName);
        let currentView = getViewByName(currentTable.views, viewName);
        if (currentMapMode === mapMode) return configSettings;
        let newConfigSettings = [];
        const mapSettings = this.getMapSetting(mapMode);
        configSettings[0] = mapSettings;
        if (mapMode === MAP_MODE.IMAGE) {
          const imageColumnSetting = this.getImageColumnsSetting(currentTable, currentView, );
          configSettings.forEach((setting) => {
            const type = setting.type;
            if (type === 'column') {
              newConfigSettings.push(setting, imageColumnSetting);
              return;
            }
            newConfigSettings.push(setting);
          });
          newConfigSettings = removeSettingByType(newConfigSettings, [CONFIG_TYPE.MARK_DEPENDENCE, CONFIG_TYPE.DIECT_SHOWN_COLUMN]);
        } else {
          newConfigSettings = removeSettingByType(configSettings, CONFIG_TYPE.IMAGE_COLUMN);
          newConfigSettings.push(this.getMarkColumnSetting(currentTable, currentView), this.getDirectShownColumnSetting(currentTable, currentView));
        }
        return newConfigSettings;
      }
      case CONFIG_TYPE.TABLE: {
        const mapModeSettings = getConfigItemByType(configSettings, CONFIG_TYPE.MAP_MODE);
        let currentTable = getTableByName(tables, option.name);
        let currentView = getNonArchiveViews(currentTable.views)[0];
        let tableSettings = this.getTableSettings(currentTable);
        let viewSettings = this.getViewSettings(currentTable);
        let columnSetting = this.getColumnSettings(currentTable, currentView);
        if (configSettings[0].active === MAP_MODE.IMAGE) {
          let imageColumnSetting = this.getImageColumnsSetting(currentTable, currentView);
          return [mapModeSettings, tableSettings, viewSettings, columnSetting, imageColumnSetting];
        }
        let markColumnSetting = this.getMarkColumnSetting(currentTable, currentView);
        let directShownColumnSetting = this.getDirectShownColumnSetting(currentTable, currentView);
        return [mapModeSettings, tableSettings, viewSettings, columnSetting, markColumnSetting, directShownColumnSetting];
      }
      case CONFIG_TYPE.VIEW: {
        const mapModeSettings = getConfigItemByType(configSettings, CONFIG_TYPE.MAP_MODE);
        const tableSettings = getConfigItemByType(configSettings, 'table');
        const tableName = tableSettings.active;
        let currentTable = getTableByName(tables, tableName);
        let currentView = getViewByName(currentTable.views, option.name);
        let viewSettings = this.getViewSettings(currentTable, currentView);
        let columnSetting = this.getColumnSettings(currentTable, currentView);
        if (configSettings[0].active === MAP_MODE.IMAGE) {
          let imageColumnSetting = this.getImageColumnsSetting(currentTable, currentView);
          return [mapModeSettings, tableSettings, viewSettings, columnSetting, imageColumnSetting];
        }
        let markColumnSetting = this.getMarkColumnSetting(currentTable, currentView);
        let directShownColumnSetting = this.getDirectShownColumnSetting(currentTable, currentView);
        return [mapModeSettings, tableSettings, viewSettings, columnSetting, markColumnSetting, directShownColumnSetting];
      }
      case CONFIG_TYPE.COLUMN: {
        const tableName = getConfigItemByType(configSettings, 'table').active;
        const viewName = getConfigItemByType(configSettings, 'view').active;
        let currentTable = getTableByName(tables, tableName);
        let currentView = getViewByName(currentTable.views, viewName);
        let currentColumn = getTableColumnByName(currentTable, option.name);
        let columnSettings = this.getColumnSettings(currentTable, currentView, currentColumn);
        replaceSettingItemByType(configSettings, 'column', columnSettings);
        return configSettings;
      }
      case CONFIG_TYPE.MARK_DEPENDENCE: {
        const tableName = getConfigItemByType(configSettings, 'table').active;
        const viewName = getConfigItemByType(configSettings, 'view').active;
        let currentTable = getTableByName(tables, tableName);
        let currentView = getViewByName(currentTable.views, viewName);
        let columnSetting = this.getMarkColumnSetting(currentTable, currentView, option.name);
        replaceSettingItemByType(configSettings, 'mark_dependence', columnSetting);
        return configSettings;
      }
      case CONFIG_TYPE.DIECT_SHOWN_COLUMN: {
        const tableName = getConfigItemByType(configSettings, 'table').active;
        const viewName = getConfigItemByType(configSettings, 'view').active;
        let currentTable = getTableByName(tables, tableName);
        let currentView = getViewByName(currentTable.views, viewName);
        let column = getTableColumnByName(currentTable, option.name);
        let directShownColumnSetting = this.getDirectShownColumnSetting(currentTable, currentView, column);
        replaceSettingItemByType(configSettings, 'direct_shown_column', directShownColumnSetting);
        return configSettings;
      }
      case CONFIG_TYPE.IMAGE_COLUMN: {
        const tableName = getConfigItemByType(configSettings, 'table').active;
        const viewName = getConfigItemByType(configSettings, 'view').active;
        let currentTable = getTableByName(tables, tableName);
        let currentView = getViewByName(currentTable.views, viewName);
        let column = getTableColumnByName(currentTable, option.name);
        let imageColumnSetting = this.getImageColumnsSetting(currentTable, currentView, column);
        replaceSettingItemByType(configSettings, CONFIG_TYPE.IMAGE_COLUMN, imageColumnSetting);
        return configSettings;
      }
      default: {
        return this.state.configSettings;
      }
    }
  }

  getMapSetting = (mapType = MAP_MODE.DEFAULT) => {
    return { name: intl.get('Map_type'), active: mapType, type: 'map_mode', settings:[{name: MAP_MODE.DEFAULT, id: 'map'}, {name: MAP_MODE.IMAGE, id: 'image'}] };
  }

  getTableSettings = (activeTable = null) => {
    const tables = window.dtableSDK.getTables();
    const tableSettings = tables.map(table => {
      return { id: table._id, name: table.name };
    });
    const active = activeTable ? activeTable.name : tables[0].name;
    return {
      type: CONFIG_TYPE.TABLE,
      name: intl.get('Table'),
      settings: tableSettings,
      active,
    };
  }

  getViewSettings = (currentTable, activeView = null) => {
    const views = getNonArchiveViews(currentTable.views);
    const viewSettings = views.map(view => {
      return { id: view._id, name: view.name };
    }).filter(Boolean);
    const active = activeView ? activeView.name : views[0].name;
    return {
      type: CONFIG_TYPE.VIEW,
      name: intl.get('View'),
      settings: viewSettings,
      active,
    };
  }

  getColumnSettings = (currentTable, currentView, activeColumn = null) => {
    let columns = getViewShownColumns(currentView, currentTable.columns);

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
    return {
      type: CONFIG_TYPE.COLUMN,
      name: intl.get('Address_field'),
      settings: columnSettings,
      active,
    };
  }

  getMarkColumnSetting = (currentTable, currentView, dependence = null) => {
    let columns = getViewShownColumns(currentView, currentTable.columns);
    // need options: checkout map column
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
    return {
      type: 'mark_dependence',
      name: intl.get('Marker_colored_by'),
      settings: columnSettings,
      active,
    };
  }

  getDirectShownColumnSetting = (currentTable, currentView, activeColumn = null) => {
    let columns = getViewShownColumns(currentView, currentTable.columns);
    columns = columns.filter(column => {
      return column.type === 'text' || column.type === 'single-select';
    });
    let columnSettings = columns.map(column => {
      return {id: column.key, name: column.name};
    });
    columnSettings.unshift({id: 'not_used', name: intl.get('Not_used')});
    // need options: checkout map column
    let active = activeColumn ? activeColumn.name : columnSettings[0].name;
    return {
      type: 'direct_shown_column',
      name: intl.get('Display_field'),
      settings: columnSettings,
      active,
    };
  }

  getImageColumnsSetting = (currentTable, currentView, activeColumn = null) => {
    let columns = getViewShownColumns(currentView, currentTable.columns);
    columns = columns.filter(column => {
      return column.type === 'image';
    });
    let columnSettings = columns.map(column => {
      return {id: column.key, name: column.name};
    });

    columnSettings.unshift({id: 'not_used', name: intl.get('Not_used')});
    let active = activeColumn ? activeColumn.name : columnSettings[0].name;
    return {
      type: 'image_column',
      name: intl.get('Image_field'),
      settings: columnSettings,
      active,
    };
  }

  onSelectChange = (option, type) => {
    let configSettings = this.updateSelectedSettings(type, option);
    let { settings, selectedViewIdx } = this.state;
    let settingItem = generateSettingsByConfig(configSettings, settings[selectedViewIdx]);
    settings = replaceSettingItem(settings, settingItem, selectedViewIdx);
    window.dtableSDK.updatePluginSettings(PLUGIN_NAME, settings);
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
      });
      this.markers = [];
    }
  }

  clearClusterMarkers = () => {
    if (this.clusterMarkers) {
      this.clusterMarkers.clearLayers();
    }
  }

  renderLocations = (locations) => {
    // clear previous layers
    this.removeLayers();
    this.clearClusterMarkers();
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.geocodingLocations = [];
    const locationItem = locations[0] || {};
    const addressType = locationItem.type;
    if (!addressType) return;
    if (GEOCODING_FORMAT.includes(addressType)) {
      this.geocoding(locations, 1, 0);
    } else {
      if (this.state.configSettings[0].active === MAP_MODE.IMAGE) {
        this.createMarkerCluster(locations);
        return;
      }
      renderMarkByPosition(locations, this.addMarker);
    }
  }

  createMarkerCluster = (locations) => {
    if (!this.clusterMarkers) {
      this.clusterMarkers = L.markerClusterGroup({
        iconCreateFunction: function(cluster) {
          const markers = cluster.getAllChildMarkers();
          let imgCount = 0, markerUrl = '';
          markers.forEach((marker) => {
            const icon = marker.options.icon;
            const urls = icon.options.imgUrl;
            imgCount += urls.length;
            if (!markerUrl) {
              markerUrl = urls[0];
            }
          });
          const imageElement = `<img src=${markerUrl} width="72" height="72" />`;
          return L.divIcon({
            html: `
            <div class="map-plugin-custom-image-container">
              ${markerUrl ? imageElement : '<div class="map-plugin-empty-custom-image-wrapper"></div>' }
              <span class="map-plugin-custom-image-number">${imgCount}</span>
              <i class='plugin-map-image-label-arrow dtable-font dtable-icon-drop-down'></i>
            </div>
          `,
            iconAnchor: [48, 55],
          });
        },
        showCoverageOnHover: false
      });
    }
    this.clusterMarkers.clearLayers();
    const list = [];
    locations.forEach((item) => {
      const { imgUrl, location } = item;
      const { lat, lng } = location;
      if (lng && lat) {
        const imageElement = `<img src=${imgUrl[0]} width="72" height="72" />`;
        const htmlString =  `
          <div class="map-plugin-custom-image-container">
            ${imgUrl.length > 0 ? `<span class="map-plugin-custom-image-number">${imgUrl.length}</span> ${imageElement}` : '<div class="map-plugin-empty-custom-image-wrapper"></div>' }
            <i class='plugin-map-image-label-arrow dtable-font dtable-icon-drop-down'></i>
          </div>
        `;
        let markIcon = L.divIcon({
          html: htmlString,
          imgUrl,
          iconAnchor: [48, 55],
        });
        let marker = new L.Marker([lat, lng], { icon: markIcon });
        list.push(marker);
      }
    });
    this.clusterMarkers.addLayers(list);
    this.map.addLayer(this.clusterMarkers);
  }

  geocoding = (locations, resolutionTimes, index) => {
    const locationItem = locations[index];
    if (!locationItem) {
      this.createMarkerCluster(this.geocodingLocations);
      return;
    }
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
    const activeColumn = this.state.configSettings[3].active;
    const mapMode = this.state.configSettings[0].active;
    this.geocoder.geocode({ 'address': address }, (points, status) => {
      if (locationItem.columnName !== activeColumn) return;
      switch (status) {
        case window.google.maps.GeocoderStatus.OK: {
          let lat = points[0].geometry.location.lat();
          let lng = points[0].geometry.location.lng();
          if (mapMode === MAP_MODE.IMAGE) {
            this.geocodingLocations.push({imgUrl: locationItem.imgUrl, location: {lat, lng}});
          } else {
            this.addMarker(locationItem, lat, lng, address);
          }
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
              // eslint-disable-next-line no-console
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
          // eslint-disable-next-line no-console
          console.log(intl.get('address_was_not_found', { address: address }));
          break;
        }
      }
    });
  }

  addMarker = (location, lat, lng, address) => {
    const { color, name, directShownLabel, mapMode } = location;
    if (!this.markers.find(marker => marker._latlng.lat === lat && marker._latlng.lng === lng)) {
      let describe = `<p>${address || ''}</p><p>${name}</p>`;
      let myIcon;
      if (mapMode === MAP_MODE.DEFAULT) {
        if (color) {
          const colorIndex = COLORS.findIndex((item) => color === item.COLOR);
          if (colorIndex > -1) {
            myIcon = L.icon({
              iconUrl: [image['image' + (colorIndex + 1)]],
              iconSize: [25, 41],
            });
          } else {
            myIcon = L.icon({
              iconUrl: [image['marker']],
              iconSize: [25, 41],
            });
          }
        } else {
          myIcon = L.icon({
            iconUrl: [image['marker']],
            iconSize: [25, 41],
          });
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
        });
        this.markers.push(marker);
        this.map.addLayer(marker);
      }
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
      };
    } else {
      return {
        maxWidth: '100%'
      };
    }
  }

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
    targetIndex += relativePosition == 'before' ? 0 : 1;

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

    //plugin_settings.views = updatedViews;
    this.setState({
      settings: plugin_settings,
      selectedViewIdx: newSelectedViewIndex
    }, () => {
      setSelectedViewIds(KEY_SELECTED_VIEW_IDS, newSelectedViewIndex);
      window.dtableSDK.updatePluginSettings(PLUGIN_NAME, plugin_settings);
    });
  }

  onSelectView = (index) => {
    const { settings } = this.state;
    const settingItem = settings[index];
    const configSettings = this.initSelectedSettings(settingItem);
    setSelectedViewIds(KEY_SELECTED_VIEW_IDS, index);
    const locations = getLocations(window.dtableSDK, configSettings);
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
      window.dtableSDK.updatePluginSettings(PLUGIN_NAME, settings);
      this.viewsTabs && this.viewsTabs.setViewsTabsScroll();
    });
  }

  onRenameView = (name) => {
    let { selectedViewIdx, settings } = this.state;
    const newSettingItem = Object.assign({}, settings[selectedViewIdx], {name: name});
    settings.splice(selectedViewIdx, 1, newSettingItem);
    window.dtableSDK.updatePluginSettings(PLUGIN_NAME, settings);
  }

  onDeleteView = (index) => {
    let { selectedViewIdx, settings } = this.state;
    selectedViewIdx = settings.length - 1 === selectedViewIdx ? selectedViewIdx - 1 : selectedViewIdx;
    settings.splice(index, 1);
    this.setState({
      selectedViewIdx: selectedViewIdx
    }, () => {
      window.dtableSDK.updatePluginSettings(PLUGIN_NAME, settings);
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
              onMoveView={this.onMoveView}
            />
          </div>
          <div className="map-operators">
            <span className="map-operator dtable-font dtable-icon-download btn-margin-right" onClick={onCapture}></span>
            <span className={`map-operator dtable-font dtable-icon-full-screen btn-margin-right ${isFullScreen ? 'full-screen-active' : ''}`} onClick={this.toggleFullScreen}></span>
            <span className="map-operator dtable-font dtable-icon-settings btn-margin-right" onClick={this.toggleSettingDialog}></span>
            <span className="map-operator dtable-font dtable-icon-x btn-margin-right btn-close" onClick={this.toggle}></span>
          </div>
        </div>
        <div className={'flex-fill map-plugin-modal-body ' + (isFullScreen ? 'map-plugin-modal-body-full-screen' : '')}>
          {(!isDataLoaded && mapKey) && <div className='plugin-map-en-loading'><Loading /></div>}
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

App.propTypes = {
  isDevelopment: PropTypes.bool,
  showDialog: PropTypes.bool,
};

export default App;
