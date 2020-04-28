import React, { Component } from 'react';
import Option from './option';
import PropTypes from 'prop-types';

const propTypes = {
  options: PropTypes.array,
  onSelectOption: PropTypes.func
};

class OptGroup extends Component {

  renderOptGroup = () => {
    let { options } = this.props;
    return options && options.map((opt, i) => {
      return (
        <Option key={i} value={opt.value} onSelectOption={this.props.onSelectOption}>{opt.label}</Option>
      );
    });
  }

  render() {
    return (
      <div className="option-group">
        {this.renderOptGroup()}
      </div>
    );
  }
}

OptGroup.propTypes = propTypes;

export default OptGroup;