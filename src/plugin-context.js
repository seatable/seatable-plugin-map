import { getTableByName, getViewByName, getTableColumnByName, getNonArchiveViews, getViewShownColumns, getRowById, getNonPrivateViews } from 'dtable-utils';
import intl from 'react-intl-universal';
import CellValueUtils from './utils/cell-value-utils';
import { MAP_MODE, SETTING_TITLE, GEOLOCATION_COLUMN_NAME, SHOWN_COLUMN_TYPES, CONFIG_TYPE, PLUGIN_NAME, KEY_SELECTED_VIEW_IDS } from './constants';
import getConfigItemByType from './utils/get-config-item-by-type';
import removeSettingByType from './utils/remove-setting-by-type';
import { replaceSettingItemByType } from './utils/repalce-setting-item-by-type';
import { generatorViewId, getSelectedViewIds } from './utils/common-utils';

class PluginContext {

  constructor() {
    this.settings = window.dtable ? window.dtable : window.dtablePluginConfig;
    this.cellValueUtils = new CellValueUtils();
  }

  getConfig = () => {
    return this.settings;
  };

  getSetting = (key) => {
    return this.settings[key] || '';
  };

  getLanguage = () => {
    return this.settings['lang'] || 'en';
  };

  getUserCommonInfo = async (email, avatar_size = '30') => {
    return  window.dtableWebAPI.getUserCommonInfo(email || this.getSetting('username'), avatar_size);
  };

  getMapConfig = () => {
    const dtableGoogleMapKey = this.getSetting('dtableGoogleMapKey');
    return { mapKey: dtableGoogleMapKey, mapType: 'google_map' };
  };

  getCollaboratorsCache = () => {
    if (!window.app) return {};
    return window.app.collaboratorsCache;
  };

  expandRow = (row, table) => {
    window.app.expandRow && window.app.expandRow(row, table);
  };

  closePlugin = () => {
    window.app.onClosePlugin && window.app.onClosePlugin();
  };

  getTableByName = (tableName) => {
    const tables = window.dtableSDK.getTables();
    return getTableByName(tables, tableName);
  };

