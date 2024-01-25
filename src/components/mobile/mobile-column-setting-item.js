import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { COLUMNS_ICON_CONFIG } from 'dtable-utils';
import Switch from './mobile-switch';

import '../../css/column-item.css';
import styles from '../../css/mobile.module.css';

const propTypes = {
  column: PropTypes.object.isRequired,
  settings: PropTypes.array,
  onColumnItemClick: PropTypes.func.isRequired,
};

class MobileColumnSettingItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isChecked: props.column.active,
    };
  }

  onColumnItemClick = (event) => {
    event.nativeEvent.stopImmediatePropagation();
    let value = event.target.checked;
    if (value === this.props.column.active) {
      return;
    }
    let { column } = this.props;
    this.props.onColumnItemClick(column, value);
  };

  render() {
    const { column } = this.props;
    let placeholder = <Fragment><i className={`${styles['column-item-icon']} dtable-font ${COLUMNS_ICON_CONFIG[column.type]}`}></i><span>{column.columnName}</span></Fragment>;
    return (
      <div
        className={`${styles['mobile-column-setting-item']}`}
      >
        <div
          className={styles['drag-column-handle']}
        ><i className={'dtable-font dtable-icon-drag'}></i></div>
        <Switch
          checked={column.active}
          placeholder={placeholder}
          onChange={this.onColumnItemClick}
        />
      </div>
    );
  }
}

MobileColumnSettingItem.propTypes = propTypes;

export default MobileColumnSettingItem;
