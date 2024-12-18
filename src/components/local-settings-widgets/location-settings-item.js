import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { DTableSelect } from 'dtable-ui-component';
import { CONFIG_TYPE } from '../../constants';

const propTypes = {
  configSetting: PropTypes.object,
  onSelectChange: PropTypes.func,
};

const CAN_CLEAR_TYPES = [CONFIG_TYPE.MARK_DEPENDENCE, CONFIG_TYPE.DIRECT_SHOWN_COLUMN, CONFIG_TYPE.IMAGE_COLUMN];

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
    if (!option) {
      this.props.onSelectChange(null, configSetting.type);
      return;
    }
    if (configSetting.active !== option.value.name) {
      this.props.onSelectChange(option.value, configSetting.type);
    }
  };

  render() {
    let { configSetting } = this.props;
    let { name, active, settings, type } = configSetting;
    let activeOption = settings.find(setting => setting.name === active);
    let selectedOption = this.createOption(activeOption);
    return (
      <div className="dtable-plugin-location-settings-item">
        <div className="dtable-plugin-location-settings-title">{name}</div>
        <DTableSelect
          value={selectedOption}
          onChange={this.onSelectChange}
          options={this.createOptions()}
          isClearable={(activeOption && CAN_CLEAR_TYPES.includes(type)) ? true : false}
        />
      </div>
    );
  }
}

LocationSettingsItem.propTypes = propTypes;

export default LocationSettingsItem;
