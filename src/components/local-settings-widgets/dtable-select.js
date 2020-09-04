import React from 'react';
import PropTypes from 'prop-types';
import Select, { components } from 'react-select';

const DropdownIndicator = props => {
  return (
    components.DropdownIndicator && (
      <components.DropdownIndicator {...props}>
        <span className="dtable-font dtable-icon-drop-down parameter-icon" style={{fontSize: '12px'}}></span>
      </components.DropdownIndicator>
    )
  );
};

const Option = props => {
  return (
    <div style={props.data.style}>
      <components.Option {...props} />
    </div>
  );
};

Option.propTypes = {
  data: PropTypes.shape({
    style: PropTypes.object,
  }),
};

const DTableSelectStyle = {
  control: styles => ({ ...styles, fontSize: '14px', cursor: 'pointer', lineHeight: '1.5'}),
  indicatorSeparator: () => {},
};

class DTableSelect extends React.Component {

  static propTypes = {
    options: PropTypes.array.isRequired,
    value: PropTypes.object,
    isSearchable: PropTypes.bool,
    placeholder: PropTypes.string,
    onChange: PropTypes.func.isRequired,
  };

  static defaultProps = {
    options: [],
    value: {},
    isSearchable: false,
    placeholder: '',
  };

  getMenuPortalTarget = () => {
    return document.querySelector('.modal');
  }

  render() {
    const { options, onChange, value, isSearchable, placeholder } = this.props;

    return(
      <Select 
        value={value}
        onChange={onChange}
        options={options}
        styles = {DTableSelectStyle}
        components={{ Option, DropdownIndicator }}
        placeholder={placeholder}
        isSearchable={isSearchable}
        menuPosition={'fixed'}
        menuShouldBlockScroll={true}
        menuShouldScrollIntoView
        menuPortalTarget={this.getMenuPortalTarget()}
        captureMenuScroll={false}
      />
    ); 
  }
}

export default DTableSelect;
