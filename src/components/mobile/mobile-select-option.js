import React, { Component } from 'react'
import styles from '../../css/mobile.module.css';
import TouchFeedBack from './touch-feedback';
import intl from 'react-intl-universal';

class MobileSelectOption extends Component {
  
  onClick = (option) => {
    const { selectedConfig } = this.props;
    if (selectedConfig.type === 'address_type') {
      this.props.onSelectOption(selectedConfig.type, option.id);
      return;
    }
    this.props.onSelectOption(selectedConfig.type, option.name);
  }

  renderOptoins = () => {
    const { selectedConfig } = this.props;
    return (
      <div className={styles["mobile-settting-item"]}>
        <div className={styles["mobile-setting-title"]}>
          {intl.get('Please_select') + selectedConfig.name}
        </div>
        {
          selectedConfig.settings.map((settingItem, index) => {
            return (
              <TouchFeedBack key={settingItem.name + index} activeClassName={styles["selected-selector"]}>
                <div
                  onClick={() => this.onClick(settingItem)}
                  className={`${styles["mobile-selector"]}`}
                >
                  <div className={styles["mobile-selector-text"]}>
                    {settingItem.name}
                  </div>
                  {settingItem.name === selectedConfig.active && <div className={styles["mobile-selector-icon"]}>
                    <i className="dtable-font dtable-icon-check-mark"></i>
                  </div>}
                </div>
              </TouchFeedBack>
            )
          })
        }
      </div>
    );
  }

  render() { 
    const { selectedConfig, hideSelectConfig } = this.props;
    return ( 
      <div className={styles['setting']}>
        <div className={styles["dtable-map-plugin-title"]}>
          <span onTouchEnd={hideSelectConfig} className={styles['dtable-map-plugin-header-btn']}><i className='dtable-font dtable-icon-return'></i></span>
          <h4 className={styles['dtable-map-plugin-header-title']}>{selectedConfig.name}</h4>
          <span className={`${styles['dtable-map-plugin-header-btn-highlight']} ${styles['dtable-map-plugin-header-btn']}`}></span>
        </div>
        {this.renderOptoins()}
      </div>
    );
  }
}
 
export default MobileSelectOption;