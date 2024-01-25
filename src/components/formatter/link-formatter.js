import React from 'react';
import PropTypes from 'prop-types';
import { CellType, FORMULA_RESULT_TYPE } from 'dtable-utils';
import {
  MultipleSelectFormatter,
  NumberFormatter,
  DateFormatter,
  CTimeFormatter,
  MTimeFormatter,
  CheckboxFormatter,
  LongTextFormatter,
} from 'dtable-ui-component';
import CollaboratorItemFormatter from './collaborator-item-formatter';
import { getFormulaArrayValue, isArrayFormalColumn } from '../../utils/common-utils';

function LinkFormatter(props) {
  const { column, value, containerClassName, tables } = props;
  const { collaborators } = window.app.state;
  const { data } = column;
  if (!Array.isArray(value) || value.length === 0) return props.renderEmptyFormatter();
  let { display_column: displayColumn } = data || {};
  if (!displayColumn) return props.renderEmptyFormatter();
  const { type: displayColumnType, data: displayColumnData } = displayColumn;
  const cellValue = getFormulaArrayValue(value, !isArrayFormalColumn(displayColumnType));
  if (!Array.isArray(cellValue) || cellValue.length === 0) return props.renderEmptyFormatter();
  switch (displayColumnType) {
    case CellType.TEXT:
    case CellType.AUTO_NUMBER:
    case CellType.EMAIL:
    case CellType.URL: {
      return (
        <div className={containerClassName}>
          {cellValue.map((value, index) => {
            if (!value) return null;
            return (
              <div key={`link-${displayColumnType}-${index}`} className="sql-query-link-item">
                {value}
              </div>
            );
          })}
        </div>
      );
    }
    case CellType.NUMBER: {
      return (
        <div className={containerClassName}>
          {cellValue.map((value, index) => {
            if (!value && value !== 0) return null;
            return <NumberFormatter
              key={`link-${displayColumnType}-${index}`}
              containerClassName="sql-query-link-item"
              data={displayColumnData || {}}
              value={value}
            />;
          })}
        </div>
      );
    }
    case CellType.DATE: {
      return (
        <div className={containerClassName}>
          {cellValue.map((value, index) => {
            if (!value || typeof value !== 'string') return null;
            const { format } = displayColumnData || {};
            return <DateFormatter
              key={`link-${displayColumnType}-${index}`}
              value={value.replace('T', ' ').replace('Z', '')}
              format={format}
              containerClassName="sql-query-link-item"
            />;
          })}
        </div>
      );
    }
    case CellType.CTIME: {
      return (
        <div className={containerClassName}>
          {cellValue.map((value, index) => {
            if (!value) return null;
            return <CTimeFormatter
              key={`link-${displayColumnType}-${index}`}
              value={value}
              containerClassName="sql-query-link-item"
            />;
          })}
        </div>
      );
    }
    case CellType.MTIME: {
      return (
        <div className={containerClassName}>
          {cellValue.map((value, index) => {
            if (!value) return null;
            return <MTimeFormatter
              key={`link-${displayColumnType}-${index}`}
              value={value}
              containerClassName="sql-query-link-item"
            />;
          })}
        </div>
      );
    }
    case CellType.DURATION: {
      return (
        <div className={containerClassName}>
          {cellValue.map((value, index) => {
            if (!value) return null;
            return <div key={`link-${displayColumnType}-${index}`} className="sql-query-link-item">
              {props.cellValueUtils.getCellValueDisplayString(value, displayColumn)}
            </div>;
          })}
        </div>
      );
    }
    case CellType.CREATOR:
    case CellType.LAST_MODIFIER: {
      return (
        <div className="dtable-ui cell-formatter-container collaborator-formatter sql-query-collaborator-formatter">
          {cellValue.map((value, index) => {
            if (!value) return null;
            return (
              <CollaboratorItemFormatter
                key={`link-${displayColumnType}-${index}`}
                cellValue={value}
                getUserCommonInfo={props.getUserCommonInfo}
                renderEmptyFormatter={props.renderEmptyFormatter}
              />
            );
          })}
        </div>
      );
    }
    case CellType.SINGLE_SELECT: {
      if (!cellValue || cellValue.length === 0) return props.renderEmptyFormatter();
      const options = displayColumnData && Array.isArray(displayColumnData.options) ? displayColumnData.options : [];
      return <MultipleSelectFormatter value={cellValue} options={options || []} containerClassName={`sql-query-${displayColumnType}-formatter`} />;
    }
    case CellType.MULTIPLE_SELECT: {
      if (!cellValue || cellValue.length === 0) return props.renderEmptyFormatter();
      return (
        <div className={containerClassName}>
          {cellValue.map((value, index) => {
            if (!value) return null;
            const valueDisplayString = Array.isArray(value) ?
              props.cellValueUtils.getCellValueDisplayString(value, displayColumn)
              :
              props.cellValueUtils.getCellValueDisplayString([value], displayColumn);
            return (
              <div key={`link-${displayColumnType}-${index}`} className="sql-query-link-item">
                {valueDisplayString}
              </div>
            );
          })}
        </div>
      );
    }
    case CellType.COLLABORATOR: {
      if (!cellValue || cellValue.length === 0) return props.renderEmptyFormatter();
      return (
        <div className={containerClassName}>
          {cellValue.map((value, index) => {
            if (!value) return null;
            const valueDisplayString = Array.isArray(value) ?
              props.cellValueUtils.getCellValueDisplayString(value, displayColumn, { collaborators })
              :
              props.cellValueUtils.getCellValueDisplayString([value], displayColumn, { collaborators });
            return (
              <div key={`link-${displayColumnType}-${index}`} className="sql-query-link-item">
                {valueDisplayString}
              </div>
            );
          })}
        </div>
      );
    }
    case CellType.CHECKBOX: {
      return (
        <div className={containerClassName}>
          {cellValue.map((value, index) => {
            return <CheckboxFormatter
              key={`link-${displayColumnType}-${index}`}
              value={Boolean(value)}
              containerClassName={`sql-query-${displayColumnType}-item`}
            />;
          })}
        </div>
      );
    }
    case CellType.GEOLOCATION: {
      return (
        <div className={containerClassName}>
          {cellValue.map((value, index) => {
            if (!value) return null;
            return (
              <div key={`link-${displayColumnType}-${index}`} className="sql-query-link-item">
                {props.cellValueUtils.getCellValueDisplayString(value, displayColumn)}
              </div>
            );
          })}
        </div>
      );
    }
    case CellType.LONG_TEXT: {
      return (
        <div className={containerClassName}>
          {cellValue.map((value, index) => {
            if (!value) return null;
            return (
              <LongTextFormatter
                key={`link-${displayColumnType}-${index}`}
                value={value}
                containerClassName={`sql-query-${displayColumnType}-item`}
              />
            );
          })}
        </div>
      );
    }
    case CellType.FORMULA:
    case CellType.LINK_FORMULA: {
      return (
        <div className={containerClassName}>
          {cellValue.map((value, index) => {
            if (!value) return null;
            return (
              <div key={`link-${displayColumnType}-${index}`} className="sql-query-link-item">
                {props.cellValueUtils.getCellValueDisplayString(value, displayColumn, { collaborators, tables })}
              </div>
            );
          })}
        </div>
      );
    }
    case FORMULA_RESULT_TYPE.BOOL: {
      return (
        <div className={containerClassName}>
          {cellValue.map((value, index) => {
            return (
              <div key={`link-${displayColumnType}-${index}`} className="sql-query-link-item">
                {value + ''}
              </div>
            );
          })}
        </div>
      );
    }
    case FORMULA_RESULT_TYPE.STRING: {
      return (
        <div className={containerClassName}>
          {cellValue.map((value, index) => {
            if (!value) return null;
            return (
              <div key={`link-${displayColumnType}-${index}`} className="sql-query-link-item">
                {value}
              </div>
            );
          })}
        </div>
      );
    }
    default: {
      return props.renderEmptyFormatter();
    }
  }
}

LinkFormatter.propTypes = {
  tables: PropTypes.array,
  column: PropTypes.object.isRequired,
  value: PropTypes.any,
  collaborators: PropTypes.array,
  containerClassName: PropTypes.string,
  cellValueUtils: PropTypes.object,
  renderEmptyFormatter: PropTypes.func,
  getUserCommonInfo: PropTypes.func,
};

export default LinkFormatter;
