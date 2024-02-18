import React from 'react';
import PropTypes from 'prop-types';
import intl from 'react-intl-universal';
import L from 'leaflet';
import 'leaflet.markercluster/dist/leaflet.markercluster-src';
import pluginContext from '../plugin-context';
import Settings from '../components/mobile/settings';
import Loading from '../components/loading';
import { getLocations, getInitialMapCenter } from '../utils/location-utils';
import ViewTabs from '../components/view-tabs';
import { generateSettingsByConfig } from '../utils/generate-settings-config';
import {  replaceSettingItem, setSelectedViewIds } from '../utils/common-utils';
import onCapture from '../utils/capture';
import getConfigItemByType from '../utils/get-config-item-by-type';
import { toaster } from 'dtable-ui-component';
import { IMAGE_PATH,
  PLUGIN_NAME,
  KEY_SELECTED_VIEW_IDS,
  EVENT_BUS_TYPE
} from '../constants';
import '../locale';
import MobileLocationDetailList from '../components/mobile/mobile-location-detail-list';
import logo from '../image/map.png';
import { GoogleMap } from '../map/google-map'; // Replace './path/to/GoogleMap' with the actual path to the GoogleMap module
import { eventBus } from '../utils/event-bus';

import styles from '../css/mobile-en.module.css';
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
      settings: null,
      clickPoint: {},
      showLocationDetail: false,
      isShowSameLocationDetails: false,
      showUserLocationChecked: true,
    };
    this.map = null;
    this.geocoder = null;
    this.markers = [];
    this.timer = null;
    this.clusterMarkers = null;
    this.cellValueUtils = pluginContext.cellValueUtils;
    this.mapKey = pluginContext.getSetting('dtableGoogleMapKey');
    this.mapInstance = new GoogleMap({ mapKey: this.mapKey, errorHandler: toaster.danger });
  }

  async componentDidMount() {
    this.unsubscribeShowDetails = eventBus.subscribe(EVENT_BUS_TYPE.SHOW_LOCATION_DETAILS, this.showLocationDetails);
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
      this.resetLocationDetails();
      this.mapInstance.renderLocations(locations, configSettings);
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
    const { showSettingDialog, pluginSettings: settings, selectedViewSettings, selectedViewIdx, shouldFetchUserInfo } = pluginContext.initPluginSettings();
    const configSettings = pluginContext.initSelectedSettings(selectedViewSettings);
    const locations = this.getLocations(configSettings);
    if (showSettingDialog) {
      this.setState({ showSettingDialog });
    }
    return { settings, configSettings, selectedViewSettings, locations, selectedViewIdx, shouldFetchUserInfo };
  };

  async initPluginDTableData() {
    if (this.props.isDevelopment) {
      this.unsubscribeLocalDtableChanged = window.dtableSDK.subscribe('local-dtable-changed', () => { this.onDTableChanged(); });
      this.unsubscribeRemoteDtableChanged = window.dtableSDK.subscribe('remote-dtable-changed', () => { this.onDTableChanged(); });
      const { settings, configSettings, locations, selectedViewIdx, shouldFetchUserInfo } = this.getInitPluginSettings();
      this.setState({
        configSettings,
        isDataLoaded: true,
        locations,
        settings,
        selectedViewIdx,
        showUserLocationChecked: shouldFetchUserInfo
      }, async () => {
        await this.mapInstance.renderMap(locations, shouldFetchUserInfo);
      });
    } else {
      this.unsubscribeLocalDtableChanged = window.dtableSDK.subscribe('local-dtable-changed', () => { this.onDTableChanged(); });
      this.unsubscribeRemoteDtableChanged = window.dtableSDK.subscribe('remote-dtable-changed', () => { this.onDTableChanged(); });
      const { settings, configSettings, locations, selectedViewIdx, shouldFetchUserInfo } = this.getInitPluginSettings();
      this.setState({
        configSettings,
        isDataLoaded: true,
        locations,
        settings,
        selectedViewIdx,
        showUserLocationChecked: shouldFetchUserInfo
      }, async () => {
        await this.mapInstance.renderMap(locations, shouldFetchUserInfo);
      });
    }
  }

  async renderMap() {
    let lang = pluginContext.getLanguage();
    let url = `https://mt0.google.com/vt/lyrs=m@160000000&hl=${lang}&gl=${lang}&src=app&y={y}&x={x}&z={z}&s=Ga`;
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
    const { settings,  locations, selectedViewIdx } = this.getInitPluginSettings();
    this.setState({
      locations,
      selectedViewIdx,
      settings
    });
  }

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
    this.setState({ configSettings: [...configSettings] });
  };

  onSaveSetting = () => {
    let { selectedViewIdx, configSettings, showUserLocationChecked } = this.state;
    const settingItem = generateSettingsByConfig(configSettings, this.state.settings[selectedViewIdx]);
    settingItem.showUserLocation = showUserLocationChecked;
    const settings = replaceSettingItem(this.state.settings, settingItem, selectedViewIdx);
    this.setState({ showSettingDialog: !this.state.showSettingDialog }, () => {
      window.dtableSDK.updatePluginSettings(PLUGIN_NAME, settings);
    });
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
    let { configSettings } = this.state;
    column.active = value;
    this.setState({
      configSettings: [...configSettings],
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
    const configSettings = pluginContext.initSelectedSettings(settingItem);
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

  // show user location
  showUserLocationSwitchChange = async (value) => {
    const checked = value.currentTarget.checked;
    const selectedViewSetting = this.state.settings[this.state.selectedViewIdx];
    selectedViewSetting.showUserLocation = checked;
    const { settings } = this.state;
    window.dtableSDK.updatePluginSettings(PLUGIN_NAME, settings);
    this.setState({
      showUserLocationChecked: checked,
    }, () => {
      this.mapInstance.resetUserLocationMarker(checked);
    });
  };

  render() {
    const { showSettingDialog, showDialog, configSettings, isDataLoaded, settings, selectedViewIdx, showUserLocationChecked, isShowSameLocationDetails } = this.state;
    const mapKey = this.mapKey;
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
              showUserLocationChecked={showUserLocationChecked}
              showUserLocationSwitchChange={this.showUserLocationSwitchChange}
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
