import React from 'react';
import PropTypes from 'prop-types';
import { FormulaFormatter } from 'dtable-ui-component';
import { FORMULA_RESULT_TYPE, CellType } from 'dtable-utils';
import { getFormulaArrayValue, convertValueToDtableLongTextValue } from '../../utils/common-utils';

function DtableFormulaFormatter(props) {
  const { cellValue, column, containerClassName } = props;
  const { collaborators } = window.app.state;
  if (!cellValue && cellValue !== 0 && cellValue !== false) return props.renderEmptyFormatter();
  const { data } = column;
  const { result_type: resultType, array_type } = data;
  let value = cellValue;
  if (Array.isArray(cellValue)) {
    value = getFormulaArrayValue(cellValue);
    if (array_type === CellType.DATE || resultType === FORMULA_RESULT_TYPE.DATE) {
      value = value.map(item => item.replace('T', ' ').replace('Z', ''));
    } else if (array_type === CellType.LONG_TEXT) {
      value = value.map(item => convertValueToDtableLongTextValue(item));
    }
  } else {
    if (resultType === FORMULA_RESULT_TYPE.DATE) {
      value = value.replace('T', ' ').replace('Z', '');
    }
  }
  return (
    <FormulaFormatter
      value={value}
      column={column}
      collaborators={collaborators}
      containerClassName={containerClassName}
    />
  );
}

DtableFormulaFormatter.propTypes = {
  cellValue: PropTypes.any,
  column: PropTypes.object,
  containerClassName: PropTypes.string,
  renderEmptyFormatter: PropTypes.func,
};

export default DtableFormulaFormatter;
