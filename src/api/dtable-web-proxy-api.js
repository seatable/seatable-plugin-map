import axios from 'axios';

class DTableWebProxyAPI {

  constructor() {
    this.req = null;
  }

  init() {
    if (this.req) return;
    const { accessToken, server, dtableUuid } = window.dtable;
    this.dtableUuid = dtableUuid;
    this.req = axios.create({
      baseURL: server,
      headers: { 'Authorization': 'Token ' + accessToken }
    });
    return this;
  }

  addressConvert(addresses) {
    this.init();
    const url = `/api/v2.1/dtables/${this.dtableUuid}/google-map/address-convert/`;
    const data = { addresses };
    return this.req.post(url, data);
  }

  locationConvert(locations, lang) {
    this.init();
    const url = `/api/v2.1/dtables/${this.dtableUuid}/google-map/location-convert/`;
    const data = { locations, lang };
    return this.req.post(url, data);
  }

}

const dtableWebProxyAPI = new DTableWebProxyAPI();

export default dtableWebProxyAPI;
