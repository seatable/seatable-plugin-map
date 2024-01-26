import React from 'react';
import PropTypes from 'prop-types';
import { getTableByName, getViewByName, getViewShownColumns } from 'dtable-utils';
import getConfigItemByType from '../../utils/get-config-item-by-type';
import RowCard from '../row-card';
import styles from '../../css/mobile.module.css';
import pluginContext from '../../plugin-context';
import intl from 'react-intl-universal';

class MobileLocationDetailList extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      location: null,
    };
  }

  async componentDidMount() {
    const address = await this.getAddressFromPoint();
    this.setLocation({ address });
  }

  async componentDidUpdate(prevProps) {
    const { clickPoint: oldClickPoint } = prevProps;
    const { clickPoint } = this.props;

    if (clickPoint.lng !== oldClickPoint.lng || oldClickPoint.lat !== clickPoint.lat) {
      this.setState({ isLoading: true, isWillHide: false });
      const address = await this.getAddressFromPoint();
      this.setLocation({ address });
    }
  }

  getAddressFromPoint = async () => {
    const { clickPoint, getLocation } = this.props;
    const res = await getLocation(clickPoint);
    // use the longest address as the location cause it is more accurate
    let maxLengthRes;
    res.results.forEach((item) => {
      if (!maxLengthRes) maxLengthRes = item.formatted_address;
      if (item.formatted_address.length > maxLengthRes.length) {
        maxLengthRes = item.formatted_address;
      }
    });

    return maxLengthRes;
  };

  setLocation = (location) => {
    if (location) {
      this.setState({ location }, () => {
        this.setState({ isLoading: false });
      });
    }
    return null;
  };

  getShowColumns = () => {
    const { configSettings } = this.props;
    const tableName = getConfigItemByType(configSettings, 'table').active;
    const viewName = getConfigItemByType(configSettings, 'view').active;
    const tables = window.dtableSDK.getTables();
    const currentTable = getTableByName(tables, tableName);
    const currentView = getViewByName(currentTable.views, viewName);
    const columns = getViewShownColumns(currentView, currentTable.columns);
    return columns;
  };

  getFilterColumns = () => {
    let nameColumn, filterColumns = [];
    const shownColumns = this.getShowColumns();
    shownColumns.forEach(column => {
      if (column.key === '0000') {
        nameColumn = column;
      } else {
        filterColumns.push(column);
      }
    });
    return { nameColumn, filterColumns };
  };

  getFormulaRows = () => {
    const { configSettings } = this.props;
    const tables = window.dtableSDK.getTables();
    const tableName = getConfigItemByType(configSettings, 'table').active;
    const currentTable = getTableByName(tables, tableName);
    const rows = this.getSameLocationRows();
    return window.dtableSDK.getTableFormulaResults(currentTable, rows);
  };

  getSameLocationRows = () => {
    const { clickPoint, sameLocationList } = this.props;
    const sameLocationItem = sameLocationList['' +  clickPoint.lat +  clickPoint.lng];
    return sameLocationItem || [];
  };

  onSelectRow = (row) => {
    const { configSettings } = this.props;
    const tableName = getConfigItemByType(configSettings, 'table').active;
    const tables = window.dtableSDK.getTables();
    const currentTable = getTableByName(tables, tableName);
    pluginContext.expandRow(row, currentTable);
  };

  render() {
    const { toggle } = this.props;
    const { location } = this.state;
    const rows = this.getSameLocationRows();
    const { nameColumn, filterColumns } = this.getFilterColumns();
    const formulaRows = this.getFormulaRows();
    const address = location ? location.address : '';
    return (
      <div className={styles['setting']}>
        <div className={styles['dtable-map-plugin-header']}>
          <div className={styles['dtable-map-plugin-title']}>
            <span onClick={toggle} className={`${styles['dtable-map-plugin-header-btn']} text-left`}>{intl.get('Back')}</span>
          </div>
          <h4 className={styles['location-detail-title']}>{address}</h4>
        </div>
        <div className={styles['location-detail-list']}>
          <div className={`${styles['location-detail-records-length']} mb-2`}>{ intl.get('Total_records', { num: rows.length }) }</div>
          {rows.map((row, rowIdx) => {
            return (
              <RowCard
                key={`row-card-${rowIdx}`}
                isShowRemoveCardItemBtn={false}
                isHighlightRow={false}
                row={row}
                rowIdx={rowIdx}
                nameColumn={nameColumn}
                columns={filterColumns}
                formulaRows={formulaRows}
                cellValueUtils={this.props.cellValueUtils}
                onSelectRow={this.onSelectRow}
              />
            );
          })}
        </div>
      </div>
    );
  }
}

MobileLocationDetailList.propTypes = {
  sameLocationList: PropTypes.array,
  configSettings: PropTypes.array,
  clickPoint: PropTypes.object,
  cellValueUtils: PropTypes.object,
  toggle: PropTypes.func,
  getLocation: PropTypes.func,
};

export default MobileLocationDetailList;
