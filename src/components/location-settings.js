import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import LocationSettingsItem from './local-settings-widgets/location-settings-item';
import intl from 'react-intl-universal';
import { getTableByName, getViewByName, getViewShownColumns } from 'dtable-utils';
import { FieldDisplaySetting, DTableSwitch } from 'dtable-ui-component';
import { MAP_MODE, SETTING_TITLE } from '../constants.js';
import getConfigItemByType from '../utils/get-config-item-by-type';


const HIDDEN_SETTING_ITEM = ['direct_shown_column', 'numeric_column', 'mark_dependence', 'shown_columns'];


const propTypes = {
  configSettings: PropTypes.array,
  onSelectChange: PropTypes.func,
  onHideMapSettings: PropTypes.func,
  onColumnItemClick: PropTypes.func,
  onMoveColumn: PropTypes.func,
};

class LocationSettings extends Component {


  constructor(props) {
    super();
    this.setColumnsMap(props);
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.configSettings !== this.props.configSettings) {
      this.setColumnsMap(this.props);
    }
  }


  onSelectChange = (option, type) => {
    this.props.onSelectChange(option, type);
  };

  getFieldsBySettingType = (props, type) => {
    const { configSettings } = props;
    if (!configSettings) return [];
    const fieldSettings = configSettings.find((item) => item.type === type);

    const fields = fieldSettings?.settings.map((item) => {
      const field = {
        key: this.columnsNameMap[item.columnName],
        type: item.type,
        name: item.columnName,
        shown: item.active,
      };
      return field;
    });
    return fields || [];
  };


  setColumnsMap = (props) => {
    const { columnsKeyMap, columnsNameMap } = this.getColumnsMap(props);
    this.columnsKeyMap = columnsKeyMap;
    this.columnsNameMap = columnsNameMap;
  };

  getColumnsMap = (props) => {
    const { configSettings } = props;
    let columnsKeyMap = {};
    let columnsNameMap = {};
    if (!configSettings.length) return { columnsKeyMap, columnsNameMap };
    const tableName = getConfigItemByType(configSettings, 'table').active;
    const viewName = getConfigItemByType(configSettings, 'view').active;
    const tables = window.dtableSDK.getTables();
    const currentTable = getTableByName(tables, tableName);
    const currentView = getViewByName(currentTable.views, viewName);
    const columns = getViewShownColumns(currentView, currentTable.columns);
    columns.forEach(colum => {
      columnsKeyMap[colum.key] = colum;
      columnsNameMap[colum.name] = colum.key;
    });
    return { columnsKeyMap, columnsNameMap };
  };

  clickField = (columnKey, value) => {
    const { configSettings } = this.props;
    const shownColumnSetting = configSettings.find(setting => setting.type === 'hover_display_columns');
    const columnName = this.columnsKeyMap[columnKey].name;
    const column = shownColumnSetting.settings.find(item => item.columnName === columnName);
    this.props.onColumnItemClick(column, value);
  };

  moveColumn = (droppedColumnKey, columnKey) => {
    const droppedColumn = this.columnsKeyMap[droppedColumnKey];
    const draggedColumn = this.columnsKeyMap[columnKey];
    this.props.onMoveColumn(droppedColumn.name, draggedColumn.name);
  };


  onToggleFieldsVisibility = (fieldAllShown) => {
    this.props.toggleAllColumns(!!fieldAllShown);
  };

  isImageMapMode = () => {
    const { configSettings } = this.props;
    const mapMode = configSettings.find(setting => setting.type === 'map_mode');
    if (!mapMode) return false;
    return mapMode.active === MAP_MODE.IMAGE;
  };


  render() {
    const { configSettings, onHideMapSettings } = this.props;
    const shownColumnFields = this.getFieldsBySettingType(this.props, 'hover_display_columns');
    const showAllFields = shownColumnFields.every((item) => item.shown);
    const textProperties = {
      titleValue: SETTING_TITLE.HOVER_DISPLAY_COLUMNS,
      bannerValue: intl.get('Field'),
      hideValue: intl.get('Hide_all'),
      showValue: intl.get('Display_all'),
    };

    return (
      <div className="dtable-plugin-location-settings">
        <div className="dtable-plugin-location-settings-header">
          <div className="location-settings-header-container align-items-center">
            <h3 className="m-0 setting-header-title h5">{intl.get('Settings')}</h3>
            <i className="dtable-font dtable-icon-x btn-close" onClick={onHideMapSettings}></i>
          </div>
        </div>
        <div className="dtable-plugin-location-settings-parameter">
          {configSettings && configSettings.map(configSetting => {

            // hide some settings when map mode is image
            if (this.isImageMapMode() && HIDDEN_SETTING_ITEM.includes(configSetting.type)) {
              return null;
            }

            // switch
            if (configSetting.type === 'show_user_location') {
              return (
                <Fragment key={configSetting.type}>
                  <div className="setting-divider"></div>
                  <div className="plugin-map-show-location">
                    <div>{intl.get('Show_user_location')}</div>
                    <DTableSwitch
                      id="showlocation"
                      checked={this.props.showUserLocationChecked}
                      onChange={(e) => this.props.onSwitchChange(e)}
                    />
                  </div>
                </Fragment>
              );
            }

            if (configSetting.type === 'mark_dependence') {
              return (
                <Fragment key={configSetting.type}>
                  <div className="setting-divider"></div>
                  <LocationSettingsItem
                    configSetting={configSetting}
                    onSelectChange={this.onSelectChange}
                  />
                </Fragment>
              );
            }

            if (configSetting.type === 'hover_display_columns') {
              return (
                <div key={configSetting.type} style={{ marginBottom: '14px' }}>
                  <div className="setting-divider"></div>
                  <FieldDisplaySetting
                    fields={shownColumnFields}
                    textProperties={textProperties}
                    fieldAllShown={showAllFields}
                    onClickField={this.clickField}
                    onMoveField={this.moveColumn}
                    onToggleFieldsVisibility={() => this.onToggleFieldsVisibility(showAllFields)}
                  />
                </div>
              );
            }

            return (
              <LocationSettingsItem
                key={configSetting.type}
                configSetting={configSetting}
                onSelectChange={this.onSelectChange}
              />
            );
          })}
        </div>
      </div>
    );
  }
}

LocationSettings.propTypes = propTypes;

export default LocationSettings;
