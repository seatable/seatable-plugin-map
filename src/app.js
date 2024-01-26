import React from 'react';
import PropTypes from 'prop-types';
import MobileMap from './views/mobile-map';
import Map from './views/map';

const IS_MOBILE = (typeof (window) !== 'undefined') && (window.innerWidth < 768 || navigator.userAgent.toLowerCase().match(/(ipod|ipad|iphone|android|coolpad|mmp|smartphone|midp|wap|xoom|symbian|j2me|blackberry|wince)/i) != null);

class App extends React.Component {

  render() {
    const MapCMP = IS_MOBILE ? MobileMap : Map;
    return (
      <MapCMP
        isDevelopment={this.props.isDevelopment}
        showDialog={this.props.showDialog}
      />
    );
  }
}

App.propTypes = {
  isDevelopment: PropTypes.bool,
  showDialog: PropTypes.bool,
};

export default App;
