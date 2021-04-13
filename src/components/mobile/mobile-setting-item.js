import React, { Component } from 'react';
import styles from '../../css/mobile-en.module.css';
import TouchFeedBack from './touch-feedback';

class MobileSettingItem extends Component {

  onClick = () => {
    this.props.onSelectConfig(this.props.configSetting)
  }

  getText = () => {
    const { configSetting } = this.props;
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