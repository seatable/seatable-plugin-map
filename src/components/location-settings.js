import React, { Component } from 'react';
import PropTypes from 'prop-types';
import LocationSettingsItem from './local-settings-widgets/location-settings-item';
import intl from 'react-intl-universal';
import '../locale/index.js';

const propTypes = {
  configSettings: PropTypes.array,
  onSelectChange: PropTypes.func,
  toggleSettingDialog: PropTypes.func,
};

class LocationSettings extends Component {

  onSelectChange = (option, type) => {
    this.props.onSelectChange(option, type);
  }

  render() {
    const { configSettings, toggleSettingDialog } = this.props;
    return (
      <div className="dtable-plugin-location-settings">
        <div className="dtable-plugin-location-settings-header">
          <span>{intl.get('Settings')}</span>
          <button onClick={toggleSettingDialog} className="close">
            <i className="dtable-font dtable-icon-x"></i>
          </button>
        </div>
        <div className="dtable-plugin-location-settings-parameter">
          {configSettings && configSettings.map(configSetting => {
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