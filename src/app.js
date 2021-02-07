import React from 'react';
import MobileMap from './mobile-map';
import Map from './map';

const IS_MOBILE = (typeof (window) !== 'undefined') && (window.innerWidth < 768 || navigator.userAgent.toLowerCase().match(/(ipod|ipad|iphone|android|coolpad|mmp|smartphone|midp|wap|xoom|symbian|j2me|blackberry|wince)/i) != null);

class App extends React.Component {

  render() {
    return (
      IS_MOBILE ? <MobileMap/> : <Map/>
    );
  }
}

export default App;
