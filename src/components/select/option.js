import React, { Component } from 'react';
import PropTypes from 'prop-types';

const propTypes = {
  value: PropTypes.object,
  children: PropTypes.oneOfType([PropTypes.node, PropTypes.string]),
  onSelectOption: PropTypes.func,
};

class Option extends Component {
  
  onSelectOption = (value) => {
    this.props.onSelectOption(value);
  }

  render() {
    return(
      <div className="option" onClick={this.onSelectOption.bind(this, this.props.value)}>{this.props.children}</div>
    );
  }
}

Option.propTypes = propTypes;

export default Option;