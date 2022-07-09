import React from 'react';
import PropTypes from 'prop-types';
import MobileMap from './mobile-map';
import Map from './map';

const IS_MOBILE = (typeof (window) !== 'undefined') && (window.innerWidth < 768 || navigator.userAgent.toLowerCase().match(/(ipod|ipad|iphone|android|coolpad|mmp|smartphone|midp|wap|xoom|symbian|j2me|blackberry|wince)/i) != null);

class App extends React.Component {

  render() {
    return (
      IS_MOBILE ? <MobileMap showDialog={this.props.showDialog}/> : <Map showDialog={this.props.showDialog}/>
    );
  }
}

App.propTypes = {
  showDialog: PropTypes.bool,
};

export default App;
