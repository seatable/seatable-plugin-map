import React from 'react';
import PropTypes from 'prop-types';
import MobileMap from './views/mobile-map';
import Map from './views/map';
import { IS_MOBILE } from './constants';
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
