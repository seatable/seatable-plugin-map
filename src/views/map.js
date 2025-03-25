import React from 'react';
import PropTypes from 'prop-types';
import intl from 'react-intl-universal';
import 'leaflet.markercluster/dist/leaflet.markercluster-src';
import { toaster } from 'dtable-ui-component';
import pluginContext from '../plugin-context';
import LocationSettings from '../components/location-settings';
import Loading from '../components/loading';
import ViewTabs from '../components/view-tabs';
import { getLocations } from '../utils/location-utils';
import { generateSettingsByConfig } from '../utils/generate-settings-config';
import {  replaceSettingItem, setSelectedViewIds } from '../utils/common-utils';
import getConfigItemByType from '../utils/get-config-item-by-type';
import onCapture from '../utils/capture';
import {
  PLUGIN_NAME,
  KEY_SELECTED_VIEW_IDS,
  EVENT_BUS_TYPE
} from '../constants';
import logo from '../image/map.png';
import { eventBus } from '../utils/event-bus';
import LocationDetailList from '../components/location-detail-list';
import { GoogleMap } from '../map/google-map';

import '../app.css';
import 'leaflet/dist/leaflet.css';

class App extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      showDialog: props.showDialog || true,
      locations: [],
      showSettingDialog: false,
      isDataLoaded: false,
      configSettings: [],
      isFullScreen: false,
      selectedViewIdx: 0,
      settings: null,
      clickPoint: {},
      showLocationDetail: false,
      showUserLocationChecked: true,
    };
    this.map = null;
    this.geocoder = null;
    this.markers = [];
    this.timer = null;
    this.clusterMarkers = null;
    this.mapKey = pluginContext.getSetting('dtableGoogleMapKey');
    this.mapInstance = new GoogleMap({ mapKey: this.mapKey, errorHandler: toaster.danger });
  }

  async componentDidMount() {
    this.unsubscribeShowDetails = eventBus.subscribe(EVENT_BUS_TYPE.SHOW_LOCATION_DETAILS, this.showLocationDetail);
    this.unsubscribeCloseDetails = eventBus.subscribe(EVENT_BUS_TYPE.CLOSE_LOCATION_DETAILS, this.closeLocationDetail);
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
    }, async () => {
      await this.mapInstance.renderMap();
    });
  }

  onDTableChanged() {
    const { settings, configSettings, locations, selectedViewIdx } = this.getInitPluginSettings();
    this.setState({
      configSettings,
      locations,
      selectedViewIdx,
      settings,
    });
  }


  // showLocationDetailController
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

  onSelectChange = (option, type) => {
    let { settings, selectedViewIdx, configSettings: oldConfigSettings } = this.state;
    let configSettings = pluginContext.updateSelectedSettings(type, option, oldConfigSettings);
    let settingItem = generateSettingsByConfig(configSettings, settings[selectedViewIdx]);
    settings = replaceSettingItem(settings, settingItem, selectedViewIdx);
    window.dtableSDK.updatePluginSettings(PLUGIN_NAME, settings);
    this.setState({ configSettings: [...configSettings], settings });
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

  toggleSettingDialog = () => {
    this.setState({ showSettingDialog: !this.state.showSettingDialog });
  };

  toggleFullScreen = () => {
    this.setState({
      isFullScreen: !this.state.isFullScreen
    });
    this.mapInstance.map.invalidateSize();
  };

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
    const view = pluginContext.getInitSettingItem(name);
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

  onColumnItemClick = (column, value) => {
    // this.resetLocationDetails();
    let { configSettings, settings, selectedViewIdx } = this.state;
    column.active = value;
    // update configs for updating settings component
    const settingItem = generateSettingsByConfig(configSettings, settings[selectedViewIdx]);
    settings = replaceSettingItem(settings, settingItem, selectedViewIdx);
    window.dtableSDK.updatePluginSettings(PLUGIN_NAME, settings);
    this.setState({ configSettings: [...configSettings], settings });
  };

  onMoveColumn = (sourceColumnName, columnName) => {
    // this.resetLocationDetails();
    const { configSettings } = this.state;
    const shownColumnSetting = getConfigItemByType(configSettings, 'hover_display_columns');
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
    window.dtableSDK.updatePluginSettings(PLUGIN_NAME, settings);
    this.setState({ configSettings: [...configSettings], settings });
  };

  toggleAllColumns = (isSelectAll) => {
    // this.resetLocationDetails();
    const { configSettings } = this.state;
    const showColumnSettings = getConfigItemByType(configSettings, 'hover_display_columns');
    const columnSettings = showColumnSettings.settings;
    columnSettings.forEach((columnSetting) => {
      columnSetting.active = !isSelectAll;
    });
    let { settings, selectedViewIdx } = this.state;
    const settingItem = generateSettingsByConfig(configSettings, settings[selectedViewIdx]);
    settings = replaceSettingItem(settings, settingItem, selectedViewIdx);
    window.dtableSDK.updatePluginSettings(PLUGIN_NAME, settings);
    this.setState({ configSettings: [...configSettings], settings });
  };


  // show user location toggle
  onShowUserPositionToggle = async (value) => {
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
    const { isDataLoaded, showSettingDialog, configSettings, isFullScreen, showDialog, settings, selectedViewIdx, showLocationDetail, showUserLocationChecked } = this.state;
    const mapKey = this.mapKey;
    const { sameLocationList, useGeocoder } = this.mapInstance;

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
            <span className="map-operator dtable-font dtable-icon-x btn-margin-right" onClick={this.toggle}></span>
          </div>
        </div>
        <div className={'flex-fill map-plugin-modal-body ' + (isFullScreen ? 'map-plugin-modal-body-full-screen' : '')}>
          {(!isDataLoaded && mapKey) && <div className='plugin-map-en-loading'><Loading /></div>}
          {(!mapKey) && (
            <div className='d-flex justify-content-center mt-9'>
              <span className="alert-danger">{intl.get('The_map_plugin_is_not_properly_configured_contact_the_administrator')}</span>
            </div>
          )}
          {mapKey && (
            <div className="App dtable-map-plugin">
              <div className='control-panel'>
                <div className='up-hover sector'></div>
                <div className='down-hover sector'></div>
                <div className='left-hover sector'></div>
                <div className='right-hover sector'></div>
                <div id='up-arrow' className='arrow'></div>
                <div id='down-arrow' className='arrow'></div>
                <div id='left-arrow' className='arrow' ></div>
                <div id='right-arrow' className='arrow'></div>
              </div>
              <div id="map-container" className="map-container"></div>
            </div>
          )}
          {showSettingDialog && (
            <LocationSettings
              onMoveColumn={this.onMoveColumn}
              onColumnItemClick={this.onColumnItemClick}
              toggleAllColumns={this.toggleAllColumns}
              configSettings={configSettings}
              onSelectChange={this.onSelectChange}
              onHideMapSettings={this.toggleSettingDialog}
              onSwitchChange={this.onShowUserPositionToggle}
              showUserLocationChecked={showUserLocationChecked}
            />
          )}
          {showLocationDetail &&
          <LocationDetailList
            toggle={this.showLocationDetailsToggle}
            sameLocationList={sameLocationList}
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
