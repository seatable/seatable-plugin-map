import React from 'react';
import PropTypes from 'prop-types';
import styles from '../../css/mobile.module.css';

const propTypes = {
  checked: PropTypes.bool,
  placeholder: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

function MobileSwitch(props) {
  const { onChange, checked, placeholder, disabled } = props;
  return (
    <div className={styles['mobile-column-switch']}>
      <label className={`custom-switch ${styles['mobile-custom-switch']}`}>
        <input
          className="custom-switch-input"
          type="checkbox"
          checked={checked}
          onChange={onChange}
          name="custom-switch-checkbox"
          disabled={disabled}
        />
        <span className={'custom-switch-description text-truncate'}>{placeholder}</span>
        <span className="custom-switch-indicator"></span>
      </label>
    </div>
  );
}

MobileSwitch.propTypes = propTypes;

export default MobileSwitch;
