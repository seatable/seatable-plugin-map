import React, { Component } from 'react';
import PropTypes from 'prop-types';
import LocationSettingsItem from './local-settings-widgets/location-settings-item';
import intl from 'react-intl-universal';
import '../locale/index.js';

const propTypes = {
  configSettings: PropTypes.array,
  onSelectChange: PropTypes.func,
};

class LocationSettings extends Component {

  onSelectChange = (option, type) => {
    this.props.onSelectChange(option, type);
  }

  render() {
    const { configSettings, onHideMapSettings } = this.props;
    return (
      <div className="dtable-plugin-location-settings">
        <div className="dtable-plugin-location-settings-header">
          <div className="setting-header-title">{intl.get('Settings')}</div>
          <div className="dtable-font dtable-icon-x btn-close" onClick={onHideMapSettings}></div>
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