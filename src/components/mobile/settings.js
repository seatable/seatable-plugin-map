import React, { Component } from 'react';
import PropTypes from 'prop-types';
import styles from '../../css/mobile-en.module.css';
import MobileSettingItem from './mobile-setting-item';
import MobileShownColumns from './mobile-shown-columns';
import MobileSelectOption from './mobile-select-option';
import intl from 'react-intl-universal';
import { MAP_MODE } from '../../constants';
import Switch from './mobile-switch';

const HIDE_SETTING_ITEM = ['direct_shown_column', 'numeric_column', 'mark_dependence', 'shown_columns'];


class Settings extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isShowSelectOption: false,
      selectedConfig: null
    };
  }

  onSelectConfig = (configItem) => {
    this.setState({
      isShowSelectOption: true,
      selectedConfig: configItem
    });
  };

  hideSelectConfig = () => {
    this.setState({
      isShowSelectOption: false
    });
  };

  onSelectOption = (type, option) => {
    this.setState({
      isShowSelectOption: false,
    });
    this.props.onSelectChange(type, option);
  };

  isImageMapMode = () => {
    const { configSettings } = this.props;
    const mapMode = configSettings.find(setting => setting.type === 'map_mode');
    if (!mapMode) return false;
    return mapMode.active === MAP_MODE.IMAGE;
  };


  render() {
    const { toggleSettingDialog, configSettings, onColumnItemClick, onMoveColumn, toggleAllColumns } = this.props;
    const { selectedConfig, isShowSelectOption } = this.state;
    return (
      <div className={styles['setting']}>
        <div className={styles['dtable-map-plugin-title']}>
          <span onClick={toggleSettingDialog} className={styles['dtable-map-plugin-header-btn']}>{intl.get('Cancel')}</span>
          <h4 className={styles['dtable-map-plugin-header-title']}>{intl.get('Settings')}</h4>
          <span onClick={this.props.onSaveSetting} className={`${styles['dtable-map-plugin-header-btn-highlight']} ${styles['dtable-map-plugin-header-btn']}`}>{intl.get('Save')}</span>
        </div>
        <div className={styles['dtable-map-plugin-setting-wrapper']}>
          {configSettings && configSettings.map(configSetting => {
            if (this.isImageMapMode() && HIDE_SETTING_ITEM.includes(configSetting.type)) {
              return null;
            }

            if (configSetting.type === 'hover_display_columns') {
              return (<MobileShownColumns
                key={configSetting.type}
                onColumnItemClick={onColumnItemClick}
                onMoveColumn={onMoveColumn}
                toggleAllColumns={toggleAllColumns}
                configSetting={configSetting}
              />);
            }

            if (configSetting.type === 'show_user_location') {
              let placeholder = (
                <span>{intl.get('Show_user_location')}</span>
              );

              return (
                <div className={`${styles['mobile-settting-item']}`} key={configSetting.type}>
                  <div className={`${styles['mobile-setting-title']}`}>
                    {intl.get('Show_user_location')}
                  </div>
                  <div className={`${styles['mobile-column-setting-item']}`}>
                    <Switch
                      checked={this.props.showUserLocationChecked}
                      onChange={this.props.showUserLocationSwitchChange}
                      placeholder={placeholder}
                    />
                  </div>
                </div>
              );

            }

            return (
              <MobileSettingItem
                key={configSetting.type}
                configSetting={configSetting}
                onSelectConfig={this.onSelectConfig}
              />
            );
          })}
        </div>
        {isShowSelectOption &&
          <MobileSelectOption
            onSelectOption={this.onSelectOption}
            selectedConfig={selectedConfig}
            hideSelectConfig={this.hideSelectConfig}
          />}
      </div>
    );
  }
}

Settings.propTypes = {
  configSettings: PropTypes.array,
  onSaveSetting: PropTypes.func,
  onSelectChange: PropTypes.func,
  toggleSettingDialog: PropTypes.func,
};

export default Settings;
