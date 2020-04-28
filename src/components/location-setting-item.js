import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Select from './select';

const propTypes = {
  configSetting: PropTypes.object,
  onSelectChange: PropTypes.func,
};

class LocationSettingItem extends Component {

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
    this.props.onSelectChange(configSetting.type, option);
  }

  render() {
    let { configSetting } = this.props;
    let { name, active, settings } = configSetting;
    let activeOption = settings.find(setting => setting.name === active);
    return (
      <div className={'dtable-plugin-location-settings-item'}>
        <div className="dtable-plugin-location-settings-title">{name}</div>
        <Select
          className="dtable-plugin-location-select"
          value={this.createOption(activeOption)}
          options={this.createOptions()}
          onSelectOption={this.onSelectChange}
        />
      </div>
    );
  }
}

LocationSettingItem.propTypes = propTypes;

export default LocationSettingItem;
