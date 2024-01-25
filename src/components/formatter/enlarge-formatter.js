import React from 'react';
import PropTypes from 'prop-types';
import { CellType } from 'dtable-utils';
import FileEnlargeFormatter from './enlarge-formatter-widgets/file-enlarge-formatter';

const enlargeFormatterMap = {
  [CellType.FILE]: FileEnlargeFormatter,
};

function EnlargeFormatter(props) {
  const { column, value } = props;
  const EnlargeFormatterItem = enlargeFormatterMap[column.type];
  if (!EnlargeFormatterItem) {
    return null;
  }

  return (<EnlargeFormatterItem value={value} closeEnlargeFormatter={props.closeEnlargeFormatter} />);
}

EnlargeFormatter.propTypes = {
  column: PropTypes.object.isRequired,
  value: PropTypes.any,
  closeEnlargeFormatter: PropTypes.func,
};

export default EnlargeFormatter;
