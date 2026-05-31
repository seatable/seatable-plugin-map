import React from 'react';
import PropTypes from 'prop-types';
import { DTableDropdownMenu } from 'dtable-ui-component';

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
      <DTableDropdownMenu className="show" style={dropdownMenuStyle}>
        {options || <div className="no-options">{'No_options'}</div>}
      </DTableDropdownMenu>
    );
  }
}

DropdownMenu.propTypes = propTypes;

export default DropdownMenu;
