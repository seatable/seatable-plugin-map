
import React, { Component } from 'react';
import styles from '../../css/mobile.module.css';
import TouchFeedBack from './touch-feedback';

class MobileSettingItem extends Component {

  onClick = () => {
    this.props.onSelectConfig(this.props.configSetting)
  }

  getText = () => {
    const { configSetting } = this.props;
    if (configSetting.type === 'address_type') {
      const active = configSetting.active;
      return active === 'text' ? '文本' : '经纬度';
    }
    return configSetting.active;
  }

  render() { 
    const { configSetting } = this.props;
    return (
      <div className={styles['mobile-settting-item']}>
        <div className={styles['mobile-setting-title']}>{configSetting.name}</div>
        <TouchFeedBack activeClassName={styles['selected-selector']}>
          <div onClick={this.onClick} className={`${styles['mobile-selector']}`}>
            <div className={styles['mobile-selector-text']}>
              {this.getText()}
            </div>
            <div className={styles['mobile-selector-icon']}>
              <i className="dtable-font dtable-icon-right"></i>
            </div>
          </div>
        </TouchFeedBack>
      </div>
    )
  }
}
 
export default MobileSettingItem;