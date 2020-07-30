import React, { Component } from 'react';
import OptGroup from './option-group';
import PropTypes from 'prop-types';
import classnames from 'classnames';

import '../../css/select.css';

const propTypes = {
  className: PropTypes.string,
  value: PropTypes.object,
  options: PropTypes.array,
  placeholder: PropTypes.string,
  onSelectOption: PropTypes.func,
  isLocked: PropTypes.bool
};

class Select extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isShowSelectOptions: false
    };
  }

  componentDidMount() {
    document.addEventListener('click', this.hideSelect);
  }

  componentWillUnmount() {
    document.removeEventListener('click', this.hideSelect);
  }

  onSelectToggle = () => {
    if (this.props.isLocked) return;
    this.setState({
      isShowSelectOptions: !this.state.isShowSelectOptions
    });
  }

  hideSelect = (event) => {
    if (!this.selector.contains(event.target)) {
      this.setState({isShowSelectOptions: false});
    }
  }

  render() {
    let { className, value, options, placeholder } = this.props;
    return(
      <div 
        ref={(node) => this.selector = node}
        className={classnames('dtable-select', 'custom-select', {'focus': this.state.isShowSelectOptions}, className)} 
        onClick={this.onSelectToggle}>
        <div className="selected-option">
          {value.label ? (
            <span className="selected-option-show">{value.label}</span>
          ) : (
            <span className="select-placeholder">{placeholder}</span>
          )}
          {!this.props.isLocked && <i className="dtable-font dtable-icon-drop-down"></i>}
        </div>
        {this.state.isShowSelectOptions && (
          <OptGroup 
            options={options}
            onSelectOption={this.props.onSelectOption}
          />
        )}
      </div>
    );
  }
}

Select.propTypes = propTypes;

export default Select;