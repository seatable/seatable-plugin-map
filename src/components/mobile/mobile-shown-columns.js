import React, { Component } from 'react';
import PropTypes from 'prop-types';
import ColumnSettingItem from './mobile-column-setting-item';
import styles from '../../css/mobile.module.css';

class MobileShownColumns extends Component {

  toggleSelectAll = (value) => {
    this.props.toggleAllColumns(value);
  };

  hasUnactiveColumn = () => {
    const { configSetting } = this.props;
    const { settings } = configSetting;
    const hasUnactiveColumn = settings.find((columnItem) => {
      return columnItem.active === false;
    });
    return !!hasUnactiveColumn;
  };

  renderChooseFields = () => {
    const hasUnactiveColumn = this.hasUnactiveColumn();
    if (hasUnactiveColumn) {
      return <span onClick={() => this.toggleSelectAll(false)}>显示全部</span>;
    } else {
      return <span onClick={() => this.toggleSelectAll(true)}>隐藏全部</span>;
    }
  };

  render() {
    const { configSetting } = this.props;
    const { settings } = configSetting;
    return (
      <div className={styles['mobile-settting-item']}>
        <div className={styles['mobile-setting-title']}>
          <div>{configSetting.name}</div>
          <div className={styles['mobile-select-all']}>{this.renderChooseFields()}</div>
        </div>
        {
          settings.map((columnItem, index) => {
            return (
              <ColumnSettingItem
                settings={settings}
                onMoveColumn={this.props.onMoveColumn}
                onColumnItemClick={this.props.onColumnItemClick}
                key={'column-item-' + index}
                column={columnItem}
              />
            );
          })
        }
      </div>
    );
  }
}

MobileShownColumns.propTypes = {
  configSetting: PropTypes.object,
  toggleAllColumns: PropTypes.func,
  onColumnItemClick: PropTypes.func,
  onMoveColumn: PropTypes.func,
};

export default MobileShownColumns;
