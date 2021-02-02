import React from 'react';

class AddressType extends React.Component {
  
  render() {
    const { configSetting, onAddressTypeChange } = this.props;
    return (
      <div className="dtable-plugin-column-setting-item dtable-plugin-location-settings-item">
        <div className="dtable-plugin-location-settings-title">
          <span>{configSetting.name}</span>
        </div>
        <div className="address-type-container">
          {configSetting.settings.map((setting) => {
            let isActive = setting.id === configSetting.active ? 'selected-address-type-item' : ' '
            return <div key={setting.id} onClick={(event) => {onAddressTypeChange(event, setting.id)}} className={`address-type-item ${isActive}`}>
              {setting.name}
            </div>
          })}
        </div>
      </div>
    );
  }
}

export default AddressType;