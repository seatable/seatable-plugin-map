import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { DTableSelect } from 'dtable-ui-component';

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
  };

  createOption = (option) => {
    if (!option || !option.id) {
      const name = !option ? this.props.configSetting.active : option.name;
      return ({
        label: (<span className='select-option-name null-select-option-name'>{name}</span>),
        value: name,
        style: {color: 'rgba(0, 0, 0, .25)'}
      });
    }

    if (!option || option.id === 'not_used') {
      const name = !option ? this.props.configSetting.active : option.name;
      return ({
        label: (<span className='select-option-name null-option-name'>{name}</span>),
        value: { name },
        style: { color: 'rgba(0, 0, 0, .25)' }
      });
    }
    return ({
      label: (<span className='select-option-name'>{option.name}</span>),
      value: { name: option.name },
    });
  };

  onSelectChange = (option) => {
    let { configSetting } = this.props;
    let { active } = configSetting;
    if (active === option.value.name) return;
    this.props.onSelectChange(option.value, configSetting.type);
  };

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