  initPluginSettings = () => {
    let showSettingDialog = false;
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
        pluginSettings = [{ ...pluginSettings, name, id }];
      } else {
        showSettingDialog = true;
        pluginSettings = [initSettingItem];
      }
    }

    let selectedViewIdx = getSelectedViewIds(KEY_SELECTED_VIEW_IDS) || 0;
    selectedViewIdx = selectedViewIdx > pluginSettings.length - 1 ? 0 : selectedViewIdx;

    const selectedViewSettings = pluginSettings[selectedViewIdx];
    const shouldFetchUserInfo = typeof selectedViewSettings.showUserLocation !== 'boolean' || selectedViewSettings.showUserLocation === true;
    return { showSettingDialog, pluginSettings, selectedViewSettings, selectedViewIdx, shouldFetchUserInfo };
  };

  initSelectedSettings = (settings) => {
    let { mapMode, tableName, viewName, columnName, shownColumns, numericColumnName, bubbleSize,
      directShownColumnName, markDependence, imageColumnName } = settings;
    let configSettings = [];
    const mapSettings = this.getMapSetting(mapMode);
    configSettings.push(mapSettings);
    let activeTable = this.getTableByName(tableName);
    if (!activeTable) {
      activeTable = window.dtableSDK.getActiveTable();
    }
    let tableSettings = this.getTableSetting(activeTable);
    configSettings.push(tableSettings);

    let activeView = getViewByName(activeTable.views, viewName);
    if (!activeView) {
      activeView = window.dtableSDK.getActiveView();
    }
    let viewSettings = this.getViewSetting(activeTable, activeView);
    configSettings.push(viewSettings);

    let columnSettings = [];
    let activeColumn = getTableColumnByName(activeTable, columnName);
    columnSettings = this.getColumnSetting(activeTable, activeView, activeColumn);
    configSettings.push(columnSettings);
    if (mapMode === MAP_MODE.IMAGE) {
      const activeImageColumn = getTableColumnByName(activeTable, imageColumnName);
      const imageColumnSetting = this.getImageColumnsSetting(activeTable, activeView, activeImageColumn);
      configSettings.push(imageColumnSetting);
    }
    let markColumnSettings = this.getMarkColumnSetting(activeTable, activeView, markDependence);
    configSettings.push(markColumnSettings);
    if (mapMode === MAP_MODE.BUBBLE) {
      let activeNumericColumn = getTableColumnByName(activeTable, numericColumnName);
      const numericColumnSetting = this.getNumericColumnSetting(activeTable, activeView, activeNumericColumn);
      const bubbleSetting = this.getBubbleSetting(bubbleSize);
      configSettings.push(numericColumnSetting, bubbleSetting);
    }
    let directShownColumn = getTableColumnByName(activeTable, directShownColumnName);
    let directShownColumnSetting = this.getDirectShownColumnSetting(activeTable, activeView, directShownColumn);
    shownColumns = this.mergeOldMarkerHoverSettings(configSettings, activeTable, activeView, columnSettings.active, shownColumns);
    let shownColumnsSettings = this.getMarkerHoverSettings(activeTable, activeView, columnName, shownColumns);
    configSettings.push(directShownColumnSetting, shownColumnsSettings);

    // show user location，just for display
    configSettings.push({
      type: 'show_user_location',
      name: SETTING_TITLE.SHOW_USER_LOCATION,
    });

    return configSettings;
  };

  getTableSetting = (activeTable = null) => {
    let tables = window.dtableSDK.getTables();
    let tableSettings = tables.map(table => {
      return { id: table._id, name: table.name };
    });
    let active = activeTable ? activeTable.name : tables[0].name;
    return { type: 'table', name: SETTING_TITLE.TABLE, active: active, settings: tableSettings };
  };


  getViewSetting = (currentTable, activeView = null) => {
    let views = getNonPrivateViews(getNonArchiveViews(currentTable.views));
    let viewSettings = views.map(view => {
      return { id: view._id, name: view.name };
    }).filter(Boolean);

    let active = activeView ? activeView.name : views[0].name;
    return { type: 'view', name: SETTING_TITLE.VIEW, active: active, settings: viewSettings };
  };

  getColumnSetting = (currentTable, currentView, activeColumn = null) => {
    let columns = getViewShownColumns(currentView, currentTable.columns);
    // need options: checkout map column
    columns = columns.filter(column => {
      const { type } = column;
      if (type === 'text') return true;
      if (type === 'geolocation') {
        const { data } = column;
        const { geo_format } = data || {};
        if (geo_format !== 'country_region') {
          return true;
        }
      }
      return false;
    });

    let columnSettings = columns.map(column => {
      return { id: column.key, name: column.name };
    });

    if (columns.length === 0) {
      const column = currentTable.columns[0];
      columnSettings.unshift({ id: column.key, name: column.name });
    }
    columnSettings.unshift({ id: '', name: GEOLOCATION_COLUMN_NAME });
    let active = activeColumn ? activeColumn.name : columnSettings[0].name;

    // need options: checkout map column
    return { type: 'column', name: SETTING_TITLE.GEO_COLUMN, active: active, settings: columnSettings };
  };

  updateSelectedSettings = (type, option, configSettings) => {
    const tables = window.dtableSDK.getTables();
    switch (type) {
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
        } else {
          newConfigSettings = removeSettingByType(configSettings, CONFIG_TYPE.IMAGE_COLUMN);
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
  };

  getRow = (table, rowID) => {
    return getRowById(table, rowID);
  };

  getBubbleSetting = (size = 1) => {
    return { name: '气泡大小', value: size, type: 'bubble_size' };
  };

  getInitSettingItem = (name = '默认视图') => {
    let activeTable = window.dtableSDK.getActiveTable();
    let activeView = window.dtableSDK.getActiveView();
    const shownColumns = this.getViewShowColumns(activeTable, activeView);
    let pluginSettingItem =
        {
          id: generatorViewId(),
          name,
          mapMode: MAP_MODE.DEFAULT,
          tableName: activeTable.name,
          viewName: activeView.name,
          columnName: null,
          markDependence: null,
          directShownColumn: null,
          shownColumns,
          showUserLocation: true,
        };
    return pluginSettingItem;
  };

  getViewShowColumns = (currentTable, currentView, locationColumn) => {
    let columns = getViewShownColumns(currentView, currentTable.columns);

    columns = columns.filter(column => {
      return SHOWN_COLUMN_TYPES.includes(column.type) && column.name !== locationColumn;
    });

    const setting = columns.map((column) => {
      return { columnName: column.name, type: column.type, active: false };
    });

    return setting;
  };

  getMarkerHoverSettings = ( currentTable, currentView, locationColumn, hoverDisplayColumns) => {
    if (hoverDisplayColumns) {
      return { type: 'hover_display_columns', name: SETTING_TITLE.HOVER_DISPLAY_COLUMNS, settings: hoverDisplayColumns };
    } else {
      const initialHoverDisplayColumns = this.getViewShowColumns(currentTable, currentView, locationColumn);
      return { type: 'hover_display_columns', name: SETTING_TITLE.HOVER_DISPLAY_COLUMNS, settings: initialHoverDisplayColumns };
    }
  };

  getMapSetting = (mapType = MAP_MODE.DEFAULT) => {
    return { name: SETTING_TITLE.MAP_MODE, active: mapType, type: 'map_mode', settings: [{ name: MAP_MODE.DEFAULT, id: 'map' }, { name: MAP_MODE.IMAGE, id: 'image' }] };
  };


  getTableSettings = (activeTable = null) => {
    const tables = window.dtableSDK.getTables();
    const tableSettings = tables.map(table => {
      return { id: table._id, name: table.name };
    });
    const active = activeTable ? activeTable.name : tables[0].name;
    return {
      type: CONFIG_TYPE.TABLE,
      name: SETTING_TITLE.TABLE,
      settings: tableSettings,
      active,
    };
  };

  getViewSettings = (currentTable, activeView = null) => {
    const views = getNonArchiveViews(currentTable.views);
    const viewSettings = views.map(view => {
      return { id: view._id, name: view.name };
    }).filter(Boolean);
    const active = activeView ? activeView.name : views[0].name;
    return {
      type: CONFIG_TYPE.VIEW,
      name: SETTING_TITLE.VIEW,
      settings: viewSettings,
      active,
    };
  };


  getColumnSettings = (currentTable, currentView, activeColumn = null) => {
    let columns = getViewShownColumns(currentView, currentTable.columns);

    // need options: checkout map column
    columns = columns.filter(column => {
      return column.type === 'text' || column.type === 'geolocation';
    });
    let columnSettings = columns.map(column => {
      return { id: column.key, name: column.name };
    });
    let active = '';
    if (columns.length === 0) {
      const column = currentTable.columns[0];
      active = column.name;
      columnSettings.unshift({ id: column.key, name: column.name });
    } else {
      active = activeColumn ? activeColumn.name : columns[0].name;
    }
    return {
      type: CONFIG_TYPE.COLUMN,
      name: SETTING_TITLE.GEO_COLUMN,
      settings: columnSettings,
      active,
    };
  };

  mergeOldMarkerHoverSettings = (configSettings, currentTable, currentView, locationColumn, oldSettings = []) => {
    if (!oldSettings.length) {
      const hoverDisplaySettings =  getConfigItemByType(configSettings, 'hover_display_columns');
      if (hoverDisplaySettings) oldSettings = hoverDisplaySettings.settings;
    }

    let shownColumns = getViewShownColumns(currentView, currentTable.columns).filter(column => {
      return SHOWN_COLUMN_TYPES.includes(column.type) && column.name !== locationColumn;
    });

    let settings = [];
    oldSettings.forEach((showColumnItem, index) => {
      const columnIndex = shownColumns.findIndex((column) => {
        return column.name === showColumnItem.columnName;
      });
      if (columnIndex > -1) {
        settings.push({ columnName: showColumnItem.columnName, type: showColumnItem.type, active: showColumnItem.active });
        shownColumns.splice(columnIndex, 1);
      }
    });

    settings = settings.concat(shownColumns.map((columnItem) => {
      return { columnName: columnItem.name, type: columnItem.type, active: false };
    }));
    return settings;
  };


  getMarkColumnSetting = (currentTable, currentView, dependence = null) => {
    let columns = getViewShownColumns(currentView, currentTable.columns);
    // need options: checkout map column
    columns = columns.filter(column => {
      return column.type === 'single-select';
    });

    let columnSettings = columns.map(column => {
      return { id: column.key, name: column.name };
    });

    let active = '';
    columnSettings.unshift({ id: 'not_used', name: intl.get('Not_used') }, { id: 'rows_color', name: intl.get('Row_color') });
    if (dependence === 'rows_color') {
      active = intl.get('Row_color');
    } else {
      active = dependence ? dependence : columnSettings[0].name;
    }
    return {
      type: 'mark_dependence',
      name: SETTING_TITLE.COLOR_COLUMN,
      settings: columnSettings,
      active,
    };
  };


  getDirectShownColumnSetting = (currentTable, currentView, activeColumn = null) => {
    let columns = getViewShownColumns(currentView, currentTable.columns);
    columns = columns.filter(column => {
      return column.type === 'text' || column.type === 'single-select';
    });
    let columnSettings = columns.map(column => {
      return { id: column.key, name: column.name };
    });
    columnSettings.unshift({ id: 'not_used', name: intl.get('Not_used') });
    // need options: checkout map column
    let active = activeColumn ? activeColumn.name : columnSettings[0].name;
    return {
      type: 'direct_shown_column',
      name: SETTING_TITLE.DIECT_SHOWN_COLUMN,
      settings: columnSettings,
      active,
    };
  };

  getImageColumnsSetting = (currentTable, currentView, activeColumn = null) => {
    let columns = getViewShownColumns(currentView, currentTable.columns);
    columns = columns.filter(column => {
      return column.type === 'image';
    });
    let columnSettings = columns.map(column => {
      return { id: column.key, name: column.name };
    });

    columnSettings.unshift({ id: 'not_used', name: intl.get('Not_used') });
    let active = activeColumn ? activeColumn.name : columnSettings[0].name;
    return {
      type: 'image_column',
      name: SETTING_TITLE.IMAGE_COLUMN,
      settings: columnSettings,
      active,
    };
  };

  isValidSettingItem = (pluginSettings) => {
    let { tableName, viewName, columnName, mapMode, numericColumnName, directShownColumnName, markDependence } = pluginSettings;
    if (!mapMode) return false;
    let table = this.getTableByName(tableName);
    if (!table) return false;
    let view = getViewByName(table.views, viewName);
    if (!view || view.type === 'archive') return false;
    let column = getTableColumnByName(table, columnName);
    if (!column && columnName) return false;
    let markColumn = getTableColumnByName(table, markDependence);
    if (!markColumn && markDependence && markDependence !== 'rows_color') return false;
    const directShownColumn = getTableColumnByName(table, directShownColumnName);
    if (!directShownColumn && directShownColumnName) return false;
    if (mapMode === MAP_MODE.BUBBLE) {
      const numericColumn = getTableColumnByName(table, numericColumnName);
      if (!numericColumn && numericColumnName) return false;
    }
    return true;
  };

}

const pluginContext =  new PluginContext();

export default pluginContext;

