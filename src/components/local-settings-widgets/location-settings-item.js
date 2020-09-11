import React, { Component } from 'react';
import PropTypes from 'prop-types';
import DTableSelect from './dtable-select';

const propTypes = {
  configSetting: PropTypes.object,
  onSelectChange: PropTypes.func,
};

class LocationSettingsItem extends Component {

  createOptions = () => {
    let { configSetting } = this.props;
    return configSetting.settings.map(option => {
      return this.createOption(option);
    });
  }

  createOption = (option) => {
    return ({
      label: (<span className='select-option-name'>{option.name}</span>),
      value: { name: option.name },
    });
  }

  onSelectChange = (option) => {
    let { configSetting } = this.props;
    let { active, settings } = configSetting;
    let activeOption = settings.find(setting => setting.name === active);
    if (activeOption.name === option.value.name) return;
    this.props.onSelectChange(option.value, configSetting.type);
  }

  render() {
    let { configSetting } = this.props;
    let { name, active, settings } = configSetting;
    let activeOption = settings.find(setting => setting.name === active);
    return (
      <div className="dtable-plugin-location-settings-item">
        <div className="dtable-plugin-location-settings-title">{name}</div>
        <DTableSelect
          value={this.createOption(activeOption)}
          onChange={this.onSelectChange}
          options={this.createOptions()}
        />
      </div>
    );
  }
}

LocationSettingsItem.propTypes = propTypes;

export default LocationSettingsItem;
