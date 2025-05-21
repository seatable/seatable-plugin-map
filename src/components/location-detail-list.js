import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { getTableByName, getViewByName, getViewShownColumns } from 'dtable-utils';
import { Loading } from 'dtable-ui-component';
import getConfigItemByType from '../utils/get-config-item-by-type';
import RowCard from './row-card';
import pluginContext from '../plugin-context';

import '../css/location-detail-list.css';
import intl from 'react-intl-universal';

class LocationDetailList extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      location: null,
      rows: [],
      isLoading: true,
      isWillHide: false
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
    return await getLocation(clickPoint);
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
    let currentTable = getTableByName(tables, tableName);
    let currentView = getViewByName(currentTable.views, viewName);
    let columns = getViewShownColumns(currentView, currentTable.columns);

    return columns;
  };

  getFormulaRows = () => {
    const { configSettings } = this.props;
    const tables = window.dtableSDK.getTables();
    const tableName = getConfigItemByType(configSettings, 'table').active;
    let currentTable = getTableByName(tables, tableName);
    const rows = this.getSameLocationRows();
    return window.dtableSDK.getTableFormulaResults(currentTable, rows);
  };

  getSameLocationRows = () => {
    const { clickPoint, sameLocationList } = this.props;
    const sameLocationItem = sameLocationList['' + clickPoint.lat + clickPoint.lng];
    return sameLocationItem || [];
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

  onChangeDeitailHeight = (event) => {
    event.stopPropagation();
    this.setState({ isWillHide: !this.state.isWillHide });
  };

  onSelectRow = (row) => {
    const { configSettings } = this.props;
    const tableName = getConfigItemByType(configSettings, 'table').active;
    const tables = window.dtableSDK.getTables();
    const currentTable = getTableByName(tables, tableName);
    pluginContext.expandRow(row, currentTable);
  };

  render() {
    const rows = this.getSameLocationRows();
    const { nameColumn, filterColumns } = this.getFilterColumns();
    const formulaRows = this.getFormulaRows();
    const { location, isLoading, isWillHide } = this.state;
    const address = location ? location.address : '';
    if (isLoading) {
      return (
        <div className='location-detail-list'>
          <div className="my-6">
            <Loading />
          </div>
        </div>
      );
    }

    return (
      <div
        className='location-detail-list'
        onClick={this.props.toggle}>
        <div className="location-detail-header">
          <div className="location-detail-header-container">
            <i className='dtable-font dtable-icon-location'></i>
            <span className="location-detail-address" title={address}>{address}</span>
            <span className="locatuon-detail-records">{(rows.length + ' ' + intl.get('Records'))}</span>
          </div>
          <i className={`dtable-font dtable-icon-${isWillHide ? 'up' : 'down'} change-detail-height`} onClick={this.onChangeDeitailHeight}></i>
        </div>
        <div className={classnames(
          'location-detail-container',
          { 'min-to-max-display': !isWillHide },
          { 'max-to-min-hide': isWillHide }
        )}>
          <div className="location-detail-list-container">
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
      </div>
    );
  }
}

LocationDetailList.propTypes = {
  sameLocationList: PropTypes.array,
  configSettings: PropTypes.array,
  dtable: PropTypes.object,
  clickPoint: PropTypes.object,
  cellValueUtils: PropTypes.object,
  toggle: PropTypes.func,
  getLocation: PropTypes.func,
};

export default LocationDetailList;
