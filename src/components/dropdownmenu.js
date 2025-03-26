import React from 'react';
import PropTypes from 'prop-types';

const propTypes = {
  dropdownMenuPosition: PropTypes.object,
  options: PropTypes.node,
};

const zIndexes = 1500;

class DropdownMenu extends React.Component {

  render() {
    let { dropdownMenuPosition, options } = this.props;
    let dropdownMenuStyle = {
      zIndex: zIndexes,
      ...dropdownMenuPosition,
    };
    return (
      <div className="dtable-dropdown-menu dropdown-menu large show" style={dropdownMenuStyle}>
        {options || <div className="no-options">{'No_options'}</div>}
      </div>
    );
  }
}

DropdownMenu.propTypes = propTypes;

export default DropdownMenu;
