import React, { Component } from 'react';
import PropTypes from 'prop-types';
import styles from '../../css/mobile-en.module.css';
import MobileSettingItem from './mobile-setting-item';
import MobileSelectOption from './mobile-select-option';
import intl from 'react-intl-universal';

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

  render() {
    const { toggleSettingDialog, configSettings } = this.props;
    const { selectedConfig, isShowSelectOption } = this.state;
    return (
      <div className={styles['setting']}>
        <div className={styles['dtable-map-plugin-title']}>
          <span onClick={toggleSettingDialog} className={styles['dtable-map-plugin-header-btn']}>{intl.get('Cancle')}</span>
          <h4 className={styles['dtable-map-plugin-header-title']}>{intl.get('Settings')}</h4>
          <span onClick={this.props.onSaveSetting} className={`${styles['dtable-map-plugin-header-btn-highlight']} ${styles['dtable-map-plugin-header-btn']}`}>{intl.get('Save')}</span>
        </div>
        <div className={styles['dtable-map-plugin-setting-wrapper']}>
          {configSettings.map(configSetting => {
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
